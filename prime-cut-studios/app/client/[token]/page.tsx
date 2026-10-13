import {notFound} from 'next/navigation';
import {SiteHeader} from '@/components/SiteHeader';import {Footer} from '@/components/Footer';
import {getClientProject,listDeliverables} from '@/lib/db';
import type {Metadata} from 'next';
export const dynamic='force-dynamic';export const runtime='nodejs';
export const metadata:Metadata={title:'Private project | Prime Cut Studios',robots:{index:false,follow:false}};
export default async function ClientProject({params}:{params:Promise<{token:string}>}){
  const {token}=await params,p=getClientProject(token);
  if(!p)notFound();
  const deliverables=listDeliverables(p.id,true);
  const cost=p.quote_amount_cents===null?'Awaiting estimate':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(p.quote_amount_cents/100);
  return <><SiteHeader/><main><div className="shell pagehero"><div className="eyebrow">Private client workspace · {p.client_name}</div><h1>{p.title}</h1><p className="muted">Requested date: {p.event_date||'To be confirmed'} · {p.location||'Location to be confirmed'}</p></div><section style={{paddingTop:18}}><div className="shell two"><div className="panel"><div className="eyebrow">Production status</div><h2 style={{textTransform:'capitalize'}}>{p.status.replaceAll('-',' ')}</h2><p className="muted">Project updates are entered by the production team. A requested date is not a confirmed reservation until a signed agreement and deposit are processed.</p><h3>Approved delivery</h3>{deliverables.length===0?<div className="empty compact">No deliverables have been released for viewing yet.</div>:<div className="delivery">{deliverables.map(d=><div className="deliverable" key={d.id}><div><strong>{d.title}</strong><p className="muted">{d.description}</p></div>{d.url?<a className="btn secondary btn-small" href={d.url} target="_blank" rel="noopener noreferrer">Open file</a>:<span className="pill">Preparing</span>}</div>)}</div>}</div><div className="panel"><div className="eyebrow">Your quote</div><h2>{cost}</h2><p className="muted">Estimate only. Payment and contract approval are managed separately until online processing is activated.</p><div className="eyebrow">Scope / notes</div><p style={{whiteSpace:'pre-wrap'}}>{p.quote_notes||'Your producer is preparing the scope of work.'}</p><div className="note">For privacy, do not forward this page link. Access expires automatically. Contact your producer if it needs to be revoked.</div></div></div></section></main><Footer/></>;
}
