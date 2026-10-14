import {sameOriginRedirect as safeFormRedirect} from '@/lib/auth';
import {boundedForm} from '@/lib/form-request';
import {dateOnly} from '@/lib/workspace-policy';
import {NextResponse} from 'next/server';
import {requestIsSameOrigin} from '@/lib/auth';import {requireCapability,castingById,createCastingCall,changeCastingStatus,audit} from '@/lib/operations-db';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!requestIsSameOrigin(req))return new Response('Forbidden',{status:403});
 const f=await boundedForm(req);if(f instanceof Response)return f;const action=String(f.get('action')||'create');
 if(action==='status'){
  const id=String(f.get('id')||''),status=String(f.get('status')||'');
  if(!/^[\da-f-]{36}$/i.test(id)||!['draft','open','closed','archived'].includes(status))return new Response('Bad status',{status:400});
  const call=await castingById(id);if(!call)return new Response('Not found',{status:404});
  const access=await requireCapability('casting.write',call.project_id);if(!access)return new Response('Forbidden',{status:403});
  await changeCastingStatus(id,status as 'draft'|'open'|'closed'|'archived');await audit('casting.status','casting_call',id,access,call.project_id,{status});
 }else{
  const projectId=String(f.get('projectId')||''),title=String(f.get('title')||'').trim(),description=String(f.get('description')||'').trim(),requirements=String(f.get('requirements')||'').trim(),location=String(f.get('location')||'').trim(),pay_details=String(f.get('payDetails')||'').trim(),status=String(f.get('status')||'draft'),closesAt=String(f.get('closesAt')||'');
  if(!/^[\da-f-]{36}$/i.test(projectId)||title.length<3||title.length>160||description.length>2000||requirements.length>1500||location.length>150||pay_details.length>200||!['draft','open'].includes(status)||(closesAt&&!/^\d{4}-\d{2}-\d{2}$/.test(closesAt)))return new Response('Invalid casting',{status:400});
  try{dateOnly(closesAt);}catch{return new Response('Invalid closing date',{status:400});}
  const access=await requireCapability('casting.write',projectId);if(!access)return new Response('Forbidden',{status:403});
  const call=await createCastingCall({project_id:projectId,title,description,requirements,location:location||null,pay_details:pay_details||null,closes_at:closesAt?closesAt+'T23:59:59Z':null,status:status as 'draft'|'open'});await audit('casting.create','casting_call',call.id,access,projectId);
 }
 return NextResponse.redirect(safeFormRedirect(req,'/team/casting'),303);
}
