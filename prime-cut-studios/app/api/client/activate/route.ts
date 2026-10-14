import {boundedForm} from '@/lib/form-request';
import {NextResponse} from 'next/server';
import {requestIsSameOrigin,sameOriginRedirect} from '@/lib/auth';
import {clientAccountByEmail,getClientInvite,redeemClientInvite} from '@/lib/db';
import {clientAuthenticated,hashClientPassword,setClientSession,strongClientPassword} from '@/lib/client-auth';
export const runtime='nodejs';
export async function POST(request:Request){
  if(!requestIsSameOrigin(request))return new Response('Forbidden',{status:403});
  const form=await boundedForm(request);if(form instanceof Response)return form;
  const token=String(form.get('token')||'');
  const invite=await getClientInvite(token);
  if(!invite)return new Response('Invite expired or already used',{status:410});
  const existing=await clientAccountByEmail(invite.email);
  let passwordHash:string|null=null,accountId:string|null=null;
  if(existing){
    const session=await clientAuthenticated();
    if(!session||session.id!==existing.id)return NextResponse.redirect(sameOriginRedirect(request,'/client/login?status=existing'),303);
    accountId=session.id;
  }else{
    const password=String(form.get('password')||'');
    if(!strongClientPassword(password))return new Response('Password must be between 12 and 128 characters',{status:400});
    passwordHash=hashClientPassword(password);
  }
  const result=await redeemClientInvite(token,passwordHash,accountId);
  if(!result)return new Response('Invitation unavailable. Sign in with your existing account, or contact Prime Cut Studios.',{status:409});
  if(!existing){
    const account=await clientAccountByEmail(invite.email);
    if(!account||account.id!==result.account_id)return new Response('Cannot establish session',{status:500});
    await setClientSession(account);
  }
  return NextResponse.redirect(sameOriginRedirect(request,`/client/projects/${result.project_id}`),303);
}
