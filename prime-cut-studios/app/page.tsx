import {HomeSales} from '@/components/HomeSales';
import {getPricingCatalog} from '@/lib/pricing-db';
import {publicMetadata} from '@/lib/public-metadata';
export const metadata=publicMetadata("Photography & Film in Central Texas","Photography, music videos, branded films and event coverage in Killeen and Central Texas. Explore real work and request your production quote.","/");
import {CinematicHero} from '@/components/CinematicHero';
import Link from 'next/link';
import {ArrowUpRight,Clapperboard,Camera,Film,CheckCircle2} from 'lucide-react';
import {SiteHeader} from '@/components/SiteHeader';import {Footer} from '@/components/Footer';import {services,faqs} from '@/lib/data';
import {LiveLightroomShowcase} from '@/components/LiveLightroomShowcase';
import {featuredLightroomAlbum} from '@/lib/featured-lightroom';
import {featuredPublicLightroomEmbed} from '@/lib/photo-galleries';
export const revalidate=3600;
export default async function Home(){const [featuredEmbed,categories]=await Promise.all([featuredPublicLightroomEmbed(featuredLightroomAlbum.albumUrl),getPricingCatalog()]);return <><SiteHeader/><main>
  <CinematicHero/>
  <section className="shell" aria-label="Featured Lightroom portfolio"><LiveLightroomShowcase {...featuredLightroomAlbum} embedUrl={featuredEmbed||featuredLightroomAlbum.embedUrl} featured/></section>
  <div className="strip"><div className="shell stripinner"><div className="stat"><strong>01</strong>Tell us your vision</div><div className="stat"><strong>02</strong>Get a clear quote</div><div className="stat"><strong>03</strong>We create together</div><div className="stat"><strong>04</strong>Receive your story</div></div></div>
  <HomeSales categories={categories}/>
  <section className="feature-section"><div className="shell feature-grid"><div className="feature-visual"><Clapperboard size={86} strokeWidth={1}/><div>CONCEPT <span>→</span> CAMERA <span>→</span> CUT</div></div><div><div className="eyebrow">The Prime Cut approach</div><h2>Not just coverage.<br/><em>A complete production.</em></h2><p className="muted">We build every project around the goal. From an intimate celebration to a brand campaign, our process keeps planning, shooting, editing and delivery connected.</p><div className="icon-features"><span><Camera size={20}/>Photography</span><span><Film size={20}/>Cinematic films</span><span><Clapperboard size={20}/>Creative direction</span></div><Link href="/about" className="btn secondary">Learn about the studio <ArrowUpRight size={18}/></Link></div></div></section>
  <section className="end-cta"><div className="shell"><div className="eyebrow">Let's bring it to life</div><h2>Have an idea? <em>Let's make it real.</em></h2><p>Share the details. We'll review your vision and build a quote that fits your production.</p><Link className="btn" href="/book">Start your project <ArrowUpRight size={18}/></Link></div></section>
</main><Footer/></>}
