'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),express=require('express');
const register=require('../decktype-assets.cjs');
async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'decktype-assets-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const first=path.join(root,'first'),second=path.join(root,'second');await fs.mkdir(first);await fs.mkdir(second);const app=express();register(app,[path.join(root,'offline'),first,second]);const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});t.after(()=>new Promise(resolve=>server.close(resolve)));return {root,first,second,get:(name,options)=>fetch('http://127.0.0.1:'+server.address().port+'/decktypes/'+name,options)};}
test('decktype PNG route searches folders in order, falls back, revalidates updates and serves encoded names',async t=>{
 const f=await fixture(t);await fs.writeFile(path.join(f.first,'SAME.png'),'first');await fs.writeFile(path.join(f.second,'SAME.png'),'second');await fs.writeFile(path.join(f.second,'@IGNISTER + MALISS.png'),'fallback');
 let response=await f.get('SAME.png');assert.equal(response.status,200);assert.equal(await response.text(),'first');assert.match(response.headers.get('content-type'),/image\/png/);assert.equal(response.headers.get('cache-control'),'no-cache');
 response=await f.get(encodeURIComponent('@IGNISTER + MALISS.png'));assert.equal(await response.text(),'fallback');
 await fs.unlink(path.join(f.first,'SAME.png'));response=await f.get('SAME.png');assert.equal(await response.text(),'second');
 await fs.writeFile(path.join(f.second,'SAME.png'),'newer snapshot');response=await f.get('SAME.png');assert.equal(await response.text(),'newer snapshot');
 response=await f.get('MISSING.png');assert.equal(response.status,404);assert.equal(response.headers.get('cache-control'),'no-store');
});
test('decktype route rejects non-PNGs, paths, hidden files and unsupported methods',async t=>{
 const f=await fixture(t);for(const file of ['secrets.json','../secret.png','folder/secret.png','folder\\secret.png','.hidden.png','C:secret.png','.png']){const r=await f.get(encodeURIComponent(file));assert.equal(r.status,400,file);}
 assert.equal((await f.get('NAME.png',{method:'POST'})).status,404);
 assert.throws(()=>register(express(),['']),/folder paths/);assert.throws(()=>register(express(),'C:/assets'),/folder paths/);
});
test('decktype file symlinks cannot escape a configured image folder',async t=>{
 const f=await fixture(t);const outside=path.join(f.root,'outside.png');await fs.writeFile(outside,'outside');
 try{await fs.symlink(outside,path.join(f.first,'LINK.png'),'file');}catch(error){if(['EPERM','EACCES'].includes(error.code)){t.skip('OS does not permit test symlink creation');return;}throw error;}
 assert.equal((await f.get('LINK.png')).status,404);
});
test('decktype folders inside a dot-folder such as .local/decktypes are served',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'decktype-dot-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const hidden=path.join(root,'.local','decktypes'),second=path.join(root,'.shared','more');await fs.mkdir(hidden,{recursive:true});await fs.mkdir(second,{recursive:true});
 await fs.writeFile(path.join(hidden,'DECK.png'),'hidden-folder');await fs.writeFile(path.join(second,'NEXT.png'),'second-folder');
 const app=express();register(app,[hidden,second]);const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});t.after(()=>new Promise(resolve=>server.close(resolve)));
 const get=name=>fetch('http://127.0.0.1:'+server.address().port+'/decktypes/'+encodeURIComponent(name));
 let response=await get('DECK.png');assert.equal(response.status,200);assert.equal(await response.text(),'hidden-folder');
 response=await get('NEXT.png');assert.equal(response.status,200,'later folders are still searched');assert.equal(await response.text(),'second-folder');
 assert.equal((await get('.DECK.png')).status,400);
});
