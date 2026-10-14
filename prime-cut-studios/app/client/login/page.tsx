import Link from 'next/link';
import {redirect} from 'next/navigation';
import {SiteHeader} from '@/components/SiteHeader';
import {Footer} from '@/components/Footer';
import {clientAuthenticated} from '@/lib/client-auth';
export const dynamic='force-dynamic';export const runtime='nodejs';
export default async function Login({searchParams}:{searchParams:Promise<{status?:string}>}){
  if(await clientAuthenticated())redirect('/client');
  const {status}=await searchParams;
  const message=status==='password-changed'?'Password changed. Sign in with your new password.':status==='invalid'?'Incorrect email or password.':status==='locked'?'Too many attempts. Try again after 15 minutes.':status==='existing'?'This email already has an account. Sign in and then reopen the invitation link.':'';
  return <><SiteHeader/><main className="shell narrow"><div className="pagehero"><div className="eyebrow">Private client workspace</div><h1>Client sign in</h1><p className="muted">Sign in to your private workspace. Project access is granted by your producer.</p></div><div className="panel">{message&&<p className="alert" role="status">{message}</p>}<form className="form" method="post" action="/api/client/login"><div className="field"><label htmlFor="client-email">Email address</label><input id="client-email" name="email" type="email" autoComplete="email" required maxLength={254}/></div><div className="field"><label htmlFor="client-password">Password</label><input id="client-password" name="password" type="password" autoComplete="current-password" required/></div><button className="btn" type="submit">Sign in</button></form><p className="small muted">First visit? Open the invitation link provided by your producer to create your account.</p><p><Link href="/account">Register, resend confirmation or reset password / Crear cuenta o recuperar acceso</Link></p><Link className="inline-link" href="/book">Start a new project</Link></div></main><Footer/></>;
}
