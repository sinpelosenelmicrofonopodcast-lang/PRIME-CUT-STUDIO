'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,ChevronLeft,ChevronRight,Pause,Play} from 'lucide-react';
import frames from '@/lib/public-portfolio-frames.json';

export function CinematicHero({portfolio=false}:{portfolio?:boolean}){
 const [order,setOrder]=useState(()=>frames.map((_,i)=>i));
 const [position,setPosition]=useState(0),[paused,setPaused]=useState(false),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false),[reduced,setReduced]=useState(true);
 const [failed,setFailed]=useState<number[]>([]);
 useEffect(()=>{
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>setReduced(motion.matches);update();motion.addEventListener('change',update);
  const shuffled=frames.map((_,i)=>i);
  for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  try{const key='primecuts-frame-start:'+String(portfolio),previous=Number(sessionStorage.getItem(key));if(shuffled[0]===previous&&shuffled.length>1)[shuffled[0],shuffled[1]]=[shuffled[1],shuffled[0]];sessionStorage.setItem(key,String(shuffled[0]));}catch{/* Storage is optional. */}
  setOrder(shuffled);
  return ()=>motion.removeEventListener('change',update);
 },[portfolio]);
 useEffect(()=>{
  if(paused||hovered||focused||reduced||failed.length===frames.length)return;
  const timer=setInterval(()=>{if(!document.hidden)setPosition(p=>(p+1)%frames.length);},6500);
  return ()=>clearInterval(timer);
 },[paused,hovered,focused,reduced,failed.length]);
 const active=order[position],next=order[(position+1)%frames.length];
 const move=(delta:number)=>{setPaused(true);setPosition(p=>(p+delta+frames.length)%frames.length);};
 return <section className={'cinema-hero '+(portfolio?'cinema-portfolio':'')} aria-label={portfolio?'Selected portfolio photographs':'Prime Cut Studios production portfolio'} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setFocused(false);}}>
  <div className="cinema-backdrop" aria-hidden="true">{!failed.includes(active)&&<img key={active} className="cinema-frame" src={frames[active].src} alt="" width={2048} height={1365} fetchPriority="high" style={{objectPosition:frames[active].position}} onError={()=>{setFailed(v=>v.includes(active)?v:[...v,active]);setPosition(p=>(p+1)%frames.length);}}/>}{!paused&&!reduced&&!failed.includes(next)&&<img className="cinema-preload" src={frames[next].src} alt="" loading="lazy"/>}<div className="cinema-shade"/></div>
  <div className="shell cinema-content"><p className="eyebrow">Killeen, Texas · Photography & film</p><h1>{portfolio?<>Stories.<br/><em>Worth keeping.</em></>:<>Make it<br/><em>unforgettable.</em></>}</h1><p className="cinema-intro">{portfolio?'Real people. Real productions. Explore the work that makes Prime Cut Studios.':'Photography, films and creative production for artists, brands and the moments that deserve more.'}</p><div className="cinema-actions"><Link href="/book" className="btn">Plan your production <ArrowUpRight size={18}/></Link><Link href={portfolio?'https://lightroom.adobe.com/shares/5b61ae7322144a77ba85dc2cca5e866f':'/portfolio'} className="cinema-link" {...(portfolio?{target:'_blank',rel:'noopener noreferrer'}:{})}>{portfolio?'Explore the live gallery':'See our work'} <ArrowUpRight size={17}/></Link></div><div className="cinema-services"><Link href="/book?service=Photography">Photography</Link><Link href="/book?service=Music%20Videos">Music videos</Link><Link href="/book?service=Business%20Content">Brand films</Link><Link href="/book?service=Event%20Coverage">Events</Link></div></div>
  <div className="shell cinema-bottom"><div className="cinema-caption"><span>Selected work</span><p>{frames[active].alt}</p></div><div className="cinema-controls"><button type="button" aria-label="Previous photograph" onClick={()=>move(-1)}><ChevronLeft size={18}/></button><span aria-label={'Photograph '+(position+1)+' of '+frames.length}>{String(position+1).padStart(2,'0')} / {String(frames.length).padStart(2,'0')}</span><button type="button" aria-label="Next photograph" onClick={()=>move(1)}><ChevronRight size={18}/></button><button type="button" aria-label={paused||reduced?'Play photographs':'Pause photographs'} onClick={()=>{if(paused||reduced){setPaused(false);setReduced(false);}else setPaused(true);}}>{paused||reduced?<Play size={15}/>:<Pause size={15}/>}</button></div></div>
 </section>;
}
