/** Prime Cut Studios public launch rates, October 2026. Proposals control final scope. */
export type Locale = 'en'|'es';
export type Bilingual = {en:string;es:string};
export type ProductionPackage = {id:string;title:Bilingual;price:number;plus?:boolean;features:Bilingual[];featured?:boolean;billing?:'month'|'image';scope?:Partial<Record<'crew'|'locations'|'revisions'|'exclusions'|'addons',Bilingual>>};
export type PricingCategory = {slug:string;name:string;title:Bilingual;tagline:Bilingual;packages:ProductionPackage[];note?:Bilingual;published?:boolean};
const b=(en:string,es:string):Bilingual=>({en,es});
const p=(id:string,name:string,price:number,items:[string,string][],featured=false,plus=false):ProductionPackage=>({id,title:b(name,name),price,features:items.map(([en,es])=>b(en,es)),featured,plus});
export const pricingCategories:PricingCategory[] = [
 {slug:'music-video',name:'Music Videos',title:b('Music Videos','Videos musicales'),tagline:b('From a quick performance shoot to a cinematic release.','Desde una grabación rápida hasta una producción cinematográfica.'),packages:[
 p('gun-n-run','Gun N Run',500,[['Up to 2 hours / 1 camera / 1 operator','Hasta 2 horas / 1 cámara / 1 operador'],['1 location / recording only on set','1 localización / solo grabación en el set'],['1 music video / basic editing','1 videoclip / edición básica'],['No creative direction, extra crew, advanced lighting, casting or advanced VFX','Sin dirección creativa, personal extra, iluminación avanzada, casting ni efectos visuales avanzados']]),
 p('performance','Performance',795,[['Up to 3 hours / 1 operator / 1 location','Hasta 3 horas / 1 operador / 1 localización'],['Simple lighting and enhanced color','Iluminación sencilla y color mejorado'],['1 edited music video','1 videoclip editado']]),
 p('signature','Signature',1395,[['Up to 5 hours / 2 nearby locations','Hasta 5 horas / 2 localizaciones cercanas'],['Operator + assistant / concept and shot list','Operador + asistente / concepto y lista de tomas'],['Creative lighting / edited video + 1 teaser','Iluminación creativa / videoclip + 1 teaser']],true),
 p('cinematic','Cinematic',2395,[['Up to 7 hours / 2 operators / up to 2 cameras','Hasta 7 horas / 2 operadores / hasta 2 cámaras'],['Up to 3 nearby locations / visual planning','Hasta 3 localizaciones cercanas / planificación visual'],['Cinematic edit + 2 social clips','Edición cinematográfica + 2 clips para redes']],false,true)]},
 {slug:'business-content',name:'Business Content',title:b('Commercial & Brand Video','Videos comerciales y de marca'),tagline:b('Promos, business stories, interviews and brand campaigns.','Promociones, historias de negocios, entrevistas y campañas.'),packages:[
 p('spotlight','Business Spotlight',595,[['Up to 1.5 hours / 1 camera','Hasta 1.5 horas / 1 cámara'],['1 branded video, 30–45 seconds','1 video de marca de 30–45 segundos'],['Basic logo and text graphics','Logo y textos básicos']]),
 p('brand-story','Brand Story',995,[['Up to 3 hours / interview or B-roll','Hasta 3 horas / entrevista o B-roll'],['1 video, 45–75 seconds','1 video de 45–75 segundos'],['1 vertical social cut','1 versión vertical para redes']],true),
 p('commercial-signature','Commercial Signature',1895,[['Up to 5 hours / 2-person crew','Hasta 5 horas / equipo de 2'],['Planning, lighting and professional audio','Planificación, iluminación y audio profesional'],['1 hero film, 60–90 sec + 3 cuts','1 video principal de 60–90 s + 3 recortes']])]},
 {slug:'social-content',name:'Social Content',title:b('Social Media Content','Contenido para redes sociales'),tagline:b('Reels and short-form content built for your platforms.','Reels y videos cortos preparados para tus plataformas.'),packages:[
 p('reel-express','Reel Express',225,[['Up to 1 hour of filming','Hasta 1 hora de grabación'],['1 edited reel, 15–45 sec','1 reel editado de 15–45 s']]),
 p('content-batch','Content Batch',595,[['Up to 2 hours / 1 shoot','Hasta 2 horas / 1 sesión'],['4 edited reels, 15–45 sec each','4 reels editados de 15–45 s cada uno'],['Basic captions','Subtítulos básicos']],true),
 p('campaign-day','Campaign Day',1095,[['Up to 4 hours / shot planning','Hasta 4 horas / planificación de tomas'],['8 edited reels, 15–60 sec each','8 reels editados de 15–60 s cada uno'],['On-screen titles and basic captions','Títulos en pantalla y subtítulos básicos']])]},
 {slug:'monthly-content',name:'Monthly Content Plans',title:b('Monthly Content Plans','Planes mensuales de contenido'),tagline:b('Predictable production for growing local brands.','Producción continua para marcas locales en crecimiento.'),packages:[
 p('local-starter','Local Starter',695,[['2 filming hours per month / 1 visit','2 horas de grabación al mes / 1 visita'],['4 edited reels','4 reels editados'],['Short planning call','Llamada breve de planificación']]),
 p('business-growth','Business Growth',1295,[['4 filming hours / 1 monthly visit','4 horas de grabación / 1 visita mensual'],['8 edited reels + 10 promotional photos','8 reels editados + 10 fotos promocionales'],['Suggested content calendar','Calendario sugerido de contenido']],true),
 p('brand-dominance','Brand Dominance',2195,[['2 shoots up to 3 hours each','2 sesiones de hasta 3 horas cada una'],['12 edited reels + 20 promotional photos','12 reels editados + 20 fotos promocionales'],['Creative planning + deliverables report','Planificación creativa + reporte de entregables']])],note:b('Monthly pricing. Recommended three-month commitment. Social account management and ad spend are separate.','Precios mensuales. Se recomienda compromiso de tres meses. La administración de cuentas y los anuncios pagados son aparte.')},
 {slug:'photography',name:'Photography',title:b('Portrait & Branding Photography','Fotografía de retratos y marca'),tagline:b('Headshots, personal portraits and professional branding.','Retratos, fotos profesionales e imagen de marca.'),packages:[
 p('quick-headshot','Quick Headshot',135,[['20 minutes / 1 look','20 minutos / 1 vestuario'],['3 retouched photos','3 fotos retocadas']]),
 p('portrait-session','Portrait Session',245,[['60 minutes / up to 2 looks','60 minutos / hasta 2 vestuarios'],['12 edited photos','12 fotos editadas']],true),
 p('personal-branding','Personal Branding',425,[['90 minutes / up to 3 looks','90 minutos / hasta 3 vestuarios'],['15 edited photos / portrait & social','15 fotos editadas / retrato y redes']])]},
 {slug:'product-photography',name:'Product Photography',title:b('Product & Menu Photography','Fotografía de productos y menús'),tagline:b('Strong product imagery for e-commerce and local businesses.','Imágenes de productos para comercio electrónico y negocios.'),packages:[
 p('product-starter','Product Starter',275,[['Up to 1.5 hours / 5 products','Hasta 1.5 horas / 5 productos'],['10 finished photos','10 fotos finales']]),
 p('menu-brand','Menu & Brand',525,[['Up to 3 hours / 12 products','Hasta 3 horas / 12 productos'],['25 finished photos','25 fotos finales']],true),
 p('commercial-catalog','Commercial Catalog',895,[['Up to 5 hours / 25 products','Hasta 5 horas / 25 productos'],['50 finished photos','50 fotos finales']])]},
 {slug:'event-coverage',name:'Event Coverage',title:b('Event Photo & Video','Fotografía y video de eventos'),tagline:b('Photo, film, or a coordinated dual-operator team.','Fotografía, video o cobertura combinada con dos profesionales.'),packages:[
 p('event-snap','Event Snap · Photo',395,[['2 hours / 1 photographer','2 horas / 1 fotógrafo'],['40+ edited images','40+ fotos editadas']]),
 p('event-story','Event Story · Photo',695,[['4 hours / 1 photographer','4 horas / 1 fotógrafo'],['100+ edited images','100+ fotos editadas']]),
 p('full-coverage','Full Coverage · Photo',995,[['6 hours / 1 photographer','6 horas / 1 fotógrafo'],['180+ edited images','180+ fotos editadas']]),
 p('event-highlight','Event Highlight · Video',495,[['2 hours / 1 camera','2 horas / 1 cámara'],['45–60 sec event recap','Resumen de 45–60 s']]),
 p('event-film','Event Film · Video',895,[['4 hours / 1 camera','4 horas / 1 cámara'],['2–3 min event film','Video resumen de 2–3 min']]),
 p('cinematic-event','Cinematic Event · Video',1495,[['6 hours / multicamera where planned','6 horas / multicámara según planificación'],['3–5 min film + 1 reel','Video de 3–5 min + 1 reel']]),
 p('photo-video-4h','Photo + Video · 4 Hours',1495,[['4 hours / dedicated photo + video operators','4 horas / fotógrafo y videógrafo dedicados'],['Edited gallery + event recap','Galería editada + video resumen']],true),
 p('photo-video-6h','Photo + Video · 6 Hours',2245,[['6 hours / dedicated photo + video operators','6 horas / fotógrafo y videógrafo dedicados'],['Expanded photo gallery + event film','Galería ampliada + video de evento']])]},
 {slug:'sweet-16',name:'Quinceañera / Sweet 16',title:b('Weddings & Milestone Celebrations','Bodas, quinceañeros y Sweet 16'),tagline:b('Thoughtful dual-operator coverage of once-in-a-lifetime moments.','Cobertura coordinada con dos profesionales para grandes momentos.'),packages:[
 p('celebration-essential','Celebration Essential',1895,[['4 hours / photographer + videographer','4 horas / fotógrafo + videógrafo'],['100+ edited photos / 2–3 min highlight','100+ fotos editadas / video de 2–3 min']]),
 p('celebration-signature','Celebration Signature',2795,[['6 hours / 2 professionals','6 horas / 2 profesionales'],['200+ photos / 4–5 min film + 1 reel','200+ fotos / video de 4–5 min + 1 reel']],true),
 p('celebration-cinematic','Celebration Cinematic',3795,[['8 hours / 2 professionals','8 horas / 2 profesionales'],['300+ photos / 5–7 min film + 2 reels','300+ fotos / video de 5–7 min + 2 reels']])]},
 {slug:'podcasts',name:'Podcast Production',title:b('Podcasts & Interviews','Podcasts y entrevistas'),tagline:b('Professional recording, multicamera edits and clips.','Grabación profesional, edición multicámara y clips.'),packages:[
 p('audio-essential','Audio Essential',195,[['Up to 90 min session / up to 60 min episode','Sesión de hasta 90 min / episodio de hasta 60 min'],['Audio clean-up and mix','Limpieza y mezcla de audio']]),
 p('video-podcast','Video Podcast',395,[['Up to 90 min / 2 cameras','Hasta 90 min / 2 cámaras'],['Edited episode up to 60 min','Episodio editado de hasta 60 min']],true),
 p('podcast-pro','Podcast Pro',695,[['Up to 2 hours / up to 3 cameras','Hasta 2 horas / hasta 3 cámaras'],['Edited episode up to 90 min + 3 clips','Episodio hasta 90 min + 3 clips']]),
 p('monthly-podcast','Video Podcast · 4 Episodes',1450,[['4 edited episodes, 60 min max each','4 episodios editados, máximo 60 min cada uno'],['Recorded in up to 2 monthly sessions','Grabados en hasta 2 sesiones mensuales']])],note:b('Studio rental and special sets are separate if required.','Alquiler de estudio y decorados especiales se cobran aparte si se requieren.')},
 {slug:'livestreaming',name:'Livestreaming',title:b('Livestreaming & Broadcast','Transmisiones en vivo'),tagline:b('Live events, interviews and conferences.','Eventos, entrevistas y conferencias en directo.'),packages:[
 p('solo-live','Solo Live',695,[['Up to 2 hours / 1 camera','Hasta 2 horas / 1 cámara'],['1 platform + program recording','1 plataforma + grabación del programa']]),
 p('multi-live','Multi Live',1295,[['Up to 3 hours / 2 cameras','Hasta 3 horas / 2 cámaras'],['Basic graphics, switching and recording','Gráficos básicos, cambios de cámara y grabación']],true),
 p('event-broadcast','Event Broadcast',2195,[['Up to 4 hours / 3 cameras','Hasta 4 horas / 3 cámaras'],['Technical crew, audio mix, graphics and recording','Equipo técnico, mezcla de audio, gráficos y grabación']])],note:b('Venue must provide reliable internet and technical access. Setup, tests and redundancy are scoped separately.','El lugar debe disponer de internet confiable y acceso técnico. Montaje, pruebas y redundancia se cotizan según alcance.')},
 {slug:'camera-operator',name:'Camera Operator',title:b('Camera Operator · No Editing','Operador de cámara · Sin edición'),tagline:b('Professional footage capture for outside producers and businesses.','Grabación profesional para otras productoras y negocios.'),packages:[
 p('camera-2h','Camera Operator · 2 Hours',250,[['2 hours / 1 operator / 1 camera','2 horas / 1 operador / 1 cámara'],['Original footage / no editing','Material original / sin edición']]),
 p('camera-half','Half-Day Camera',350,[['Up to 4 hours / 1 operator / 1 camera','Hasta 4 horas / 1 operador / 1 cámara'],['Original footage / no editing','Material original / sin edición']],true),
 p('camera-full','Full-Day Camera',625,[['Up to 8 hours / 1 operator / 1 camera','Hasta 8 horas / 1 operador / 1 cámara'],['Original footage / no editing','Material original / sin edición']])]},
 {slug:'post-production',name:'Post-Production',title:b('Editing & Post-Production','Edición y postproducción'),tagline:b('Professional editing from your existing footage.','Edición profesional a partir de tus grabaciones.'),packages:[
 p('reel-edit','Reel Edit',95,[['1 short reel / footage supplied','1 reel corto / material suministrado']]),
 p('five-reels','5-Reel Editing Pack',395,[['5 short reels / footage supplied','5 reels cortos / material suministrado']],true),
 p('youtube-edit','YouTube Edit',225,[['Edited video up to 15 minutes','Video editado de hasta 15 minutos']]),
 p('music-edit','Music Video Editing',350,[['Basic music video edit from supplied footage','Edición básica de videoclip con material suministrado']]),
 p('podcast-edit','Podcast Multicam Editing',195,[['Multicam podcast edit up to 60 minutes','Edición de podcast multicámara hasta 60 min']]),
 p('commercial-edit','Commercial Editing',295,[['Branded video edit up to 60 seconds','Edición comercial de hasta 60 segundos']]),
 p('color-grade','Color Correction & Grade',175,[['Short-project color polish','Corrección y acabado de color en proyecto corto']],false,true),
 p('photo-retouch','Additional Photo Retouching',15,[['Per image / supplied photograph','Por imagen / fotografía suministrada']])]},
 {slug:'real-estate',published:false,name:'Real Estate',title:b('Real Estate Media','Fotografía y video inmobiliario'),tagline:b('Photo and video packages for local property listings.','Paquetes visuales para propiedades locales.'),packages:[
 p('mls-essential','MLS Essential',175,[['Property up to 2,500 sq ft','Propiedad de hasta 2,500 pies²'],['25 edited listing photos','25 fotos editadas']]),
 p('property-social','Property Social',345,[['Property up to 2,500 sq ft','Propiedad de hasta 2,500 pies²'],['25 photos + 1 vertical reel','25 fotos + 1 reel vertical']],true),
 p('listing-signature','Listing Signature',595,[['Property up to 3,500 sq ft','Propiedad de hasta 3,500 pies²'],['40 photos + 60–90 sec film + 1 vertical cut','40 fotos + video de 60–90 s + 1 versión vertical']])],note:b('Drone footage and 3D scans are not included. Availability by request.','No incluye tomas con dron ni escaneos 3D. Disponibilidad previa consulta.')},
 {slug:'custom',name:'Custom Production',title:b('Custom Production','Producción personalizada'),tagline:b('Documentaries, complex shoots and unique productions deserve a tailored scope.','Documentales, proyectos especiales y producciones a la medida.'),packages:[],note:b('Name your budget or request a detailed production estimate. No obligation to accept.','Indica tu presupuesto o solicita una cotización detallada. Sin compromiso de contratar.')}
];
for(const category of pricingCategories){for(const pack of category.packages){if(category.slug==='monthly-content'||pack.id==='monthly-podcast')pack.billing='month';if(pack.id==='photo-retouch')pack.billing='image';}}
export const publicPricingCategories=pricingCategories.filter(c=>c.published!==false);
export const pricingAddOns = [
 b('Gun N Run extra hour · $125','Hora adicional Gun N Run · $125'),
 b('Additional video coverage hour · $150','Hora extra de cobertura de video · $150'),
 b('Additional photography hour · $125','Hora extra de fotografía · $125'),
 b('Extra operator / assistant · from $250','Operador / asistente extra · desde $250'),
 b('Second operated camera · from $250','Segunda cámara operada · desde $250'),
 b('Additional location · from $100','Localización adicional · desde $100'),
 b('Extra social reel · $95','Reel adicional · $95'),
 b('Music video teaser · $125','Teaser para videoclip · $125'),
 b('Extra vertical / horizontal version · $50','Versión vertical / horizontal adicional · $50'),
 b('Raw footage delivery · from $150','Entrega de material original · desde $150'),
 b('Additional video revision · from $75','Revisión adicional de video · desde $75'),
 b('Script and detailed storyboard · from $250','Guion y storyboard detallado · desde $250'),
 b('Casting coordination · from $250','Coordinación de casting · desde $250'),
 b('Rush delivery · +25–50%','Entrega urgente · +25–50%')
];
export const findPricingCategory=(service:string)=>publicPricingCategories.find(x=>x.name===service||x.slug===service);
export const currency=(price:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(price);
