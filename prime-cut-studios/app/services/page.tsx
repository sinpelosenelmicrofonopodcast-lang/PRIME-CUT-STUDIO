import {getPricingCatalog} from '@/lib/pricing-db';
export const dynamic='force-dynamic';
import {publicMetadata} from '@/lib/public-metadata';
import {SiteHeader} from '@/components/SiteHeader';
import {Footer} from '@/components/Footer';
import {PricingCatalog} from '@/components/PricingCatalog';
export const metadata=publicMetadata('Production Packages & Pricing | Paquetes y Precios','Prime Cut Studios pricing in Central Texas: music videos from $500, photography, events, commercial films, podcasts, reels and monthly production. Name Your Budget on every service.','/services');
export default async function Services(){const categories=await getPricingCatalog();return <><SiteHeader/><main><PricingCatalog categories={categories}/></main><Footer/></>}
