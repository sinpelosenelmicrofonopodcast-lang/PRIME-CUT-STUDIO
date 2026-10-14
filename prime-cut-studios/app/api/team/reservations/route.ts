import {sameOriginRedirect as safeFormRedirect} from '@/lib/auth';
import {boundedForm} from '@/lib/form-request';
import {NextResponse} from 'next/server';
import {requestIsSameOrigin} from '@/lib/auth';
import {operationsSession,audit} from '@/lib/operations-db';
import {gearBooking,reserveGear,confirmGear,closeGear} from '@/lib/operations-reservations';
import {equipmentById} from '@/lib/equipment-catalog';
import {getProject} from '@/lib/db';
export const runtime='nodejs';
export async function POST(req:Request){
 if(!requestIsSameOrigin(req))return new Response('Forbidden',{status:403});
 const actor=await operationsSession();if(!actor||!(actor.legacyOwner||actor.role==='administrator'))return new Response('Owner authorization required',{status:403});
 const form=await boundedForm(req);if(form instanceof Response)return form;const action=String(form.get('action')||'hold');
 if(action==='hold'){
  const assetId=String(form.get('assetId')||''),item=equipmentById(assetId),requester=String(form.get('requester')||'').trim(),start=String(form.get('start')||''),end=String(form.get('end')||''),projectId=String(form.get('projectId')||'');
  if(!item||item.inventoryStatus!=='ready'||requester.length<2||requester.length>160||! /^\d{4}-\d{2}-\d{2}$/.test(start)||! /^\d{4}-\d{2}-\d{2}$/.test(end)||start<new Date().toISOString().slice(0,10)||end<start||projectId&&(!/^[\da-f-]{36}$/i.test(projectId)||!await getProject(projectId)))return new Response('Invalid booking',{status:400});
  const result=await reserveGear(assetId,requester,start,end,projectId||null);
  if(!result.booked)return NextResponse.redirect(safeFormRedirect(req,'/team/reservations?conflict=1'),303);
  await audit('gear.hold','equipment_booking',result.booking_id,actor,projectId||null,{assetId,start,end});
  return NextResponse.redirect(safeFormRedirect(req,'/team/reservations?created=1'),303);
 }
 const id=String(form.get('id')||'');if(!/^[\da-f-]{36}$/i.test(id))return new Response('Bad booking ID',{status:400});
 const booking=await gearBooking(id);if(!booking)return new Response('Not found',{status:404});
 if(action==='confirm'){if(booking.status!=='hold'||!await confirmGear(id))return NextResponse.redirect(safeFormRedirect(req,'/team/reservations?conflict=1'),303);}
 else if(action==='cancelled'||action==='returned'){
  if(action==='cancelled'&&booking.status!=='hold'||action==='returned'&&booking.status!=='confirmed')return new Response('Invalid transition',{status:400});
  await closeGear(id,action);
 }else return new Response('Invalid action',{status:400});
 await audit('gear.'+action,'equipment_booking',id,actor,booking.project_id,{assetId:booking.asset_id});
 return NextResponse.redirect(safeFormRedirect(req,'/team/reservations'),303);
}