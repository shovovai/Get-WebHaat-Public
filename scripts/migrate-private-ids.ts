/**
 * One-time migration: move every non-catalog document to a PRIVATE id.
 *
 * Why: Sanity's free plan only offers public datasets. Anyone can download every document in a
 * public dataset without a token — except documents whose _id contains a dot ("in a path"), which
 * need an authenticated request. The app now creates customer/business documents with
 * `private.<type>.<uuid>` ids (lib/privateId.ts); this script moves the documents created before
 * that change.
 *
 * What it does, for every document of a private type whose _id has no dot (root path):
 *   1. copies it to `private.<type>.<oldId>` (the old id stays inside the new one for
 *      traceability; the `paymentSettings` singleton becomes `private.paymentSettings`).
 *      Plain-string fields holding an old id (e.g. walletTransactions[].orderId) are rewritten.
 *   2. rewrites every reference (`_ref`) to a moved id, in ALL documents (drafts included),
 *   3. deletes the originals,
 *   all in batched transactions. `drafts.` / `versions.` documents are never moved.
 *   Finally it asks the API WITHOUT a token how many private-type documents it can still see.
 *   That number must be 0.
 *
 * Usage (reads .env.local, then .env; needs SANITY_API_TOKEN with write access):
 *   npx tsx scripts/migrate-private-ids.ts --dry-run   # report only, writes nothing
 *   npx tsx scripts/migrate-private-ids.ts --apply     # do it
 *
 * Safe to re-run: already-private documents are skipped. Back up first:
 *   npx sanity dataset export <dataset> backup.tar.gz
 */
import { createClient, type SanityClient, type SanityDocument } from "@sanity/client";

/** Document types that hold customer or business data (everything except the public catalog). */
const PRIVATE_TYPES = [
  "order",
  "user",
  "userType", // legacy type name still written by a few older routes
  "address",
  "contact",
  "subscription",
  "coupon",
  "emailCampaign",
  "review",
  "sentNotification",
  "userAccessRequest",
  "paymentSettings",
  "auditLog",
];

/** Singletons with a well-known id get a fixed private id instead of private.<type>.<oldId>. */
const SINGLETONS: Record<string, string> = { paymentSettings: "private.paymentSettings" };

const BATCH = 100; // mutations per transaction
const PAGE = 500; // documents per read
const REF_CHUNK = 150; // ids per references() query

type Doc = SanityDocument & Record<string, unknown>;

async function loadEnv() {
  // Prefer dotenv when installed, otherwise Node's built-in loader (Node >= 20.12)
  for (const file of [".env.local", ".env"]) {
    try {
      const name = "dotenv";
      const dotenv = (await import(name)) as { config: (o: { path: string }) => unknown };
      dotenv.config({ path: file });
    } catch {
      try {
        process.loadEnvFile(file);
      } catch {
        /* file missing — fine */
      }
    }
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function newIdFor(doc: { _id: string; _type: string }): string {
  return SINGLETONS[doc._type] && doc._id === doc._type
    ? SINGLETONS[doc._type]
    : `private.${doc._type}.${doc._id}`;
}

/** Deep copy of `value`, replacing `_ref`s (and optionally plain id strings) found in `idMap`. */
function rewrite(
  value: unknown,
  idMap: Map<string, string>,
  opts: { refs: boolean; strings: boolean },
  stats: { refs: number; strings: number },
  key = ""
): unknown {
  if (Array.isArray(value)) return value.map((v) => rewrite(v, idMap, opts, stats));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === "_ref" && typeof v === "string") {
        if (opts.refs && idMap.has(v)) {
          stats.refs++;
          out[k] = idMap.get(v);
        } else out[k] = v;
        continue;
      }
      out[k] = rewrite(v, idMap, opts, stats, k);
    }
    return out;
  }
  // Plain strings equal to a moved, random-looking id (never _id/_type/_key or short singleton ids)
  if (
    opts.strings &&
    typeof value === "string" &&
    !key.startsWith("_") &&
    value.length >= 16 &&
    idMap.has(value)
  ) {
    stats.strings++;
    return idMap.get(value);
  }
  return value;
}

/** Top-level fields whose value changed — what a patch needs to set. */
function changedFields(before: Doc, after: Record<string, unknown>): Record<string, unknown> {
  const set: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(after)) {
    if (k.startsWith("_")) continue;
    if (JSON.stringify(v) !== JSON.stringify(before[k])) set[k] = v;
  }
  return set;
}

async function fetchRootDocs(client: SanityClient): Promise<Doc[]> {
  const docs: Doc[] = [];
  let last = "";
  for (;;) {
    const page = await client.fetch<Doc[]>(
      `*[_type in $types && _id in path("*") && _id > $last] | order(_id asc) [0...${PAGE}]`,
      { types: PRIVATE_TYPES, last }
    );
    docs.push(...page);
    if (page.length < PAGE) return docs;
    last = page[page.length - 1]._id;
  }
}

/** Every document (any type, drafts included) that references one of `ids`. */
async function fetchReferrers(client: SanityClient, ids: string[]): Promise<Doc[]> {
  const byId = new Map<string, Doc>();
  for (const part of chunk(ids, REF_CHUNK)) {
    const docs = await client.fetch<Doc[]>(`*[references($ids)]`, { ids: part });
    for (const d of docs) byId.set(d._id, d);
  }
  return [...byId.values()];
}

async function commitInBatches(
  client: SanityClient,
  label: string,
  ops: Array<(tx: ReturnType<SanityClient["transaction"]>) => void>
) {
  let done = 0;
  for (const part of chunk(ops, BATCH)) {
    const tx = client.transaction();
    for (const op of part) op(tx);
    await tx.commit(); // default "sync" visibility: the next phase's queries must see these writes
    done += part.length;
    console.log(`  ${label}: ${done}/${ops.length}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const dryRun = args.includes("--dry-run");
  if (apply === dryRun) {
    console.error("Usage: npx tsx scripts/migrate-private-ids.ts --dry-run | --apply");
    process.exit(1);
  }

  await loadEnv();
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-01-01";
  const token = process.env.SANITY_API_TOKEN;
  if (!projectId || !dataset || !token) {
    console.error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET or SANITY_API_TOKEN");
    process.exit(1);
  }

  // raw perspective: see drafts too, so references held by drafts get rewritten as well
  const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false, perspective: "raw" });
  console.log(`${apply ? "APPLY" : "DRY RUN"} — project ${projectId}, dataset ${dataset}\n`);

  // 1. What has to move
  const originals = await fetchRootDocs(client);
  const idMap = new Map(originals.map((d) => [d._id, newIdFor(d)]));
  const perType: Record<string, number> = {};
  for (const d of originals) perType[d._type] = (perType[d._type] || 0) + 1;

  console.log("Documents to move to a private id:");
  for (const t of PRIVATE_TYPES) console.log(`  ${t.padEnd(18)} ${perType[t] || 0}`);
  console.log(`  ${"TOTAL".padEnd(18)} ${originals.length}`);

  const collisions = originals.length
    ? await client.fetch<string[]>(`*[_id in $ids]._id`, { ids: [...idMap.values()] })
    : [];
  if (collisions.length) {
    console.warn(`\n! ${collisions.length} target id(s) already exist and will be overwritten:`, collisions.slice(0, 10));
  }

  const drafts = await client.fetch<number>(
    `count(*[_type in $types && (_id in path("drafts.**") || _id in path("versions.**")) && !(_id in path("drafts.private.**"))])`,
    { types: PRIVATE_TYPES }
  );
  if (drafts) {
    console.warn(
      `\n! ${drafts} draft/version document(s) of private types exist. They are private already but are\n` +
        `  not moved; publish or discard them in Studio (a published draft lands on its old public id).`
    );
  }

  const oldIds = [...idMap.keys()];
  const referrers = oldIds.length ? await fetchReferrers(client, oldIds) : [];
  const refStats = { refs: 0, strings: 0 };
  for (const d of referrers) rewrite(d, idMap, { refs: true, strings: false }, refStats);
  const strStats = { refs: 0, strings: 0 };
  for (const d of originals) rewrite(d, idMap, { refs: false, strings: true }, strStats);
  console.log(
    `\nDocuments holding references to moved ids: ${referrers.length} (${refStats.refs} references to rewrite)` +
      `\nPlain-string id fields to rewrite inside moved documents: ${strStats.strings}`
  );

  if (!apply) {
    console.log("\nDry run: nothing was written. Re-run with --apply to migrate.");
  } else if (originals.length) {
    // Phase 1: create the private copies. References still point at the old (existing) ids so
    // strong references stay valid; plain id strings are rewritten now.
    console.log("\nPhase 1 — creating private copies");
    await commitInBatches(
      client,
      "created",
      originals.map((d) => (tx) => {
        const { _rev, _updatedAt, ...rest } = rewrite(d, idMap, { refs: false, strings: true }, {
          refs: 0,
          strings: 0,
        }) as Doc;
        void _rev;
        void _updatedAt;
        tx.createOrReplace({ ...rest, _id: idMap.get(d._id)!, _type: d._type });
      })
    );

    // Phase 2: point every reference at the new ids — in the copies, in other documents and in
    // the originals too (so no original still strongly references another original at delete time).
    console.log("\nPhase 2 — rewriting references");
    const toPatch = await fetchReferrers(client, oldIds);
    const patches = toPatch
      .map((d) => ({ d, set: changedFields(d, rewrite(d, idMap, { refs: true, strings: false }, { refs: 0, strings: 0 }) as Record<string, unknown>) }))
      .filter(({ set }) => Object.keys(set).length > 0);
    await commitInBatches(
      client,
      "patched",
      patches.map(({ d, set }) => (tx) => {
        tx.patch(d._id, (p) => p.ifRevisionId(d._rev).set(set));
      })
    );

    // Phase 3: delete the originals once nothing outside them references them any more
    let remaining = 0;
    for (const part of chunk(oldIds, REF_CHUNK)) {
      // anything except the originals themselves (root-path docs of private types)
      remaining += await client.fetch<number>(
        `count(*[references($ids) && !(_type in $types && _id in path("*"))])`,
        { ids: part, types: PRIVATE_TYPES }
      );
    }
    if (remaining > 0) {
      console.error(`\n✗ ${remaining} document(s) still reference old ids; originals NOT deleted. Re-run --apply.`);
      process.exit(1);
    }
    console.log("\nPhase 3 — deleting originals");
    await commitInBatches(
      client,
      "deleted",
      oldIds.map((id) => (tx) => {
        tx.delete(id);
      })
    );
    console.log(`\nMoved ${originals.length} document(s); patched ${patches.length} referencing document(s).`);
    if (idMap.has("paymentSettings")) {
      console.log("Payment settings now live at private.paymentSettings (lib/paymentConfig.ts must use that id).");
    }
  } else {
    console.log("\nNothing to migrate.");
  }

  // The public storeSettings singleton used to record the admin's email in updatedBy
  const leaked = await client.fetch<string[]>(`*[_type == "storeSettings" && updatedBy match "*@*"]._id`);
  if (leaked.length) {
    console.log(`\nstoreSettings documents exposing an admin email in updatedBy: ${leaked.length}`);
    if (apply) await commitInBatches(client, "cleared", leaked.map((id) => (tx) => { tx.patch(id, (p) => p.unset(["updatedBy"])); }));
  }

  // Final check: what can an anonymous visitor still download?
  const anon = createClient({ projectId, dataset, apiVersion, useCdn: false, perspective: "published" });
  try {
    const visible = await anon.fetch<number>(`count(*[_type in $types])`, { types: PRIVATE_TYPES });
    console.log(`\nUnauthenticated query sees ${visible} private-type document(s) — ${visible === 0 ? "OK" : "MUST BE 0"}.`);
    if (visible !== 0 && apply) process.exitCode = 1;
  } catch (error) {
    console.log("\nUnauthenticated query was rejected (dataset is private) — OK.", (error as Error).message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
