import {createHash,timingSafeEqual} from 'node:crypto';
import {commEnabled} from '@/lib/communications-db';
import {drainMail} from '@/lib/email';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(req:Request){
 const secret=process.env.CRON_SECRET,auth=req.headers.get('authorization')||'';
 if(!secret||!timingSafeEqual(createHash('sha256').update(auth).digest(),createHash('sha256').update('Bearer '+secret).digest()))return new Response('Unauthorized',{status:401});
 if(!commEnabled())return new Response('Unavailable',{status:503});
 return Response.json({processed:await drainMail(2)},{headers:{'Cache-Control':'no-store'}});
}
