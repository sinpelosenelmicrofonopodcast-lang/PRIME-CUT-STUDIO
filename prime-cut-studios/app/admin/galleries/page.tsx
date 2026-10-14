import Link from 'next/link';
import {redirect} from 'next/navigation';
import {adminAuthenticated} from '@/lib/auth';
import {listProjects} from '@/lib/db';
import {allPhotoGalleries,galleryCategories} from '@/lib/photo-galleries';
import {featuredLightroomAlbum} from '@/lib/featured-lightroom';
export const runtime='nodejs';export const dynamic='force-dynamic';
export default async function PhotoGalleries(){
 if(!await adminAuthenticated())redirect('/admin/login');
 const [projects,albums]=await Promise.all([listProjects(),allPhotoGalleries()]);
 const publicCount=albums.filter(g=>g.visibility==='public').length;
 const privateCount=albums.filter(g=>g.visibility==='client').length;
 return <main className="shell pagehero" style={{maxWidth:1100}}>
  <div className="eyebrow">PrimeCuts OS · Owner workspace</div><h1>Lightroom photo galleries</h1>
  <p className="muted">Paste a shared Lightroom album link. Draft by default. You control whether each album appears inside a client's authenticated project or the public portfolio. Lightroom permissions remain independent.</p>
  <p><Link className="inline-link" href="/admin">← Owner dashboard</Link></p>
  <div className="cards4"><div className="dashmetric"><span>Saved galleries</span><b>{albums.length}</b></div><div className="dashmetric"><span>Client-only</span><b>{privateCount}</b></div><div className="dashmetric"><span>Public, approved</span><b>{publicCount}</b></div></div>

  <section className="panel" style={{marginTop:24,borderColor:'#8d704c'}}>
   <div className="eyebrow">Featured public portfolio · Lightroom live</div>
   <h2>Conectar el álbum principal</h2>
   <p className="muted">Ya elegiste mostrar este álbum completo en la portada y el portafolio, sin subir copias. Este panel registra el código oficial de Lightroom una sola vez; las futuras fotos se actualizan desde Adobe sin volver a modificar la página.</p>
   <p><a className="inline-link" target="_blank" rel="noopener noreferrer" href={featuredLightroomAlbum.albumUrl}>Abrir álbum seleccionado ↗</a></p>
   <form action="/api/admin/galleries" method="post" className="form">
    <input type="hidden" name="action" value="featured"/>
    <div className="field"><label>Código de inserción oficial de Lightroom</label>
     <textarea required name="embed" rows={3} maxLength={1800} placeholder={'<iframe src="https://lightroom.adobe.com/..."></iframe>'}/></div>
    <label><input type="checkbox" name="consent" value="yes" required/> Confirmo que tengo autorización para mostrar públicamente todas las fotografías y personas del álbum.</label>
    <button className="btn" type="submit">Activar álbum en la portada y el portafolio</button>
   </form>
   <p className="small muted">En Lightroom Web: Compartir e invitar → icono &lt;/&gt; → Copiar código. No activa cargas de fotos, tareas programadas ni servicios nuevos.</p>
  </section>
  <section className="panel" style={{marginTop:24}}><h2>Add Lightroom gallery</h2>
   <p className="muted">An album can belong to a client production or remain unassigned until a project is selected. Adding never publishes automatically.</p>
   <form className="form" method="post" action="/api/admin/galleries">
    <input name="action" type="hidden" value="create"/>
    <div className="field"><label>Gallery title</label><input name="title" required minLength={2} maxLength={140} placeholder="Client highlights — final delivery"/></div>
    <div className="field"><label>Lightroom shared album link</label><input name="url" required type="url" maxLength={1000} placeholder="https://adobe.ly/..."/></div>
    <div className="field"><label>Optional Lightroom embed URL or copied iframe code</label><textarea name="embed" maxLength={1800} rows={2} placeholder="Paste Lightroom's <> embed code only when available"/></div>
    <div className="field"><label>Project (optional for a draft)</label><select name="projectId"><option value="">Not assigned — owner-only draft</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title} · {p.client_name}</option>)}</select></div>
    <div className="form-two"><div className="field"><label>Purpose</label><select name="galleryType"><option value="proofs">Proofing / favorites / comments</option><option value="final_delivery">Finished photo delivery</option><option value="portfolio">Public portfolio candidate</option></select></div><div className="field"><label>Category</label><select name="category">{galleryCategories.map(c=><option key={c} value={c}>{c}</option>)}</select></div></div>
    <div className="field"><label>Client-facing description</label><textarea name="description" maxLength={1200} rows={3} placeholder="What the client should know about reviewing or downloading"/></div>
    <label><input type="checkbox" name="downloads" value="yes"/> Final downloads intended (requires enabling downloads in Lightroom separately)</label>
    <button className="btn" type="submit">Save as private draft</button>
   </form>
  </section>
  <section className="admin-section"><h2>Saved albums</h2>
   {albums.length===0&&<div className="empty">No galleries saved yet. Your Lightroom URL has not been imported automatically.</div>}
   <div className="grid">{albums.map(a=><article className="panel" key={a.id}>
    <div className="eyebrow">{a.gallery_type.replace('_',' ')} · {a.visibility}</div><h3>{a.title}</h3><p className="muted">{a.description}</p>
    {a.embed_url&&<p className="small muted">Embed configured — preview in the client portal after permission is granted.</p>}<div className="equipment-links"><a href={a.album_url} rel="noopener noreferrer" target="_blank">Open Lightroom album ↗</a></div>
    <p className="small muted">Project: {projects.find(p=>p.id===a.project_id)?.title||'No project assigned'} · Downloads: {a.requested_downloads?'Intended, check Adobe settings':'Not requested'}</p>
    <form className="form" method="post" action="/api/admin/galleries">
     <input type="hidden" name="action" value="visibility"/><input type="hidden" name="id" value={a.id}/>
     <div className="field"><label>Visibility</label><select name="visibility" defaultValue={a.visibility}><option value="draft">Owner-only draft</option>{a.project_id&&<option value="client">Client login required</option>}{a.gallery_type==='portfolio'&&<option value="public">Public portfolio (requires consent)</option>}</select></div>
     <label><input type="checkbox" name="consent" value="yes" defaultChecked={a.consent_confirmed}/> Written permission to publish in public portfolio confirmed</label>
     <button className="btn secondary" type="submit">Save visibility</button>
    </form>
   </article>)}</div>
  </section>
 </main>;
}