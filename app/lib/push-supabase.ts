import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_PUSH_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_PUSH_SUPABASE_KEY

export const pushSupabase = createClient(supabaseUrl, supabaseKey)
