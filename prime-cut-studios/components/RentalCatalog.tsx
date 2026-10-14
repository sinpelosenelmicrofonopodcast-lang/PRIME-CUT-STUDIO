'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {Camera,Search,BookOpen,ExternalLink,Check,Plus,Minus,ShieldCheck} from 'lucide-react';
import {groupEquipment} from '@/lib/equipment-groups';
import type {EquipmentItem} from '@/lib/equipment-catalog';
type Listing=EquipmentItem & {priceCents?:number|null};
export function RentalCatalog({items}:{items:Listing[]}){
 const [failedImages,setFailedImages]=useState<Set<string>>(new Set());
 const [search,setSearch]=useState(''),[category,setCategory]=useState('All'),[selected,setSelected]=useState<string[]>([]);
 const categories=useMemo(()=>['All',...Array.from(new Set(items.map(i=>i.category))).sort()],[items]);
 const groups=useMemo(()=>groupEquipment(items),[items]);
 const visible=groups.filter(group=>(category==='All'||group.units[0].category===category)&&(group.name+' '+group.units.map(i=>i.id).join(' ')).toLowerCase().includes(search.toLowerCase()));
 const adjust=(ids:string[],delta:number)=>setSelected(current=>{if(delta<0){const last=[...ids].reverse().find(id=>current.includes(id));return current.filter(id=>id!==last);}const next=ids.find(id=>!current.includes(id));return next&&current.length<12?[...current,next]:current;});
 return <div className="shell" style={{paddingBottom:70}}>
  <div className="rental-controls"><label className="rental-search"><Search size={18}/><input aria-label="Search equipment" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find your equipment…"/></label></div>
  <div className="rental-categories" aria-label="Equipment categories">{categories.map(cat=><button type="button" aria-pressed={category===cat} onClick={()=>setCategory(cat)} key={cat}>{cat}</button>)}</div>
  <div className="rental-metrics"><strong>{visible.length} models</strong><span>Availability and rental terms confirmed with your quote</span></div>
  <div className="rental-grid">{visible.map(group=>{
   const item=group.units.find(unit=>unit.photoUrl&&!failedImages.has(unit.id))||group.units[0];
   const ids=group.units.map(unit=>unit.id),count=ids.filter(id=>selected.includes(id)).length;
   return <article className="rental-card" key={group.key}>
    <div className="equipment-picture">{item.photoUrl&&!failedImages.has(item.id)?<img src={item.photoUrl} alt={group.name} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailedImages(current=>new Set(current).add(item.id))}/>:<div className="equipment-no-photo"><Camera size={32}/><small>Photo coming soon</small></div>}</div>
    <div className="equipment-details"><span className="equipment-category-label">{item.category}</span><h3>{group.name}</h3><span className="equipment-stock">{group.quantity} {group.quantity===1?'unit':'units'} in studio · Quote on request</span>
     <details className="equipment-more"><summary>Specifications & references</summary><div className="equipment-specs">{item.specs.map(s=><span key={s}>{s}</span>)}</div><div className="equipment-links">{item.manufacturerUrl&&<a href={item.manufacturerUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Product</a>}{item.manualUrl&&<a href={item.manualUrl} target="_blank" rel="noopener noreferrer"><BookOpen size={14}/> Manual</a>}</div></details>
    </div>
    <div className="equipment-card-action">{count===0?<button type="button" className="btn secondary" onClick={()=>adjust(ids,1)} disabled={selected.length>=12}><Plus size={16}/> Add to quote</button>:<div className="equipment-quantity"><button type="button" aria-label={'Remove one '+group.name} onClick={()=>adjust(ids,-1)}><Minus size={16}/></button><span><Check size={14}/> {count} selected</span><button type="button" aria-label={'Add one '+group.name} disabled={count>=ids.length||selected.length>=12} onClick={()=>adjust(ids,1)}><Plus size={16}/></button></div>}</div>
   </article>;
  })}</div>
  {selected.length>0&&<div className="rental-quote-bar"><span>{selected.length} {selected.length===1?'unit':'units'} selected</span><a className="btn btn-small" href="#request-rental">Continue to quote</a></div>}
  {visible.length===0&&<div className="empty">No matching equipment. Try another search.</div>}
  <section id="request-rental" className="panel rental-request"><div className="eyebrow">Custom rental quote</div><h2>Equipment availability request</h2><p className="muted">Choose up to 12 items, tell us the dates, and we'll confirm availability, coverage requirements, rates and pickup conditions. This is not an instant reservation.</p>
   {selected.length>0&&<div className="rental-selection">{groups.map(group=>{const ids=group.units.map(unit=>unit.id),count=ids.filter(id=>selected.includes(id)).length;return count?<span className="pill" key={group.key}>{group.name} × {count}<button type="button" aria-label={'Remove one '+group.name} onClick={()=>adjust(ids,-1)}><Minus size={12}/></button></span>:null})}</div>}
   <form method="post" action="/api/rentals/request" className="rental-inquiry-form"><input type="hidden" name="equipmentIds" value={selected.join(',')}/>
    <label>Name<input name="name" type="text" minLength={2} maxLength={120} required/></label>
    <label>Email<input name="email" type="email" maxLength={254} required/></label>
    <label>Phone<input name="phone" type="tel" maxLength={40}/></label>
    <label>Pickup / start date<input name="startDate" type="date" required/></label>
    <label>Return / end date<input name="endDate" type="date" required/></label>
    <label>Project and requirements<textarea name="details" maxLength={1200} rows={4}/></label>
    <input type="text" name="website" className="trap-input" tabIndex={-1} autoComplete="off"/>
    <div className="rental-submit"><ShieldCheck size={18}/><span>Equipment reservations require manual confirmation and applicable paperwork.</span></div>
    <button className="btn" type="submit" disabled={selected.length===0}>Request quote ({selected.length} selected)</button>
   </form><p className="muted" style={{marginTop:14,fontSize:13}}>Need a crew or a production package? <Link href="/book">Contact Prime Cut Studios.</Link></p>
  </section>
 </div>;
}