import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// بتشتغل مرة كل يوم (مساءً بتوقيت المستخدمين تقريباً) عن طريق pg_cron.
// بتدور على أي حد سلسلته (streak) هتتصفر لو محفتحش التطبيق قبل نص الليل:
// يعني last_streak_date بتاعه = إمبارح، ومعندوش نشاط النهاردة لسه.
// بنستهدف بس اللي عندهم سلسلة تستاهل (current_streak >= 2) عشان ما نزعجش
// كل المستخدمين كل يوم من غير داعي - ده بالظبط اللي بيخلي إشعارات زي دي
// فعّالة نفسياً (خسارة حاجة بنيتها) مش بس تذكير عام.
const WEBHOOK_SECRET = "0a062c3519436c1ccf2876130c5cbc7339c164202cebda79";
const SEND_PUSH_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (_req: Request) => {
  try {
    const { data: atRisk, error } = await supabase
      .from("profiles")
      .select("id, username, current_streak")
      .eq("last_streak_date", new Date(Date.now() - 86400000).toISOString().slice(0, 10))
      .gte("current_streak", 2);

    if (error) throw error;
    if (!atRisk || atRisk.length === 0) {
      return new Response(JSON.stringify({ notified: 0 }), { headers: { "Content-Type": "application/json" } });
    }

    let notified = 0;
    await Promise.all(
      atRisk.map(async (p: { id: string; username: string; current_streak: number }) => {
        try {
          const res = await fetch(SEND_PUSH_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-webhook-secret": WEBHOOK_SECRET },
            body: JSON.stringify({
              user_id: p.id,
              title: `🔥 سلسلتك ${p.current_streak} يوم هتضيع!`,
              body: "افتح mem دلوقتي عشان متفقدش سلسلتك",
              url: "/",
            }),
          });
          if (res.ok) notified++;
        } catch (e) {
          console.error("streak push failed for", p.id, e);
        }
      })
    );

    return new Response(JSON.stringify({ notified }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("streak-reminder error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
