import {getPricingCatalog} from '@/lib/pricing-db';
import {cookies} from 'next/headers';
import {publicMetadata} from '@/lib/public-metadata';
import {SiteHeader} from '@/components/SiteHeader';
import {Footer} from '@/components/Footer';
import {QuoteRequestForm} from '@/components/QuoteRequestForm';
import {services} from '@/lib/data';
import {findPricingCategory,type Locale} from '@/lib/pricing';
import {CheckCircle2,CalendarDays,ClipboardList,Film} from 'lucide-react';
export const metadata=publicMetadata('Get a Quote / Name Your Budget · Cotizaciones','Request a Prime Cut Studios production package or name your budget. Bilingual custom quotes for Central Texas video, photography and events.','/book');
export default async function Book({searchParams}:{searchParams:Promise<{service?:string;package?:string;mode?:string;lang?:string;sent?:string;error?:string}>}){
 const params=await searchParams;const categories=await getPricingCatalog();
 const service=services.find(x=>x.name===params.service||x.slug===params.service)?.name||'';
 const pack=categories.find(c=>c.name===service)?.packages.find(x=>x.id===params.package)?.id||'';
 const custom=params.mode==='custom';const preferred=params.lang||(await cookies()).get('primecut-language')?.value;const lang:Locale=preferred==='es'?'es':'en';const txt=(en:string,es:string)=>lang==='es'?es:en;
 return <><SiteHeader/><main><div className="shell pagehero"><div className="eyebrow">Production quotes / Cotizaciones · Central Texas</div><h1>{txt('Tell us your vision.','Cuéntanos tu visión.')}<br/><em>{txt('Name your budget.','Dinos tu presupuesto.')}</em></h1><p className="muted">{txt('Choose a clearly scoped package or share the amount you can invest. Every request is reviewed by our production team.','Elige un paquete con alcance definido o dinos cuánto puedes invertir. Nuestro equipo revisa cada solicitud.')}</p></div>
 <section style={{paddingTop:18}}><div className="shell two inquiry-layout"><div className="panel">
 {params.sent==='1'&&<div className="alert success" role="status"><CheckCircle2 size={20}/> {txt('Request received. Our team will review it and contact you. Your date is not reserved yet.','Solicitud recibida. Revisaremos tu proyecto y te contactaremos. Tu fecha aún no está reservada.')}</div>}
 {params.error&&<div className="alert" role="alert">{params.error==='limit'?txt('Too many requests. Please try later.','Demasiadas solicitudes. Intenta más tarde.'):params.error==='server'?txt('We could not save the request. Please try again.','No pudimos guardar la solicitud. Intenta nuevamente.'):params.error==='date'?txt('Choose a valid future date.','Elige una fecha futura válida.'):txt('Please check the required details and try again.','Revisa los datos requeridos e intenta nuevamente.')}</div>}
 <QuoteRequestForm initialService={service} initialPackage={pack} initialMode={custom?'custom':'package'} initialLanguage={lang} categories={categories}/>
 </div><aside className="panel process-panel"><div className="eyebrow">The process / El proceso</div><h2>{txt('Clear from the first conversation.','Claridad desde la primera conversación.')}</h2><div className="process-steps"><div><ClipboardList size={25}/><span><b>01 · Request / Solicitud</b><small>{txt('Choose a package or name your budget.','Elige un paquete o dinos tu presupuesto.')}</small></span></div><div><CalendarDays size={25}/><span><b>02 · Plan / Planificación</b><small>{txt('We review your needs and prepare a realistic written quote.','Revisamos tus necesidades y preparamos una propuesta escrita viable.')}</small></span></div><div><Film size={25}/><span><b>03 · Produce / Producción</b><small>{txt('Once the agreement and deposit are confirmed, we create.','Comenzamos tras confirmar el acuerdo y el depósito.')}</small></span></div><div><CheckCircle2 size={25}/><span><b>04 · Deliver / Entrega</b><small>{txt('Review and securely receive your approved files.','Revisa y recibe tus archivos aprobados de forma segura.')}</small></span></div></div><div className="note">Serving Killeen, Fort Cavazos, Copperas Cove, Harker Heights, Belton and nearby Central Texas. Travel outside the regular area may cost extra.</div></aside></div></section></main><Footer/></>;
}
