import 'server-only';
import {randomBytes} from 'node:crypto';
import {hashToken} from '@/lib/db';
import {comm,filters} from '@/lib/communications-db';
import {enqueueEmail} from '@/lib/email';
export async function subscribeNewsletter(email:string,language:'es'|'en',segment:'client'|'talent'|'subscriber'='subscriber'){
 const existing=(await comm<{state:string}[]>(filters('pc_newsletter',{email:'eq.'+email,select:'state',limit:'1'})))[0];if(existing?.state==='subscribed'||existing?.state==='bounced')return;
 const confirm=randomBytes(32).toString('base64url'),manage=randomBytes(32).toString('base64url');
 await comm('pc_newsletter?on_conflict=email',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({email,language,segment,state:'pending',consent_at:new Date().toISOString(),consent_version:'newsletter-explicit-2026-10-14',confirm_hash:hashToken(confirm),manage_hash:hashToken(manage),confirm_expires:new Date(Date.now()+48*3600000).toISOString()})});
 await enqueueEmail('newsletter:'+hashToken(confirm),email,'newsletter_confirmation',language,'/newsletter/manage#action=confirm&token='+confirm+'&manage='+manage,true);
}
