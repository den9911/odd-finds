import test from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';
import {decodeImage} from '../server/validation.mjs';import {decodePixels} from '../server/image-decoder.mjs';
import {createApp} from '../server/index.mjs';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
const broken='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6jJ8AAAAASUVORK5CYII=';
const png=()=>sharp({create:{width:2,height:2,channels:4,background:'#cc2244'}}).png().toBuffer();
test('old signature check accepts a broken PNG; real decoder rejects it',async()=>{assert.ok(decodeImage(broken).image);await assert.rejects(decodePixels(broken),e=>e.status===400);});
test('PNG JPEG and WebP must complete decoding; truncation and excess dimensions fail',async()=>{
 for(const [format,mime] of [['png','png'],['jpeg','jpeg'],['webp','webp']]){
  const b=await sharp(await png())[format]().toBuffer();assert.ok((await decodePixels(`data:image/${mime};base64,${b.toString('base64')}`)).image);
  await assert.rejects(decodePixels(`data:image/${mime};base64,${b.subarray(0,Math.floor(b.length/2)).toString('base64')}`));
 }
 const huge=await sharp({create:{width:2049,height:1,channels:3,background:'red'}}).png().toBuffer();await assert.rejects(decodePixels('data:image/png;base64,'+huge.toString('base64')));
});
test('excess concurrent decoder calls reject without queueing; a later request succeeds',async()=>{const input='data:image/png;base64,'+(await png()).toString('base64');const out=await Promise.allSettled(Array.from({length:10},()=>decodePixels(input)));assert.ok(out.some(x=>x.status==='rejected'&&x.reason.status===503));assert.ok((await decodePixels(input)).image);});
test('invalid uploads never write posts; concurrent replay writes one pending image and keeps it private',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'pixel-decode-')),app=await createApp({dataDir:dir,appId:'finds',adminToken:'fixture-only',disableRateLimit:true});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>app.server.close(r));await rm(dir,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${app.server.address().port}`,config=await fetch(base+'/api/config'),cookie=config.headers.get('set-cookie').split(';')[0];await config.arrayBuffer();
 const submit=async input=>{const r=await fetch(base+'/api/posts',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(input)});return {status:r.status,body:await r.json()};};
 const input={kind:'finds',title:'Actual pixels',category:'Вывески',image:broken,requestId:'fixture-request-1234'};
 assert.equal((await submit(input)).status,400);assert.equal(app.db.prepare("SELECT COUNT(*) n FROM posts WHERE kind='finds'").get().n,0);
 input.image='data:image/png;base64,'+(await png()).toString('base64');const both=await Promise.all([submit(input),submit(input)]);assert.deepEqual(both.map(x=>x.status).sort(),[200,201]);assert.equal(both[0].body.id,both[1].body.id);
 assert.equal((await submit({...input,title:'changed'})).status,409);assert.equal(app.db.prepare("SELECT COUNT(*) n FROM posts WHERE kind='finds'").get().n,1);
 assert.equal((await fetch(base+'/media/'+both[0].body.id)).status,401);
 app.db.prepare('DELETE FROM posts WHERE id=?').run(both[0].body.id);assert.equal((await submit(input)).status,410);
});
