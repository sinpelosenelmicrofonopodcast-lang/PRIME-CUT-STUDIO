import {bookBlock,readBookFile} from '@/lib/project-book-db';import {projectBookEnabled} from '@/lib/project-book-policy';import {uuid} from '@/lib/workspace-policy';import {requireCapability} from '@/lib/operations-db';import {clientAuthenticated} from '@/lib/client-auth';import {clientCanAccess} from '@/lib/db';
export const runtime='nodejs';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!projectBookEnabled())return new Response('Not found',{status:404});const {id}=await params;if(!uuid(id))return new Response('Not found',{status:404});
 const block=await bookBlock(id);if(!block?.storage_path||!block.file_mime)return new Response('Not found',{status:404});
 const staff=await requireCapability('projects.read',block.project_id);
 if(!staff){const client=await clientAuthenticated();if(!client||!block.client_visible||!await clientCanAccess(client.id,block.project_id))return new Response('Not found',{status:404});}
 if(!new RegExp('^'+block.project_id+'/[0-9a-f-]{36}\\.(pdf|jpg|png|webp)$').test(block.storage_path))return new Response('Invalid path',{status:404});
 const bytes=await readBookFile(block.storage_path);
 // PDFs download as attachments; untrusted PDF active content is not embedded in our pages.
 const disposition=block.file_mime==='application/pdf'?'attachment':'inline';
 return new Response(bytes,{headers:{'Content-Type':block.file_mime,'Content-Disposition':disposition+`; filename="document.${block.file_mime==='application/pdf'?'pdf':block.file_mime.split('/')[1]}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'",'X-Robots-Tag':'noindex, nofollow'}});
}
