import {sameOriginRedirect as safeFormRedirect} from '@/lib/auth';
import {boundedForm} from '@/lib/form-request';
import {NextResponse} from 'next/server';
import {adminAuthenticated,requestIsSameOrigin} from '@/lib/auth';
import {updateProject} from '@/lib/db';
export const runtime='nodejs';
export async function POST(request:Request){
  if(!requestIsSameOrigin(request))return new Response('Invalid origin',{status:403});
  if(!await adminAuthenticated())return new Response('Unauthorized',{status:401});
  const form=await boundedForm(request);if(form instanceof Response)return form;
  const id=String(form.get('id')||'');if(!/^[\da-f-]{36}$/i.test(id))return new Response('Invalid id',{status:400});
  const action=String(form.get('action')||'update');
  if(action!=='update')return new Response('Unsupported action',{status:400});
  const raw=String(form.get('amount')||'').trim();
  const amount=raw===''?null:Math.round(Number(raw)*100);
  const notes=String(form.get('notes')||'').trim();
  if(notes.length>3000 || (amount!==null && (!Number.isFinite(amount)||amount<0)))return new Response('Invalid amount or notes',{status:400});
  const ok=await updateProject(id,{status:String(form.get('status')||''),amount,notes});
  if(!ok)return new Response('Invalid project data',{status:400});
  return NextResponse.redirect(safeFormRedirect(request,'/admin#projects'),303);
}
