-- Wardrobe foundation. Additive: existing tracker objects and Auth settings are untouched.
create schema wardrobe;
revoke all on schema wardrobe from public, anon;
grant usage on schema wardrobe to authenticated;
create table wardrobe.memberships (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table wardrobe.memberships enable row level security;
create policy membership_read on wardrobe.memberships for select to authenticated using (user_id=(select auth.uid()));
grant select on wardrobe.memberships to authenticated;
-- Membership is granted explicitly by an administrator after access is approved.
-- No users are enrolled automatically.
create table wardrobe.items (
 item_id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 display_name text not null check(length(trim(display_name)) between 1 and 100),
 category text not null check(category in ('top','bottom','one_piece','shoes','outerwear','accessory')),
 subcategory text not null check(length(trim(subcategory)) between 1 and 60),
 primary_colour text not null check(primary_colour in ('cream','white','black','navy','blue','green','brown','grey','pink','red','yellow','purple','unknown')),
 pattern text not null default 'unknown' check(pattern in ('solid','striped','checked','other','unknown')),
 fit text not null default 'unknown' check(length(fit)<=60),
 formality text not null default 'unknown' check(formality in ('casual','smart','formal','unknown')),
 notes text not null default '' check(length(notes)<=1000),
 lifecycle_status text not null default 'active' check(lifecycle_status in ('active','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index items_owner_status on wardrobe.items(owner_user_id,lifecycle_status);
alter table wardrobe.items enable row level security;
create policy items_owner on wardrobe.items for all to authenticated
 using(owner_user_id=(select auth.uid()) and exists(select 1 from wardrobe.memberships where user_id=(select auth.uid())))
 with check(owner_user_id=(select auth.uid()) and exists(select 1 from wardrobe.memberships where user_id=(select auth.uid())));
grant select,insert,update,delete on wardrobe.items to authenticated;
create table wardrobe.preferences (
 owner_user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
 style text not null default '' check(length(style)<=500), fit text not null default '' check(length(fit)<=500),
 climate text not null default '' check(length(climate)<=500), preferred_colours text not null default '' check(length(preferred_colours)<=500),
 avoided_colours text not null default '' check(length(avoided_colours)<=500), budget text not null default '' check(length(budget)<=500)
);
alter table wardrobe.preferences enable row level security;
create policy preferences_owner on wardrobe.preferences for all to authenticated
 using(owner_user_id=(select auth.uid()) and exists(select 1 from wardrobe.memberships where user_id=(select auth.uid())))
 with check(owner_user_id=(select auth.uid()) and exists(select 1 from wardrobe.memberships where user_id=(select auth.uid())));
grant select,insert,update,delete on wardrobe.preferences to authenticated;
-- Explicit invoker functions preserve RLS and avoid exposing the entire schema in Data API settings.
create function public.wardrobe_bootstrap() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('access',exists(select 1 from wardrobe.memberships where user_id=(select auth.uid())),
 'items',coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at desc) from wardrobe.items i where owner_user_id=(select auth.uid())),'[]'::jsonb),
 'preferences',(select to_jsonb(p)-'owner_user_id' from wardrobe.preferences p where owner_user_id=(select auth.uid())));
$$;
create function public.wardrobe_save_item(payload jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved wardrobe.items; target uuid:=nullif(payload->>'item_id','')::uuid;
begin
 if target is null then
 insert into wardrobe.items(display_name,category,subcategory,primary_colour,pattern,fit,formality,notes,lifecycle_status)
 values(trim(payload->>'display_name'),payload->>'category',trim(payload->>'subcategory'),payload->>'primary_colour',payload->>'pattern',payload->>'fit',payload->>'formality',coalesce(payload->>'notes',''),coalesce(payload->>'lifecycle_status','active')) returning * into saved;
 else
 update wardrobe.items set display_name=trim(payload->>'display_name'),category=payload->>'category',subcategory=trim(payload->>'subcategory'),primary_colour=payload->>'primary_colour',pattern=payload->>'pattern',fit=payload->>'fit',formality=payload->>'formality',notes=coalesce(payload->>'notes',''),lifecycle_status=payload->>'lifecycle_status',updated_at=now()
 where item_id=target and owner_user_id=(select auth.uid()) returning * into saved;
 if not found then raise exception 'Piece not found or access denied'; end if;
 end if;
 return to_jsonb(saved);
end; $$;
create function public.wardrobe_delete_item(target_id uuid) returns void language sql security invoker set search_path='' as $$
 delete from wardrobe.items where item_id=target_id and owner_user_id=(select auth.uid());
$$;
create function public.wardrobe_save_preferences(payload jsonb) returns void language sql security invoker set search_path='' as $$
 insert into wardrobe.preferences(owner_user_id,style,fit,climate,preferred_colours,avoided_colours,budget)
 values((select auth.uid()),coalesce(payload->>'style',''),coalesce(payload->>'fit',''),coalesce(payload->>'climate',''),coalesce(payload->>'preferred_colours',''),coalesce(payload->>'avoided_colours',''),coalesce(payload->>'budget',''))
 on conflict(owner_user_id) do update set style=excluded.style,fit=excluded.fit,climate=excluded.climate,preferred_colours=excluded.preferred_colours,avoided_colours=excluded.avoided_colours,budget=excluded.budget;
$$;
revoke all on function public.wardrobe_bootstrap() from public,anon;
revoke all on function public.wardrobe_save_item(jsonb) from public,anon;
revoke all on function public.wardrobe_delete_item(uuid) from public,anon;
revoke all on function public.wardrobe_save_preferences(jsonb) from public,anon;
grant execute on function public.wardrobe_bootstrap(),public.wardrobe_save_item(jsonb),public.wardrobe_delete_item(uuid),public.wardrobe_save_preferences(jsonb) to authenticated;
notify pgrst,'reload schema';
