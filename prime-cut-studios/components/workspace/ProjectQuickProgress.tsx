import Link from 'next/link';
import {projectStages} from '@/lib/workspace-db';
import {getTasks} from '@/lib/operations-db';
import {progress,stageLabels} from '@/lib/workspace-policy';
import {WorkspaceForm} from './WorkspaceForm';
import styles from './project-quick.module.css';

const sensitive=/(?:contract|reservation|deposit|approval|client review|final delivery|contrato|firma|dep[oó]sito|factura|entrega final|aprobaci[oó]n)/i;
export async function ProjectQuickProgress({projectId,canEdit,canReadTasks,canWriteTasks}:{
 projectId:string;canEdit:boolean;canReadTasks:boolean;canWriteTasks:boolean;
}){
 const [stages,tasks]=await Promise.all([projectStages(projectId),canReadTasks?getTasks([projectId],false):Promise.resolve([])]);
 const included=stages.filter(s=>s.status!=='not_applicable');
 const completed=included.filter(s=>s.status==='completed').length;
 const pct=progress(stages);
 const next=included.find(s=>s.status==='waiting_client'||s.status==='blocked')||included.find(s=>s.status==='in_progress')||included.find(s=>s.status==='pending');
 const pendingTasks=tasks.filter(t=>t.status!=='done');
 const countDate=stages.filter(s=>s.planned_start&&!s.dates_confirmed).length;
 return <div className={styles.root}>
  <section className={styles.hero} aria-label="Resumen del proyecto">
   <div><span className={styles.kicker}>CENTRO DE PRODUCCIÓN</span><h2>{next?'Próximo: '+next.title:'Etapas al día'}</h2><p>{next?.next_step||next?.description||'No hay acciones urgentes registradas.'}</p></div>
   <div className={styles.percent}><strong>{stages.length?pct+'%':'—'}</strong><span>{stages.length?completed+' de '+included.length+' etapas completadas':'Aún sin cronología'}</span></div>
   {stages.length>0&&<progress className={styles.bar} max={100} value={pct} aria-label={'Progreso del proyecto '+pct+'%'}/>}
  </section>
  <div className={styles.metrics}><div><strong>{pendingTasks.length}</strong><span>Tareas pendientes</span></div><div><strong>{countDate}</strong><span>Fechas sin confirmar</span></div><div><strong>{stages.filter(s=>s.status==='waiting_client').length}</strong><span>Esperando al cliente</span></div></div>
  <section className={styles.panel} id="avance">
   <div className={styles.heading}><div><h2>Avance de producción</h2><p>Marca lo terminado sin entrar a múltiples formularios.</p></div><Link href={'/team/projects/'+projectId+'?tab=details'} className={styles.secondary}>Opciones avanzadas →</Link></div>
   {!stages.length&&<p>Este proyecto todavía no tiene etapas. Ábrelas en las opciones avanzadas.</p>}
   <div className={styles.stageList}>{stages.map(s=>{
    const done=s.status==='completed';
    const canToggle=canEdit&&!sensitive.test(s.title)&&(done||s.status==='pending'||s.status==='in_progress');
    return <article className={styles.stage} key={s.id}>
     <div className={styles.stageHead}>
      {canToggle?<WorkspaceForm action="/api/team/timeline" method="post" className={styles.quickForm}>
       <input type="hidden" name="action" value="quick"/>
       <input type="hidden" name="projectId" value={projectId}/>
       <input type="hidden" name="stageId" value={s.id}/>
       <input type="hidden" name="revision" value={s.revision}/>
       <input type="hidden" name="status" value={done?'pending':'completed'}/>
       <button className={done?styles.checked:styles.check} title={done?'Reabrir etapa':'Marcar como completada'} aria-label={done?'Reabrir '+s.title:'Completar '+s.title}>{done?'✓':'○'}</button>
      </WorkspaceForm>:<span className={done?styles.checked:styles.readonly} aria-label={done?'Completado':'No completado'}>{done?'✓':'○'}</span>}
      <div className={styles.stageBody}><strong>{s.title}</strong><span>{stageLabels[s.status]}{s.responsible?' · '+s.responsible:''}</span></div>
      <div className={styles.stageDate}><b>{s.planned_start||'Sin fecha'}</b><span>{s.dates_confirmed?'Confirmada':'Tentativa'}</span></div>
     </div>
     {s.next_step&&s.status!=='completed'&&<p className={styles.next}>Próximo paso: {s.next_step}</p>}
     {canEdit&&<details className={styles.edit}><summary>Editar fechas y detalles</summary>
      <WorkspaceForm action="/api/team/timeline" method="post" className={styles.dateForm}>
       <input type="hidden" name="action" value="update"/><input type="hidden" name="projectId" value={projectId}/><input type="hidden" name="stageId" value={s.id}/><input type="hidden" name="revision" value={s.revision}/>
       <input type="hidden" name="title" value={s.title}/><input type="hidden" name="description" value={s.description}/><input type="hidden" name="status" value={s.status}/>
       <input type="hidden" name="responsible" value={s.responsible}/><input type="hidden" name="nextStep" value={s.next_step}/><input type="hidden" name="reason" value="Fecha editada desde el centro de producción"/>
       {s.dates_confirmed&&<input type="hidden" name="confirmed" value="yes"/>}
       <label>Desde <input type="date" name="plannedStart" defaultValue={s.planned_start||''}/></label>
       <label>Hasta <input type="date" name="plannedEnd" defaultValue={s.planned_end||''}/></label>
       <button className={styles.primary} type="submit">Guardar fecha</button>
      </WorkspaceForm>
      {!s.dates_confirmed&&(s.planned_start||s.planned_end)&&<WorkspaceForm action="/api/team/timeline" method="post" className={styles.confirmForm}>
       <input type="hidden" name="action" value="confirm_dates"/><input type="hidden" name="projectId" value={projectId}/><input type="hidden" name="stageId" value={s.id}/><input type="hidden" name="revision" value={s.revision}/>
       <label><input type="checkbox" name="verified" value="yes" required/> Verifiqué estas fechas con las partes correspondientes. Esto no confirma una reserva sin contrato y depósito.</label>
       <button className={styles.secondary} type="submit">Confirmar fechas</button>
      </WorkspaceForm>}
     </details>}
    </article>;
   })}</div>
  </section>
  {canReadTasks&&<section className={styles.panel} id="tareas">
   <div className={styles.heading}><div><h2>Tareas del proyecto</h2><p>Acciones operativas, separadas del progreso por etapas.</p></div><span>{pendingTasks.length} pendientes</span></div>
   {tasks.map(t=><div key={t.id} className={styles.task}>
    {canWriteTasks?<WorkspaceForm action="/api/team/tasks" method="post" className={styles.quickForm}>
     <input type="hidden" name="action" value="status"/><input type="hidden" name="returnToProject" value="yes"/><input type="hidden" name="id" value={t.id}/>
     <input type="hidden" name="status" value={t.status==='done'?'todo':'done'}/>
     <button className={t.status==='done'?styles.checked:styles.check} aria-label={(t.status==='done'?'Reabrir ':'Completar ')+t.title}>{t.status==='done'?'✓':'○'}</button>
    </WorkspaceForm>:<span>{t.status==='done'?'✓':'○'}</span>}
    <div><strong>{t.title}</strong><small>{t.status==='done'?'Completada':t.status==='blocked'?'Bloqueada':t.due_at?'Vence '+t.due_at.slice(0,10):'Sin fecha de vencimiento'}</small></div>
   </div>)}
   {!tasks.length&&<p className={styles.empty}>No hay tareas registradas para este proyecto.</p>}
   {canWriteTasks&&<details className={styles.edit}><summary>+ Añadir tarea</summary><WorkspaceForm action="/api/team/tasks" method="post" className={styles.addTask}>
    <input type="hidden" name="projectId" value={projectId}/><input type="hidden" name="returnToProject" value="yes"/>
    <label>Tarea <input name="title" minLength={2} maxLength={180} required placeholder="Ej. Confirmar locación"/></label>
    <label>Vence <input name="dueDate" type="date"/></label>
    <label>Detalles <textarea name="description" maxLength={2000} rows={2}/></label>
    <button className={styles.primary} type="submit">Guardar tarea</button>
   </WorkspaceForm></details>}
  </section>}
 </div>;
}
