import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {castingById,requireCapability} from '@/lib/operations-db';
import {presentationFor} from '@/lib/casting-editor';
export const runtime='nodejs';export const dynamic='force-dynamic';
const multiline=(items:string[]|undefined)=>(items||[]).join('\n');
const panel={border:'1px solid #594b36',background:'#191714',borderRadius:14,padding:20,marginBottom:20} as const;
const grid={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14} as const;
const field={display:'grid',gap:8,color:'#eee0c9',fontSize:13} as const;
const input={background:'#111',border:'1px solid #574830',color:'#fff',borderRadius:9,padding:12,width:'100%',maxWidth:'100%',fontSize:14} as const;

export default async function EditCasting({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<{saved?:string;uploaded?:string}>}){
 const {id}=await params;
 if(!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id))notFound();
 const call=await castingById(id);
 if(!call)notFound();
 const actor=await requireCapability('casting.write',call.project_id);
 if(!actor)redirect('/team/casting');
 const messages=await searchParams;
 const preview=presentationFor(call);
 const status=call.presentation?.paymentStatus||(preview?.compensated===true?'paid':preview?.compensated===false?'unpaid':'pending');
 const facts=preview?.facts||[];
 return <main className="shell pagehero" style={{maxWidth:1150}}>
  <Link href="/team/casting" className="inline-link">← Volver a administración de castings</Link>
  <div className="eyebrow" style={{marginTop:24}}>PRIME CUT STUDIOS · GESTIÓN PRIVADA</div>
  <h1 style={{fontSize:'clamp(32px,4vw,53px)',margin:'12px 0'}}>Editar convocatoria</h1>
  <p className="muted">Modifica portada, personajes, texto, compensación y visibilidad. Después de guardar, los cambios aparecen en las páginas públicas sin necesidad de un nuevo deployment.</p>
  {messages.saved==='1'&&<div role="status" style={{padding:15,border:'1px solid #648354',background:'#1b3020',borderRadius:10,margin:'20px 0'}}>Cambios guardados correctamente. <Link href={'/casting/'+id} style={{color:'#f1d48b'}}>Ver convocatoria publicada ↗</Link></div>}
  {messages.uploaded==='1'&&<div role="status" style={{padding:15,border:'1px solid #648354',background:'#1b3020',borderRadius:10,margin:'20px 0'}}>Portada cargada y publicada correctamente. Si el casting está abierto, la nueva imagen ya está disponible.</div>}

  <section style={panel}>
   <h2>Portada conceptual</h2>
   {preview?.image&&<img src={preview.image} alt="Vista actual de la portada" style={{width:'100%',maxWidth:600,aspectRatio:'16/9',objectFit:'cover',borderRadius:12,border:'1px solid #4b3e29'}}/>}
   <p className="muted">Sube una imagen horizontal JPG, PNG o WebP (máximo 4 MB). Se publica al terminar la carga. Usa imágenes que tienes derecho a compartir; las conceptuales deben identificarse como referencia visual.</p>
   <form action="/api/team/casting/upload-cover" method="post" encType="multipart/form-data" style={{...grid,alignItems:'end'}}>
    <input type="hidden" name="id" value={id}/>
    <label style={field}>Seleccionar nueva portada<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required style={input}/></label>
    <button type="submit" className="btn">Subir y guardar portada</button>
   </form>
  </section>

  <form method="post" action="/api/team/casting/edit" className="form">
   <input type="hidden" name="id" value={id}/>
   <section style={panel}>
    <h2>Información pública</h2>
    <div style={grid}>
     <label style={field}>Título administrativo de la convocatoria<input style={input} required minLength={3} maxLength={160} name="title" defaultValue={call.title}/></label>
     <label style={field}>Título comercial visible<input style={input} name="shortTitle" maxLength={160} defaultValue={preview?.shortTitle||call.title}/></label>
     <label style={field}>Subtítulo del video<input style={input} name="subtitle" maxLength={180} defaultValue={preview?.subtitle||''}/></label>
     <label style={field}>Tipo de talento<input style={input} name="tag" maxLength={160} defaultValue={preview?.tag||''}/></label>
     <label style={field}>Lugar<input style={input} name="location" maxLength={150} defaultValue={call.location||''}/></label>
     <label style={field}>Ambiente del videoclip<input style={input} name="tone" maxLength={160} defaultValue={preview?.tone||''}/></label>
    </div>
    <label style={{...field,marginTop:16}}>Descripción general para textos de la convocatoria<textarea style={input} name="description" rows={3} maxLength={4200} defaultValue={call.description}/></label>
    <label style={{...field,marginTop:16}}>Historia / concepto visual principal<textarea style={input} name="story" rows={4} maxLength={2500} defaultValue={preview?.story||call.description}/></label>
    <label style={{...field,marginTop:16}}>URL actual de portada (opcional: también puedes pegar una URL HTTPS de imagen)<input style={input} name="image" maxLength={500} defaultValue={preview?.image||''}/></label>
    <p className="muted" style={{fontSize:12}}>Las portadas subidas desde arriba se enlazan automáticamente; este campo permite reemplazar manualmente la URL.</p>
   </section>
   <section style={panel}>
    <h2>Personajes y requisitos</h2>
    <p className="muted">Escribe un punto por línea. El sistema mostrará los personajes y las condiciones separados y ordenados.</p>
    <div style={grid}>
     <label style={field}>Papeles / perfiles<textarea style={input} name="roles" rows={7} maxLength={4500} defaultValue={multiline(preview?.roles)}/></label>
     <label style={field}>Vestuario y apariencia<textarea style={input} name="look" rows={7} maxLength={4500} defaultValue={multiline(preview?.look)}/></label>
     <label style={field}>Lugar / jornada / horario<textarea style={input} name="shoot" rows={6} maxLength={4500} defaultValue={multiline(preview?.shoot)}/></label>
     <label style={field}>Notas importantes<textarea style={input} name="notes" rows={6} maxLength={4500} defaultValue={multiline(preview?.notes)}/></label>
    </div>
    <label style={{...field,marginTop:16}}>Requisitos completos (información interna y referencia)<textarea style={input} name="requirements" rows={4} maxLength={4200} defaultValue={call.requirements}/></label>
   </section>
   <section style={panel}>
    <h2>Compensación y datos rápidos</h2>
    <div style={grid}>
     <label style={field}>¿La participación es pagada?<select style={input} name="paymentStatus" defaultValue={status}>
      <option value="paid">Sí, remunerada</option><option value="unpaid">No remunerada</option><option value="pending">Paga por confirmar</option>
     </select></label>
     <label style={field}>Tarifa y condiciones (si es pagada, este campo es obligatorio)<textarea style={input} name="payDetails" rows={3} maxLength={500} defaultValue={call.pay_details||''}/></label>
    </div>
    <p className="muted" style={{fontSize:12}}>Publica solo importes y condiciones aprobados. Un casting con paga pendiente no debe presentarse como remunerado.</p>
    <h3 style={{margin:'22px 0 12px'}}>Cuatro tarjetas informativas</h3>
    <div style={grid}>
     {[0,1,2,3].map(i=><div key={i} style={{padding:12,border:'1px solid #4e3e27',borderRadius:10}}>
      <label style={field}>Etiqueta {i+1}<input style={input} name={'factLabel'+i} maxLength={60} defaultValue={facts[i]?.label||''}/></label>
      <label style={{...field,marginTop:9}}>Texto {i+1}<input style={input} name={'factValue'+i} maxLength={140} defaultValue={facts[i]?.value||''}/></label>
     </div>)}
    </div>
   </section>
   <section style={panel}>
    <h2>Publicación</h2>
    <div style={grid}>
     <label style={field}>Estado<select name="status" style={input} defaultValue={call.status}>
      <option value="draft">Borrador — oculto</option><option value="open">Abierto — acepta solicitudes</option>
      <option value="closed">Cerrado — oculto</option><option value="archived">Archivado — oculto</option>
     </select></label>
     <label style={field}>Cierre de solicitudes (opcional)<input name="closesAt" type="date" style={input} defaultValue={call.closes_at?.slice(0,10)||''}/></label>
    </div>
    <p className="muted" style={{fontSize:12}}>Los candidatos y sus solicitudes existentes no se eliminan cuando editas esta convocatoria.</p>
   </section>
   <div style={{display:'flex',gap:15,flexWrap:'wrap',alignItems:'center',marginBottom:65}}>
    <button type="submit" className="btn" style={{fontSize:16,padding:'15px 32px'}}>Guardar cambios y actualizar casting</button>
    <Link className="inline-link" href={'/casting/'+id} target="_blank" rel="noopener noreferrer">Abrir página pública ↗</Link>
   </div>
  </form>
 </main>;
}
