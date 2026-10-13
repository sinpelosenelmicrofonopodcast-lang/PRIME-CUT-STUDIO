import type {MetadataRoute} from 'next';
export default function sitemap():MetadataRoute.Sitemap{const base=process.env.NEXT_PUBLIC_SITE_URL;if(!base)return [];return ['/','/services','/portfolio','/rentals','/about','/book','/privacy','/terms'].map(path=>({url:new URL(path,base).toString(),changeFrequency:'monthly' as const,priority:path==='/'?1:.7}));}
