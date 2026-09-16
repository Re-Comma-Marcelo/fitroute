/**
 * Uploads exercise media to the public `exercise-media` bucket and points the
 * matching `exercises.midia_url` at it.
 *
 * Drop the files in a local folder that mirrors the bucket:
 *
 *   media/loop/<slug>.webp    animated execution loop
 *   media/thumb/<slug>.webp   static frame, same slug
 *
 * The slug is matched against the exercise name (`Barbell Row` ->
 * `barbell-row`). When the file is named differently, add an entry to
 * scripts/exercise-media-map.json: { "Barbell Row": "Bent_Over_Barbell_Row" }.
 *
 * Run with:
 *   bun scripts/upload-exercise-media.ts --check        # report only
 *   bun scripts/upload-exercise-media.ts [media-dir]    # upload + update rows
 *
 * Needs FORJA_SUPABASE_URL and FORJA_SUPABASE_SERVICE_ROLE_KEY in the env.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "exercise-media";
const MAP_FILE = "scripts/exercise-media-map.json";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const dryRun = args.includes("--dry-run");
const mediaDir = args.find((a) => !a.startsWith("--")) ?? "media";

const slugify = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function supabase() {
  const url = process.env["FORJA_SUPABASE_URL"];
  const key = process.env["FORJA_SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) {
    throw new Error(
      "Missing FORJA_SUPABASE_URL / FORJA_SUPABASE_SERVICE_ROLE_KEY in the environment.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Local files keyed by slug, so a name match finds them regardless of case. */
function localFiles(dir: string): Map<string, string> {
  const found = new Map<string, string>();
  if (!existsSync(dir)) return found;
  for (const file of readdirSync(dir)) {
    if (extname(file).toLowerCase() !== ".webp") continue;
    found.set(slugify(basename(file, extname(file))), join(dir, file));
  }
  return found;
}

function explicitMap(): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(MAP_FILE)) return map;
  const raw = JSON.parse(readFileSync(MAP_FILE, "utf8")) as Record<string, string>;
  for (const [nome, file] of Object.entries(raw)) map.set(slugify(nome), slugify(file));
  return map;
}

async function main() {
  const db = supabase();
  const { data: exercises, error } = await db
    .from("exercises")
    .select("id, nome, grupo_primario, midia_url")
    .order("grupo_primario")
    .order("nome");
  if (error) throw error;

  const loops = localFiles(join(mediaDir, "loop"));
  const thumbs = localFiles(join(mediaDir, "thumb"));
  const overrides = explicitMap();

  const pending: { id: string; nome: string; slug: string; loop: string; thumb: string }[] = [];
  const missing: string[] = [];
  const noThumb: string[] = [];
  let withMedia = 0;

  for (const ex of exercises ?? []) {
    if ((ex.midia_url ?? "").trim()) {
      withMedia += 1;
      continue;
    }
    const slug = overrides.get(slugify(ex.nome)) ?? slugify(ex.nome);
    const loop = loops.get(slug);
    const thumb = thumbs.get(slug);
    if (!loop) {
      missing.push(`${ex.nome} (${ex.grupo_primario}) -> ${slug}.webp`);
      continue;
    }
    if (!thumb) {
      noThumb.push(`${ex.nome} -> thumb/${slug}.webp`);
      continue;
    }
    pending.push({ id: ex.id, nome: ex.nome, slug, loop, thumb });
  }

  console.log(`${exercises?.length ?? 0} exercises, ${withMedia} already with media.`);
  if (missing.length) {
    console.log(`\nNo local file for ${missing.length}:`);
    for (const line of missing) console.log(`  - ${line}`);
  }
  if (noThumb.length) {
    console.log(`\nLoop found but thumb missing for ${noThumb.length}:`);
    for (const line of noThumb) console.log(`  - ${line}`);
  }
  if (!pending.length) {
    console.log("\nNothing to upload.");
    return;
  }
  console.log(`\nReady to upload ${pending.length}:`);
  for (const item of pending) console.log(`  - ${item.nome} -> ${item.slug}.webp`);
  if (checkOnly || dryRun) return;

  for (const item of pending) {
    for (const kind of ["loop", "thumb"] as const) {
      const path = `${kind}/${item.slug}.webp`;
      const body = readFileSync(kind === "loop" ? item.loop : item.thumb);
      const { error: upErr } = await db.storage
        .from(BUCKET)
        .upload(path, body, { contentType: "image/webp", upsert: true });
      if (upErr) throw new Error(`${path}: ${upErr.message}`);
    }
    const { error: rowErr } = await db
      .from("exercises")
      .update({ midia_url: `${BUCKET}/loop/${item.slug}.webp` })
      .eq("id", item.id);
    if (rowErr) throw new Error(`${item.nome}: ${rowErr.message}`);
    console.log(`uploaded ${item.nome}`);
  }
  console.log(`\nDone: ${pending.length} exercises now have media.`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
