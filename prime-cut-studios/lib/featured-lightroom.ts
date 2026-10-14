/** Public live album explicitly chosen by Prime Cut Studios.
 * Keep the whole album in Adobe Lightroom as the only photo source.
 * All added/removed/edited photos are reflected by Adobe on the next album load.
 * No per-photo transfer, own-hosted copies, scheduled sync, storage or Vercel image proxy.
 * An official Lightroom embed code may be added later; Lightroom shared pages might refuse iframe framing.
 */
export const featuredLightroomAlbum={
 albumUrl:'https://lightroom.adobe.com/shares/5b61ae7322144a77ba85dc2cca5e866f',
 embedUrl:null as string|null,
 title:'Fotografía que se siente.',
 description:'Retratos, momentos y producciones que hablan por sí solos. Mira nuestro trabajo real y descubre lo que podemos crear para ti.'
} as const;
