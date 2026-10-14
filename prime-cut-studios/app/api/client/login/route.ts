import {boundedForm} from '@/lib/form-request';
import {signInAuth} from '@/lib/supabase-auth';
import {NextResponse} from 'next/server';
import {requestIsSameOrigin,safeIp,sameOriginRedirect} from '@/lib/auth';
import {identifyIp,normalizedEmail,clientAccountByEmail,clientLoginThrottled,recordClientLoginFailure} from '@/lib/db';
import {setClientSession,verifyClientPassword} from '@/lib/client-auth';
import {staffMemberForAccount} from '@/lib/operations-staff';
export const runtime='nodejs';
export async function POST(request:Request){
  if(!requestIsSameOrigin(request))return new Response('Forbidden',{status:403});
  const form=await boundedForm(request,12000);if(form instanceof Response)return form;
  const email=normalizedEmail(String(form.get('email')||''));
  const password=String(form.get('password')||'');
  const redirectTo=(name:string)=>NextResponse.redirect(sameOriginRedirect(request,`/client/login?status=${name}`),303);
  const hash=identifyIp(safeIp(request));
  if(await clientLoginThrottled(hash))return redirectTo('locked');
  if(!email||email.length>254||password.length>256)return redirectTo('invalid');
  const account=await clientAccountByEmail(email);
  let valid=false;
  if(account&&!account.disabled){if(account.auth_user_id){try{valid=(await signInAuth(email,password)).id===account.auth_user_id;}catch{valid=false;}}else valid=verifyClientPassword(password,account.password_hash);}
  if(!valid||!account){
    await recordClientLoginFailure(hash);
    return redirectTo('invalid');
  }
  await setClientSession(account);
  const staff=await staffMemberForAccount(account.id);
  return NextResponse.redirect(sameOriginRedirect(request,staff?'/team':'/client'),303);
}
