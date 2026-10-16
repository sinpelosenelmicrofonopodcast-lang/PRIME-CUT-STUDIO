import Link from 'next/link';
import {ProjectFinance} from '@/components/workspace/ProjectFinance';
import {projectTalent} from '@/lib/workspace-db';
import {TalentCards} from '@/components/workspace/TalentCards';
import {clientProjectData} from '@/lib/client-project-data';
import {ClientProjectDashboard} from '@/components/workspace/ClientProjectDashboard';
import {redirect,notFound} from 'next/navigation';
import {ProjectDetails} from '@/components/workspace/ProjectDetails';
import {ProjectClient} from '@/components/workspace/ProjectClient';
import {ProductionBook} from '@/components/workspace/ProductionBook';
import {ProjectMembers} from '@/components/workspace/ProjectMembers';
import {ProjectWorkspace} from '@/components/workspace/ProjectWorkspace';
import {ProjectQuickProgress} from '@/components/workspace/ProjectQuickProgress';
import {projectBookEnabled} from '@/lib/project-book-policy';
import {requireCapability} from '@/lib/operations-db';
import {getProject} from '@/lib/db';
import {workspaceEnabled,uuid} from '@/lib/workspace-policy';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const metadata={title:'Project operations | Prime Cut Studios',robots:{index:false,follow:false}};
export default async function Project({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{saved?:string;tab?:string;section?:string}>}){
 if(!workspaceEnabled())notFound();
 const {id}=await params;
 if(!uuid(id))notFound();
 if(!await requireCapability('projects.read',id))redirect('/client/login');
 const p=await getProject(id);
 if(!p)notFound();
 const editor=await requireCapability('projects.write',id);const canEdit=Boolean(editor);
 const {saved,tab,section}=await searchParams;
 if(tab==='client'){const data=await clientProjectData(p);return <><div className="shell" style={{paddingTop:16,paddingBottom:16}}><Link className="inline-link" href={'/team/projects/'+id}>← Volver a gestión del proyecto</Link></div><ClientProjectDashboard data={data} section={section} preview/></>;}
 const talents=await projectTalent(id);
 const bookEnabled=projectBookEnabled();
 const financeRead=bookEnabled&&!!await requireCapability('finance.read',id);
 const canReadTasks=!!await requireCapability('tasks.read',id),canWriteTasks=canEdit&&!!await requireCapability('tasks.write',id);
 const tabs=[{id:'overview',label:'Avance rápido',description:'Marca tareas, cambia fechas y confirma avances en un solo lugar.'},{id:'details',label:'Vista avanzada',description:'Cronología completa, historial, conversación y todos los detalles.'},...(bookEnabled?[{id:'production',label:'Ficha de producción',description:'Locaciones, elenco, libreto, referencias y documentos.'}]:[]),...(financeRead?[{id:'finance',label:'Contrato y pagos',description:'Acuerdo, factura, depósito y confirmación de reserva.'}]:[]),...(canEdit?[{id:'settings',label:'Datos y accesos',description:'Información general, cliente y colaboradores del proyecto.'}]:[])];
 const current=tabs.find(t=>t.id===tab)||tabs[0];
 return <main className="shell project-dashboard">
  <Link href="/team" className="inline-link">← Team workspace</Link>
  <header className="project-dashboard-header"><div><div className="eyebrow">Producción · {p.client_name}</div><h1>{p.title}</h1><p className="muted">Gestiona la producción y mantén al cliente al día.</p></div><div className="workspace-actions"><Link className="btn secondary btn-small" href={'/team/projects/'+id+'?tab=client'}>Ver como cliente</Link><span className="pill">{p.status.replaceAll('-',' ')}</span></div></header>
  <dl className="project-facts"><div><dt>Cliente</dt><dd>{p.client_name}</dd></div><div><dt>Rodaje / sesión</dt><dd>{p.event_date||'Por confirmar'}</dd></div><div><dt>Locación principal</dt><dd>{p.location||'Por definir'}</dd></div></dl>
  {saved&&<p role="status" className="note">Cambios guardados en el proyecto.</p>}
  <nav className="project-navigation" aria-label="Secciones del proyecto">{tabs.map(t=><Link key={t.id} href={'/team/projects/'+id+'?tab='+t.id} aria-current={current.id===t.id?'page':undefined} scroll={false}>{t.label}</Link>)}</nav>
  <div className="project-section-heading"><h2>{current.label}</h2><p className="muted">{current.description}</p></div>
  {current.id==='overview'&&<ProjectQuickProgress projectId={id} canEdit={canEdit} canReadTasks={canReadTasks} canWriteTasks={canWriteTasks}/>}
  {current.id==='details'&&<ProjectWorkspace projectId={id} staff canEdit={canEdit}/>}
  {current.id==='production'&&<><section className="panel"><h2>Elenco asignado al proyecto</h2><p className="muted">Estos perfiles autorizados también aparecen en la sección Elenco del cliente.</p><TalentCards project={id} talents={talents.map(({photo_paths,...t})=>({...t,photo_count:photo_paths.length}))}/>{!talents.length&&<p>Todavía no hay talentos asignados.</p>}<Link href="/team/talent" className="btn secondary btn-small">Asignar talentos del banco →</Link></section><ProductionBook projectId={id} staff canEdit={canEdit}/></>}
  {current.id==='finance'&&financeRead&&<ProjectFinance projectId={id} eventDate={p.event_date}/>}
  {current.id==='settings'&&canEdit&&<div className="project-settings">{bookEnabled&&<ProjectDetails project={p}/>}<div className="project-access-grid">{bookEnabled&&<ProjectClient id={id} name={p.client_name} email={p.client_email} canReassign={!!editor&&['owner','administrator'].includes(editor.role)}/>}<ProjectMembers id={id} primaryEmail={p.client_email}/></div></div>}
 </main>;
}
