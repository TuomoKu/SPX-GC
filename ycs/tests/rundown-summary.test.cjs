const {test}=require('node:test');
const assert=require('node:assert/strict');
const summary=require('../public/rundown-summary.js');
test('summary skips hidden identity, booleans, settings and collections, and resolves current values',()=>{
 const fields=[{ftype:'hidden',value:'broadcast-1'},{ftype:'checkbox',value:'0'},{ftype:'textfield',value:'5 rounds'},{ftype:'textfield',value:'IN PROGRESS'},{ftype:'textfield',value:'ROUND 11'},{ftype:'textarea',value:'[]'}];
 assert.equal(summary.text(fields),'5 rounds | IN PROGRESS | ROUND 11');
 assert.equal(summary.text(fields,f=>f.value==='5 rounds'?'13 rounds':f.value),'13 rounds | IN PROGRESS | ROUND 11');
});
test('description follows current project definition without stale copied descriptions',()=>{
 const definitions=[{relpath:'/ticker.html',description:'YCS Ticker'}];
 assert.equal(summary.description('/ticker.html',definitions),'YCS Ticker');
 definitions[0].description='Orlando Ticker';
 assert.equal(summary.description('/ticker.html',definitions),'Orlando Ticker');
 assert.equal(summary.description('/missing.html',definitions),'');
 definitions[0].description='';
 assert.equal(summary.description('/ticker.html',definitions),'');
});
