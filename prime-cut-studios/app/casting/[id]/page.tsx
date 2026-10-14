import {WorkspaceForm} from '@/components/workspace/WorkspaceForm';
import Link from 'next/link';
import {CastingPhotoPicker} from '@/components/workspace/CastingPhotoPicker';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {SiteHeader} from '@/components/SiteHeader';
import {Footer} from '@/components/Footer';
import {castingById} from '@/lib/operations-db';
import {presentationFor} from '@/lib/casting-editor';
import {workspaceEnabled} from '@/lib/workspace-policy';
import styles from '../casting.module.css';
export const runtime='nodejs';export const dynamic='force-dynamic';

export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
 const {id}=await params;
 const c=/^[\da-f-]{36}$/i.test(id)?await castingById(id,true):null;
 return {title:c?((presentationFor(c)?.shortTitle||c.title)+' | Casting Prime Cut Studios'):'Casting | Prime Cut Studios'};
}

export default async function Apply({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[\da-f-]{36}$/i.test(id))notFound();
 const call=await castingById(id,true);
 if(!call)notFound();
 const meta=presentationFor(call);
 const closed=Boolean(call.closes_at&&Date.parse(call.closes_at)<=Date.now());
 return <><SiteHeader/><main className={styles.page}>
  <div className={styles.container}>
   <header className={styles.hero}>
    <Link className={styles.back} href="/casting">← Ver todas las convocatorias</Link>
    <div className={styles.heroGrid}>
     <div>
      <span className={styles.eyebrow}>PRIME CUT STUDIOS · CASTING ABIERTO</span>
      <h1 className={styles.heroTitle}>{meta?.shortTitle||call.title}</h1>
      {meta&&<div className={styles.heroSubtitle}>{meta.subtitle}</div>}
      <p className={styles.heroLead}>{meta?.story||call.description}</p>
      <div className={styles.heroPills}>
       <span className={meta?.compensated?styles.pill:styles.pillPending}>{meta?.paymentLabel||call.pay_details||'Compensación por confirmar'}</span>
       <span className={styles.pillPending}>{meta?.tag||'Casting abierto'}</span>
       <span className={styles.pillPending}>Central Texas</span>
      </div>
      <div className={styles.heroCTA}><a className={styles.primary} href="#solicitud">Solicitar participación ↗</a></div>
     </div>
     <div className={styles.heroImage}>
      {meta?.image?<img src={meta.image} alt={'Concepto cinematográfico para '+meta.shortTitle}/>:
       <div style={{height:'100%',display:'grid',placeItems:'center',color:'#ccb787'}}>PRIME CUT STUDIOS</div>}
      <small>Imagen conceptual de referencia. No representa al elenco, artista ni locación definitiva.</small>
     </div>
    </div>
   </header>
   <div className={styles.mainLayout}>
    <div>
     <section className={styles.section}>
      <span className={styles.eyebrow}>01 · DATOS DEL PROYECTO</span>
      <h2 style={{marginTop:10}}>Lo esencial</h2>
      <div className={styles.factGrid}>
       {(meta?.facts||[{label:'Ubicación',value:call.location||'Central Texas'},{label:'Compensación',value:call.pay_details||'Por confirmar'}]).map(f=>
        <div className={styles.fact} key={f.label}><small>{f.label}</small><strong>{f.value}</strong></div>)}
      </div>
      <div className={styles.payment}>
       <strong>{meta?.paymentLabel||call.pay_details||'Compensación por confirmar'}</strong>
       <p>{meta?.paymentDetail||'Los honorarios, condiciones y cualquier reembolso se comunicarán antes de cualquier contratación.'}</p>
      </div>
     </section>
     <section className={styles.section}>
      <span className={styles.eyebrow}>02 · CASTING</span>
      <h2 style={{marginTop:10}}>Personajes que buscamos</h2>
      {meta?<ul className={styles.list}>{meta.roles.map(x=><li key={x}>{x}</li>)}</ul>:<p style={{whiteSpace:'pre-wrap'}}>{call.requirements}</p>}
     </section>
     {meta&&<section className={styles.section}>
      <span className={styles.eyebrow}>03 · ESTILO Y PRODUCCIÓN</span>
      <h2 style={{marginTop:10}}>Concepto y requisitos</h2>
      <p><b style={{color:'#e8d1a3'}}>Estilo visual</b></p>
      <ul className={styles.list}>{meta.look.map(x=><li key={x}>{x}</li>)}</ul>
      <p style={{marginTop:18}}><b style={{color:'#e8d1a3'}}>Sobre la grabación</b></p>
      <ul className={styles.list}>{meta.shoot.map(x=><li key={x}>{x}</li>)}</ul>
      <div className={styles.notice} style={{marginTop:17}}>{meta.notes.map(x=><p key={x}>{x}</p>)}</div>
     </section>}
     <section className={styles.section}>
      <span className={styles.eyebrow}>04 · CONVOCATORIA</span>
      <h2 style={{marginTop:10}}>Antes de aplicar</h2>
      <ul className={styles.list}>
       <li>Mayores de 18 años únicamente.</li>
       <li>Solicitud gratuita. No pagues por audiciones o por ser preseleccionado.</li>
       <li>Disponibilidad y transporte a la locación por confirmar.</li>
       <li>Los detalles contractuales y de compensación se informarán antes de aceptar el papel.</li>
       <li>Las imágenes conceptuales muestran la estética prevista; no son fotografías del artista ni del rodaje.</li>
      </ul>
     </section>
    </div>
    <aside className={styles.applyCard} id="solicitud">
     <span className={styles.eyebrow}>APLICA DIRECTAMENTE</span>
     <h2>Envía tu solicitud</h2>
     <p>Completa la información a continuación. Solo contactaremos a los perfiles preseleccionados.</p>
     {closed?<div className={styles.empty}>El periodo de solicitudes para esta convocatoria ha finalizado.</div>:
     <WorkspaceForm method="post" action="/api/casting/apply" encType="multipart/form-data" className={styles.form}>
      <input type="hidden" name="callId" value={call.id}/>
      <div className={styles.field}><label htmlFor="casting-full-name">Nombre completo *</label><input id="casting-full-name" name="fullName" autoComplete="name" minLength={2} maxLength={140} required placeholder="Tu nombre y apellido"/></div>
      <div className={styles.field}><label htmlFor="casting-email">Correo electrónico *</label><input id="casting-email" name="email" type="email" autoComplete="email" maxLength={254} required placeholder="tu@correo.com"/></div>
      <div className={styles.twoCols}>
       <div className={styles.field}><label htmlFor="casting-phone">Teléfono</label><input id="casting-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} placeholder="(254) 555-0100"/></div>
       <div className={styles.field}><label htmlFor="casting-city">Ciudad</label><input id="casting-city" name="city" maxLength={100} placeholder="Killeen, TX"/></div>
      </div>
      <CastingPhotoPicker/><div className={styles.field}><label htmlFor="casting-headshot">Enlace a una foto reciente (opcional)</label><input id="casting-headshot" name="headshotUrl" type="url" maxLength={500} placeholder="https://..."/><small>Pega un enlace HTTPS accesible de Google Drive, Lightroom o tu portafolio. Asegúrate de permitir la visualización.</small></div>
      <div className={styles.field}><label htmlFor="casting-portfolio">Portafolio / redes / demo reel</label><input id="casting-portfolio" name="portfolioUrl" type="url" maxLength={500} placeholder="https://..."/></div>
      <div className={styles.field}><label htmlFor="casting-experience">Papel solicitado y experiencia</label><textarea id="casting-experience" name="experience" rows={4} maxLength={1800} placeholder={id==='5336e475-8dc8-4b47-a852-aeaf12fc7472'?'Indica: EX, ACOMPAÑANTE, PAREJA, BARTENDER o EXTRA. Añade tu experiencia.':'Indica si solicitas individualmente o como pareja. Cuéntanos tu experiencia y, si aplica, el nombre de tu pareja.'}/></div>
      <div className={styles.field}><label htmlFor="casting-availability">Disponibilidad</label><textarea id="casting-availability" name="availability" rows={3} maxLength={500} placeholder="Fechas y horarios en que puedes grabar"/></div>
      <label className={styles.consent}><input type="checkbox" name="consent" value="yes" required/><span>Autorizo a Prime Cut Studios a usar mis datos únicamente para evaluar esta convocatoria y contactarme. *</span></label>
      {workspaceEnabled()&&<><label className={styles.consent}><input type="checkbox" name="talentBank" value="yes"/><span>Quiero formar parte del banco privado de talentos de Prime Cut Studios para que puedan contactarme sobre futuras producciones propias o proyectos de sus clientes. Es opcional y puedo retirar mi autorización.</span></label><label className={styles.consent}><input type="checkbox" name="clientMaterial" value="yes"/><span>Si decido entrar al banco, autorizo compartir mi perfil profesional y materiales de portafolio en selecciones privadas para clientes. Mi teléfono y correo permanecerán privados. No autorizo publicidad ni entrenamiento de IA.</span></label><p>Podrás enviar esta solicitud sin entrar al banco. Si eliges entrar, recibirás un enlace privado para administrar tus preferencias.</p></>}
      <label className={styles.consent}><input type="checkbox" name="adult" value="yes" required/><span>Confirmo que tengo 18 años o más. *</span></label>
      <input className={styles.hidden} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"/>
      <button type="submit" className={styles.submit}>Enviar mi solicitud ↗</button>
      <p>Tu información será revisada de forma privada por el equipo de casting. El envío no garantiza una selección.</p>
     </WorkspaceForm>}
    </aside>
   </div>
  </div>
 </main><Footer/></>;
}
