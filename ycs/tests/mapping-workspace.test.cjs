'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');const {EventEmitter}=require('node:events');const {PassThrough}=require('node:stream');const {JSONAPI,normalizeJSONSettings,publicAddress}=require('../json-api.cjs');const {DataSources}=require('../data.cjs');const {normalizeField}=require('../field-types.cjs');const {fixture}=require('./playback.test.cjs');
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
test('JSON pointer escaping, empty static values and native field validation are explicit',async t=>{
  const base=await fixture(t),sources=new DataSources(path.join(base.root,'sources.json'),base.stages,{json:{read:async()=>({data:{'a/b':{'~key':'Value'},arr:[{name:'First'}],nil:null}})}});await sources.ready;t.after(()=>sources.close());
  const {connectionId}=await sources.saveConnection(null,'API',settings,0,'json-api');const ref=pointer=>sources.reference({connection:connectionId,selection:{kind:'json',pointer}});
  assert.equal(sources.value(ref('/a~1b/~0key')),'Value');assert.equal(sources.value(ref('/arr/0/name')),'First');assert.equal(sources.value(ref('/nil')),undefined);assert.equal(sources.value(sources.reference({static:''})), '');
  assert.throws(()=>normalizeField({ftype:'checkbox'},'maybe'));assert.throws(()=>normalizeField({ftype:'number'},''));assert.throws(()=>normalizeField({ftype:'color'},'#12345'));assert.throws(()=>normalizeField({ftype:'filelist'},'javascript:alert(1)'));
});
