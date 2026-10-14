import {NextResponse} from 'next/server';import {sameOriginRedirect} from '@/lib/auth';import {workspaceForm} from '@/lib/workspace-request';
import {updateTalent} from '@/lib/workspace-db';
export const runtime='nodejs';
export async function POST(req:Request){
 const f=await workspaceForm(req);if(f instanceof Response)return f;
 const token=f.get('token')||'',experience=(f.get('experience')||'').trim(),availability=(f.get('availability')||'').trim();
 if(!/^[A-Za-z0-9_-]{43}$/.test(token)||experience.length>1800||availability.length>500)return new Response('Invalid profile',{status:400});
 if(!await updateTalent(token,f.get('bank')==='yes',f.get('material')==='yes',f.get('available')==='yes',experience,availability))return new Response('Expired or revoked access',{status:410});
 return NextResponse.redirect(sameOriginRedirect(req,'/talent/manage/'+token+'?saved=1'),303);
}
