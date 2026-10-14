import {publicMetadata} from '@/lib/public-metadata';
export const metadata=publicMetadata("Production Equipment & Rentals","Explore studio gear, official specifications, manuals and request a rental quote in Central Texas.","/rentals");
import type {Metadata} from 'next';
import {SiteHeader} from '@/components/SiteHeader';import {Footer} from '@/components/Footer';
import {RentalCatalog} from '@/components/RentalCatalog';
import {equipmentCatalog} from '@/lib/equipment-catalog';import {equipmentOverrides} from '@/lib/operations-db';

export const dynamic='force-dynamic';export const runtime='nodejs';
export default async function Rentals({searchParams}:{searchParams:Promise<{sent?:string;invalid?:string;error?:string;limit?:string}>}){const flags=await searchParams;
 let overrides;try{overrides=await equipmentOverrides();}catch{return <><SiteHeader/><main className="shell pagehero"><h1>Equipment & rentals</h1><section className="panel"><p role="alert">Availability is temporarily unavailable. Please contact the studio before requesting equipment.</p><a className="btn" href="/book">Contact the studio</a></section></main><Footer/></>;}
 const map=new Map(overrides.map(x=>[x.asset_id,x]));
 const items=equipmentCatalog.filter(i=>i.inventoryStatus==='ready'&&!map.get(i.id)?.disabled).map(i=>({...i,photoUrl:map.get(i.id)?.photo_url||i.photoUrl,rentalApproval:map.get(i.id)?.rental_approved?'approved' as const:'review_required' as const,priceCents:map.get(i.id)?.rental_approved?map.get(i.id)?.daily_rate_cents:null}));
 return <><SiteHeader/><main className="rentals-page"><div className="shell pagehero"><div className="eyebrow">Prime Cut Studios · Central Texas</div><h1>Your next shoot.<br/><em>The right equipment.</em></h1><p className="muted">Cameras, lenses, lighting and sound. Choose your equipment and quantities — we’ll build a quote around your production.</p></div>{flags.sent&&<div className="shell"><div className="panel success-panel">Your rental inquiry was received. It is not a confirmed reservation.</div></div>}{(flags.invalid||flags.error||flags.limit)&&<div className="shell"><div className="panel">We could not save your inquiry. Check the request and try again.</div></div>}<RentalCatalog items={items}/></main><Footer/></>;
}