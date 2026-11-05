'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');const {EventEmitter}=require('node:events');const {PassThrough}=require('node:stream');const {JSONAPI,normalizeJSONSettings,publicAddress}=require('../json-api.cjs');const {DataSources}=require('../data.cjs');const {normalizeField,normalizeLinked}=require('../field-types.cjs');const {transform:transformValue,normalizeTransform}=require('../bindings.cjs');const {fixture}=require('./playback.test.cjs');
const settings={url:'https://api.example.com/event',refreshSeconds:5};
function adapter({body='{"event":{"name":"Finals","round":15,"active":true}}',status=200,type='application/json',address='93.184.216.34',env={}}={}){
  let calls=0,headers;const json=new JSONAPI({env,lookup:(host,options,callback)=>callback(null,[{address,family:4}]),request:(url,options,receive)=>{calls++;headers=options.headers;const request=new EventEmitter();request.end=()=>options.lookup(url.hostname,{all:true},(error)=>{if(error){queueMicrotask(()=>request.emit('error',error));return;}const response=new PassThrough();response.statusCode=status;response.headers={'content-type':type};receive(response);queueMicrotask(()=>response.end(body));});return request;}});return {json,calls:()=>calls,headers:()=>headers};
}
test('JSON APIs read bounded scalar data without redirects and pin DNS to public addresses',async()=>{
  const a=adapter(),result=await a.json.read(settings);assert.equal(result.data.event.round,15);assert.equal(a.headers().Accept,'application/json');
  for(const url of ['http://api.example.com','https://user:secret@api.example.com','https://localhost/event','https://127.0.0.1/event','https://[::1]/event','https://[::ffff:127.0.0.1]/event'])assert.throws(()=>normalizeJSONSettings({...settings,url}));
  for(const options of [{status:302},{type:'text/html'},{body:'not json'},{body:'x'.repeat(1048577)},{address:'10.1.2.3'},{address:'169.254.169.254'}])await assert.rejects(adapter(options).json.read(settings),{status:502});
  assert.equal(publicAddress('192.168.1.10'),false);assert.equal(publicAddress('2606:4700:4700::1111'),true);
  const secure=adapter({env:{YCS_DATA_TOKEN:'private-value'}});await secure.json.read({...settings,tokenEnv:'YCS_DATA_TOKEN'});assert.equal(secure.headers().Authorization,'Bearer private-value');
  await assert.rejects(adapter().json.read({...settings,tokenEnv:'YCS_DATA_MISSING'}),{status:422});assert.throws(()=>normalizeJSONSettings({...settings,tokenEnv:'AWS_SECRET_ACCESS_KEY'}));
});
const listed={url:'http://192.168.1.55:8080/api/stages/1',refreshSeconds:1};
function localAdapter(localHosts=['192.168.1.55:8080']){
  const calls={http:0,https:0};
  const reply=kind=>(url,options,receive)=>{calls[kind]++;const request=new EventEmitter();request.end=()=>{const response=new PassThrough();response.statusCode=200;response.headers={'content-type':'application/json'};receive(response);queueMicrotask(()=>response.end('{"ok":true}'));};return request;};
  return {json:new JSONAPI({localHosts,request:reply('https'),httpRequest:reply('http'),lookup:()=>assert.fail('an IP address needs no lookup')}),calls};
}
test('only listed network addresses are read, over plain HTTP and at a fast refresh',async()=>{
  assert.deepEqual(normalizeJSONSettings(listed),listed);
  const allowed=localAdapter();assert.equal((await allowed.json.read(listed)).data.ok,true);assert.deepEqual(allowed.calls,{http:1,https:0});
  const secure=localAdapter(['192.168.1.55:8443']);await secure.json.read({...listed,url:'https://192.168.1.55:8443/x'});assert.deepEqual(secure.calls,{http:0,https:1});
  for(const [hosts,url] of [[[],listed.url],[['192.168.1.55:8081'],listed.url],[['192.168.1.56:8080'],listed.url],[['192.168.1.55:8080'],'http://192.168.1.55/x'],[['192.168.1.55:8080'],'http://10.0.0.5:8080/x']]){
    const refused=localAdapter(hosts);await assert.rejects(refused.json.read({...listed,url}),{status:422,message:/localJsonHosts/});assert.deepEqual(refused.calls,{http:0,https:0});
  }
});
test('the local allowance does not widen the rules for anything else',()=>{
  for(const url of ['http://93.184.216.34:8080/x','http://api.example.com/x','https://api.example.com:8443/x','http://127.0.0.1:8080/x','http://localhost:8080/x','http://169.254.169.254/x','http://[::1]:8080/x','ftp://192.168.1.55/x'])assert.throws(()=>normalizeJSONSettings({...listed,url,refreshSeconds:5}),url);
  assert.throws(()=>normalizeJSONSettings({...listed,url:'http://user:secret@192.168.1.55:8080/x'}),/username and password/);
  assert.throws(()=>normalizeJSONSettings({...listed,url:'http://192.168.1.55:8080/x#part'}),/# part/);
  assert.throws(()=>normalizeJSONSettings({...settings,refreshSeconds:1}),/5–3600/);
  assert.throws(()=>normalizeJSONSettings({...listed,refreshSeconds:0}),/1–3600/);
  assert.throws(()=>normalizeJSONSettings({...listed,refreshSeconds:3601}),/1–3600/);
});
test('a saved local source that is no longer listed fails alone and the data file still loads',async t=>{
  const base=await fixture(t),file=path.join(base.root,'sources.json');
  const first=new DataSources(file,base.stages,{json:{read:async()=>({data:{ok:true}})}});await first.ready;
  const {connectionId}=await first.saveConnection(null,'Local',listed,0,'json-api');await first.close();
  const second=new DataSources(file,base.stages,{json:new JSONAPI({localHosts:[]})});await second.ready;t.after(()=>second.close());
  assert.equal(second.snapshot().error,'');assert.equal(second.snapshot().connections[connectionId].label,'Local');
  await second.refreshSheet(connectionId).catch(()=>{});
  assert.match(second.snapshot().connections[connectionId].error,/localJsonHosts/);
});
test('JSON mappings, static values and transforms resolve in an isolated preview and commit explicitly',async t=>{
  const base=await fixture(t);let data={event:{name:'Finals',round:15,active:true},'a/b':{'~key':'escaped'}};
  const sources=new DataSources(path.join(base.root,'sources.json'),base.stages,{json:{read:async()=>({data})}});await sources.ready;t.after(()=>sources.close());base.playback.sources=sources;
  const rundown=await base.repository.read('stage-1');rundown.templates[0].DataFields.push({field:'f8',title:'Duration',ftype:'number',value:'10'},{field:'f2',title:'Show',ftype:'checkbox',value:'0'});await base.repository.write('stage-1',rundown);
  const added=await sources.saveConnection(null,'API',settings,0,'json-api','Stage1'),connection=added.connectionId;
  const edits=[{field:'f5',scope:'override',binding:{connection,selection:{kind:'json',pointer:'/event/name'},transform:{kind:'uppercase'}}},{field:'f8',scope:'override',binding:{connection,selection:{kind:'json',pointer:'/event/round'}}},{field:'f2',scope:'override',binding:{connection,selection:{kind:'json',pointer:'/event/active'}}}];
  const before=sources.snapshot().revision,preview=await base.playback.mappingPreview('stage-1','ticker',edits);
  assert.equal(preview.graphic.data.f5,'FINALS');assert.equal(preview.graphic.data.f8,'15');assert.equal(preview.graphic.data.f2,'1');assert.equal(sources.snapshot().revision,before);assert.equal(base.playback.snapshot('stage-1','program').graphics.length,0);assert.equal(base.playback.snapshot('stage-1','preview').graphics.length,0);
  await sources.saveMappings('stage-1','ticker','/test/graphic.html',edits,before);
  const links=Object.fromEntries(['f5','f8','f2'].map(field=>[field,{mode:'linked',manual:field==='f2'?'0':'10'}]));await base.playback.command('stage-1','ticker','play',undefined,{links});
  data={event:{name:'Semi final',round:'invalid',active:false}};await sources.refreshSheet(connection);await base.playback.refreshLinks('stage-1');const program=base.playback.snapshot('stage-1','program').graphics[0];assert.equal(program.data.f5,'SEMI FINAL');assert.equal(program.data.f8,'15','invalid numeric data holds the committed valid value');assert.equal(program.data.f2,'0');
  const staticPreview=await base.playback.mappingPreview('stage-1','ticker',[{field:'f5',scope:'override',binding:{static:'hale.png',transform:{kind:'prefix',value:'media/guests/'}}}]);assert.equal(staticPreview.graphic.data.f5,'media/guests/hale.png');assert.equal(base.playback.snapshot('stage-1','program').graphics[0].data.f5,'SEMI FINAL');
  await assert.rejects(sources.saveMappings('stage-2','ticker','/test/graphic.html',edits,sources.snapshot().revision),{status:422});
});
test('a JSON value that is missing, null or empty shows blank, never an earlier value',async t=>{
  const base=await fixture(t);let data={blue:{name:'Player A',deck:'Deck A',wins:1,ready:true}},failing=false;
  const sources=new DataSources(path.join(base.root,'sources.json'),base.stages,{json:{read:async()=>{if(failing)throw Object.assign(new Error('down'),{status:502});return {data};}}});await sources.ready;t.after(()=>sources.close());base.playback.sources=sources;
  const rundown=await base.repository.read('stage-1');rundown.templates[0].DataFields.push({field:'f6',title:'Name',ftype:'textfield',value:'typed name'},{field:'f7',title:'Deck',ftype:'textfield',value:'typed deck'},{field:'f8',title:'Wins',ftype:'number',value:'9'},{field:'f2',title:'Ready',ftype:'checkbox',value:'1'},{field:'f9',title:'Must have',ftype:'textfield',required:true,value:'typed'});await base.repository.write('stage-1',rundown);
  const {connectionId:connection}=await sources.saveConnection(null,'API',settings,0,'json-api');
  const link=(field,pointer,transform)=>({field,scope:'override',binding:{connection,selection:{kind:'json',pointer},...(transform?{transform}:{})}});
  await sources.saveMappings('stage-1','ticker','/test/graphic.html',[link('f6','/blue/name'),link('f7','/blue/deck',{kind:'uppercase'}),link('f8','/blue/wins'),link('f2','/blue/ready'),link('f9','/blue/name')],sources.snapshot().revision);
  const links=Object.fromEntries(['f6','f7','f8','f2','f9'].map(field=>[field,{mode:'linked',manual:field==='f8'?'9':field==='f2'?'1':'typed'}]));
  await base.playback.command('stage-1','ticker','play',undefined,{links});
  const onAir=async()=>{await sources.refreshSheet(connection).catch(()=>{});await base.playback.refreshLinks('stage-1');const {f6,f7,f8,f2,f9}=base.playback.snapshot('stage-1','program').graphics[0].data;return {f6,f7,f8,f2,f9};};
  assert.deepEqual(await onAir(),{f6:'Player A',f7:'DECK A',f8:'1',f2:'1',f9:'Player A'});
  for(const deck of [undefined,null,'','   ']){
    data={blue:{name:'Player B',wins:2,ready:true,...(deck===undefined?{}:{deck})}};
    assert.deepEqual(await onAir(),{f6:'Player B',f7:'',f8:'2',f2:'1',f9:'Player B'},JSON.stringify(deck));
    data={blue:{name:'Player A',deck:'Deck A',wins:1,ready:true}};await onAir();
  }
  data={stageNumber:2};assert.deepEqual(await onAir(),{f6:'',f7:'',f8:'',f2:'0',f9:'Player A'},'a whole player missing is blank; a required field keeps its value');
  data={blue:{name:'Player C',deck:'Deck C',wins:0,ready:false}};assert.deepEqual(await onAir(),{f6:'Player C',f7:'DECK C',f8:'0',f2:'0',f9:'Player C'},'values come straight back, and zero and false are real values');
  failing=true;assert.deepEqual(await onAir(),{f6:'Player C',f7:'DECK C',f8:'0',f2:'0',f9:'Player C'},'an unreachable API keeps the last values');failing=false;
  data={blue:{name:'Player D',wins:1,ready:true}};await sources.refreshSheet(connection);await base.playback.command('stage-1','ticker','stop',undefined,{});await base.playback.command('stage-1','ticker','play',undefined,{links});
  const fresh=base.playback.snapshot('stage-1','program').graphics[0].data;assert.equal(fresh.f6,'Player D');assert.equal(fresh.f7,'','a fresh Play is blank too, not the typed fallback');
  data={blue:{name:'Player E'}};await sources.refreshSheet(connection);await base.playback.command('stage-1','ticker','stop',undefined,{});await base.playback.command('stage-1','ticker','play',undefined,{links});
  const fields=base.playback.snapshot('stage-1','program').graphics[0].data;assert.equal(fields.f8,'','a fresh Play blanks a number');assert.equal(fields.f2,'0','a fresh Play unticks a checkbox');
  data={blue:{name:{first:'Not text'}}};await sources.refreshSheet(connection);const status=sources.resolveSnapshot(sources.reference(link('f6','/blue/name').binding));assert.equal(status.health,'error','a value of the wrong kind is still reported');
});
test('the completed game transform gives the game that just ended and refuses anything but a whole count',()=>{
  for(const [count,game] of [['1','1'],['2','1'],['3','2'],['4','3'],['0','1']])assert.equal(transformValue(count,{kind:'completed-game'}),game,count);
  for(const bad of ['','  ','two','1.5','NaN'])assert.throws(()=>transformValue(bad,{kind:'completed-game'}),/whole game count/,bad);
  assert.deepEqual(normalizeTransform({kind:'completed-game',value:'ignored'}),{kind:'completed-game'});
  assert.throws(()=>normalizeTransform({kind:'subtract-two'}),/Unsupported transform/);
});
test('a linked game number follows the game count minus one on air, and a typed one is left alone',async t=>{
  const base=await fixture(t);let data={gameCount:1,wins:0};
  const sources=new DataSources(path.join(base.root,'sources.json'),base.stages,{json:{read:async()=>({data})}});await sources.ready;t.after(()=>sources.close());base.playback.sources=sources;
  const rundown=await base.repository.read('stage-1');rundown.templates[0].DataFields.push({field:'f2',title:'Game number',ftype:'number',min:1,max:3,value:'1'},{field:'f3',title:'Typed game',ftype:'number',min:1,max:3,value:'3'});await base.repository.write('stage-1',rundown);
  const {connectionId:connection}=await sources.saveConnection(null,'API',settings,0,'json-api');
  const counted={connection,selection:{kind:'json',pointer:'/gameCount'},transform:{kind:'completed-game'}};
  await sources.saveMappings('stage-1','ticker','/test/graphic.html',[{field:'f2',scope:'override',binding:counted},{field:'f3',scope:'override',binding:counted}],sources.snapshot().revision);
  const onAir=async count=>{data={gameCount:count};await sources.refreshSheet(connection);await base.playback.refreshLinks('stage-1');return base.playback.snapshot('stage-1','program').graphics[0].data;};
  await base.playback.command('stage-1','ticker','play',undefined,{links:{f2:{mode:'linked',manual:'1'},f3:{mode:'manual',manual:'3'}}});
  assert.equal(base.playback.snapshot('stage-1','program').graphics[0].data.f2,'1','game 1 before any result');
  for(const [count,game] of [[2,'1'],[3,'2'],[4,'3']]){const shown=await onAir(count);assert.equal(shown.f2,game,'count '+count);assert.equal(shown.f3,'3','a typed value is untouched');}
  data={gameCount:'two'};await sources.refreshSheet(connection);await base.playback.refreshLinks('stage-1');assert.equal(base.playback.snapshot('stage-1','program').graphics[0].data.f2,'3','an unusable count keeps the last value');
  assert.equal(sources.resolveSnapshot(sources.reference(counted)).health,'error','and reports it');
  data={wins:0};await sources.refreshSheet(connection);await base.playback.refreshLinks('stage-1');assert.equal(base.playback.snapshot('stage-1','program').graphics[0].data.f2,'','a missing count stays blank');
});
test('a link whose transform refuses its value reports an error and breaks nothing else',async t=>{
  const base=await fixture(t);let data={name:'Player A',gameCount:2};
  const sources=new DataSources(path.join(base.root,'sources.json'),base.stages,{json:{read:async()=>({data})}});await sources.ready;t.after(()=>sources.close());base.playback.sources=sources;
  const rundown=await base.repository.read('stage-1');rundown.templates[0].DataFields.push({field:'f6',title:'Name',ftype:'textfield',value:'typed'},{field:'f2',title:'Game',ftype:'number',min:1,max:3,value:'3'},{field:'f3',title:'Other',ftype:'number',min:1,max:3,value:'2'});await base.repository.write('stage-1',rundown);
  const {connectionId:connection}=await sources.saveConnection(null,'API',settings,0,'json-api');
  const refused={kind:'completed-game'};
  for(const record of [{static:'',transform:refused},{static:'text',transform:refused}]){const status=sources.resolveSnapshot('preview',record);assert.equal(status.health,'error');assert.equal(status.value,undefined);assert.match(status.error,/whole game count/);}
  assert.equal(sources.resolveSnapshot('preview',{static:'3',transform:refused}).value,'2');
  sources.document.sources.localText={label:'Local text',value:'not a number'};
  const alias=sources.resolveSnapshot('preview',{source:'localText',transform:refused});assert.equal(alias.health,'error');assert.equal(alias.value,undefined);delete sources.document.sources.localText;
  await sources.saveMappings('stage-1','ticker','/test/graphic.html',[{field:'f6',scope:'override',binding:{connection,selection:{kind:'json',pointer:'/name'}}},{field:'f2',scope:'override',binding:{static:'',transform:refused}},{field:'f3',scope:'override',binding:{connection,selection:{kind:'json',pointer:'/gameCount'},transform:refused}}],sources.snapshot().revision);
  assert.doesNotThrow(()=>sources.snapshot(),'the snapshot every controller reads still works');
  await base.playback.command('stage-1','ticker','play',undefined,{links:{f6:{mode:'linked',manual:'typed'},f2:{mode:'linked',manual:'3'},f3:{mode:'linked',manual:'2'}}});
  const shown=()=>base.playback.snapshot('stage-1','program').graphics[0].data;
  assert.equal(shown().f2,'3','the refused link uses its typed fallback');assert.equal(shown().f3,'1');
  data={name:'Player B',gameCount:3};await sources.refreshSheet(connection);await base.playback.refreshLinks('stage-1');
  assert.equal(shown().f6,'Player B','other links keep refreshing');assert.equal(shown().f3,'2');assert.equal(shown().f2,'3');
  assert.equal((await base.playback.mappingPreview('stage-1','ticker')).fields.find(field=>field.field==='f2').health,'error');
});
test('a report with no data counts as a failed read, so the last values stay',async()=>{
  for(const body of ['null','{}','[]','5','"text"','true'])await assert.rejects(adapter({body}).json.read(settings),{status:502},body);
  assert.deepEqual((await adapter({body:'[{"a":1}]'}).json.read(settings)).data,[{a:1}],'a list with entries is still data');
});
test('linked blanks reach only the fields that can show them',()=>{
  assert.equal(normalizeLinked({ftype:'textfield'},''),'');
  assert.equal(normalizeLinked({ftype:'filelist'},''),'');
  assert.equal(normalizeLinked({ftype:'number',min:1,max:3},''),'');
  assert.equal(normalizeLinked({ftype:'checkbox'},''),'0');
  assert.equal(normalizeLinked({ftype:'number',min:1,max:3},'2'),'2');
  assert.throws(()=>normalizeLinked({ftype:'number',min:1,max:3},'4'),'an out-of-range number is still refused');
  assert.throws(()=>normalizeLinked({ftype:'dropdown',items:[{value:'1'},{value:'2'}]},''));
  assert.equal(normalizeLinked({ftype:'dropdown',items:[{value:''},{value:'2'}]},''),'');
  assert.throws(()=>normalizeLinked({ftype:'color'},''));
  assert.throws(()=>normalizeLinked({ftype:'textfield',required:true},''));
  assert.throws(()=>normalizeLinked({ftype:'number',required:true},''));
});
test('JSON pointer escaping, empty static values and native field validation are explicit',async t=>{
  const base=await fixture(t),sources=new DataSources(path.join(base.root,'sources.json'),base.stages,{json:{read:async()=>({data:{'a/b':{'~key':'Value'},arr:[{name:'First'}],nil:null}})}});await sources.ready;t.after(()=>sources.close());
  const {connectionId}=await sources.saveConnection(null,'API',settings,0,'json-api');const ref=pointer=>sources.reference({connection:connectionId,selection:{kind:'json',pointer}});
  assert.equal(sources.value(ref('/a~1b/~0key')),'Value');assert.equal(sources.value(ref('/arr/0/name')),'First');assert.equal(sources.value(ref('/nil')),'','a successful read with no value is blank');assert.equal(sources.value(sources.reference({static:''})), '');
  assert.throws(()=>normalizeField({ftype:'checkbox'},'maybe'));assert.throws(()=>normalizeField({ftype:'number'},''));assert.throws(()=>normalizeField({ftype:'color'},'#12345'));assert.throws(()=>normalizeField({ftype:'filelist'},'javascript:alert(1)'));
});
