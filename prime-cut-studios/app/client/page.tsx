import {commEnabled} from '@/lib/communications-db';
import {NotificationLink} from '@/components/workspace/NotificationLink';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {SiteHeader} from '@/components/SiteHeader';import {Footer} from '@/components/Footer';
import {clientAuthenticated} from '@/lib/client-auth';
import {clientProjects} from '@/lib/db';
import {workspaceEnabled} from '@/lib/workspace-policy';
export const metadata={robots:{index:false,follow:false}};
export const dynamic='force-dynamic';export const runtime='nodejs';
export default async function ClientHome(){
  const account=await clientAuthenticated();if(!account)redirect('/client/login');
  const projects=await clientProjects(account.id);
  return <><SiteHeader/><main className="shell"><div className="pagehero"><div className="eyebrow">Private workspace · {account.email}</div><h1>Your projects</h1>{commEnabled()&&<><NotificationLink/><p><Link href="/talent/account">Mi cuenta de talento / My talent account</Link></p></>}<p className="muted">Review materials and approved updates for your productions.</p>{workspaceEnabled()&&<p><Link href="/client/profile" className="inline-link">My profile & preferences ↗</Link></p>}<form method="post" action="/api/client/logout"><button className="btn secondary btn-small">Sign out</button></form></div><div className="grid">{projects.length?projects.map(p=><article className="panel" key={p.id}><div className="eyebrow">{p.status.replaceAll('-',' ')}</div><h2>{p.title}</h2><p>{p.event_date||'Date to be confirmed'} · {p.location||'Location pending'}</p><Link href={`/client/projects/${p.id}`} className="btn">Open project</Link></article>):<div className="empty"><h3>No projects assigned yet</h3><p>Ask your producer for a private project invitation.</p></div>}</div></main><Footer/></>;
}
