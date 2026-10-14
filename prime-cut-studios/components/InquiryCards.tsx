import type {Inquiry} from '@/lib/db';
function submitted(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?'Date unavailable':new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}).format(date);}
function shootDate(value:string|null){if(!value||Number.isNaN(Date.parse(value+'T12:00:00Z')))return 'To be confirmed';return value?new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'}).format(new Date(value+'T12:00:00Z')):'To be confirmed';}
export function InquiryCards({leads,action,canConvert=true}:{leads:Inquiry[];action:string;canConvert?:boolean}){
 return <div className="inquiry-cards">{leads.map(lead=><article className="inquiry-card" key={lead.id}>
  <header><div><span className="inquiry-date">{submitted(lead.created_at)} · Central time</span><h3>{lead.name}</h3></div><span className="pill">{lead.status.replaceAll('_',' ')}</span></header>
  <div className="inquiry-contact"><a href={'mailto:'+lead.email}>{lead.email}</a>{lead.phone&&<a href={'tel:'+lead.phone.replace(/[^\d+]/g,'')}>{lead.phone}</a>}</div>
  <dl><div><dt>Service</dt><dd>{lead.service}</dd></div><div><dt>Shoot date</dt><dd>{shootDate(lead.event_date)}</dd></div><div><dt>Location</dt><dd>{lead.location||'To be confirmed'}</dd></div><div><dt>Budget</dt><dd>{lead.budget||'Not specified'}</dd></div></dl>
  {lead.details&&<details className="inquiry-brief"><summary>Read the project brief</summary><p>{lead.details}</p></details>}
  <footer><a className="btn secondary btn-small" href={'mailto:'+lead.email+'?subject='+encodeURIComponent('Your '+lead.service+' request — Prime Cut Studios')}>Reply to request ↗</a>{canConvert&&lead.status==='new'&&<form action={action} method="post"><input type="hidden" name="id" value={lead.id}/><button className="btn btn-small" type="submit">Create project</button></form>}</footer>
 </article>)}</div>;
}
