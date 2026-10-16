import {scheduleMail} from '@/lib/email';
import {NextResponse} from 'next/server';import {sameOriginRedirect} from '@/lib/auth';
import {requireCapability,audit} from '@/lib/operations-db';import {getProject} from '@/lib/db';
import {workspaceForm} from '@/lib/workspace-request';import {uuid,dateOnly,stageStates} from '@/lib/workspace-policy';
import {initializeStages,stageById,updateStage,staffMessage} from '@/lib/workspace-db';
export const runtime='nodejs';
export async function POST(req:Request){
 const f=await workspaceForm(req);if(f instanceof Response)return f;
 const projectId=f.get('projectId')||'';if(!uuid(projectId))return new Response('Invalid project',{status:400});
 const actor=await requireCapability('projects.write',projectId);if(!actor)return new Response('Forbidden',{status:403});
 if(!await getProject(projectId))return new Response('Not found',{status:404});
 const action=f.get('action');
 if(action==='initialize'){await initializeStages(projectId);}
 else if(action==='message'){
 const body=(f.get('body')||'').trim();if(body.length<1||body.length>3000)return new Response('Invalid message',{status:400});
 await staffMessage(projectId,actor.accountId,body,f.get('visible')==='yes');
 }else if(action==='quick'||action==='confirm_dates'){
 const stageId=f.get('stageId')||'',revision=Number(f.get('revision'));
 if(!uuid(stageId)||!Number.isSafeInteger(revision)||revision<0)return new Response('Invalid stage',{status:400});
 const stage=await stageById(stageId);
 if(!stage||stage.project_id!==projectId)return new Response('Not found',{status:404});
 const sensitive=/(?:contract|reservation|deposit|approval|client review|final delivery|contrato|firma|dep[oó]sito|factura|entrega final|aprobaci[oó]n)/i;
 let nextStatus=stage.status,nextConfirmed=stage.dates_confirmed,reason='';
 if(action==='quick'){
  const requested=f.get('status')||'';
  if([3,4,10,12,13,14].includes(stage.position)||sensitive.test(stage.title)||!['pending','in_progress','completed'].includes(stage.status)||!['pending','completed'].includes(requested))
   return new Response('This stage requires detailed verification',{status:400});
  if((requested==='completed'&&stage.status==='completed')||(requested==='pending'&&stage.status!=='completed'))
   return new Response('Invalid transition',{status:409});
  nextStatus=requested as typeof stage.status;
  reason=requested==='completed'?'Etapa marcada completada por el equipo':'Etapa reabierta por el equipo';
 }else{
  if(f.get('verified')!=='yes'||!(stage.planned_start||stage.planned_end)||stage.dates_confirmed||[3,4,10,12,13,14].includes(stage.position)||sensitive.test(stage.title))
   return new Response('Verify the dates and any required agreements first',{status:400});
  nextConfirmed=true;reason='Fechas verificadas y confirmadas manualmente por el equipo';
 }
 const values={title:stage.title,description:stage.description,status:nextStatus,
  planned_start:stage.planned_start,planned_end:stage.planned_end,dates_confirmed:nextConfirmed,
  next_step:stage.next_step,responsible:stage.responsible,reason};
 if(!await updateStage(stageId,revision,values,actor.accountId))return new Response('Stage changed. Reload before saving.',{status:409});
 }
 else if(action==='update'){
 const stageId=f.get('stageId')||'',revision=Number(f.get('revision')),status=f.get('status')||'',title=(f.get('title')||'').trim(),description=(f.get('description')||'').trim(),next_step=(f.get('nextStep')||'').trim(),responsible=(f.get('responsible')||'').trim(),reason=(f.get('reason')||'').trim();
 if(!uuid(stageId)||!Number.isSafeInteger(revision)||revision<0||!stageStates.includes(status as typeof stageStates[number])||title.length<2||title.length>120||description.length>1000||next_step.length>1000||responsible.length>120||reason.length<3||reason.length>3000)return new Response('Invalid stage update',{status:400});
 const stage=await stageById(stageId);if(!stage||stage.project_id!==projectId)return new Response('Not found',{status:404});
 let planned_start,planned_end;try{planned_start=dateOnly(f.get('plannedStart')||'');planned_end=dateOnly(f.get('plannedEnd')||'');}catch{return new Response('Invalid dates',{status:400});}
 if(planned_start&&planned_end&&planned_end<planned_start)return new Response('End must follow start',{status:400});
 const datesChanged=planned_start!==stage.planned_start||planned_end!==stage.planned_end;
 const confirmed=!datesChanged&&stage.dates_confirmed&&f.get('confirmed')==='yes';
 if(!await updateStage(stageId,revision,{title,description,status,planned_start,planned_end,dates_confirmed:confirmed,next_step,responsible,reason},actor.accountId))return new Response('Stage changed. Reload before saving.',{status:409});
 }else return new Response('Unsupported action',{status:400});
 await audit('timeline.'+action,'project',projectId,actor,projectId);
 scheduleMail();
 return NextResponse.redirect(sameOriginRedirect(req,'/team/projects/'+projectId+'?saved=1'),303);
}
