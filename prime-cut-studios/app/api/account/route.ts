import {randomBytes,randomUUID} from 'node:crypto';
import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {workspaceForm} from '@/lib/workspace-request';
import {safeIp,sameOriginRedirect} from '@/lib/auth';
import {clientAccountByEmail,identifyIp,hashToken} from '@/lib/db';
import {clientAuthenticated,setClientSession,clearClientSession,strongClientPassword,verifyClientPassword,hashClientPassword} from '@/lib/client-auth';
import {authApi,linkVerifiedUser,saveTokens,signInAuth,verifiedAuthUser,updateAuthPassword,signOutAuth,type AuthUser} from '@/lib/supabase-auth';
import {comm,filters,rpc,allowAction,commEnabled} from '@/lib/communications-db';
import {enqueueEmail} from '@/lib/email';
import {publicSiteOrigin} from '@/lib/site-origin';
import {seal,unseal} from '@/lib/private-token';
export const runtime='nodejs';
type Link={properties:{hashed_token:string;verification_type?:string};user:AuthUser};
async function generateLink(body:object):Promise<Link>{const raw=await authApi<Link&AuthUser&{hashed_token?:string;verification_type?:string}>('admin/generate_link',{...body,redirect_to:publicSiteOrigin()+'/account/verify'},undefined,true);const link=raw.properties?raw:{properties:{hashed_token:raw.hashed_token||'',verification_type:raw.verification_type},user:raw};if(!link.user.id||!link.properties.hashed_token)throw new Error('INVALID_AUTH_LINK');return link;}

export async function POST(req:Request){if(!commEnabled())return new Response('Account updates unavailable',{status:503});const f=await workspaceForm(req);if(f instanceof Response)return f;const action=f.get('action')||'',email=(f.get('email')||'').trim().toLowerCase(),password=f.get('password')||'',language=f.get('language')==='es'?'es':'en';const go=(s:string)=>NextResponse.redirect(sameOriginRedirect(req,'/account?status='+s),303);
 const ip=identifyIp(safeIp(req));if(!await allowAction('account:ip:'+ip,12,900))return go('rate');
 try{
 if(action==='verify'){
 const token=f.get('token')||'',intent=f.get('intent')||'confirmation';if(!/^[a-f\d]{40,128}$/i.test(token)||!['confirmation','recovery'].includes(intent))return go('expired');
 const t=await authApi<{access_token:string;refresh_token:string;expires_in:number;user:AuthUser}>('verify',{token_hash:token,type:f.get('type')==='recovery'?'recovery':f.get('type')==='signup'?'signup':'magiclink'});if(!t.user.email_confirmed_at)return go('expired');await saveTokens(t);
 const pending=(await comm<{name:string;kind:string;language:'es'|'en'}[]>(filters('pc_auth_pending',{email:'eq.'+t.user.email!.toLowerCase(),select:'name,kind,language',limit:'1'})))[0];
 const account=await linkVerifiedUser(t.user,pending?.name);if(!account||account.disabled)return go('expired');await setClientSession(account);
 if(intent==='recovery'){(await cookies()).set('primecuts_recovery',seal({uid:t.user.id,exp:Date.now()+900000}),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:900});return go('new-password');}
 await enqueueEmail('welcome:'+account.id,account.email,'welcome',pending?.language||'en','/client');return NextResponse.redirect(sameOriginRedirect(req,pending?.kind==='talent'?'/talent/account':'/client'),303);
 }
 if(action==='password'){
 if(!strongClientPassword(password)||password!==f.get('confirm'))return go('password-invalid');const account=await clientAuthenticated();if(!account)return go('expired');
 const recovery=unseal<{uid:string;exp:number}>((await cookies()).get('primecuts_recovery')?.value||'');
 if(account.auth_user_id){const user=await verifiedAuthUser(true);if(!user||user.id!==account.auth_user_id)return go('expired');if(!recovery||recovery.uid!==user.id||recovery.exp<Date.now()){await signInAuth(account.email,f.get('current')||'');}await updateAuthPassword(password);}
 else{if(!verifyClientPassword(f.get('current')||'',account.password_hash))return go('password-invalid');await comm(filters('pc_client_accounts',{id:'eq.'+account.id}),{method:'PATCH',body:JSON.stringify({password_hash:hashClientPassword(password)})});}
 await rpc('pc_invalidate_sessions',{p_id:account.id});await signOutAuth();await clearClientSession();return NextResponse.redirect(sameOriginRedirect(req,'/client/login?status=password-changed'),303);
 }
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return go('invalid');if(!await allowAction('account:email:'+hashToken(email),3,900))return go('sent');
 if(action==='register'){
 const name=(f.get('name')||'').trim(),kind=f.get('kind')==='talent'?'talent':'client';if(name.length<2||name.length>140||!strongClientPassword(password)||f.get('privacy')!=='yes')return go('invalid');
 if(await clientAccountByEmail(email))return go('sent');
 const response=await authApi<AuthUser&{user?:AuthUser}>('signup?redirect_to='+encodeURIComponent(publicSiteOrigin()+'/account/verify'),{email,password,data:{name}});
 const user=response.user||response;if(!user.id)throw new Error('INVALID_AUTH_USER');
 await comm('pc_auth_pending?on_conflict=email',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({email,auth_user_id:user.id,name,kind,language})});
 // Supabase Auth sends its own confirmation; do not queue a second email.
 if(f.get('newsletter')==='yes'){const {subscribeNewsletter}=await import('@/lib/newsletter');await subscribeNewsletter(email,language,kind);}
 return go('sent');
 }
 if(action==='recover'||action==='resend'){
 const account=await clientAccountByEmail(email),pending=(await comm<{auth_user_id:string}[]>(filters('pc_auth_pending',{email:'eq.'+email,select:'auth_user_id',limit:'1'})))[0];if(!account&&!pending)return go('sent');
 if(action==='recover'&&account&&!account.auth_user_id&&!pending)await generateLink({type:'magiclink',email});
 const endpoint=(action==='recover'?'recover':'resend')+'?redirect_to='+encodeURIComponent(publicSiteOrigin()+'/account/verify');
 await authApi(endpoint,action==='recover'?{email}:{type:'signup',email});return go('sent');
 }
 return go('invalid');
 }catch{return go(action==='verify'?'expired':action==='password'?'password-invalid':'sent');}
}
