'use client';
import {useEffect,useState} from 'react';
import type {Locale} from '@/lib/pricing';
export function useSalesLanguage(initial:Locale='en'){
 const [lang,set]=useState<Locale>(initial);
 useEffect(()=>{const sync=()=>{const query=new URLSearchParams(window.location.search).get('lang');let saved:string|null=null;try{saved=localStorage.getItem('primecut-language');}catch{};const next=query==='es'||query==='en'?query:saved==='es'?'es':initial;set(next);document.documentElement.lang=next;};sync();window.addEventListener('primecut-language',sync);return()=>window.removeEventListener('primecut-language',sync);},[initial]);
 const setLang=(value:Locale)=>{set(value);try{localStorage.setItem('primecut-language',value);}catch{}document.documentElement.lang=value;document.cookie=`primecut-language=${value}; Path=/; SameSite=Lax; Max-Age=31536000`;const url=new URL(window.location.href);url.searchParams.set('lang',value);window.history.replaceState(null,'',url);window.dispatchEvent(new Event('primecut-language'));};
 const localized=(href:string)=>{const [path,hash]=href.split('#');return path+(path.includes('?')?'&':'?')+'lang='+lang+(hash?'#'+hash:'');};
 return {lang,setLang,localized,txt:(en:string,es:string)=>lang==='es'?es:en};
}
