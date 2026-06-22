import { createClient } from "@supabase/supabase-js"
import type { WorkoutSession } from "@/types"

// Server-side client — uses service role key, bypasses RLS
// Only use in API routes, never expose to browser
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Browser client — uses anon key, respects RLS
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type { WorkoutSession }
