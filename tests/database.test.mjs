import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const alice = "11111111-1111-4111-8111-111111111111",
  bob = "22222222-2222-4222-8222-222222222222",
  outsider = "33333333-3333-4333-8333-333333333333";
test("Wardrobe migration and RLS enforce ownership, membership and CRUD", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated; insert into auth.users values ('${alice}'),('${bob}'),('${outsider}');`,
    );
    await db.exec(
      await readFile(new URL("../docs/schema.sql", import.meta.url), "utf8"),
    );
    for (const name of (
      await readdir(new URL("../supabase/migrations/", import.meta.url))
    )
      .filter(
        (n) =>
          n.includes("wardrobe_usability_and_feedback") ||
          n.includes("wardrobe_capture_quota"),
      )
      .sort())
      await db.exec(
        await readFile(
          new URL("../supabase/migrations/" + name, import.meta.url),
          "utf8",
        ),
      );
    assert.equal(
      (await db.query("select count(*)::int as n from wardrobe.memberships"))
        .rows[0].n,
      0,
      "migration must never enroll users automatically",
    );
    await db.exec(
      `insert into wardrobe.memberships(user_id) values('${alice}'),('${bob}'); set role authenticated; set request.jwt.claim.sub='${alice}';`,
    );
    for (let n = 0; n < 10; n++)
      await db.query("select public.wardrobe_reserve_capture()");
    await assert.rejects(
      db.query("select public.wardrobe_reserve_capture()"),
      /limit/i,
    );
    const item = {
      display_name: "Test shirt",
      category: "top",
      subcategory: "shirt",
      primary_colour: "blue",
      pattern: "solid",
      fit: "regular",
      formality: "casual",
      notes: "",
      lifecycle_status: "active",
      owner_user_id: bob,
    };
    const result = await db.query(
      "select public.wardrobe_save_item($1) as item",
      [JSON.stringify(item)],
    );
    const saved = result.rows[0].item;
    assert.equal(
      saved.owner_user_id,
      alice,
      "client-supplied owner is ignored",
    );
    const boot = async () =>
      (await db.query("select public.wardrobe_bootstrap() as data")).rows[0]
        .data;
    assert.equal((await boot()).items.length, 1);
    await db.exec(`set request.jwt.claim.sub='${bob}';`);
    assert.equal(
      (await boot()).items.length,
      0,
      "second user cannot read first user inventory",
    );
    await assert.rejects(
      db.query("select public.wardrobe_save_item($1)", [
        JSON.stringify({ ...item, item_id: saved.item_id }),
      ]),
      /not found|access denied/i,
    );
    await db.query("select public.wardrobe_delete_item($1)", [saved.item_id]);
    await db.exec(`set request.jwt.claim.sub='${alice}';`);
    assert.equal((await boot()).items.length, 1, "other user cannot delete");
    await assert.rejects(
      db.query("update wardrobe.items set owner_user_id=$1 where item_id=$2", [
        bob,
        saved.item_id,
      ]),
      /row-level security/i,
    );
    await db.query("select public.wardrobe_save_item($1)", [
      JSON.stringify({
        ...item,
        item_id: saved.item_id,
        lifecycle_status: "archived",
      }),
    ]);
    assert.equal((await boot()).items[0].lifecycle_status, "archived");
    await db.query("select public.wardrobe_save_preferences($1)", [
      JSON.stringify({ style: "minimal" }),
    ]);
    assert.equal((await boot()).preferences.style, "minimal");
    await db.exec(`set request.jwt.claim.sub='${outsider}';`);
    assert.equal((await boot()).access, false);
    await assert.rejects(
      db.query("select public.wardrobe_save_item($1)", [JSON.stringify(item)]),
      /row-level security/i,
    );
    await assert.rejects(
      db.query("insert into wardrobe.memberships(user_id) values($1)", [
        outsider,
      ]),
      /permission denied/i,
    );
    await db.exec(`set request.jwt.claim.sub='${alice}';`);
    // Persist recommendations with ownership and active-item validation, then exercise feedback isolation.
    await db.query("select public.wardrobe_save_item($1)", [
      JSON.stringify({
        ...item,
        item_id: saved.item_id,
        lifecycle_status: "active",
        season: "all",
      }),
    ]);
    const rid = "44444444-4444-4444-8444-444444444444";
    await db.query(
      "select public.wardrobe_record_recommendation($1,$2,'casual','Test rationale','{}')",
      [rid, [saved.item_id]],
    );
    await db.query(
      "select public.wardrobe_rate_recommendation($1,1,'Good fit')",
      [rid],
    );
    assert.equal((await boot()).feedback[0].rating, 1);
    await db.exec(`set request.jwt.claim.sub='${bob}';`);
    await assert.rejects(
      db.query("select public.wardrobe_rate_recommendation($1,-1,'Not mine')", [
        rid,
      ]),
      /row-level security|foreign key/i,
    );
    await assert.rejects(
      db.query(
        "select public.wardrobe_record_recommendation($1,$2,'casual','Invalid','{}')",
        ["55555555-5555-4555-8555-555555555555", [saved.item_id]],
      ),
      /active|owner|security/i,
    );
    assert.equal((await boot()).feedback.length, 0);
    await db.exec(`set request.jwt.claim.sub='${alice}';`);
    await assert.rejects(
      db.query(
        "select public.wardrobe_record_recommendation($1,$2,'formal','Invalid','{}')",
        ["66666666-6666-4666-8666-666666666666", [saved.item_id]],
      ),
      /occasion/i,
    );
    const exported = (
      await db.query("select public.wardrobe_export_data() as data")
    ).rows[0].data;
    assert.equal(exported.recommendations.length, 1);
    assert.equal(exported.feedback.length, 1);
    await db.exec(
      "reset role; create table public.tracker_preservation_probe(id int); insert into public.tracker_preservation_probe values(1); set role authenticated;",
    );
    await db.query("select public.wardrobe_clear_data()");
    assert.equal((await boot()).items.length, 0);
    assert.equal((await boot()).feedback.length, 0);
    assert.equal(
      (await boot()).access,
      true,
      "clearing data retains membership",
    );
    await db.exec("reset role;");
    assert.equal(
      (
        await db.query(
          "select count(*)::int as n from public.tracker_preservation_probe",
        )
      ).rows[0].n,
      1,
      "clear cannot touch tracker tables",
    );
    assert.equal(
      (await db.query("select count(*)::int as n from auth.users")).rows[0].n,
      3,
      "shared users remain",
    );
    await db.exec("set role authenticated;");

    await db.exec("reset role; set role anon;");
    await assert.rejects(
      db.query("select public.wardrobe_bootstrap()"),
      /permission denied/i,
    );
  } finally {
    await db.close();
  }
});
