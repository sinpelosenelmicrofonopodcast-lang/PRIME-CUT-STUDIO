import {clientFinance} from '@/lib/project-finance';
import type {Project} from '@/lib/db';
import {listDeliverables} from '@/lib/db';
import {bookBlocks,bookResponses} from '@/lib/project-book-db';
import {projectBookEnabled} from '@/lib/project-book-policy';
import {projectStages,projectEvents,projectTalent} from '@/lib/workspace-db';
import {workspaceEnabled} from '@/lib/workspace-policy';
import {clientPhotoGalleries} from '@/lib/photo-galleries';
import type {ClientProjectData} from '@/components/workspace/ClientProjectDashboard';
/** Caller must authorize this project before reading. Staff preview uses client filters. */
export async function clientProjectData(p:Project):Promise<ClientProjectData>{
 const [blocks,stages,events,deliverables,galleries,talents]=await Promise.all([projectBookEnabled()?bookBlocks(p.id,true):[],workspaceEnabled()?projectStages(p.id):[],workspaceEnabled()?projectEvents(p.id,true):[],listDeliverables(p.id,true),clientPhotoGalleries(p.id),workspaceEnabled()?projectTalent(p.id):[]]);
 const responses=projectBookEnabled()?await bookResponses(p.id,blocks.map(b=>b.id),true):[];
 const finance=projectBookEnabled()?await clientFinance(p.id,blocks.filter(b=>b.client_visible&&!!b.storage_path).map(b=>b.id)):null;
 return {finance,talents:talents.map(({photo_paths,...t})=>({...t,photo_count:photo_paths.length})),project:{id:p.id,title:p.title,status:p.status,event_date:p.event_date,location:p.location},blocks,responses,stages,events,deliverables,galleries:galleries.map(g=>({id:g.id,title:g.title,description:g.description,album_url:g.album_url}))};
}
