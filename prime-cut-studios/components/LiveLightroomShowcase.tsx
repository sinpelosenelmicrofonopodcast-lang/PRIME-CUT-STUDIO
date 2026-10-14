'use client';

import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import Link from 'next/link';

type Props = {albumUrl:string;embedUrl?:string|null;title:string;description?:string;featured?:boolean};

/** Lightroom's slideshow endpoint, not its non-embeddable gallery webpage.
 * This path format matches Adobe's public embed examples. The source album
 * still belongs to Lightroom and updates without re-uploading or polling.
 */
function officialSlideshow(albumUrl:string,configured?:string|null){
  try {
    const album=new URL(albumUrl);
    if(album.protocol!=='https:'||album.hostname!=='lightroom.adobe.com')return null;
    const match=album.pathname.match(/^\/shares\/([a-f0-9]{32})\/?$/i);
    if(!match)return null;
    const slideshow='/embed/shares/'+match[1]+'/slideshow';
    if(configured){
      const supplied=new URL(configured);
      if(supplied.protocol==='https:'&&supplied.hostname==='lightroom.adobe.com'&&supplied.pathname===slideshow)return supplied.toString();
    }
    return new URL(slideshow+'?background_color=%230b0b0b&color=%23f4e5cc','https://lightroom.adobe.com').toString();
  }catch{return null;}
}

export function LiveLightroomShowcase({albumUrl,embedUrl,title}:Props){
 const root=useRef<HTMLElement|null>(null);
 const [inView,setInView]=useState(false);
 const url=officialSlideshow(albumUrl,embedUrl);
 useEffect(()=>{
   const node=root.current;
   if(!node)return;
   if(typeof IntersectionObserver==='undefined'){setInView(true);return;}
   const observer=new IntersectionObserver(entries=>{
     if(entries.some(entry=>entry.isIntersecting)){setInView(true);observer.disconnect();}
   },{rootMargin:'240px 0px',threshold:0});
   observer.observe(node);
   return ()=>observer.disconnect();
 },[]);
 if(!url)return <section className="prime-photo-clean" aria-label={title}>
   <div className="prime-photo-art">
     <div className="prime-photo-art-copy"><span>PRIME CUT STUDIOS</span><h2>El próximo gran proyecto puede ser el tuyo.</h2>
       <a href={albumUrl} target="_blank" rel="noopener noreferrer" className="prime-photo-link">Ver nuestro trabajo <ArrowUpRight size={18}/></a></div>
   </div></section>;
 return <section ref={root} className="prime-photo-clean" aria-label={title}>
   <div className="prime-photo-art">
    {inView&&<iframe
      className="prime-photo-slideshow"
      title="Fotografías de Prime Cut Studios"
      src={url}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />}
    <div className="prime-photo-screen" aria-hidden="true"/>
    <div className="prime-photo-art-copy">
      <span>PRIME CUT STUDIOS / FOTOGRAFÍA</span>
      <h2>Fotografía que se siente.</h2>
      <div className="prime-photo-actions">
        <a href={albumUrl} target="_blank" rel="noopener noreferrer" className="prime-photo-link">
          Explorar nuestro trabajo <ArrowUpRight size={18}/>
        </a>
        <Link href="/book" className="prime-photo-secondary">Cotiza tu proyecto <ArrowUpRight size={17}/></Link>
      </div>
    </div>
   </div>
 </section>;
}
