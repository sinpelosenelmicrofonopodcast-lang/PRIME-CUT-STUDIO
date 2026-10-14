import {sameOriginRedirect as safeFormRedirect} from '@/lib/auth';
import {boundedForm} from '@/lib/form-request';
import {NextResponse} from 'next/server';
import {requestIsSameOrigin} from '@/lib/auth';import {staffInvite,acceptStaffInvite} from '@/lib/operations-db';
import {clientAccountByEmail} from '@/lib/db';
import {clientAuthenticated,hashClientPassword,setClientSession,strongClientPassword} from '@/lib/client-auth';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!requestIsSameOrigin(request))return new Response('Forbidden',{status:403});
 const f=await boundedForm(request);if(f instanceof Response)return f;const token=String(f.get('token')||'');
 const inv=await staffInvite(token);if(!inv)return new Response('Expired invite',{status:410});
 const existing=await clientAccountByEmail(inv.email);
 let accountId:string|null=null,passwordHash:string|null=null;
 if(existing){const session=await clientAuthenticated();if(!session||session.id!==existing.id)return new Response('Sign in with the invited account and reopen the link',{status:403});accountId=session.id;}
 else{const password=String(f.get('password')||'');if(!strongClientPassword(password))return new Response('Password must have at least 12 characters',{status:400});passwordHash=hashClientPassword(password);}
 const accepted=await acceptStaffInvite(token,passwordHash,accountId);
 if(!accepted)return new Response('Invitation unavailable or already redeemed',{status:409});
 if(!existing){const newAccount=await clientAccountByEmail(inv.email);if(!newAccount||newAccount.id!==accepted.account_id)return new Response('Account not active',{status:500});await setClientSession(newAccount);}
 return NextResponse.redirect(safeFormRedirect(request,'/team'),303);
}