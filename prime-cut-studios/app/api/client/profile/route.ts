import {NextResponse} from 'next/server';import {clientAuthenticated} from '@/lib/client-auth';
import {sameOriginRedirect} from '@/lib/auth';import {workspaceForm} from '@/lib/workspace-request';
import {saveClientProfile,privacyRequest,type ClientProfile} from '@/lib/workspace-db';
export const runtime='nodejs';
export async function POST(req:Request){
 const f=await workspaceForm(req);if(f instanceof Response)return f;
 const account=await clientAuthenticated();if(!account)return new Response('Unauthorized',{status:401});
 if(f.get('action')==='privacy'){
 const kind=f.get('kind')||'',details=(f.get('details')||'').trim();
 if(!['correction','export','deletion'].includes(kind)||details.length>1500)return new Response('Invalid request',{status:400});
 await privacyRequest(account.id,kind,details);
 }else{
 const name=(f.get('name')||'').trim(),company=(f.get('company')||'').trim(),phone=(f.get('phone')||'').trim(),language=f.get('language')||'',contact_method=f.get('contactMethod')||'',preferences=(f.get('preferences')||'').trim();
 if(name.length<2||name.length>140||company.length>140||phone.length>40||preferences.length>1500||!['en','es'].includes(language)||!['email','phone','portal'].includes(contact_method))return new Response('Invalid profile',{status:400});
 await saveClientProfile(account.id,name,{company,phone,language,contact_method,preferences} as ClientProfile);
 }
 return NextResponse.redirect(sameOriginRedirect(req,'/client/profile?saved=1'),303);
}
