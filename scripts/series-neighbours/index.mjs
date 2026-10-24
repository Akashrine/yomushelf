// "Séries proches" for the curated catalogue (migration 20261024000200).
// Each series becomes a vector from what it tells (title, genres,
// readership, French synopsis) with an open multilingual model
// (multilingual-e5-small, MIT), then keeps its closest series.
// Catalogue data only : no reader data leaves or enters this script.
//
// Usage (own dependencies, never installed by the app ; service key of the
// target project, never committed) :
//   cd scripts/series-neighbours && ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node index.mjs [--dry-run]
// Run again after a catalogue change ; rows of a previous run are replaced.
// One run at a time : a run's purge removes the rows of any older run.

import { createClient } from "@supabase/supabase-js";
import { pipeline } from "@huggingface/transformers";

const MODEL = "Xenova/multilingual-e5-small";
const NEIGHBOURS = 12;
const DRY_RUN = process.argv.includes("--dry-run");

const GENRE_LABELS = {
  action: "action",
  aventure: "aventure",
  comedie: "comédie",
  drame: "drame",
  fantasy: "fantasy",
  surnaturel: "surnaturel",
  "science-fiction": "science-fiction",
  "tranche-de-vie": "tranche de vie",
  mystere: "mystère",
  romance: "romance",
  psychologique: "psychologique",
  horreur: "horreur",
  historique: "historique",
  sport: "sport",
  cuisine: "cuisine",
};
const READERSHIP = {
  kodomo: "pour enfants",
  shonen: "shōnen",
  shojo: "shōjo",
  seinen: "seinen",
  josei: "josei",
};
const titleKey = (t) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

// PostgREST returns at most 1000 rows a call : read every page, then check
// the total before writing anything (a short read would purge real links).
const curated = () => supabase.from("mangas").select("id, title, genres, demographic, synopsis", { count: "exact" }).is("created_by", null).is("merged_into", null).eq("curated", true);
const series = [];
let expected = null;
for (let from = 0; ; from += 1000) {
  const { data, error, count } = await curated().order("id").range(from, from + 999);
  if (error) throw error;
  expected = count;
  series.push(...data);
  if (data.length < 1000) break;
}
if (series.length !== expected) {
  console.error(`Lecture incomplète : ${series.length} séries lues sur ${expected}. Rien n'est écrit.`);
  process.exit(1);
}
console.log(`${series.length} séries curées`);

// e5 : the "query: " prefix on both sides for a symmetric similarity.
const text = (s) =>
  `query: ${s.title}. ${(s.genres ?? []).map((g) => GENRE_LABELS[g] ?? g).join(", ")}. ${READERSHIP[s.demographic] ?? ""}. ${s.synopsis ?? ""}`;

const embed = await pipeline("feature-extraction", MODEL, { dtype: "q8" });
const vectors = [];
for (let i = 0; i < series.length; i += 32) {
  const out = await embed(series.slice(i, i + 32).map(text), {
    pooling: "mean",
    normalize: true,
  });
  vectors.push(...out.tolist());
}
const cos = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

const computedAt = new Date().toISOString();
const rows = [];
series.forEach((s, i) => {
  const own = titleKey(s.title);
  series
    .map((t, j) => ({ t, score: j === i ? -2 : cos(vectors[i], vectors[j]) }))
    .filter(({ t, score }) => score > -2 && titleKey(t.title) !== own)
    .sort((a, b) => b.score - a.score)
    .slice(0, NEIGHBOURS)
    .forEach(({ t, score }, r) =>
      rows.push({
        manga_id: s.id,
        neighbour_id: t.id,
        rank: r + 1,
        score: Math.round(score * 10000) / 10000,
        model: MODEL,
        computed_at: computedAt,
      }),
    );
});

if (DRY_RUN) {
  const byId = new Map(series.map((s) => [s.id, s.title]));
  for (const s of series.slice(0, 200).filter((_, i) => i % 15 === 0)) {
    const near = rows
      .filter((r) => r.manga_id === s.id)
      .slice(0, 5)
      .map((r) => `${byId.get(r.neighbour_id)} (${r.score.toFixed(3)})`);
    console.log(`${s.title} → ${near.join(" · ")}`);
  }
  console.log(`${rows.length} liens calculés, rien d'écrit (--dry-run).`);
} else {
  await write();
}
// Free the ONNX session : exiting with it alive aborts the process.
await embed.dispose();

async function write() {
  for (let i = 0; i < rows.length; i += 500) {
    const { error: e } = await supabase
      .from("series_neighbours")
      .upsert(rows.slice(i, i + 500), { onConflict: "manga_id,neighbour_id" });
    if (e) throw e;
  }
  // Links of a previous run that are no longer among the closest.
  const { error: purge } = await supabase
    .from("series_neighbours")
    .delete()
    .lt("computed_at", computedAt);
  if (purge) throw purge;
  console.log(
    `${rows.length} liens écrits (${series.length} séries × ${NEIGHBOURS}).`,
  );
}
