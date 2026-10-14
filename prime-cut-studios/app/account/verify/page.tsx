import {VerifyLink} from '@/components/account/VerifyLink';import {SiteHeader} from '@/components/SiteHeader';
export const metadata={title:'Verify email | Prime Cut Studios',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default function Verify(){return <><SiteHeader/><main className="shell narrow pagehero"><h1>Verificar correo / Verify email</h1><section className="panel"><VerifyLink/></section></main></>;}
