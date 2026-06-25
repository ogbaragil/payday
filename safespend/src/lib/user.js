// Resolve a first name for greetings, mirroring Grow UP's logic so the two apps
// agree. Priority: an explicitly stored profile name (from onboarding or the
// Grow UP import) → the signed-in account's metadata (Google) → nothing.
// Email prefixes are deliberately skipped — they're often not real names.
export function firstNameFrom(profile, user) {
  if (profile?.name) return String(profile.name).trim().split(" ")[0];

  const meta = user?.user_metadata || {};
  const metaName =
    meta.first_name ||
    meta.given_name ||
    meta.full_name ||
    meta.name ||
    meta.display_name ||
    "";
  if (metaName) return String(metaName).trim().split(" ")[0];

  return "";
}
