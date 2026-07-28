/**
 * Edge Middleware: بريفيو حقيقي (OG tags) لروابط الميمز المشاركة
 * ===============================================================
 * التطبيق SPA - يعني React بيرندر المحتوى في المتصفح بعد ما يوصله
 * index.html فاضي تقريباً. المشكلة: لما حد يشارك رابط ميم (مثلاً
 * mem.app/?meme=123) في واتساب أو تليجرام أو تويتر، الأنظمة دي مش
 * بتشغل جافاسكريبت خالص - بتقرأ الـ HTML الخام بس عشان تجيب صورة
 * وعنوان للبريفيو، فكانت بتشوف index.html الفاضي وتطلع بريفيو عام
 * زي أي رابط عادي من غير صورة الميم ولا اسمه، وده بيقلل جداً من نسب
 * الضغط على الروابط المشاركة (اللينك بيبان "ميت" في المحادثة).
 *
 * الحل: قبل ما الطلب يوصل لملفات الموقع، بنشوف هل الطلب جاي من بوت
 * معروف (فيسبوك/واتساب/تليجرام/تويتر..) ومعاه ?meme=ID. لو كده، بنجيب
 * بيانات الميم مباشرة من REST API بتاع Supabase (بمفتاح anon العام -
 * نفس المفتاح المتاح للمتصفح أصلاً، آمن) ونرجع صفحة HTML صغيرة فيها
 * og:title وog:image الحقيقيين بس. أي زائر عادي (مش بوت) بيعدي عادي
 * ويوصله التطبيق الكامل زي ما هو.
 */

export const config = {
  matcher: "/",
};

const CRAWLER_UA_PATTERN =
  /facebookexternalhit|Facebot|WhatsApp|TelegramBot|Twitterbot|LinkedInBot|Slackbot|Discordbot|Pinterest|SkypeUriPreview|vkShare|W3C_Validator/i;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default async function middleware(request: Request): Promise<Response | void> {
  const url = new URL(request.url);
  const memeId = url.searchParams.get("meme");
  const userAgent = request.headers.get("user-agent") || "";

  // مش رابط ميم أو مش بوت سوشيال - سيبه يعدي عادي للتطبيق الحقيقي
  if (!memeId || !CRAWLER_UA_PATTERN.test(userAgent)) {
    return;
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

  const fallbackHtml = buildHtml({
    title: "mem - منصة الميمز العربية",
    description: "منصة ميمز عربية بأسلوب فيسبوك/تيك توك: انشر، شارك، وتفاعل مع أحدث الميمز.",
    image: `${url.origin}/icons/icon-512.png`,
    url: url.toString(),
  });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(fallbackHtml, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  try {
    const apiUrl = `${SUPABASE_URL}/rest/v1/memes?id=eq.${encodeURIComponent(memeId)}&select=caption,image_url,video_url,images,status&limit=1`;
    const res = await fetch(apiUrl, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    const rows = res.ok ? await res.json() : [];
    const meme = Array.isArray(rows) ? rows[0] : null;

    if (!meme || meme.status !== "approved") {
      return new Response(fallbackHtml, { headers: { "content-type": "text/html; charset=utf-8" } });
    }

    const image = meme.image_url || (Array.isArray(meme.images) && meme.images[0]) || `${url.origin}/icons/icon-512.png`;
    const title = meme.caption ? meme.caption.slice(0, 90) : "شوف الميم ده على mem 😂";

    const html = buildHtml({
      title,
      description: "منصة mem - انضم وشارك ميمزك مع الجميع",
      image,
      url: url.toString(),
      isVideo: !!meme.video_url,
    });

    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  } catch {
    return new Response(fallbackHtml, { headers: { "content-type": "text/html; charset=utf-8" } });
  }
}

function buildHtml({
  title,
  description,
  image,
  url,
  isVideo = false,
}: {
  title: string;
  description: string;
  image: string;
  url: string;
  isVideo?: boolean;
}): string {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>${safeTitle}</title>
<meta property="og:type" content="${isVideo ? "video.other" : "website"}" />
<meta property="og:title" content="${safeTitle}" />
<meta property="og:description" content="${safeDesc}" />
<meta property="og:image" content="${image}" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta property="og:site_name" content="mem" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${safeTitle}" />
<meta name="twitter:description" content="${safeDesc}" />
<meta name="twitter:image" content="${image}" />
</head>
<body></body>
</html>`;
}
