import {dateOnly} from '@/lib/workspace-policy';
import {sameOriginRedirect as safeFormRedirect} from '@/lib/auth';
import {boundedForm} from '@/lib/form-request';
import {NextResponse} from 'next/server';
import {requestIsSameOrigin} from '@/lib/auth';
import {requireCapability,taskById,createTask,setTaskStatus,audit} from '@/lib/operations-db';
export const runtime='nodejs';
export async function POST(req:Request){
 let projectReturn:string|null=null;
 if(!requestIsSameOrigin(req))return new Response('Forbidden',{status:403});
 const f=await boundedForm(req);if(f instanceof Response)return f;const action=String(f.get('action')||'create');
 if(action==='status'){
  const id=String(f.get('id')||''),status=String(f.get('status')||'');
  if(!/^[a-f\d-]{36}$/i.test(id)||!['todo','doing','blocked','done'].includes(status))return new Response('Bad request',{status:400});
  const t=await taskById(id);if(!t)return new Response('Not found',{status:404});
  projectReturn=t.project_id;
  const access=await requireCapability('tasks.write',t.project_id);if(!access)return new Response('Forbidden',{status:403});
  await setTaskStatus(id,status as 'todo'|'doing'|'blocked'|'done');await audit('task.status','task',id,access,t.project_id,{status});
 }else{
  const projectId=String(f.get('projectId')||''),title=String(f.get('title')||'').trim(),description=String(f.get('description')||'').trim(),dueDate=String(f.get('dueDate')||'');
  if(!/^[a-f\d-]{36}$/i.test(projectId)||title.length<2||title.length>180||description.length>2000||(dueDate&&!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)))return new Response('Invalid task',{status:400});
  try{dateOnly(dueDate);}catch{return new Response('Invalid due date',{status:400});}
  const access=await requireCapability('tasks.write',projectId);if(!access)return new Response('Forbidden',{status:403});
  projectReturn=projectId;
  const t=await createTask(projectId,title,description,dueDate?dueDate+'T12:00:00Z':null);await audit('task.create','task',t.id,access,projectId);
 }
 return NextResponse.redirect(safeFormRedirect(req,f.get('returnToProject')==='yes'&&projectReturn?'/team/projects/'+projectReturn:' /team#tasks'.trim()),303);
}