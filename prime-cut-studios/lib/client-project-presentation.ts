import type {BookBlock,BookResponse} from '@/lib/project-book-db';
export const clientProjectSections=[['home','Inicio'],['proposal','Propuesta'],['shots','Shot list'],['references','Referencias'],['locations','Locaciones'],['talent','Elenco'],['files','Archivos'],['conversation','Conversación']] as const;
export type ClientProjectSection=(typeof clientProjectSections)[number][0];
export function clientProjectSection(value?:string):ClientProjectSection{return clientProjectSections.some(([key])=>key===value)?value as ClientProjectSection:'home';}
export function visibleClientBlocks(blocks:BookBlock[]){return blocks.filter(b=>b.client_visible);}
export function currentClientDecision(block:BookBlock,responses:BookResponse[]){return responses.filter(r=>r.block_id===block.id&&r.revision===block.revision&&r.actor_kind==='client'&&(block.metadata.decisionType==='location'||r.kind!=='comment')).sort((a,b)=>b.created_at.localeCompare(a.created_at))[0];}
export function proposalDate(value?:string|null){if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return 'Por confirmar';return new Intl.DateTimeFormat('es-US',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));}
