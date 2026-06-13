import { createClient } from "@supabase/supabase-js";

// Exact Supabase keys provided by the user
const DEFAULT_SUPABASE_URL = "https://lzntzpmjocbaxamechsi.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bnR6cG1qb2NiYXhhbWVjaHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTY0NDcsImV4cCI6MjA5Njg3MjQ0N30.Dbre_9NxGGueYamdQMEt0uUW3csjV_kE20OV3JxFG7k";

export const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
