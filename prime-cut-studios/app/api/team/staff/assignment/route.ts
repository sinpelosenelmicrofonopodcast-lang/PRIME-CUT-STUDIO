import {sameOriginRedirect as safeFormRedirect} from '@/lib/auth';
import {boundedForm} from '@/lib/form-request';
import {NextResponse} from 'next/server';import {requestIsSameOrigin,adminAuthenticated} from '@/lib/auth';
import {getProject,serverHeaders} from '@/lib/db';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!requestIsSameOrigin(req)||!await adminAuthenticated())return new Response('Forbidden',{status:403});
 const f=await boundedForm(req);if(f instanceof Response)return f;const id=String(f.get('accountId')||''),project=String(f.get('projectId')||''),action=String(f.get('action')||'');
 if(!/^[\da-f-]{36}$/i.test(id)||!/^[\da-f-]{36}$/i.test(project)||!['add','remove'].includes(action))return new Response('Invalid assignment',{status:400});
 if(!await getProject(project))return new Response('No such project',{status:404});
 const base=process.env.SUPABASE_URL+'/rest/v1/';
 const staff=await fetch(base+'pc_staff_members?account_id=eq.'+id+'&select=account_id&limit=1',{headers:serverHeaders(),cache:'no-store'});
 if(!staff.ok||(await staff.json()).length===0)return new Response('Staff not found',{status:404});
 let r:Response;
 if(action==='add')r=await fetch(base+'pc_staff_projects',{method:'POST',headers:serverHeaders({'Content-Type':'application/json','Prefer':'resolution=ignore-duplicates'}),body:JSON.stringify({account_id:id,project_id:project})});
 else r=await fetch(base+'pc_staff_projects?account_id=eq.'+id+'&project_id=eq.'+project,{method:'DELETE',headers:serverHeaders()});
 if(!r.ok)return new Response('Unable to update assignment',{status:500});
 return NextResponse.redirect(safeFormRedirect(req,'/team/staff'),303);
}