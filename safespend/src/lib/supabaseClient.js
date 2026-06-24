// ---------------------------------------------------------------------------
// Supabase client (placeholder)
// ---------------------------------------------------------------------------
// SafeSpend currently persists everything to localStorage (see ./db.js). This
// file is the single seam where Supabase will plug in later. Nothing here runs
// until real environment variables are provided, so the app works with zero
// configuration today.
//
// To enable Supabase later:
//   1. Create a project at https://supabase.com
//   2. Add these to a .env file (see .env.example):
//        VITE_SUPABASE_URL=...
//        VITE_SUPABASE_ANON_KEY=...
//   3. Implement the repository functions in ./db.js against `supabase`
//      (the function signatures there are already async + Supabase-ready).
//
// Suggested schema (run in the Supabase SQL editor):
//   profiles(id uuid pk references auth.users, currency text,
//            pay_frequency text, next_payday date, typical_income numeric)
//   pay_cycles(id uuid pk, user_id uuid references auth.users,
//              start_date date, next_payday date, income numeric,
//              created_at timestamptz default now())
//   expenses(id uuid pk, cycle_id uuid references pay_cycles on delete cascade,
//            name text, amount numeric, due_date date, type text,
//            recurring bool, notes text)
//   -- enable Row Level Security and scope every table to auth.uid().
// ---------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Only create a real client if keys exist; otherwise stay null so the app
// transparently falls back to localStorage.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Example of where an auth call will live later:
//
//   export async function signIn(email) {
//     return supabase.auth.signInWithOtp({ email });
//   }
//
//   export async function getSession() {
//     return supabase.auth.getSession();
//   }
