import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {projectDossier} from '@/lib/project-dossiers';
import {bookBlock} from '@/lib/project-book-db';
import {projectBookEnabled} from '@/lib/project-book-policy';
import {requireCapability} from '@/lib/operations-db';
import {clientAuthenticated} from '@/lib/client-auth';
import {clientCanAccess} from '@/lib/db';
export const runtime='nodejs';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 if(!projectBookEnabled())return new Response('Not found',{status:404});
 const {id}=await params,asset=projectDossier(id);
 if(!asset)return new Response('Not found',{status:404});
 const block=await bookBlock(asset.blockId);
 if(!block||block.project_id!==id)return new Response('Not found',{status:404});
 const staff=await requireCapability('projects.read',id);
 if(!staff){const client=await clientAuthenticated();if(!client||!block.client_visible||!await clientCanAccess(client.id,id))return new Response('Not found',{status:404});}
 // The file path comes only from a fixed server registry, never request data.
 const bytes=await readFile(join(process.cwd(),'private','dossiers',asset.path));
 return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Content-Disposition':'attachment; filename="'+asset.filename+'"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'",'X-Robots-Tag':'noindex, nofollow'}});
}
