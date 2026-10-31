const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {fixture}=require('./playback.test.cjs');
async function profile(f,definition){await fs.writeFile(path.join(f.root,'Stage1/profile.json'),JSON.stringify({templates:[{relpath:'/test/graphic.html',...definition}]}));}
test('slot edits preserve program, preview, content and identity, enforce revisions and apply on next Play',async t=>{
 const f=await fixture(t),p=f.playback;
 await p.command('stage-1','ticker','play');await p.command('stage-1','lower-third','play');
 const before=p.snapshot('stage-1','program'),preview=p.snapshot('stage-1','preview');
 const original=await f.repository.read('stage-1');
 const result=await p.assignSlot('stage-1','ticker','lower-third',0);
 assert.equal(result.editorRevision,1);assert.deepEqual(p.snapshot('stage-1','program'),before);assert.deepEqual(p.snapshot('stage-1','preview'),preview);
 const saved=await f.repository.read('stage-1');assert.deepEqual(saved.templates[0].DataFields,original.templates[0].DataFields);assert.equal(saved.templates[0].itemID,'ticker');
 await assert.rejects(p.assignSlot('stage-1','ticker','ticker',0),e=>e.status===409);
 assert.throws(()=>p.assignSlot('stage-1','ticker','missing',1),e=>e.status===422);
 await p.command('stage-1','ticker','play');
 assert.deepEqual(p.snapshot('stage-1','program').graphics.map(g=>[g.id,g.slot]),[['ticker','lower-third']]);
});
test('template defaults and explicit unassignment work; unassigned graphics share Default while invalid slot IDs remain blocked',async t=>{
 const f=await fixture(t),p=f.playback;
 await profile(f,{ycsSlot:'lower-third',editorSections:[{title:'Names',fields:['f5']}]});
 await p.assignSlot('stage-1','ticker',null,0);
 let editor=await p.editor('stage-1','ticker');assert.equal(editor.slot,'lower-third');assert.equal(editor.slotOverride,null);assert.equal(editor.sections[0].title,'Names');
 await p.command('stage-1','ticker','play');
 await p.assignSlot('stage-1','ticker','',1);
 assert.equal((await p.editor('stage-1','ticker')).slotConfigured,true);
 p.sources={mapping:()=>null,holdReferences:()=>()=>{},retain(){}};
 await p.command('stage-1','ticker','save',[{field:'f5',value:'SAVED'}]);
 for(const action of ['preview','play'])await p.command('stage-1','ticker',action);
 assert.equal(p.snapshot('stage-1','program').graphics.find(g=>g.id==='ticker').slot,'default');
 await p.assignSlot('stage-1','lower-third','',0);await p.command('stage-1','lower-third','play');
 assert.deepEqual(p.snapshot('stage-1','program').graphics.map(g=>g.id),['lower-third']);
 await p.command('stage-1','lower-third','stop');
 await p.command('stage-1','ticker','stop');assert.equal(p.snapshot('stage-1','program').graphics.length,0);
 await p.command('stage-1','ticker','stop');
});
test('Update replaces an occupied destination slot without duplicating either graphic',async t=>{
 const f=await fixture(t),p=f.playback;
 await p.command('stage-1','ticker','play');await p.command('stage-1','lower-third','play');
 await p.assignSlot('stage-1','ticker','lower-third',0);
 await p.command('stage-1','ticker','update');
 assert.deepEqual(p.snapshot('stage-1','program').graphics.map(g=>g.id),['ticker']);
 assert.equal(p.snapshot('stage-2','program').graphics.length,0);
});
