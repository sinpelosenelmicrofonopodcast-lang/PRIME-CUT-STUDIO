import {boundedForm} from '@/lib/form-request';
import {enqueueEmail} from '@/lib/email';
import {hashToken} from '@/lib/db';
import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {adminAuthenticated,requestIsSameOrigin,sameOriginRedirect} from '@/lib/auth';
import {issueClientInvite,getProject} from '@/lib/db';
export const runtime='nodejs';
export async function POST(request:Request){
  if(!requestIsSameOrigin(request))return new Response('Forbidden',{status:403});
  if(!await adminAuthenticated())return new Response('Unauthorized',{status:401});
  const f=await boundedForm(request);if(f instanceof Response)return f;const id=String(f.get('projectId')||'');
  if(!/^[a-f\d-]{36}$/i.test(id))return new Response('Bad project',{status:400});
  const project=await getProject(id);if(!project||!project.client_email)return new Response('Client email required',{status:400});
  const token=await issueClientInvite(id);
  if(!token)return new Response('Unable to invite',{status:404});
  (await cookies()).set('primecuts_invite_flash',JSON.stringify({id,email:project.client_email,token}),{
    httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/admin',maxAge:300
  });
  await enqueueEmail('invite:'+hashToken(token),project.client_email,'invitation','en','/client/activate/'+token,true);
  return NextResponse.redirect(sameOriginRedirect(request,'/admin#client-invites'),303);
}
