import {publicMetadata} from '@/lib/public-metadata';
export const metadata=publicMetadata("Castings abiertos en Central Texas","Convocatorias de videoclips y producciones en Central Texas. Descubre roles, compensaci\u00f3n, requisitos y aplica de forma segura.","/casting");
import {workspaceEnabled} from '@/lib/workspace-policy';
import Link from 'next/link';
import type {Metadata} from 'next';
import {SiteHeader} from '@/components/SiteHeader';
import {Footer} from '@/components/Footer';
import {castingCalls} from '@/lib/operations-db';
import {presentationFor} from '@/lib/casting-editor';
import styles from './casting.module.css';


export const runtime='nodejs';export const dynamic='force-dynamic';

export default async function Casting({searchParams}:{searchParams:Promise<{sent?:string}>}){
 const params=await searchParams;let calls;try{calls=await castingCalls(true);}catch{return <><SiteHeader/><main className="shell pagehero"><h1>Castings</h1><section className="panel"><p role="alert">Las convocatorias no están disponibles temporalmente. Vuelve a consultar o contacta al estudio.</p><Link className="btn" href="/book">Contactar al estudio</Link></section></main><Footer/></>;}
 const active=calls.filter(c=>!c.closes_at||Date.parse(c.closes_at)>Date.now());
 return <><SiteHeader/><main className={styles.page}>
  <div className={styles.container}>
   <header className={styles.indexHero}>
    <span className={styles.eyebrow}>PRIME CUT STUDIOS · CASTING EN CENTRAL TEXAS</span>
    <h1 className={styles.heading}>Tu próximo papel<br/><em>comienza aquí.</em></h1>
    <p className={styles.lede}>Explora nuestras convocatorias, conoce el concepto de cada producción y solicita tu participación directamente. Los datos de los aspirantes se revisan de manera privada.</p>
    <div className={styles.count}>{active.length} {active.length===1?'convocatoria abierta':'convocatorias abiertas'}</div>
   </header>
   {params.sent==='1'&&<div role="status" className={styles.message}>Gracias. Tu solicitud ha sido recibida. Revisaremos tu perfil y contactaremos a las personas preseleccionadas. Enviar una solicitud no garantiza selección.</div>}
   <div className={styles.grid}>
    {active.map(c=>{
      const meta=presentationFor(c);
      return <article className={styles.card} key={c.id}>
        <div className={styles.cardPhoto}>
          {meta?.image?<img src={meta.image} alt={meta.shortTitle+' — imagen conceptual del videoclip'} loading="lazy"/>:
            <div style={{height:'100%',display:'grid',placeItems:'center',color:'#c9b68b'}}>PRIME CUT STUDIOS</div>}
          <span className={styles.photoBadge}>CASTING ABIERTO</span>
          {meta&&<span className={styles.photoCaption}>Imagen de referencia conceptual · No es el elenco definitivo</span>}
        </div>
        <div className={styles.cardBody}>
          <span className={styles.eyebrow}>{meta?.tag||'OPORTUNIDAD DE CASTING'}</span>
          <h2>{meta?.shortTitle||c.title}</h2>
          <p className={styles.summary}>{meta?.story||c.description}</p>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'14px 0'}}>
            <span className={meta?.compensated?styles.pill:styles.pillPending}>{meta?.paymentLabel||c.pay_details||'Compensación pendiente de confirmar'}</span>
          </div>
          <div className={styles.metrics}>
            <div className={styles.metric}><small>Ubicación</small>{c.location||'Central Texas'}</div>
            <div className={styles.metric}><small>Perfiles</small>{meta?.facts.find(f=>f.label==='Perfiles')?.value||meta?.tag||'Talento frente a cámara'}</div>
          </div>
          <Link className={styles.primary} href={'/casting/'+c.id}>Ver casting y aplicar <span aria-hidden>↗</span></Link>
        </div>
      </article>;
    })}
    {active.length===0&&<div className={styles.empty}>No hay convocatorias abiertas en este momento. Vuelve a consultar esta página para próximas oportunidades.</div>}
   </div>
  </div>
 {workspaceEnabled()&&<div className="shell panel" style={{marginBottom:40}}><h2>Más oportunidades para tu talento</h2><p>También puedes solicitar formar parte de nuestro banco privado para futuras producciones, sin aplicar a un casting específico.</p><a className="btn" href="/talent/join">Banco privado de talentos ↗</a></div>}</main><Footer/></>;
}
