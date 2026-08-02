import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase environment variables. Please check your .env file.");
}

export const supabase = createClient(SUPABASE_URL || "", SUPABASE_ANON_KEY || "");

// مُصدّرين هنا عشان أي كود يحتاج يرفع ملف عن طريق XMLHttpRequest يدوي
// (مش عن طريق supabase-js) عشان يقدر يتابع نسبة تقدم الرفع (onprogress) -
// الميزة دي مش متاحة في supabase-js .upload() اللي بيستخدم fetch من غير
// أي progress events. استخدامها الأساسي في uploadManager (رفع الخلفية
// بستايل تيك توك مع شريط تقدم حقيقي).
export const SUPABASE_URL_EXPORTED = SUPABASE_URL || "";
export const SUPABASE_ANON_KEY_EXPORTED = SUPABASE_ANON_KEY || "";
