import {sameOriginRedirect as safeFormRedirect} from '@/lib/auth';
import {boundedForm} from '@/lib/form-request';
import {NextResponse} from 'next/server';import {requestIsSameOrigin,adminAuthenticated} from '@/lib/auth';
import {adminDisableStaff} from '@/lib/operations-staff';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!requestIsSameOrigin(req)||!await adminAuthenticated())return new Response('Forbidden',{status:403});
 const f=await boundedForm(req);if(f instanceof Response)return f;const accountId=String(f.get('accountId')||''),active=String(f.get('active')||'')==='1';
 if(!/^[\da-f-]{36}$/i.test(accountId))return new Response('Bad account',{status:400});
 await adminDisableStaff(accountId,active);
 return NextResponse.redirect(safeFormRedirect(req,'/team/staff'),303);
}