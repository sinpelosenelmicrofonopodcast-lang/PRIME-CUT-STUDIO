// Isolated route tests: synthetic account sessions and persistence spies, no real credentials.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),vm=require('node:vm'),{randomUUID}=require('node:crypto');
const root=path.resolve(__dirname,'..');const project=randomUUID(),stage=randomUUID(),talent=randomUUID();
let actor=null,member=false,staff=null,writes=[];
const mocks={
 '@/lib/email':{scheduleMail:()=>{},enqueueEmail:async()=>{}},
 '@/lib/communications-db':{commEnabled:()=>false,allowAction:async()=>true},
 'next/server':{NextResponse:{redirect:(url,status)=>new Response(null,{status,headers:{location:String(url)}})}},
 '@/lib/client-auth':{clientAuthenticated:async()=>actor},
 '@/lib/db':{clientCanAccess:async()=>member,getProject:async id=>id===project?{id}:null},
 '@/lib/operations-db':{requireCapability:async()=>staff,operationsSession:async()=>staff,audit:async()=>{}},
 '@/lib/workspace-db':{
 clientCanReview:async()=>member,
 clientProjectAction:async(...args)=>{writes.push(args);return true},
 saveClientProfile:async(...args)=>writes.push(args),privacyRequest:async(...args)=>writes.push(args),
 stageById:async()=>({project_id:project}),updateStage:async(...args)=>{writes.push(args);return true},
 initializeStages:async(...args)=>writes.push(args),staffMessage:async(...args)=>writes.push(args),
 selectTalent:async(...args)=>{writes.push(args);return true},revokeSelection:async(...args)=>writes.push(args),updatePrivacyRequest:async()=>{},
 updateTalent:async(...args)=>{writes.push(args);return true}
 },
 'next/headers':{cookies:async()=>({get:()=>undefined})}
};
const cache=new Map();function load(file){if(cache.has(file))return cache.get(file);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};cache.set(file,module.exports);const req=name=>mocks[name]||(name.startsWith('@/')?load(path.join(root,name.slice(2)+'.ts')):require(name));vm.runInNewContext('(function(require,module,exports,process,Response,Request,URL,URLSearchParams,TextDecoder,Uint8Array,Buffer){'+code+'\n})',{ })(req,module,module.exports,process,Response,Request,URL,URLSearchParams,TextDecoder,Uint8Array,Buffer);cache.set(file,module.exports);return module.exports;}
const action=load(path.join(root,'app/api/client/project-action/route.ts')).POST,profile=load(path.join(root,'app/api/client/profile/route.ts')).POST,selection=load(path.join(root,'app/api/team/talent/route.ts')).POST,timeline=load(path.join(root,'app/api/team/timeline/route.ts')).POST;
const request=(values,headers={})=>new Request('https://prime-cut-studios.vercel.app/api/test',{method:'POST',headers:{origin:'https://prime-cut-studios.vercel.app','sec-fetch-site':'same-origin','content-type':'application/x-www-form-urlencoded',...headers},body:new URLSearchParams(values)});
const data={projectId:project,eventId:randomUUID(),kind:'message',body:'Test message'};
(async()=>{let n=0;async function test(name,fn){writes=[];await fn();console.log('PASS: '+name);n++;}
 process.env.PRIMECUTS_WORKSPACE_V1='false';await test('disabled workspace refuses writes before sessions or persistence',async()=>{assert.equal((await action(request(data))).status,503);assert.equal(writes.length,0)});
 process.env.PRIMECUTS_WORKSPACE_V1='true';await test('cross-origin browser request refused',async()=>{assert.equal((await action(request(data,{origin:'https://evil.example','sec-fetch-site':'cross-site'}))).status,403);assert.equal(writes.length,0)});
 await test('anonymous project action denied',async()=>{assert.equal((await action(request(data))).status,401);assert.equal(writes.length,0)});
 actor={id:randomUUID()};await test('signed-in foreign client cannot address another project',async()=>{assert.equal((await action(request(data))).status,404);assert.equal(writes.length,0)});
 member=true;await test('authorized action takes account identity from verified session, never form',async()=>{const response=await action(request({...data,accountId:randomUUID()}));assert.equal(response.status,303);assert.equal(writes[0][2],actor.id)});
 await test('real byte limit applies without Content-Length header',async()=>{assert.equal((await action(request({...data,body:'x'.repeat(26000)}))).status,413);assert.equal(writes.length,0)});
 await test('invalid project and approval revision rejected',async()=>{assert.equal((await action(request({...data,projectId:'anything'}))).status,400);assert.equal((await action(request({...data,kind:'approval',stageId:stage,revision:'NaN'}))).status,400);assert.equal(writes.length,0)});
 await test('profile edits cannot switch account through submitted ID',async()=>{assert.equal((await profile(request({accountId:randomUUID(),name:'Test Client',language:'en',contactMethod:'email'}))).status,303);assert.equal(writes[0][0],actor.id)});
 staff={role:'editor',accountId:randomUUID()};await test('internal editor cannot export or share the global talent bank',async()=>{assert.equal((await selection(request({projectId:project,talentId:talent,action:'share',expires:'2026-11-01'}))).status,403);assert.equal(writes.length,0)});
 staff=null;await test('timeline mutation denied to unauthorized staff',async()=>{assert.equal((await timeline(request({projectId:project,action:'initialize'}))).status,403);assert.equal(writes.length,0)});
 console.log(n+' route authorization/body checks passed; no external writes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
