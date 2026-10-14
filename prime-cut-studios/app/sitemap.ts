import type {MetadataRoute} from 'next';
import {publicSiteOrigin} from '@/lib/site-origin';
export default function sitemap():MetadataRoute.Sitemap{const base=publicSiteOrigin();return ['/','/services','/portfolio','/rentals','/about','/book','/casting','/privacy','/terms'].map(path=>({url:new URL(path,base).toString(),changeFrequency:'monthly' as const,priority:path==='/'?1:.7}));}
