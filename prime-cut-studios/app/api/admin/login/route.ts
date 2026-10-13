import {NextResponse} from 'next/server';
import {createSession,isAdminConfigured,requestIsSameOrigin,safeIp,setAdminSession,verifyPassword} from '@/lib/auth';
import {adminLoginThrottled,identifyIp,recordAdminAttempt} from '@/lib/db';
export const runtime='nodejs';
export async function POST(request:Request){
  if(!requestIsSameOrigin(request))return new Response('Invalid origin',{status:403});
  if(Number(request.headers.get('content-length')||0)>4096)return new Response('Too large',{status:413});
  if(!isAdminConfigured())return NextResponse.redirect(new URL('/admin/login?error=setup',request.url),303);
  const ip=identifyIp(safeIp(request));
  if(adminLoginThrottled(ip))return NextResponse.redirect(new URL('/admin/login?error=limit',request.url),303);
  const form=await request.formData();
  const email=String(form.get('email')||'').trim().toLowerCase();
  const password=String(form.get('password')||'');
  if(email!==process.env.ADMIN_EMAIL!.trim().toLowerCase() || !verifyPassword(password)){
    recordAdminAttempt(ip);return NextResponse.redirect(new URL('/admin/login?error=invalid',request.url),303);
  }
  await setAdminSession(createSession());
  return NextResponse.redirect(new URL('/admin',request.url),303);
}
