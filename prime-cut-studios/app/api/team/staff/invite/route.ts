import {sameOriginRedirect as safeFormRedirect} from '@/lib/auth';
import {boundedForm} from '@/lib/form-request';
import {enqueueEmail} from '@/lib/email';
import {hashToken} from '@/lib/db';
import {publicSiteOrigin} from '@/lib/site-origin';
import {NextResponse} from 'next/server';import {cookies} from 'next/headers';
import {adminAuthenticated,requestIsSameOrigin} from '@/lib/auth';
import {createStaffInvite,audit} from '@/lib/operations-db';
import {getProject,normalizedEmail} from '@/lib/db';import {staffRoleValid} from '@/lib/operations-policy';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!requestIsSameOrigin(req)||!await adminAuthenticated())return new Response('Forbidden',{status:403});
 const f=await boundedForm(req);if(f instanceof Response)return f;const email=normalizedEmail(String(f.get('email')||'')),role=String(f.get('role')||''),projectId=String(f.get('projectId')||'');
 if(!/^\S+@\S+\.\S+$/.test(email)||email.length>254||!staffRoleValid(role)||role==='owner'||(projectId&&!/^[\da-f-]{36}$/i.test(projectId)))return new Response('Invalid invite',{status:400});
 if(projectId&&!await getProject(projectId))return new Response('Unknown project',{status:404});
 const token=await createStaffInvite(email,role,projectId||null);
 const link=publicSiteOrigin()+'/team/activate/'+token;
 await enqueueEmail('staff-invite:'+hashToken(token),email,'invitation','en','/team/activate/'+token,true);
 (await cookies()).set('primecuts_staff_flash',JSON.stringify({link}),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/team',maxAge:300});
 await audit('staff.invite','staff_invite',null,null,projectId||null,{role});
 return NextResponse.redirect(safeFormRedirect(req,'/team/staff'),303);
}