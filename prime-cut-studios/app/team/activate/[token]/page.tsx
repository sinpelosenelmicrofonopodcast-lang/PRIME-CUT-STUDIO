import Link from 'next/link';
import {SiteHeader} from '@/components/SiteHeader';import {Footer} from '@/components/Footer';
import {staffInvite} from '@/lib/operations-db';import {clientAccountByEmail} from '@/lib/db';
import {clientAuthenticated} from '@/lib/client-auth';
export const runtime='nodejs';export const dynamic='force-dynamic';
export default async function ActivateStaff({params}:{params:Promise<{token:string}>}){
 const {token}=await params,invite=await staffInvite(token);
 if(!invite)return <><SiteHeader/><main className="shell pagehero"><h1>Invitation unavailable</h1><p>This invitation has expired or was used. Contact Prime Cut Studios.</p></main><Footer/></>;
 const account=await clientAccountByEmail(invite.email),session=await clientAuthenticated();
 return <><SiteHeader/><main className="shell pagehero"><div className="eyebrow">Secure staff invitation</div><h1>Join PrimeCuts OS</h1><p>Role: {invite.role} · {invite.email}</p>
 <section className="panel" style={{maxWidth:650}}>{account&&(!session||session.id!==account.id)?<><p>This email already has an account. Sign in, then reopen this invitation link.</p><Link href="/client/login" className="btn">Sign in</Link></>:<form action="/api/team/activate" method="post" className="form"><input type="hidden" name="token" value={token}/>{!account&&<div className="field"><label>Create a personal password (12+ characters)</label><input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required/></div>}<p className="muted">This invitation is personal and expires after 7 days. Your role and project permissions are checked on each request.</p><button className="btn" type="submit">{account?'Activate staff access':'Create account and join team'}</button></form>}</section>
 </main><Footer/></>;
}