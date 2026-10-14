import {requestIsSameOrigin} from '@/lib/auth';
import {workspaceEnabled} from '@/lib/workspace-policy';
/** Enforce actual streamed byte count, including chunked requests with no Content-Length. */
export async function workspaceForm(request:Request,maxBytes=24000){
 if(!workspaceEnabled())return new Response('Workspace update not enabled',{status:503});
 if(!requestIsSameOrigin(request))return new Response('Forbidden',{status:403});
 const type=request.headers.get('content-type')||'';
 if(!type.startsWith('application/x-www-form-urlencoded'))return new Response('Use the provided form',{status:415});
 const reader=request.body?.getReader();if(!reader)return new Response('Empty request',{status:400});
 const chunks:Uint8Array[]=[];let total=0;
 while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();return new Response('Request too large',{status:413});}chunks.push(value);}
 const bytes=new Uint8Array(total);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
 return new URLSearchParams(new TextDecoder().decode(bytes));
}
