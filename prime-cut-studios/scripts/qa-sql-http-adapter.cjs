/** Isolated PostgREST-compatible subset over actual PostgreSQL (PGlite).
 * Fixture data only. No production connections, no SMTP provider, no Auth stub.
 */
const {PGlite}=require('@electric-sql/pglite'),http=require('node:http'),fs=require('node:fs'),crypto=require('node:crypto');
const identifier=x=>{if(!/^[a-z_][a-z_0-9]*$/i.test(x))throw Error('Invalid identifier');return '"'+x+'"'};
async function createBackend(secret){
 const db=new PGlite();
 await db.exec('CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);');
 for(const file of ['supabase/migrations/20261013030000_primecuts_persistent_storage.sql','supabase/migrations/20261013190000_client_review_portal.sql','supabase/planned/20261013_operations_casting_rentals_NOT_APPLIED.sql','supabase/planned/20261014_client_timeline_talent_NOT_APPLIED.sql','supabase/planned/20261014_project_production_book_NOT_APPLIED.sql','supabase/migrations/20261014030000_auth_communications.sql','supabase/planned/20261013_lightroom_photo_galleries_NOT_APPLIED.sql','supabase/migrations/20261014134206_casting_private_photos.sql','supabase/migrations/20261014134614_project_client_email_reassignment.sql','supabase/migrations/20261014140000_recovered_talent_selection.sql','supabase/migrations/20261014140500_recovered_collaborator_invitation.sql'])await db.exec(fs.readFileSync(file,'utf8'));
 await db.exec("CREATE SCHEMA IF NOT EXISTS private; CREATE FUNCTION private.is_staff() RETURNS boolean LANGUAGE sql AS 'select false'; CREATE TABLE catalog_items(id uuid PRIMARY KEY,kind text,name text,description text,active boolean DEFAULT true,base_price_cents integer,metadata jsonb DEFAULT '{}'); ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY; CREATE POLICY \"catalog public read\" ON catalog_items FOR SELECT TO anon, authenticated USING (active = true OR private.is_staff());");
 await db.exec(fs.readFileSync('supabase/migrations/20261014234000_pricing_inquiry_snapshots.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/migrations/20261014235100_atomic_production_pricing.sql','utf8'));
 const files=new Map(),errors=[];
 const server=http.createServer(async(req,res)=>{try{
  const u=new URL(req.url,'http://localhost');let raw=Buffer.alloc(0);for await(const part of req){raw=Buffer.concat([raw,part]);if(raw.length>5*1024*1024)throw Error('Too large');}
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(data===undefined?'':JSON.stringify(data));};
  if(req.headers.apikey!==secret){send(403,{error:'Local QA service key required'});return;}
  if(u.pathname.startsWith('/storage/v1/object/')){
   const key=decodeURIComponent(u.pathname.slice('/storage/v1/object/'.length));
   if(req.method==='POST'){if(files.has(key)){send(409,{error:'exists'});return;}files.set(key,{bytes:raw,mime:req.headers['content-type']});send(200,{Key:key});return;}
   if(req.method==='DELETE'){if(raw.length){for(const prefix of JSON.parse(raw.toString()).prefixes||[])files.delete(key+'/'+prefix);}else files.delete(key);send(200,{});return;}
   if(req.method==='GET'){const object=files.get(key.replace(/^(authenticated|public)\//,''));if(!object){send(404,{});return;}res.writeHead(200,{'Content-Type':object.mime});res.end(object.bytes);return;}
  }
  if(!u.pathname.startsWith('/rest/v1/')){send(404,{error:'Unsupported provider operation: never simulated as successful'});return;}
  const target=u.pathname.slice('/rest/v1/'.length),body=raw.length?JSON.parse(raw.toString()):null;
  if(target.startsWith('rpc/')){
   const fn=target.slice(4),args=Object.entries(body||{}),values=args.map(([,v])=>v&&typeof v==='object'?JSON.stringify(v):v);
   const info=(await db.query('select proretset,prorettype::regtype::text as result_type from pg_proc where proname=$1',[fn])).rows[0];if(!info)throw Error('Unknown RPC '+fn);
   const call=identifier(fn)+'('+args.map(([name],i)=>identifier(name)+' => $'+(i+1)).join(',')+')';
   const scalar=!info.proretset&&['uuid','boolean','text','integer','bigint','void','jsonb'].includes(info.result_type);
   const result=await db.query(scalar?'select '+call+' as result':'select * from '+call,values);send(200,scalar?result.rows[0]?.result:result.rows);return;
  }
  const table=identifier(target),values=[],where=[];
  for(const [key,value] of u.searchParams){if(['select','order','limit','offset','on_conflict'].includes(key))continue;
   const field=identifier(key),split=value.indexOf('.'),op=value.slice(0,split),val=value.slice(split+1);
   if(op==='is'){if(!['null','true','false'].includes(val))throw Error('Bad is filter');where.push(field+' IS '+val.toUpperCase());}
   else if(op==='in'){const items=val.slice(1,-1).split(',');where.push(field+' IN ('+items.map(v=>{values.push(v);return '$'+values.length}).join(',')+')');}
   else{const ops={eq:'=',neq:'<>',gt:'>',gte:'>=',lt:'<',lte:'<='};if(!ops[op])throw Error('Unsupported filter '+op);values.push(val);where.push(field+' '+ops[op]+' $'+values.length);}
  }
  const clause=where.length?' WHERE '+where.join(' AND '):'',select=u.searchParams.get('select')||'*',projection=select==='*'?'*':select.split(',').map(identifier).join(',');let result;
  if(req.method==='GET'){
   let suffix='';const order=u.searchParams.get('order');if(order)suffix+=' ORDER BY '+order.split(',').map(x=>{const [f,d]=x.split('.');return identifier(f)+(d==='desc'?' DESC':' ASC')}).join(',');
   if(u.searchParams.has('limit'))suffix+=' LIMIT '+Math.min(1000,Math.max(0,Number(u.searchParams.get('limit'))));
   result=await db.query('SELECT '+projection+' FROM '+table+clause+suffix,values);send(200,result.rows);return;
  }
  if(req.method==='POST'){
   const list=Array.isArray(body)?body:[body];if(!list.length){send(200,[]);return;}
   const keys=Object.keys(list[0]),params=[];const tuples=list.map(row=>'('+keys.map(k=>{const v=row[k];params.push(v&&typeof v==='object'?JSON.stringify(v):v);return '$'+params.length}).join(',')+')');
   let conflict='';if(u.searchParams.has('on_conflict')){const conflictKeys=u.searchParams.get('on_conflict').split(',');conflict=' ON CONFLICT ('+conflictKeys.map(identifier).join(',')+') '+(String(req.headers.prefer).includes('ignore-duplicates')?'DO NOTHING':'DO UPDATE SET '+keys.filter(k=>!conflictKeys.includes(k)).map(k=>identifier(k)+'=excluded.'+identifier(k)).join(','));}
   result=await db.query('INSERT INTO '+table+' ('+keys.map(identifier).join(',')+') VALUES '+tuples.join(',')+conflict+' RETURNING '+projection,params);
  }else if(req.method==='PATCH'){
   const set=Object.entries(body).map(([k,v])=>{values.push(v&&typeof v==='object'?JSON.stringify(v):v);return identifier(k)+'=$'+values.length});result=await db.query('UPDATE '+table+' SET '+set.join(',')+clause+' RETURNING '+projection,values);
  }else if(req.method==='DELETE'){result=await db.query('DELETE FROM '+table+clause+' RETURNING '+projection,values);}
  else{send(405,{});return;}
  if(String(req.headers.prefer).includes('return=minimal'))send(204);else send(200,result.rows);
 }catch(e){const status=e.code==='23505'?409:500;if(status===500)errors.push(e.message);res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return {db,files,errors,url:'http://127.0.0.1:'+server.address().port,close:async()=>{await new Promise(r=>server.close(r));await db.close();}};
}
module.exports={createBackend};
