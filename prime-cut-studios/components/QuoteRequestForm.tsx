'use client';
import {useEffect,useState} from 'react';
import {useSalesLanguage} from './useSalesLanguage';
import {services} from '@/lib/data';
import {findPricingCategory,pricingAddOns,currency,publicPricingCategories,type PricingCategory,type Locale} from '@/lib/pricing';
import Link from 'next/link';

export function QuoteRequestForm({initialService='',initialPackage='',initialMode='package',initialLanguage='en',categories=publicPricingCategories}:{initialService?:string;initialPackage?:string;initialMode?:'package'|'custom';initialLanguage?:Locale;categories?:PricingCategory[]}){
 const {lang,setLang}=useSalesLanguage(initialLanguage);
 const [requestId,setRequestId]=useState('');
 useEffect(()=>setRequestId(crypto.randomUUID()),[]);
 const [service,setService]=useState(initialService);
 const [packageId,setPackageId]=useState(initialPackage);
 const [mode,setMode]=useState<'package'|'custom'>(initialMode);
 const [budgetAmount,setBudgetAmount]=useState('');
 const [budgetRange,setBudgetRange]=useState('');
 const txt=(en:string,es:string)=>lang==='es'?es:en;
 const category=categories.find(c=>c.name===service||c.slug===service);
 const pack=category?.packages.find(p=>p.id===packageId);
 return <form className="form" action="/api/inquiry" method="post">
   <div className="pricing-language" role="group" aria-label="Language / Idioma" style={{justifySelf:'start'}}>
    <button type="button" aria-pressed={lang==='en'} className={lang==='en'?'active':''} onClick={()=>setLang('en')}>English</button>
    <button type="button" aria-pressed={lang==='es'} className={lang==='es'?'active':''} onClick={()=>setLang('es')}>Español</button>
   </div>
   <input type="hidden" name="request_id" value={requestId}/><input type="hidden" name="language" value={lang}/>
   <div className="form-two"><div className="field"><label htmlFor="name">{txt('Full name *','Nombre completo *')}</label><input id="name" name="name" required minLength={2} maxLength={120} autoComplete="name" placeholder={txt('Your full name','Tu nombre completo')}/></div>
    <div className="field"><label htmlFor="email">{txt('Email *','Correo electrónico *')}</label><input id="email" name="email" type="email" maxLength={254} required autoComplete="email" placeholder="you@example.com"/></div></div>
   <div className="form-two"><div className="field"><label htmlFor="phone">{txt('Phone','Teléfono')}</label><input id="phone" name="phone" type="tel" maxLength={40} autoComplete="tel" placeholder="(254) 555-0100"/></div>
    <div className="field"><label htmlFor="service">{txt('Service *','Servicio *')}</label><select id="service" name="service" value={service} required onChange={e=>{setService(e.target.value);setPackageId('');}}><option value="" disabled>{txt('Select a service','Selecciona un servicio')}</option>{services.map(s=><option key={s.slug} value={s.name}>{findPricingCategory(s.name)?.title[lang]||s.name}</option>)}</select></div></div>
   <div className="budget-card"><h3>{txt('Choose a package or name your budget','Elige un paquete o dinos tu presupuesto')}</h3>
    <p className="small muted">{txt('Your budget is always welcome. We may recommend a smaller scope that respects it.','Siempre puedes indicar tu presupuesto. Podemos ofrecerte un alcance menor que se ajuste a él.')}</p>
    <div className="budget-choice"><label><input type="radio" name="quote_mode" value="package" checked={mode==='package'} onChange={()=>setMode('package')}/>{txt('Choose a package','Elegir un paquete')}</label><label><input type="radio" name="quote_mode" value="custom" checked={mode==='custom'} onChange={()=>setMode('custom')}/>{txt('Name Your Budget','Dinos tu presupuesto')}</label></div>
    {mode==='package'&&category?.packages.length?<div className="field"><label htmlFor="package">{txt('Package preference','Paquete preferido')}</label><select id="package" name="package" value={packageId} onChange={e=>setPackageId(e.target.value)}><option value="">{txt('Help me choose','Ayúdame a elegir')}</option>{category.packages.map(p=><option key={p.id} value={p.id}>{p.title[lang]} — {currency(p.price)}{p.plus?'+':''}</option>)}</select>{pack&&<p className="package-summary">{txt('Starting at','Desde')} {currency(pack.price)}{pack.plus?'+':''}. {txt('Final price depends on the approved scope.','El precio final depende del alcance aprobado.')}</p>}</div>:mode==='package'&&<p className="small muted">{txt('We will prepare a tailored proposal for this project.','Prepararemos una propuesta personalizada para este proyecto.')}</p>}
    {mode==='custom'&&<div className="field"><label htmlFor="budget_amount">{txt('Your total target budget (USD) *','Tu presupuesto total (USD) *')}</label><input id="budget_amount" name="budget_amount" type="number" min="0.01" max="1000000" step="0.01" inputMode="decimal" placeholder={txt('For example: 350','Por ejemplo: 350')} value={budgetAmount} onChange={e=>setBudgetAmount(e.target.value)} required/><p className="small muted">{txt('Any amount is welcome for review, including below $500. Submitting does not guarantee a booking.','Puedes enviarnos cualquier cantidad, incluso menos de $500. Solicitar no garantiza una reserva.')}</p></div>}
    {mode==='package'&&<div className="field"><label htmlFor="budget_range">{txt('Estimated budget (optional)','Presupuesto estimado (opcional)')}</label><select id="budget_range" name="budget_range" value={budgetRange} onChange={e=>setBudgetRange(e.target.value)}><option value="">{txt('Prefer to discuss','Prefiero hablarlo')}</option><option value="Under $500">{txt('Under $500','Menos de $500')}</option><option>$500–$999</option><option>$1,000–$1,999</option><option>$2,000–$3,999</option><option>$4,000+</option></select></div>}
   </div>
   <div className="form-two"><div className="field"><label htmlFor="date">{txt('Preferred shoot date','Fecha preferida')}</label><input id="date" name="date" type="date"/></div><div className="field"><label htmlFor="location">{txt('Location','Localización')}</label><input id="location" name="location" maxLength={150} placeholder={txt('City or venue','Ciudad o lugar')}/></div></div>
   <details className="panel"><summary style={{cursor:'pointer',fontWeight:700}}>{txt('Optional add-ons / extras','Complementos opcionales')}</summary><p className="small muted">{txt('These are requests only, not automatic charges.','Son solicitudes, no cargos automáticos.')}</p><div className="pricing-extras-grid" style={{gridTemplateColumns:'1fr'}}>{pricingAddOns.map((a,i)=><label key={i} style={{cursor:'pointer',display:'flex',alignItems:'start',gap:8}}><input type="checkbox" name="extras" value={String(i)} style={{marginTop:3}}/>{a[lang]}</label>)}</div></details>
   <div className="field"><label htmlFor="details">{txt('Tell us about your project','Cuéntanos sobre tu proyecto')}</label><textarea id="details" name="details" maxLength={2000} placeholder={txt('What are you creating? Describe goals, shoot hours, must-have moments, references and anything we should know.','¿Qué quieres crear? Describe objetivos, horas, momentos importantes, referencias y cualquier otro detalle.')}/></div>
   <div className="hidden-honeypot" aria-hidden="true"><label>Leave blank<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
   <button className="btn" type="submit">{txt('Send quote request','Enviar solicitud de cotización')} <span aria-hidden="true">↗</span></button>
   <p className="small muted">{txt('We review each request and send a written proposal. No payment is taken and the date is not reserved by submitting this form.','Revisamos cada solicitud y enviamos una propuesta escrita. Este formulario no cobra ni reserva la fecha.')}{' '}<Link href="/privacy" className="pricing-plain-link">{txt('Privacy policy','Política de privacidad')}</Link>.</p>
 </form>;
}
