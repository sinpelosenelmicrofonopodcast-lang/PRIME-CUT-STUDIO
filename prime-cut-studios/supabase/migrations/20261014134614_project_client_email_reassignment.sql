-- Authorize owner/admin correction in the HTTP layer; commit recipient, access
-- revocation and fresh invitation together with compare-and-swap concurrency.
create function public.pc_save_project_client_invitation(p_project uuid,p_expected text,p_email text,p_hash text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare current_email text;target text:=lower(trim(p_email));
begin
 if char_length(target)>254 or target!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or p_hash!~'^[a-f0-9]{64}$' then raise exception 'INVALID_INVITATION';end if;
 select lower(trim(client_email)) into current_email from public.pc_projects where id=p_project for update;
 if not found or current_email<>lower(trim(p_expected)) then return false;end if;
 if current_email<>target then
  delete from public.pc_project_members m using public.pc_client_accounts a where m.project_id=p_project and m.account_id=a.id and lower(a.email)=current_email;
  update public.pc_client_invites set expires_at=now() where project_id=p_project and lower(email)=current_email and redeemed_at is null and expires_at>now();
  update public.pc_projects set client_email=target,updated_at=now() where id=p_project;
 end if;
 -- A replacement invitation invalidates previous pending links for this recipient.
 update public.pc_client_invites set expires_at=now() where project_id=p_project and lower(email)=target and redeemed_at is null and expires_at>now();
 insert into public.pc_client_invites(token_hash,project_id,email,member_role,expires_at) values(p_hash,p_project,target,'reviewer',now()+interval '7 days');
 return true;
end $$;
revoke all on function public.pc_save_project_client_invitation(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.pc_save_project_client_invitation(uuid,text,text,text) to service_role;
