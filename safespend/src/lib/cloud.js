// ---------------------------------------------------------------------------
// Cloud backup (Supabase)
// ---------------------------------------------------------------------------
// Snapshot-style sync: the whole-account object that db.exportAll() produces is
// stored as one jsonb row per user in the `backups` table (see
// safespend-supabase.sql, Part 2). Restoring runs that payload back through
// db.importAll(). RLS scopes every row to the signed-in user, so these queries
// never need an explicit user filter.
// ---------------------------------------------------------------------------

import { supabase } from "./supabaseClient.js";

function requireClient() {
  if (!supabase) throw new Error("Cloud sync isn't configured");
  return supabase;
}

// Upload the current account snapshot. payload = await db.exportAll().
export async function pushBackup(payload) {
  const client = requireClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Sign in to back up");

  const { error } = await client.from("backups").upsert({
    user_id: user.id,
    payload,
    schema_version: payload?.schemaVersion ?? 1,
  });
  if (error) throw error;
  return true;
}

// Fetch the stored snapshot (or null if none yet).
export async function pullBackup() {
  const client = requireClient();
  const { data, error } = await client
    .from("backups")
    .select("payload, updated_at")
    .maybeSingle();
  if (error) throw error;
  return data; // { payload, updated_at } | null
}

// Just the timestamp, for the "last backed up" label.
export async function getBackupMeta() {
  const client = requireClient();
  const { data, error } = await client
    .from("backups")
    .select("updated_at")
    .maybeSingle();
  if (error) throw error;
  return data?.updated_at || null;
}
