import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/* The browser's Supabase client: it keeps the signed-in customer's session and reads only what row level security lets them see. */
export const authAvailable = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;
export function browserClient(): SupabaseClient {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'supplyforge.auth' },
  });
  return client;
}

/** Fictitious customers created by supabase/seed/60_accounts.sql; every one has the same password. */
export const DEMO_PASSWORD = 'supplyforge-demo';
export const DEMO_ACCOUNTS = [
  { email: 'customer12@example.com', label: 'Business customer' },
  { email: 'customer331@example.com', label: 'Home customer' },
];
