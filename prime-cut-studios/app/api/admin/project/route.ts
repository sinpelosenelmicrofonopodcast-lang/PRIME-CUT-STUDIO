import {NextResponse} from 'next/server';
import {adminAuthenticated,requestIsSameOrigin} from '@/lib/auth';
import {regeneratePortalToken,updateProject} from '@/lib/db';
import {cookies} from 'next/headers';
export const runtime='nodejs';
export async function POST(request:Request){
  if(!requestIsSameOrigin(request))return new Response('Invalid origin',{status:403});
  if(!await adminAuthenticated())return new Response('Unauthorized',{status:401});
  const form=await request.formData();
  const id=String(form.get('id')||'');if(!/^[\da-f-]{36}$/i.test(id))return new Response('Invalid id',{status:400});
  const action=String(form.get('action')||'update');
  if(action==='regenerate'){
    const token=await regeneratePortalToken(id);if(!token)return new Response('Not found',{status:404});
    (await cookies()).set('primecuts_portal_flash',JSON.stringify({id,token}),{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/admin',maxAge:300});
    return NextResponse.redirect(new URL('/admin#projects',request.url),303);
  }
  const raw=String(form.get('amount')||'').trim();
  const amount=raw===''?null:Math.round(Number(raw)*100);
  const notes=String(form.get('notes')||'').trim();
  if(notes.length>3000 || (amount!==null && (!Number.isFinite(amount)||amount<0)))return new Response('Invalid amount or notes',{status:400});
  const ok=await updateProject(id,{status:String(form.get('status')||''),amount,notes});
  if(!ok)return new Response('Invalid project data',{status:400});
  return NextResponse.redirect(new URL('/admin#projects',request.url),303);
}
