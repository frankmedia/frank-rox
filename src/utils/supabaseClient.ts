import { createClient } from "@supabase/supabase-js";

declare const __VITE_SUPABASE_URL__: string;
declare const __VITE_SUPABASE_ANON_KEY__: string;

const supabaseUrl = (typeof __VITE_SUPABASE_URL__ !== "undefined" && __VITE_SUPABASE_URL__) || (import.meta.env.VITE_SUPABASE_URL as string);
const supabaseAnonKey = (typeof __VITE_SUPABASE_ANON_KEY__ !== "undefined" && __VITE_SUPABASE_ANON_KEY__) || (import.meta.env.VITE_SUPABASE_ANON_KEY as string);

if (!supabaseUrl || !supabaseAnonKey) {
	// eslint-disable-next-line no-console
	console.warn("Supabase env vars missing: SUPABASE_URL / SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");


