import {NewsletterLink} from '@/components/account/NewsletterLink';import {SiteHeader} from '@/components/SiteHeader';
export const metadata={title:'Newsletter preferences | Prime Cut Studios',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default function Manage(){return <><SiteHeader/><main className="shell narrow pagehero"><h1>Newsletter · Preferencias</h1><section className="panel"><NewsletterLink/></section></main></>;}
