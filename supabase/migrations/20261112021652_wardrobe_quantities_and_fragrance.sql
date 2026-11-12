alter table wardrobe.items drop constraint items_category_check;
alter table wardrobe.items add constraint items_category_check check(category in ('top','bottom','one_piece','shoes','outerwear','accessory','fragrance'));
alter table wardrobe.items drop constraint items_primary_colour_check;
alter table wardrobe.items add constraint items_primary_colour_check check(primary_colour in ('cream','white','black','navy','blue','green','brown','grey','pink','red','yellow','purple','unknown','olive','light_blue','sage','charcoal','beige','gold','silver','maroon','lilac','rust','light_grey','pale_yellow','multicolour'));
alter table wardrobe.items add column quantity int not null default 1 check(quantity between 1 and 10000);
alter table wardrobe.items add column usage_group text not null default 'unknown' check(length(usage_group)<=60);
alter table wardrobe.items add column sleeve_length text not null default 'unknown' check(length(sleeve_length)<=60);
alter table wardrobe.items add column condition text not null default 'unknown' check(length(condition)<=60);
create or replace function public.wardrobe_save_item(payload jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved wardrobe.items; target uuid:=nullif(payload->>'item_id','')::uuid;
begin
 if target is null then
 insert into wardrobe.items(display_name,category,subcategory,primary_colour,pattern,fit,formality,notes,lifecycle_status,season,material,garment_length,style_tags,quantity,usage_group,sleeve_length,condition)
 values(trim(payload->>'display_name'),payload->>'category',lower(trim(payload->>'subcategory')),payload->>'primary_colour',coalesce(payload->>'pattern','unknown'),coalesce(payload->>'fit','unknown'),coalesce(payload->>'formality','unknown'),coalesce(payload->>'notes',''),coalesce(payload->>'lifecycle_status','active'),coalesce(payload->>'season','unknown'),coalesce(payload->>'material','unknown'),coalesce(payload->>'garment_length','unknown'),coalesce(payload->>'style_tags',''),coalesce((payload->>'quantity')::int,1),coalesce(payload->>'usage_group','unknown'),coalesce(payload->>'sleeve_length','unknown'),coalesce(payload->>'condition','unknown')) returning * into saved;
 else
 update wardrobe.items set display_name=trim(payload->>'display_name'),category=payload->>'category',subcategory=lower(trim(payload->>'subcategory')),primary_colour=payload->>'primary_colour',pattern=payload->>'pattern',fit=payload->>'fit',formality=payload->>'formality',notes=coalesce(payload->>'notes',''),lifecycle_status=payload->>'lifecycle_status',season=coalesce(payload->>'season',season),material=coalesce(payload->>'material',material),garment_length=coalesce(payload->>'garment_length',garment_length),style_tags=coalesce(payload->>'style_tags',style_tags),quantity=coalesce((payload->>'quantity')::int,quantity),usage_group=coalesce(payload->>'usage_group',usage_group),sleeve_length=coalesce(payload->>'sleeve_length',sleeve_length),condition=coalesce(payload->>'condition',condition),updated_at=now()
 where item_id=target and owner_user_id=auth.uid() returning * into saved;
 if not found then raise exception 'Piece not found or access denied'; end if;
 end if; return to_jsonb(saved);
end; $$;

notify pgrst,'reload schema';
