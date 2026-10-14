/** Verified public production hostname. Client invitations must not use protected Vercel previews. */
export function publicSiteOrigin(){
 const value=process.env.NEXT_PUBLIC_SITE_URL||'https://www.primecutstudiostx.com';
 try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password)return url.origin;}catch{}
 return 'https://www.primecutstudiostx.com';
}
