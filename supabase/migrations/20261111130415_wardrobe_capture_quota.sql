create table wardrobe.capture_usage(user_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now());
create index capture_usage_user_time on wardrobe.capture_usage(user_id,created_at);
alter table wardrobe.capture_usage enable row level security;
-- No direct client table grants. The private quota function only writes the caller's ID.
create function wardrobe.reserve_capture() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from wardrobe.memberships where user_id=auth.uid()) then raise exception 'Wardrobe access required'; end if;
 perform pg_advisory_xact_lock(73482011);
 delete from wardrobe.capture_usage where created_at<now()-interval '2 days';
 if (select count(*) from wardrobe.capture_usage where user_id=auth.uid() and created_at>now()-interval '1 hour')>=10 or (select count(*) from wardrobe.capture_usage where user_id=auth.uid() and created_at>now()-interval '1 day')>=100 or (select count(*) from wardrobe.capture_usage where created_at>now()-interval '1 day')>=900 then raise exception 'Capture limit reached'; end if;
 insert into wardrobe.capture_usage(user_id) values(auth.uid());
end; $$;
revoke all on function wardrobe.reserve_capture() from public,anon;
grant execute on function wardrobe.reserve_capture() to authenticated;
create function public.wardrobe_reserve_capture() returns void language sql security invoker set search_path='' as $$ select wardrobe.reserve_capture(); $$;
revoke all on function public.wardrobe_reserve_capture() from public,anon;
grant execute on function public.wardrobe_reserve_capture() to authenticated;
