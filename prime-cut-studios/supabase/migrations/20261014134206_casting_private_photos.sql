-- Private applicant photos, never public URLs or anonymous Storage grants.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('primecuts-casting-private','primecuts-casting-private',false,1048576,array['image/jpeg'])
on conflict(id) do nothing;
alter table public.pc_casting_applications add column photo_paths jsonb not null default '[]'::jsonb check(jsonb_typeof(photo_paths)='array' and jsonb_array_length(photo_paths)<=3);
alter table public.pc_talent_profiles add column photo_paths jsonb not null default '[]'::jsonb check(jsonb_typeof(photo_paths)='array' and jsonb_array_length(photo_paths)<=3);
create function public.pc_apply_casting_photos(p_application jsonb,p_bank boolean,p_material boolean,p_token_hash text,p_version text)
returns uuid language plpgsql security invoker set search_path=public as $$
declare app_id uuid; paths jsonb:=coalesce(p_application->'photo_paths','[]'::jsonb); entry jsonb;
begin
 if jsonb_typeof(paths)<>'array' or jsonb_array_length(paths)>3 then raise exception 'INVALID_PHOTOS';end if;
 for entry in select value from jsonb_array_elements(paths) loop
  if jsonb_typeof(entry)<>'string' or (entry#>>'{}')!~'^[a-f0-9-]{36}/[a-f0-9-]{36}\.jpg$' then raise exception 'INVALID_PHOTO_PATH';end if;
 end loop;
 app_id:=public.pc_apply_casting_with_talent(p_application,p_bank,p_material,p_token_hash,p_version);
 update public.pc_casting_applications set photo_paths=paths where id=app_id;
 update public.pc_talent_profiles set photo_paths=paths where source_application_id=app_id;
 return app_id;
end $$;
revoke all on function public.pc_apply_casting_photos(jsonb,boolean,boolean,text,text) from public,anon,authenticated;
grant execute on function public.pc_apply_casting_photos(jsonb,boolean,boolean,text,text) to service_role;
