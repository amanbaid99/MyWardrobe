-- Wardrobe-only extension. No tracker/Auth changes, enrollment or existing data deletion.
alter table wardrobe.items add column season text not null default 'unknown' check(season in ('unknown','all','summer','winter','spring','autumn'));
alter table wardrobe.items add column material text not null default 'unknown' check(length(material)<=60);
alter table wardrobe.items add column garment_length text not null default 'unknown' check(length(garment_length)<=60);
alter table wardrobe.items add column style_tags text not null default '' check(length(style_tags)<=200);
create table wardrobe.recommendations(
 recommendation_id uuid primary key,
 owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 occasion text not null check(occasion in ('casual','smart','formal')),
 item_ids uuid[] not null check(cardinality(item_ids) between 1 and 8),
 item_snapshot jsonb not null,
 rationale text not null check(length(rationale)<=2000),
 missing_slots text[] not null default '{}',
 created_at timestamptz not null default now(),
 unique(owner_user_id,recommendation_id)
);
create index wardrobe_recommendations_owner on wardrobe.recommendations(owner_user_id,created_at desc);
alter table wardrobe.recommendations enable row level security;
create policy recommendations_owner on wardrobe.recommendations for all to authenticated
using(owner_user_id=(select auth.uid()) and exists(select 1 from wardrobe.memberships where user_id=(select auth.uid())))
with check(owner_user_id=(select auth.uid()) and exists(select 1 from wardrobe.memberships where user_id=(select auth.uid())));
grant select,insert,delete on wardrobe.recommendations to authenticated;
create table wardrobe.feedback(
 recommendation_id uuid primary key,
 owner_user_id uuid not null default auth.uid(),
 rating smallint not null check(rating in(-1,1)),
 reason text not null default '' check(length(reason)<=500),
 updated_at timestamptz not null default now(),
 foreign key(owner_user_id,recommendation_id) references wardrobe.recommendations(owner_user_id,recommendation_id) on delete cascade
);
create index wardrobe_feedback_owner on wardrobe.feedback(owner_user_id);
alter table wardrobe.feedback enable row level security;
create policy feedback_owner on wardrobe.feedback for all to authenticated
using(owner_user_id=(select auth.uid()) and exists(select 1 from wardrobe.memberships where user_id=(select auth.uid())))
with check(owner_user_id=(select auth.uid()) and exists(select 1 from wardrobe.memberships where user_id=(select auth.uid())));
grant select,insert,update,delete on wardrobe.feedback to authenticated;
-- The trigger validates even direct table inserts, with the caller's permissions/RLS.
create function wardrobe.validate_recommendation() returns trigger language plpgsql security invoker set search_path='' as $$
declare valid_count int; expected_missing text[]:='{}'; has_one bool; has_top bool; has_bottom bool; has_shoes bool; has_layer bool;
begin
 if new.owner_user_id is distinct from auth.uid() then raise exception 'Invalid outfit owner'; end if;
 if cardinality(new.item_ids)<>(select count(distinct x) from unnest(new.item_ids) x) then raise exception 'Repeated outfit item'; end if;
 select count(*),coalesce(bool_or(category='one_piece'),false),coalesce(bool_or(category='top'),false),coalesce(bool_or(category='bottom'),false),coalesce(bool_or(category='shoes'),false),coalesce(bool_or(category='outerwear'),false)
 into valid_count,has_one,has_top,has_bottom,has_shoes,has_layer
 from wardrobe.items where item_id=any(new.item_ids) and owner_user_id=auth.uid() and lifecycle_status='active';
 if valid_count<>cardinality(new.item_ids) then raise exception 'Every owned item must be active in your wardrobe'; end if;
 if exists(select 1 from wardrobe.items where item_id=any(new.item_ids) and (new.occasion='formal' and formality<>'formal' or new.occasion='smart' and formality not in ('smart','formal'))) then raise exception 'Outfit does not match occasion'; end if;
 if exists(select 1 from wardrobe.items i join wardrobe.preferences p on p.owner_user_id=i.owner_user_id where i.item_id=any(new.item_ids) and (lower(i.primary_colour)=any(regexp_split_to_array(lower(trim(p.avoided_colours)),'[,;[:space:]]+')) or (p.climate='hot' and i.season='winter') or (p.climate='cold' and i.season='summer'))) then raise exception 'Outfit conflicts with your preferences'; end if;
 if not has_one then if not has_top then expected_missing:=array_append(expected_missing,'Top'); end if; if not has_bottom then expected_missing:=array_append(expected_missing,'Bottom'); end if; end if;
 if not has_shoes then expected_missing:=array_append(expected_missing,'Shoes'); end if;
 if exists(select 1 from wardrobe.preferences where owner_user_id=auth.uid() and climate='cold') and not has_layer then expected_missing:=array_append(expected_missing,'Warm layer'); end if;
 new.missing_slots:=expected_missing;
 select jsonb_agg(to_jsonb(i) order by i.item_id) into new.item_snapshot from wardrobe.items i where i.item_id=any(new.item_ids) and owner_user_id=auth.uid();
 return new;
end; $$;
revoke all on function wardrobe.validate_recommendation() from public,anon,authenticated;
create trigger validate_wardrobe_recommendation before insert on wardrobe.recommendations for each row execute function wardrobe.validate_recommendation();
create or replace function public.wardrobe_save_item(payload jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved wardrobe.items; target uuid:=nullif(payload->>'item_id','')::uuid;
begin
 if target is null then
 insert into wardrobe.items(display_name,category,subcategory,primary_colour,pattern,fit,formality,notes,lifecycle_status,season,material,garment_length,style_tags)
 values(trim(payload->>'display_name'),payload->>'category',lower(trim(payload->>'subcategory')),payload->>'primary_colour',coalesce(payload->>'pattern','unknown'),coalesce(payload->>'fit','unknown'),coalesce(payload->>'formality','unknown'),coalesce(payload->>'notes',''),coalesce(payload->>'lifecycle_status','active'),coalesce(payload->>'season','unknown'),coalesce(payload->>'material','unknown'),coalesce(payload->>'garment_length','unknown'),coalesce(payload->>'style_tags','')) returning * into saved;
 else
 update wardrobe.items set display_name=trim(payload->>'display_name'),category=payload->>'category',subcategory=lower(trim(payload->>'subcategory')),primary_colour=payload->>'primary_colour',pattern=payload->>'pattern',fit=payload->>'fit',formality=payload->>'formality',notes=coalesce(payload->>'notes',''),lifecycle_status=payload->>'lifecycle_status',season=coalesce(payload->>'season',season),material=coalesce(payload->>'material',material),garment_length=coalesce(payload->>'garment_length',garment_length),style_tags=coalesce(payload->>'style_tags',style_tags),updated_at=now()
 where item_id=target and owner_user_id=auth.uid() returning * into saved;
 if not found then raise exception 'Piece not found or access denied'; end if;
 end if; return to_jsonb(saved);
end; $$;
create function public.wardrobe_record_recommendation(request_id uuid,owned_ids uuid[],selected_occasion text,explanation text,missing_slots text[]) returns jsonb language plpgsql security invoker set search_path='' as $$
declare rec wardrobe.recommendations;
begin
 insert into wardrobe.recommendations(recommendation_id,item_ids,occasion,rationale,missing_slots,item_snapshot)
 values(request_id,owned_ids,selected_occasion,explanation,missing_slots,'[]') on conflict(recommendation_id) do nothing;
 select * into rec from wardrobe.recommendations where recommendation_id=request_id and owner_user_id=auth.uid();
 if not found then raise exception 'Recommendation unavailable'; end if;
 return to_jsonb(rec);
end; $$;
create function public.wardrobe_rate_recommendation(target_id uuid,rating_value int,reason_text text) returns void language sql security invoker set search_path='' as $$
 insert into wardrobe.feedback(recommendation_id,owner_user_id,rating,reason) values(target_id,auth.uid(),rating_value,coalesce(reason_text,''))
 on conflict(recommendation_id) do update set rating=excluded.rating,reason=excluded.reason,updated_at=now();
$$;
create or replace function public.wardrobe_bootstrap() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('access',exists(select 1 from wardrobe.memberships where user_id=auth.uid()),
 'items',coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at desc) from wardrobe.items i where owner_user_id=auth.uid()),'[]'::jsonb),
 'preferences',(select to_jsonb(p)-'owner_user_id' from wardrobe.preferences p where owner_user_id=auth.uid()),
 'feedback',coalesce((select jsonb_agg(to_jsonb(f)) from (select f.recommendation_id,f.rating,f.reason,r.item_ids from wardrobe.feedback f join wardrobe.recommendations r using(recommendation_id) where f.owner_user_id=auth.uid() order by f.updated_at desc limit 200) f),'[]'::jsonb));
$$;
create function public.wardrobe_export_data() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('recommendations',coalesce((select jsonb_agg(to_jsonb(r)) from wardrobe.recommendations r where owner_user_id=auth.uid()),'[]'::jsonb),'feedback',coalesce((select jsonb_agg(to_jsonb(f)) from wardrobe.feedback f where owner_user_id=auth.uid()),'[]'::jsonb));
$$;
create function public.wardrobe_clear_data() returns void language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 delete from wardrobe.feedback where owner_user_id=auth.uid();
 delete from wardrobe.recommendations where owner_user_id=auth.uid();
 delete from wardrobe.items where owner_user_id=auth.uid();
 delete from wardrobe.preferences where owner_user_id=auth.uid();
end; $$;
revoke all on function public.wardrobe_record_recommendation(uuid,uuid[],text,text,text[]),public.wardrobe_rate_recommendation(uuid,int,text),public.wardrobe_export_data(),public.wardrobe_clear_data() from public,anon;
grant execute on function public.wardrobe_record_recommendation(uuid,uuid[],text,text,text[]),public.wardrobe_rate_recommendation(uuid,int,text),public.wardrobe_export_data(),public.wardrobe_clear_data() to authenticated;
notify pgrst,'reload schema';
