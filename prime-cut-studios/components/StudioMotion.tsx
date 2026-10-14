'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
export function StudioMotion(){const pathname=usePathname();useEffect(()=>{
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window))return;
 const nodes=document.querySelectorAll('main .service-card,main .sectionhead,main .portfolio-card,main .faq-grid>details,main .inquiry-card');
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('motion-visible');observer.unobserve(entry.target);}}),{threshold:.08});
 nodes.forEach(node=>{node.classList.add('studio-reveal');observer.observe(node);});
 return ()=>{observer.disconnect();nodes.forEach(node=>node.classList.remove('studio-reveal','motion-visible'));};
},[pathname]);return null;}
