'use client';
import {useSalesLanguage} from './useSalesLanguage';
import Link from 'next/link';
import {ArrowUpRight,Check,MoveRight} from 'lucide-react';
import {publicPricingCategories,pricingAddOns,currency,type PricingCategory,type Locale} from '@/lib/pricing';

export function PricingCatalog({categories=publicPricingCategories}:{categories?:PricingCategory[]}){
 const {lang,setLang,localized}=useSalesLanguage();
 const isEs=lang==='es';
 const txt=(en:string,es:string)=>isEs?es:en;
 return <div className="pricing-wrap">
   <div className="shell pricing-intro">
    <div><div className="eyebrow">{txt('2026 launch rates · Central Texas','Precios de lanzamiento 2026 · Centro de Texas')}</div>
      <h1>{txt('The right production.','La producción ideal.')}<br/><em>{txt('The right investment.','La inversión correcta.')}</em></h1>
      <p className="muted">{txt('Explore our clearly scoped packages, or tell us your budget. We will look for a creative, realistic option without promising unlimited production.','Explora nuestros paquetes con alcance definido o dinos tu presupuesto. Buscaremos una opción creativa y realista, sin prometer producción ilimitada.')}</p>
      <div className="pricing-hero-actions"><Link href={localized("/book?mode=custom")} className="btn">{txt('Name Your Budget','Dinos tu presupuesto')} <ArrowUpRight size={17}/></Link><a href="#packages" className="btn secondary">{txt('Browse packages','Ver paquetes')}</a></div>
    </div>
    <div role="group" aria-label="Language / Idioma" className="pricing-language"><button type="button" className={lang==='en'?'active':''} aria-pressed={lang==='en'} onClick={()=>setLang('en')}>English</button><button type="button" className={lang==='es'?'active':''} aria-pressed={lang==='es'} onClick={()=>setLang('es')}>Español</button></div>
   </div>
   <section className="shell pricing-categories" id="packages" aria-label={txt('Service packages','Paquetes de servicios')}>
    <nav aria-label={txt('Jump to service','Ir al servicio')} className="pricing-jump">{categories.map(c=><a key={c.slug} href={`#price-${c.slug}`}>{c.title[lang]}</a>)}</nav>
    {categories.map((category,i)=><section key={category.slug} className="pricing-category" id={`price-${category.slug}`}>
      <div className="pricing-category-head"><div><div className="eyebrow">{String(i+1).padStart(2,'0')} / {txt('Production services','Servicios de producción')}</div><h2>{category.title[lang]}</h2><p className="muted">{category.tagline[lang]}</p></div>
        <Link className="pricing-budget-inline" href={localized(`/book?service=${encodeURIComponent(category.name)}&mode=custom`)}>{txt('Name Your Budget','Dinos tu presupuesto')} <MoveRight size={17}/></Link>
      </div>
      {category.packages.length>0?<div className="pricing-card-grid">{category.packages.map(pack=><article key={pack.id} className={`pricing-card ${pack.featured?'pricing-card-featured':''}`}>
        {pack.featured&&<span className="pricing-featured-tag">{txt('Popular choice','Más solicitado')}</span>}
        <h3>{pack.title[lang]}</h3><div className="pricing-amount">{pack.plus&&<span className="pricing-starts">{txt('from','desde')}</span>}{currency(pack.price)}{pack.billing==='month'&&<small>{txt('/ month','/ mes')}</small>}{pack.billing==='image'&&<small>{txt('/ image','/ imagen')}</small>}</div>
        <ul>{pack.features.map((feature,j)=><li key={j}><Check size={16} aria-hidden="true"/>{feature[lang]}</li>)}</ul>
        {pack.scope&&<dl className="small">{Object.entries(pack.scope).filter(([,value])=>value?.[lang]).map(([key,value])=><div key={key}><dt>{txt(({crew:'Crew',locations:'Locations',revisions:'Revisions',exclusions:'Exclusions',addons:'Add-ons'} as Record<string,string>)[key],({crew:'Equipo',locations:'Lugares',revisions:'Revisiones',exclusions:'Exclusiones',addons:'Complementos'} as Record<string,string>)[key])}</dt><dd>{value?.[lang]}</dd></div>)}</dl>}<p className="small muted">{txt('Revisions: allowance and delivery date confirmed in your written proposal. Actors, permits, travel, taxes and rentals excluded unless listed.','Revisiones: cantidad y entrega confirmadas en la propuesta escrita. Actores, permisos, viajes, impuestos y alquileres excluidos salvo que se indiquen.')}</p><div className="pricing-actions"><Link href={localized(`/book?service=${encodeURIComponent(category.name)}&package=${encodeURIComponent(pack.id)}`)} className="btn">{txt('Choose package','Elegir paquete')} <ArrowUpRight size={15}/></Link><Link href={localized(`/book?service=${encodeURIComponent(category.name)}&mode=custom`)} className="btn secondary">{txt('Name Your Budget','Dinos tu presupuesto')}</Link></div>
      </article>)}</div>:<div className="pricing-empty"><p>{txt('Have a special project? Describe it and choose your own budget range.','¿Tienes un proyecto especial? Cuéntanos y escoge tu presupuesto.')}</p><Link href={localized(`/book?service=${encodeURIComponent(category.name)}&mode=custom`)} className="btn">{txt('Build a custom quote','Solicitar cotización personalizada')} <ArrowUpRight size={16}/></Link></div>}
      {category.note&&<p className="pricing-note">{category.note[lang]}</p>}
    </section>)}
   </section>
   <section className="pricing-extras"><div className="shell"><div className="eyebrow">{txt('Need a little more?','¿Necesitas algo más?')}</div><h2>{txt('Popular add-ons','Complementos disponibles')}</h2><p className="muted">{txt('Add these to a custom quote; availability and exact scope are confirmed before booking.','Añádelos a tu solicitud; disponibilidad y alcance final se confirman antes de reservar.')}</p><div className="pricing-extras-grid">{pricingAddOns.map((x,i)=><div key={i}><Check size={15}/>{x[lang]}</div>)}</div></div></section>
   <section className="pricing-final"><div className="shell pricing-final-inner"><div className="eyebrow">{txt('Your vision. Your budget.','Tu visión. Tu presupuesto.')}</div><h2>{txt('Have a budget in mind?','¿Ya tienes un presupuesto?')}</h2><p>{txt('Every project starts somewhere. We can adjust the number of hours, locations, crew, and deliverables to find a responsible fit. A smaller budget means a smaller scope—not a lower quality standard.','Todo proyecto comienza por algún lugar. Podemos ajustar horas, localizaciones, personal y entregables para encontrar una solución viable. Menor presupuesto significa menor alcance, no menor calidad.')}</p><Link href={localized("/book?mode=custom")} className="btn">{txt('Name Your Budget','Dinos tu presupuesto')} <ArrowUpRight size={18}/></Link></div></section>
   <section className="shell pricing-terms"><h2>{txt('Clear terms. Better productions.','Condiciones claras. Mejores producciones.')}</h2><div className="pricing-terms-grid">
    <p>{txt('Published rates are starting prices in USD. Quotes include an agreed scope, deliverables, revisions and timeline. Actors, permits, rentals, travel, taxes and external expenses are separate unless expressly listed.','Tarifas iniciales en USD. Cada propuesta establece alcance, entregables, revisiones y calendario. Actores, permisos, alquileres, transporte, impuestos y gastos externos van aparte salvo que se indique lo contrario.')}</p>
    <p>{txt('Typical booking deposit: 50% upon contract. Dates are only held after written acceptance and deposit. Most productions include 1–2 revision rounds as specified in the written proposal.','Anticipo típico de reserva: 50% con contrato. Las fechas se confirman tras aceptación escrita y anticipo. La mayoría de las producciones incluye 1–2 rondas de revisiones, según propuesta escrita.')}</p>
    <p>{txt('Our regular service area is within approximately 25 miles of Killeen. Extended travel and additional shoot hours are quoted separately. Usage rights and delivery formats are specified by project.','Nuestra zona habitual cubre aproximadamente 25 millas desde Killeen. Viajes y horas adicionales se cotizan aparte. Los derechos de uso y formatos de entrega se especifican por proyecto.')}</p>
   </div></section>
 </div>;
}
