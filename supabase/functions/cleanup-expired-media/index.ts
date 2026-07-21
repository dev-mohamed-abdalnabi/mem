// cleanup-expired-media
//
// بتشتغل مرة كل ليلة (الساعة 12 بالظبط حسب الجدولة في السيرفر) وبتمسح
// فعلياً من الـ Storage + قاعدة البيانات أي حاجة بقت "مش ظاهرة في الموقع":
//
// 1) الحالات (Stories) اللي وقتها خلص (expires_at < دلوقتي).
// 2) الميمز اللي حالتها "rejected" أو "deleted" ومر عليها أكتر من يوم
//    (عشان نسيب مساحة كافية لو حد عايز يراجع قرار الرفض قبل ما يتمسح
//    نهائي بدل ما يتمسح فوراً في نفس اللحظة).
//
// مهم: مسح ملف من Storage لازم يحصل عن طريق Storage API (supabase.storage
// .remove)، مش عن طريق DELETE مباشر في جدول storage.objects من SQL - ده
// بيسيب الملف الفعلي "يتيم" (orphaned) في الباكت من غير ما يتمسح فعلياً.
// عشان كده الشغل ده لازم يحصل هنا في Edge Function مش في SQL trigger.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const BUCKET = "memes";
const STORY_BATCH_LIMIT = 500;
const MEME_BATCH_LIMIT = 300;

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const publicPrefix = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/`;

  // بيحول رابط عام (public URL) لمسار جوه الباكت نفسه (اللي محتاجه storage.remove)
  function toStoragePath(url: string | null | undefined): string | null {
    if (!url || !url.startsWith(publicPrefix)) return null;
    return decodeURIComponent(url.slice(publicPrefix.length));
  }

  async function removePaths(paths: string[]) {
    const unique = Array.from(new Set(paths.filter(Boolean)));
    if (unique.length === 0) return { removed: 0, errors: [] as string[] };
    const errors: string[] = [];
    let removed = 0;
    // limit(1000) قصوى لكل نداء remove حسب حدود الـ Storage API
    for (let i = 0; i < unique.length; i += 1000) {
      const chunk = unique.slice(i, i + 1000);
      const { error } = await supabase.storage.from(BUCKET).remove(chunk);
      if (error) errors.push(error.message);
      else removed += chunk.length;
    }
    return { removed, errors };
  }

  const summary: Record<string, unknown> = {};

  try {
    // ---------------- 1) الحالات المنتهية ----------------
    const { data: expiredStories, error: storiesFetchError } = await supabase
      .from("stories")
      .select("id, media_url")
      .lt("expires_at", new Date().toISOString())
      .limit(STORY_BATCH_LIMIT);

    if (storiesFetchError) throw storiesFetchError;

    if (expiredStories && expiredStories.length > 0) {
      const paths = expiredStories.map((s) => toStoragePath(s.media_url)).filter((p): p is string => !!p);
      const { removed, errors } = await removePaths(paths);

      const ids = expiredStories.map((s) => s.id);
      const { error: deleteError } = await supabase.from("stories").delete().in("id", ids);
      if (deleteError) throw deleteError;

      summary.expired_stories = { found: expiredStories.length, files_removed: removed, storage_errors: errors };
    } else {
      summary.expired_stories = { found: 0 };
    }

    // ---------------- 2) الميمز المرفوضة/المحذوفة من أكتر من يوم ----------------
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: purgeMemes, error: memesFetchError } = await supabase
      .from("memes")
      .select("id, image_url, video_url, images")
      .in("status", ["rejected", "deleted"])
      .lt("updated_at", oneDayAgo)
      .limit(MEME_BATCH_LIMIT);

    if (memesFetchError) throw memesFetchError;

    if (purgeMemes && purgeMemes.length > 0) {
      const paths: string[] = [];
      for (const m of purgeMemes) {
        const p1 = toStoragePath(m.image_url);
        const p2 = toStoragePath(m.video_url);
        if (p1) paths.push(p1);
        if (p2) paths.push(p2);
        if (Array.isArray(m.images)) {
          for (const img of m.images) {
            const p = toStoragePath(img);
            if (p) paths.push(p);
          }
        }
      }
      const { removed, errors } = await removePaths(paths);

      const ids = purgeMemes.map((m) => m.id);
      // الحذف هنا CASCADE على الجداول المرتبطة (لايكات/كومنتات/بلاغات/...)
      // فمفيش داعي نمسحها يدوي قبل كده.
      const { error: deleteError } = await supabase.from("memes").delete().in("id", ids);
      if (deleteError) throw deleteError;

      summary.purged_memes = { found: purgeMemes.length, files_removed: removed, storage_errors: errors };
    } else {
      summary.purged_memes = { found: 0 };
    }

    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("cleanup-expired-media failed:", (error as Error)?.message);
    return new Response(JSON.stringify({ success: false, error: (error as Error)?.message, ...summary }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }
});
