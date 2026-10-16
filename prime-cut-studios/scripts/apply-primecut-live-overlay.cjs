/* Validated, narrow UX patch over the exact Vercel deployment source. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.cwd();
const base='https://raw.githubusercontent.com/sinpelosenelmicrofonopodcast-lang/PRIME-CUT-STUDIO/1cd9cbe79c268f0113139065cde3d0675019a724/prime-cut-studios/';
async function download(relative){const r=await fetch(base+relative,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Patch unavailable '+relative+' HTTP '+r.status);return await r.text()}
function target(p){const x=path.resolve(root,p);if(!x.startsWith(root+path.sep))throw Error('Unsafe file');return x}
function source(p){return fs.readFileSync(target(p),'utf8')}
function write(p,s){fs.mkdirSync(path.dirname(target(p)),{recursive:true});fs.writeFileSync(target(p),s)}
function replace(s,a,b,label){if(!s.includes(a))throw Error('Version mismatch '+label);return s.replace(a,b)}
function regex(s,a,b,label){if(!a.test(s))throw Error('Version mismatch '+label);return s.replace(a,b)}
function verify(p,sha){const a=crypto.createHash('sha1').update(source(p)).digest('hex');if(a!==sha)throw Error('Unexpected original '+p+' '+a)}
async function main(){
 if(!fs.existsSync(target('app/team/projects/[id]/page.tsx')))throw Error('Original Vercel source absent');
 const updates=new Map();
 for(const p of ['components/workspace/ProjectQuickProgress.tsx','components/workspace/project-quick.module.css'])updates.set(p,await download(p));
 for(const [p,sha] of [
 ['app/api/team/timeline/route.ts','c3ca10513b90a4b9d65d4df36a249ce77778a12a'],
 ['app/api/team/tasks/route.ts','45f9809a0615df26ecf5698d269dac3bb40f8a42']
 ]){verify(p,sha);updates.set(p,await download(p))}
 let project=source('app/team/projects/[id]/page.tsx');
 project=replace(project,"import {ProjectWorkspace} from '@/components/workspace/ProjectWorkspace';","import {ProjectWorkspace} from '@/components/workspace/ProjectWorkspace';\nimport {ProjectQuickProgress} from '@/components/workspace/ProjectQuickProgress';",'import');
 project=regex(project,/(\bconst\s+financeRead\s*=\s*[^;]+;)/,"$1\n const canReadTasks=!!await requireCapability('tasks.read',id),canWriteTasks=canEdit&&!!await requireCapability('tasks.write',id);",'access');
 project=regex(project,/\{id:'overview',label:'[^']*',description:'[^']*'\}/,"{id:'overview',label:'Avance rápido',description:'Tareas, progreso y fechas.'},{id:'details',label:'Vista avanzada',description:'Cronología, mensajes e historial.'}",'tabs');
 project=regex(project,/\{current\.id==='overview'&&<ProjectWorkspace\b[^>]*\/>\}/,"{current.id==='overview'&&<ProjectQuickProgress projectId={id} canEdit={canEdit} canReadTasks={canReadTasks} canWriteTasks={canWriteTasks}/>}\n{current.id==='details'&&<ProjectWorkspace projectId={id} staff canEdit={canEdit}/>}",'overview');
 updates.set('app/team/projects/[id]/page.tsx',project);
 let team=source('app/team/page.tsx');
 if(team.includes('<nav className="operations-nav">')){
  team=replace(team,'<nav className="operations-nav">','<details style={{margin:"16px 0"}}><summary style={{cursor:"pointer",color:"#d6b46d",fontWeight:700}}>Herramientas adicionales</summary><nav className="operations-nav">','team nav');
  const ix=team.indexOf('</nav>',team.indexOf('Herramientas adicionales'));if(ix<0)throw Error('Missing nav end');
  team=team.slice(0,ix)+'</nav></details>'+team.slice(ix+6);
  updates.set('app/team/page.tsx',team);
 }
 let client=source('components/workspace/ClientProjectDashboard.tsx');
 const updated=await download('components/workspace/ClientProjectDashboard.tsx');
 const opening='<nav className={styles.nav} aria-label="Tu proyecto">';
 const start=client.indexOf(opening),end=client.indexOf('</nav>',start);
 const nextStart=updated.indexOf(opening),nextEnd=updated.indexOf('</nav>',nextStart);
 if(start<0||end<0||end-start>2800||nextStart<0||nextEnd<0)throw Error('Client nav mismatch');
 client=client.slice(0,start)+updated.slice(nextStart,nextEnd+6)+client.slice(end+6);
 updates.set('components/workspace/ClientProjectDashboard.tsx',client);
 for(const [p,s] of updates)write(p,s);
 console.log('PRIMECUTS_SAFE_PATCH_OK '+updates.size+' files, original modules preserved');
}
main().catch(e=>{console.error('PRIMECUTS_PATCH_ABORT '+e.message);process.exitCode=1});
