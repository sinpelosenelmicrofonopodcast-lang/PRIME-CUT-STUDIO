import {sameOriginRedirect as safeFormRedirect} from '@/lib/auth';
import {boundedForm} from '@/lib/form-request';
import {NextResponse} from 'next/server';import {requestIsSameOrigin} from '@/lib/auth';
import {castingApplicationById,castingById,requireCapability,castingStatusUpdate,audit} from '@/lib/operations-db';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!requestIsSameOrigin(req))return new Response('Forbidden',{status:403});
 const f=await boundedForm(req);if(f instanceof Response)return f;const id=String(f.get('id')||''),status=String(f.get('status')||''),notes=String(f.get('notes')||'').trim();
 if(!/^[\da-f-]{36}$/i.test(id)||!['submitted','under_review','shortlisted','offered','selected','declined'].includes(status)||notes.length>1000)return new Response('Invalid review',{status:400});
 const candidate=await castingApplicationById(id);if(!candidate)return new Response('Not found',{status:404});
 const call=await castingById(candidate.casting_call_id);if(!call)return new Response('Not found',{status:404});
 const access=await requireCapability('casting.review',call.project_id);if(!access)return new Response('Forbidden',{status:403});
 await castingStatusUpdate(id,status,notes);await audit('casting.application.review','casting_application',id,access,call.project_id,{status});
 return NextResponse.redirect(safeFormRedirect(req,'/team/casting'),303);
}