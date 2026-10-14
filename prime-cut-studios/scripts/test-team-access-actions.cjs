/** Synthetic no-network route tests for collaborator and talent save actions. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),vm=require('node:vm'),{randomUUID}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const project=randomUUID(),talent=randomUUID(),account=randomUUID();
let session=null,hasCapability=false,calls=[],lastMail=null;
const mocks={
 'next/server':{NextResponse:{json:(data,options)=>Response.json(data,options),redirect:(url,status)=>new Response(null,{status,headers:{location:String(url)}})}},
 'next/headers':{cookies:async()=>({set:(...args)=>calls.push(['cookie',...args])})},
 '@/lib/email':{enqueueEmail:async(...args)=>{lastMail=args;calls.push(['mail',...args])}},
 '@/lib/db':{getProject:async id=>id===project?{id,client_email:'primary@example.test'}:null,normalizedEmail:x=>x.trim().toLowerCase(),hashToken:x=>'b'.repeat(64)},
 '@/lib/operations-db':{requireCapability:async()=>hasCapability?session:null,operationsSession:async()=>session,audit:async(...args)=>calls.push(['audit',...args])},
 '@/lib/workspace-db':{inviteCollaborator:async(...args)=>{calls.push(['invite',...args]);return 'private-token'},projectMembers:async()=>[],revokeCollaborator:async(...args)=>calls.push(['revoke-member',...args]),revokeProjectInvite:async(...args)=>calls.push(['revoke-invite',...args]),selectTalent:async(...args)=>{calls.push(['assign',...args]);return true},revokeSelection:async(...args)=>{calls.push(['revoke-talent',...args]);return true}},
};
const cache=new Map();function load(file){if(cache.has(file))return cache.get(file);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};cache.set(file,module.exports);const req=name=>mocks[name]||(name.startsWith('@/')?load(path.join(root,name.slice(2)+'.ts')):require(name));const fn=vm.runInNewContext('(function(require,module,exports,process,Response,Request,URL,URLSearchParams,TextDecoder,Uint8Array,Buffer){'+code+'\n})',{});fn(req,module,module.exports,process,Response,Request,URL,URLSearchParams,TextDecoder,Uint8Array,Buffer);cache.set(file,module.exports);return module.exports;}
const invite=load(path.join(root,'app/api/team/members/route.ts')).POST,assign=load(path.join(root,'app/api/team/talent/route.ts')).POST;
function request(path,fields,json=true){return new Request('https://www.primecutstudiostx.com'+path,{method:'POST',headers:{origin:'https://www.primecutstudiostx.com','host':'www.primecutstudiostx.com','sec-fetch-site':'same-origin','content-type':'application/x-www-form-urlencoded',accept:json?'application/json':'text/html'},body:new URLSearchParams(fields)});}
async function check(name,body){calls=[];lastMail=null;await body();console.log('PASS:',name)}
(async()=>{
 process.env.PRIMECUTS_WORKSPACE_V1='true';
 await check('anonymous collaborator invite denied',async()=>{const res=await invite(request('/api/team/members',{projectId:project,action:'invite',email:'guest@example.test',role:'viewer'}));assert.equal(res.status,403);assert.equal(calls.length,0)});
 hasCapability=true;session={role:'owner',accountId:account};
 await check('viewer invitation has JSON success, scoped project, and queues email',async()=>{const res=await invite(request('/api/team/members',{projectId:project,action:'invite',email:'GUEST@EXAMPLE.TEST',role:'viewer'}));assert.equal(res.status,200);const j=await res.json();assert.deepEqual(j,{ok:true,redirect:'/team/projects/'+project+'?tab=settings&saved=1'});assert.deepEqual(calls.find(c=>c[0]==='invite').slice(1),[project,'guest@example.test','viewer']);assert.equal(lastMail[1],'guest@example.test')});
 await check('native submissions still redirect',async()=>{const res=await invite(request('/api/team/members',{projectId:project,action:'invite',email:'guest@example.test',role:'reviewer'},false));assert.equal(res.status,303);assert.match(res.headers.get('location'),/tab=settings&saved=1/)});
 await check('cannot invite primary client as a collaborator',async()=>{const res=await invite(request('/api/team/members',{projectId:project,action:'invite',email:'primary@example.test',role:'viewer'}));assert.equal(res.status,400);assert.equal(calls.length,0)});
 await check('share talent responds JSON after persistence and audit',async()=>{const res=await assign(request('/api/team/talent',{projectId:project,talentId:talent,action:'share',expires:'2026-11-13'}));assert.equal(res.status,200);assert.deepEqual(await res.json(),{ok:true,redirect:'/team/talent?saved=1'});assert.equal(calls.find(c=>c[0]==='assign')[2],talent);assert.ok(calls.some(c=>c[0]==='audit'))});
 await check('revoke talent responds JSON and preserves audit',async()=>{const res=await assign(request('/api/team/talent',{projectId:project,talentId:talent,action:'revoke'}));assert.equal(res.status,200);assert.ok(calls.find(c=>c[0]==='revoke-talent'))});
 session={role:'editor',accountId:account};await check('editor cannot share consented talent outside admin role',async()=>{const res=await assign(request('/api/team/talent',{projectId:project,talentId:talent,action:'share',expires:'2026-11-13'}));assert.equal(res.status,403);assert.equal(calls.length,0)});
 console.log('7 access, form and response tests passed; no production writes.');
})().catch(err=>{console.error(err);process.exitCode=1})
