import {boundedForm} from '@/lib/form-request';
import {NextResponse} from 'next/server';
import {adminAuthenticated,requestIsSameOrigin,sameOriginRedirect} from '@/lib/auth';
import {convertInquiry,issueClientInvite,getProject} from '@/lib/db';
import {cookies} from 'next/headers';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!requestIsSameOrigin(request))return new Response('Invalid origin',{status:403});
 if(!await adminAuthenticated())return new Response('Unauthorized',{status:401});
 const form=await boundedForm(request);if(form instanceof Response)return form;const id=String(form.get('id')||'');
 if(!/^[\da-f-]{36}$/i.test(id))return new Response('Invalid inquiry',{status:400});
 const created=await convertInquiry(id);
 if(!created)return new Response('Inquiry not found',{status:404});
 const project=await getProject(created.projectId);
 if(!project)return new Response('Project not found',{status:500});
 // v0.4 requires an authenticated client account. The legacy portal token
 // from pc_convert_inquiry is intentionally NOT shared.
 const invitation=await issueClientInvite(project.id);
 if(invitation)(await cookies()).set('primecuts_invite_flash',JSON.stringify({id:project.id,email:project.client_email,token:invitation}),{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/admin',maxAge:300});
 return NextResponse.redirect(sameOriginRedirect(request,'/admin#client-invites'),303);
}