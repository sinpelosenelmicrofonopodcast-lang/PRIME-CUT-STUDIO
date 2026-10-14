import {redirect,notFound} from 'next/navigation';
import {clientAuthenticated} from '@/lib/client-auth';
import {clientCanAccess,getProject} from '@/lib/db';
import {clientCanReview} from '@/lib/workspace-db';
import {workspaceEnabled} from '@/lib/workspace-policy';
import {commEnabled} from '@/lib/communications-db';
import {clientProjectData} from '@/lib/client-project-data';
import {ClientProjectDashboard} from '@/components/workspace/ClientProjectDashboard';
import {Conversation} from '@/components/workspace/Conversation';
export const metadata={robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export const runtime='nodejs';
export default async function Project({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{section?:string}>}){
 const account=await clientAuthenticated();if(!account)redirect('/client/login');
 const {id}=await params;
 if(!await clientCanAccess(account.id,id))notFound();
 const p=await getProject(id);if(!p)notFound();
 const canAct=workspaceEnabled()?await clientCanReview(account.id,id):false;
 const [data,{section}]=await Promise.all([clientProjectData(p),searchParams]);
 return <ClientProjectDashboard data={data} section={section} canReview={canAct} conversation={commEnabled()?<Conversation project={id} staff={false} canWrite={canAct}/>:undefined}/>;
}
