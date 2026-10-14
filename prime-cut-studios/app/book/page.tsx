import {QuotePageContent} from '@/components/QuotePageContent';
import {getPricingCatalog} from '@/lib/pricing-db';
import {cookies} from 'next/headers';
import {publicMetadata} from '@/lib/public-metadata';
import {SiteHeader} from '@/components/SiteHeader';
import {Footer} from '@/components/Footer';
import {QuoteRequestForm} from '@/components/QuoteRequestForm';
import {services} from '@/lib/data';
import {findPricingCategory,type Locale} from '@/lib/pricing';
import {CheckCircle2,CalendarDays,ClipboardList,Film} from 'lucide-react';
export const metadata=publicMetadata('Get a Quote / Name Your Budget · Cotizaciones','Request a Prime Cut Studios production package or name your budget. Bilingual custom quotes for Central Texas video, photography and events.','/book');
export default async function Book({searchParams}:{searchParams:Promise<{service?:string;package?:string;mode?:string;lang?:string;sent?:string;error?:string}>}){
 const params=await searchParams;const categories=await getPricingCatalog();
 const service=services.find(x=>x.name===params.service||x.slug===params.service)?.name||'';
 const pack=categories.find(c=>c.name===service)?.packages.find(x=>x.id===params.package)?.id||'';
 const custom=params.mode==='custom';const preferred=params.lang||(await cookies()).get('primecut-language')?.value;const lang:Locale=preferred==='es'?'es':'en';
 return <><SiteHeader/><QuotePageContent categories={categories} service={service} pack={pack} custom={custom} initialLanguage={lang} params={{sent:params.sent,error:params.error}}/><Footer/></>;
}
