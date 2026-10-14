import Link from 'next/link';
import {SiteHeader} from '@/components/SiteHeader';
import {Footer} from '@/components/Footer';
import {getClientInvite,clientAccountByEmail} from '@/lib/db';
import {clientAuthenticated} from '@/lib/client-auth';
export const runtime='nodejs';export const dynamic='force-dynamic';
export default async function Activate({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  const invite=await getClientInvite(token);
  if(!invite)return <><SiteHeader/><main className="shell narrow pagehero"><h1>Invitation unavailable</h1><p>It may have expired or already been used. Request a fresh link from your producer.</p><Link href="/client/login" className="btn">Sign in</Link></main><Footer/></>;
  const existing=await clientAccountByEmail(invite.email);
  const session=await clientAuthenticated();
  return <><SiteHeader/><main className="shell narrow"><div className="pagehero"><div className="eyebrow">Private project invitation</div><h1>Welcome to PrimeCuts OS</h1><p>Invitation for {invite.email}</p></div><div className="panel">{existing&&(!session||session.id!==existing.id)?<><p>This email already has a client account. Please sign in first, then open this invitation link again.</p><Link href="/client/login" className="btn">Sign in</Link></>:<form className="form" action="/api/client/activate" method="post"><input type="hidden" name="token" value={token}/>{!existing&&<div className="field"><label htmlFor="new-password">Create your password (at least 12 characters)</label><input id="new-password" type="password" name="password" autoComplete="new-password" minLength={12} maxLength={128} required/></div>}<p className="small muted">Access is personal. Do not forward this invitation.</p><button type="submit" className="btn">{existing?'Add this project to my account':'Create account and access project'}</button></form>}</div></main><Footer/></>;
}
