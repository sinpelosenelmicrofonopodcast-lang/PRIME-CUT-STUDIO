import type {MetadataRoute} from 'next';
export default function robots():MetadataRoute.Robots{return {rules:[{userAgent:'*',allow:'/',disallow:['/admin','/client','/api/','/data/','/team','/talent','/account','/notifications']}],sitemap:process.env.NEXT_PUBLIC_SITE_URL?`${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/,'')}/sitemap.xml`:undefined};}
