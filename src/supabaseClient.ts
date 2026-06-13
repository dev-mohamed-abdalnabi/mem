import { createClient } from "@supabase/supabase-js";

// Exact Supabase keys provided by the user
const DEFAULT_SUPABASE_URL = "https://lzntzpmjocbaxamechsi.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bnR6cG1qb2NiYXhhbWVjaHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTY0NDcsImV4cCI6MjA5Njg3MjQ0N30.Dbre_9NxGGueYamdQMEt0uUW3csjV_kE20OV3JxFG7k";

function getValidUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.startsWith("https://") && !envUrl.includes("PLACEHOLDER") && envUrl !== "undefined" && envUrl !== "null") {
    return envUrl.trim();
  }
  return DEFAULT_SUPABASE_URL;
}

function getValidKey(): string {
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (envKey && typeof envKey === "string" && envKey.startsWith("eyJ") && envKey.length > 50 && envKey !== "undefined" && envKey !== "null") {
    return envKey.trim();
  }
  return DEFAULT_SUPABASE_ANON_KEY;
}

export const SUPABASE_URL = getValidUrl();
export const SUPABASE_ANON_KEY = getValidKey();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

