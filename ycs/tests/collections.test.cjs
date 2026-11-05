'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');const {DataSources}=require('../data.cjs');const {normalizeSelection,resolveCollection,normalizeValue}=require('../collections.cjs');const {fixture}=require('./playback.test.cjs');
const schema={version:1,fields:[{key:'category',title:'Category'},{key:'topic',title:'Topic'},{key:'subtopic',title:'Crawler text',required:true}]};
const field={field:'f14',ftype:'textarea',title:'Stories',value:'[{"subtopic":"Manual story"}]',ycsCollection:schema};
const sheetSettings={url:'https://docs.google.com/spreadsheets/d/1PUBLIC_SHEET_TEST_1234567890/edit',worksheet:'Ticker',range:'A1:G8',refreshSeconds:5};
const rows=values=>values.map((row,i)=>row.map((value,j)=>({address:String.fromCharCode(65+j)+(i+1),value:String(value),usable:String(value).length<=300})));
const sheetPick={kind:'collection',format:'sheet',range:'A1:G8',headerRow:1,fields:{category:{kind:'column',name:'Category'},topic:{kind:'column',name:'Topic'},subtopic:{kind:'column',name:'Subtopic'}},enabled:{kind:'column',name:'Published'},order:{kind:'column',name:'Order'},id:{kind:'column',name:'Story ID'},required:['subtopic']};
const values=[['Published','Category','Topic','Subtopic','Order','Story ID','Unused'],['TRUE','TCG','News','Later',20,'later',''],['FALSE','TCG','Unpublished','','','later',''],['TRUE','Games','Match','First',10,'first',''],['','','','','','','']];
test('sheet playlists follow unique header names across reordered columns and filter publication before validation',()=>{
 const pick=normalizeSelection(sheetPick,sheetSettings),first=resolveCollection(rows(values),pick);assert.equal(first.invalid,0);assert.equal(first.excluded,1);assert.deepEqual(first.items.map(item=>item.id),['first','later']);
 const permutation=[5,3,0,6,2,4,1],moved=values.map(row=>permutation.map(index=>row[index]));assert.deepEqual(resolveCollection(rows(moved),pick).items,first.items);
 const renamed=structuredClone(values);renamed[0][3]='Message';assert.throws(()=>resolveCollection(rows(renamed),pick),/missing or duplicated.*Subtopic/);
 const duplicate=structuredClone(values);duplicate[0][6]='Subtopic';assert.throws(()=>resolveCollection(rows(duplicate),pick),/duplicated/);
 const orderless=structuredClone(pick);delete orderless.order;assert.deepEqual(resolveCollection(rows(values),orderless).items.map(item=>item.id),['later','first']);
});
test('JSON arrays support arbitrary property paths, fixed fields, fallbacks and explicit row errors',()=>{
 const pick=normalizeSelection({kind:'collection',format:'json',pointer:'/event/stories',fields:{category:{kind:'static',value:'YCS'},topic:{kind:'property',pointer:'/section/title',fallback:'Tournament'},subtopic:{kind:'property',pointer:'/a~1b/~0text'}},enabled:{kind:'property',pointer:'/live'},order:{kind:'property',pointer:'/rank'},id:{kind:'property',pointer:'/key'},required:['subtopic']},{});
 const data={event:{stories:[{live:true,rank:2,key:'b','a/b':{'~text':'B'}},{live:false},{live:true,rank:1,key:'a',section:{title:'Games'},'a/b':{'~text':'A'}}]}};
 const result=resolveCollection(data,pick);assert.equal(result.invalid,0);assert.deepEqual(result.items,[{category:'YCS',topic:'Games',subtopic:'A',id:'a'},{category:'YCS',topic:'Tournament',subtopic:'B',id:'b'}]);assert.equal(result.excluded,1);
 data.event.stories.push({live:'MAYBE'});assert.equal(resolveCollection(data,pick).invalid,1);
 data.event.stories.at(-1).live=true;data.event.stories.at(-1).rank='not numeric';assert.equal(resolveCollection(data,pick).invalid,1);
 assert.throws(()=>resolveCollection({event:{stories:{}}},pick),/array/);
 assert.throws(()=>normalizeSelection({...sheetPick,range:'A1:H8'},sheetSettings),/inside/);
});
test('collection bounds, required text, duplicate IDs and an intentionally empty playlist are explicit',()=>{
 const pick=normalizeSelection(sheetPick,sheetSettings),bad=structuredClone(values);bad[3][5]='later';assert.match(resolveCollection(rows(bad),pick).error,/invalid/);
 bad[3][5]='first';bad[3][3]='';assert.match(resolveCollection(rows(bad),pick).rows.find(row=>row.status==='invalid').error,/required/);
 assert.equal(normalizeValue(field,'[]'),'[]');assert.throws(()=>normalizeValue(field,'[{"topic":"Missing"}]'),/required/);assert.throws(()=>normalizeValue(field,'[{"id":"a","subtopic":"A"},{"id":"a","subtopic":"B"}]'),/unique/);
 assert.throws(()=>normalizeValue(field,JSON.stringify(Array.from({length:201},()=>({subtopic:'x'})))),/200/);
 const long='x'.repeat(1000),data=structuredClone(values);data[1][3]=long;assert.equal(resolveCollection(rows(data),pick).items[1].subtopic,long);
 for(const row of data.slice(1))row[0]='FALSE';assert.equal(resolveCollection(rows(data),pick).value,'[]');
});
test('collection preview, explicit commits, live refresh, schema enforcement and restart cache preserve stage isolation',async t=>{
 const base=await fixture(t);let dataset=rows(values);const file=path.join(base.root,'source.json');const sources=new DataSources(file,base.stages,{sheets:{read:async()=>({rows:dataset})}});await sources.ready;t.after(()=>sources.close());base.playback.sources=sources;
 const rundown=await base.repository.read('stage-1');rundown.templates[0].DataFields.push(structuredClone(field));await base.repository.write('stage-1',rundown);
 const {connectionId}=await sources.saveConnection(null,'Stories',sheetSettings,0),binding={connection:connectionId,selection:sheetPick},edits=[{field:'f14',scope:'override',binding}];
 const before=sources.snapshot().revision,preview=await base.playback.mappingPreview('stage-1','ticker',edits);assert.equal(JSON.parse(preview.graphic.data.f14).length,2);assert.equal(preview.fields.find(field=>field.field==='f14').collection.excluded,1);assert.equal(sources.snapshot().revision,before);assert.equal(base.playback.snapshot('stage-1','program').graphics.length,0);
 await sources.saveMappings('stage-1','ticker','/test/graphic.html',edits,before);await base.playback.command('stage-1','ticker','play',undefined,{links:{f14:{mode:'linked',manual:field.value}}});const committed=base.playback.snapshot('stage-1','program').graphics[0].data.f14;
 dataset=rows(values.map((row,i)=>i===1?row.map((value,j)=>j===3?'Updated story '+ 'x'.repeat(1000):value):row));await sources.refreshSheet(connectionId);await base.playback.refreshLinks('stage-1');assert.match(base.playback.snapshot('stage-1','program').graphics[0].data.f14,/Updated story/);
 dataset[0][3].value='Renamed';await sources.refreshSheet(connectionId);await base.playback.refreshLinks('stage-1');assert.match(base.playback.snapshot('stage-1','program').graphics[0].data.f14,/Updated story/);assert.equal(base.playback.snapshot('stage-2','program').graphics.length,0);
 const invalid=await base.playback.mappingPreview('stage-1','ticker');assert.match(invalid.fields.find(field=>field.field==='f14').error,/missing or duplicated/);
 await assert.rejects(base.playback.mappingPreview('stage-1','ticker',[{field:'f5',scope:'override',binding}]),/single value/);
 await assert.rejects(base.playback.mappingPreview('stage-1','ticker',[{field:'f14',scope:'override',binding:{connection:connectionId,selection:{kind:'cell',cell:'A2'}}}]),/story list/);
 await base.playback.command('stage-1','ticker','update',undefined,{links:{f14:{mode:'manual',manual:field.value}}});assert.equal(base.playback.snapshot('stage-1','program').graphics[0].data.f14,field.value);
 await sources.flushCache();// background cache writes are throttled
 const restarted=new DataSources(file,base.stages,{sheets:{read:async()=>{throw new Error('offline');}}});await restarted.ready;t.after(()=>restarted.close());const ref=restarted.mapping('stage-1','ticker','f14','/test/graphic.html');assert.match(restarted.value(ref),/Updated story/);assert.notEqual(restarted.value(ref),committed);
});
test('JSON playlists use the same typed preview and commit path, and invalid required fields cannot be bypassed',async t=>{
 const base=await fixture(t);let data={feed:[{live:true,heading:'Final',message:'API story'}]};const sources=new DataSources(path.join(base.root,'json-list.json'),base.stages,{json:{read:async()=>({data})}});await sources.ready;t.after(()=>sources.close());base.playback.sources=sources;
 const rundown=await base.repository.read('stage-1');rundown.templates[0].DataFields.push(structuredClone(field));await base.repository.write('stage-1',rundown);
 const {connectionId}=await sources.saveConnection(null,'JSON stories',{url:'https://api.example.com/stories',refreshSeconds:5},0,'json-api');
 const edits=[{field:'f14',scope:'override',binding:{connection:connectionId,selection:{kind:'collection',format:'json',pointer:'/feed',fields:{topic:{kind:'property',pointer:'/heading'},subtopic:{kind:'property',pointer:'/message'}},enabled:{kind:'property',pointer:'/live'},required:[]}}}];
 let preview=await base.playback.mappingPreview('stage-1','ticker',edits);assert.equal(JSON.parse(preview.graphic.data.f14)[0].subtopic,'API story');
 data={feed:[{live:true,heading:'Missing message'}]};await sources.refreshSheet(connectionId);preview=await base.playback.mappingPreview('stage-1','ticker',edits);assert.equal(preview.fields.find(field=>field.field==='f14').collection.invalid,1);assert.match(preview.fields.find(field=>field.field==='f14').error,/invalid/);
});
test('story text transforms apply to sheet, JSON, fixed and fallback values before validation without changing source data or IDs',()=>{
 const input=structuredClone(sheetPick);input.fields.category.transform={kind:'uppercase'};input.fields.topic.transform={kind:'lowercase'};input.fields.subtopic.transform={kind:'prefix',value:'NEWS: '};const data=rows(values),before=structuredClone(data),result=resolveCollection(data,normalizeSelection(input,sheetSettings));
 assert.deepEqual(result.items[0],{category:'GAMES',topic:'match',subtopic:'NEWS: First',id:'first'});assert.deepEqual(data,before);assert.equal(result.excluded,1);
 const json={kind:'collection',format:'json',pointer:'',fields:{category:{kind:'static',value:'ycs',transform:{kind:'uppercase'}},topic:{kind:'property',pointer:'/missing',fallback:'Event News',transform:{kind:'lowercase'}},subtopic:{kind:'property',pointer:'/message',transform:{kind:'uppercase'}}},id:{kind:'property',pointer:'/id'},required:['subtopic']};
 const record=[{message:'Mixed Case',id:'keepMixedCase'}];assert.deepEqual(resolveCollection(record,normalizeSelection(json,{})).items,[{category:'YCS',topic:'event news',subtopic:'MIXED CASE',id:'keepMixedCase'}]);assert.equal(record[0].message,'Mixed Case');
 json.fields.subtopic.transform={kind:'trim'};assert.equal(resolveCollection([{message:'  ',id:'empty'}],normalizeSelection(json,{})).invalid,1);
 json.fields.subtopic.transform={kind:'uppercase'};assert.equal(resolveCollection([{message:'ß'.repeat(4000),id:'expanded'}],normalizeSelection(json,{})).invalid,1,'expanded text is checked after transformation');
 json.fields.subtopic.transform={kind:'unsupported'};assert.throws(()=>normalizeSelection(json,{}),/Unsupported transform/);
 json.fields.subtopic.transform={kind:'prefix',value:'x'.repeat(201)};assert.throws(()=>normalizeSelection(json,{}),/prefix/);
 input.id.transform={kind:'uppercase'};assert.throws(()=>normalizeSelection(input,sheetSettings),/only to story text/);
});
