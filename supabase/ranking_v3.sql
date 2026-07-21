-- =====================================================================
-- RANKING ALGORITHMS V3 — Feed / Reels / Stories
-- بناءً على ranking_v2.sql، بيضيف إشارات حقيقية تانية كانت ناقصة:
--   • Feed:   إشارة نزاهة مجتمعية (community integrity — لو ناس كتير قالوا
--             "مش مهتم"/"إخفاء" على بوست، بينزل للجميع مش بس لصاحب الفعل)
--             + velocity/momentum (بوست بياخد تفاعل بسرعة دلوقتي بيتصعد
--             فوراً، مش لازم يستنى ساعات كتير زي التقييم القديم اللي كان
--             بيعتمد بس على المجموع الكلي من غير وقت التفاعل)
--   • Reels:  velocity حقيقي على watch events (زي "Trending Now" في
--             تيك توك) + خبرة صانع المحتوى (creator quality prior — بيدي
--             فيديو جديد من صانع بيعمل completion عالي عادة فرصة أعدل
--             بدل ما يستنى بيانات مشاهدة كافية عليه هو تحديداً) + مطابقة
--             اهتمامات (tags) اللي كانت موجودة في الفيد بس مش في الريلز
--   • Stories: طبقة "أصدقاء مقرّبين" (close friends tier) قبل باقي
--             الغير-مشاهد، + استبعاد الحالات من ناس عملتلهم snooze/hide
--             (كان مفيش أي استبعاد خالص في v2، فحتى لو سكتّ حد من فيدك
--             حالاته كانت لسه بتظهر في الشريط)
--
-- زي v2 بالظبط: ده تنفيذ أصلي مبني على مبادئ منشورة، مش كود مسروق من أي
-- شركة. الفانكشنز الجديدة _v3 بتحل محل _v2 كواجهة افتراضية، وv2 فاضلة
-- زي ما هي (مش بنمسحها) عشان توافق رجعي لو حصل rollback.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. FEED — COMMUNITY INTEGRITY + VELOCITY
-- ---------------------------------------------------------------------
-- community_negative: عدد المستخدمين المختلفين (مش عدد الأحداث) اللي
-- عملوا hide/not_interested على البوست ده. بنستخدم distinct users عشان
-- شخص واحد يعمل hide 5 مرات (لو تكرر البوست في فيده) ميضخمش الإشارة.
-- velocity: تفاعل آخر 3 ساعات كنسبة من العمر — بوست عمره يوم بس أخد نص
-- تفاعله في آخر 3 ساعات ده إشارة "بيصعد دلوقتي" حقيقية، بعكس بوست نفس
-- التفاعل بس اتوزع بالتساوي على مدار اليوم كله.

CREATE OR REPLACE FUNCTION public.get_ranked_feed_v3(
  p_limit integer DEFAULT 30,
  p_offset integer DEFAULT 0,
  p_tag text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_post_type text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, user_id uuid, image_url text, video_url text, images text[], caption text,
  likes_count integer, comments_count integer, shares_count integer, saves_count integer,
  views_count integer, status meme_status, post_type text, created_at timestamptz, updated_at timestamptz,
  profile jsonb, tags text[], is_following boolean, liked_by_me boolean, saved_by_me boolean,
  score numeric
)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH me AS (SELECT auth.uid() AS uid),
  user_tag_affinity AS (
    SELECT t.name AS tag_name, count(*)::numeric AS strength
    FROM public.likes l
    JOIN public.meme_tags mt ON mt.meme_id = l.meme_id
    JOIN public.tags t ON t.id = mt.tag_id, me
    WHERE l.user_id = me.uid
    GROUP BY t.name
  ),
  -- تفضيل شكل المحتوى (فيديو مقابل صورة): مبني على إيه اللي المستخدم فعلاً
  -- بيتفاعل معاه أكتر تاريخياً، مش بس نوع البوست الحالي
  user_format_affinity AS (
    SELECT m2.post_type, count(*)::numeric AS strength
    FROM public.likes l, public.memes m2, me
    WHERE l.user_id = me.uid AND l.meme_id = m2.id
    GROUP BY m2.post_type
  ),
  excluded_authors AS (
    SELECT target_user_id FROM public.post_negative_feedback, me
    WHERE user_id = me.uid AND feedback_type = 'snooze_author'
      AND created_at > now() - interval '14 days'
    UNION
    SELECT target_user_id FROM public.post_negative_feedback, me
    WHERE user_id = me.uid AND feedback_type = 'not_interested'
  ),
  excluded_memes AS (
    SELECT meme_id FROM public.post_negative_feedback, me
    WHERE user_id = me.uid AND feedback_type = 'hide'
  ),
  exposure AS (
    SELECT meme_id, count(*) AS times_seen
    FROM public.meme_views, me
    WHERE viewer_id = me.uid
    GROUP BY meme_id
  ),
  -- إشارة نزاهة مجتمعية: كام شخص مختلف (مش من دايرة معارفك) قال عن
  -- البوست ده "مش مهتم"/"إخفاء". لو نسبة معتبرة من اللي شافوه رفضوه، ده
  -- سيجنال مستقل عن رأيك الشخصي إن جودة/ملاءمة البوست ده منخفضة عموماً
  community_negative AS (
    SELECT meme_id, count(DISTINCT user_id) AS reject_count
    FROM public.post_negative_feedback
    WHERE feedback_type IN ('hide','not_interested')
    GROUP BY meme_id
  ),
  -- momentum: تفاعل آخر 3 ساعات (لايكات فقط، أخف استعلام وأقوى دلالة على
  -- "بيصعد دلوقتي" من كومنتات/شير القديمة اللي محتاجة جوين تاني)
  recent_momentum AS (
    SELECT meme_id, count(*) AS recent_likes
    FROM public.likes
    WHERE created_at > now() - interval '3 hours'
    GROUP BY meme_id
  ),
  base AS (
    SELECT
      m.id, m.user_id, m.image_url, m.video_url, m.images, m.caption,
      m.likes_count, m.comments_count, m.shares_count, m.saves_count, m.views_count,
      m.status, m.post_type, m.created_at, m.updated_at,
      to_jsonb(p.*) AS profile,
      COALESCE(m_tags.tags, ARRAY[]::text[]) AS tag_list,
      (f.follower_id IS NOT NULL) AS following_flag,
      (l2.user_id IS NOT NULL) AS liked_flag,
      (sv.user_id IS NOT NULL) AS saved_flag,
      COALESCE(ua.score, 0.5) AS affinity_score,
      COALESCE(mm.is_pinned, false) AS pinned_flag,
      COALESCE(mm.boost_level, 0) AS boost_lvl,
      COALESCE(ex.times_seen, 0) AS times_seen,
      COALESCE(rw.avg_completion, 0.42) AS avg_completion,
      COALESCE(cn.reject_count, 0) AS reject_count,
      COALESCE(rm.recent_likes, 0) AS recent_likes,
      GREATEST(extract(epoch FROM (now() - m.created_at)) / 3600.0, 0.01) AS age_hours
    FROM public.memes m
    JOIN public.profiles p ON p.id = m.user_id
    CROSS JOIN me
    LEFT JOIN public.follows f ON f.follower_id = me.uid AND f.following_id = m.user_id
    LEFT JOIN public.likes l2 ON l2.meme_id = m.id AND l2.user_id = me.uid
    LEFT JOIN public.saved_memes sv ON sv.meme_id = m.id AND sv.user_id = me.uid
    LEFT JOIN public.user_affinity ua ON ua.user_id = me.uid AND ua.target_id = m.user_id
    LEFT JOIN public.meme_moderation mm ON mm.meme_id = m.id
    LEFT JOIN exposure ex ON ex.meme_id = m.id
    LEFT JOIN community_negative cn ON cn.meme_id = m.id
    LEFT JOIN recent_momentum rm ON rm.meme_id = m.id
    LEFT JOIN LATERAL (
      SELECT avg(watched_seconds / NULLIF(video_duration,0)) AS avg_completion
      FROM public.reel_watch_events WHERE meme_id = m.id
    ) rw ON true
    LEFT JOIN LATERAL (
      SELECT array_agg(t.name) AS tags
      FROM public.meme_tags mt JOIN public.tags t ON t.id = mt.tag_id
      WHERE mt.meme_id = m.id
    ) m_tags ON true
    WHERE m.status = 'approved'
      AND NOT COALESCE(mm.is_hidden, false)
      AND m.user_id NOT IN (SELECT target_user_id FROM excluded_authors WHERE target_user_id IS NOT NULL)
      AND m.id NOT IN (SELECT meme_id FROM excluded_memes WHERE meme_id IS NOT NULL)
      -- استبعاد صريح لو أنت شخصياً صاحب البوست عملتله reject count عالي جداً
      -- من الكل ده مش شرط هنا (بيتحط كعقاب سكور بس مش استبعاد كامل)، عشان
      -- بوست مثير للجدل مش بالضرورة سيء - ممكن يفضل يظهر بس بأولوية أقل
      AND (p_tag IS NULL OR p_tag = ANY(COALESCE(m_tags.tags, ARRAY[]::text[])))
      AND (p_search IS NULL OR p_search = '' OR m.caption ILIKE '%' || p_search || '%')
      AND (p_post_type IS NULL OR m.post_type = p_post_type)
  )
  SELECT
    b.id, b.user_id, b.image_url, b.video_url, b.images, b.caption,
    b.likes_count, b.comments_count, b.shares_count, b.saves_count, b.views_count,
    b.status, b.post_type, b.created_at, b.updated_at,
    b.profile, b.tag_list AS tags,
    b.following_flag AS is_following, b.liked_flag AS liked_by_me, b.saved_flag AS saved_by_me,
    (
      (CASE WHEN b.pinned_flag THEN 1000 ELSE 0 END)
      + b.boost_lvl * 15
      + ln(1 + b.likes_count * 1.0 + b.comments_count * 4.0 + b.shares_count * 6.0
            + b.saves_count * 5.0 + b.views_count * 0.05)
        * (1 + ln(1 + b.affinity_score) * 0.35)
      + (CASE WHEN b.following_flag THEN 6 ELSE 0 END)
      -- طبقة "أصدقاء مقرّبين": affinity عالي جداً (تفاعل ثنائي كثيف ومستمر)
      -- بياخد بونص إضافي فوق البونص العادي بتاع following، زي "Close
      -- Friends" في انستجرام لكن مستنتج تلقائياً من السلوك مش list يدوي
      + (CASE WHEN b.affinity_score >= 15 THEN 8 ELSE 0 END)
      + COALESCE((
          SELECT SUM(LEAST(uta.strength, 5)) FROM user_tag_affinity uta
          WHERE uta.tag_name = ANY(b.tag_list)
        ), 0) * 0.9
      -- تفضيل الشكل (فيديو/صورة/متعدد) بناءً على تاريخك الفعلي، مش وزن
      -- ثابت لكل الناس زي ما كان قبل كده (فيديو بونص 10 للجميع دايماً)
      + COALESCE((
          SELECT LEAST(ufa.strength, 20) FROM user_format_affinity ufa
          WHERE ufa.post_type = b.post_type
        ), 0) * 0.25
      + (CASE WHEN b.post_type = 'video' THEN LEAST(b.avg_completion, 2.0) * 10 ELSE 0 END)
      - power(b.age_hours, 1.35) * 0.12
      -- momentum: تفاعل حديث نسبة لعمر البوست - بوست بياخد لايكات كتير في
      -- آخر 3 ساعات بيتصعد فوراً بدل ما يستنى يتراكم عليه سكور كافي بمرور
      -- الوقت العادي بس. مقسومة على جذر العمر عشان بوست عمره ساعة ولسه
      -- بياخد لايكات ميتفوقش أوتوماتيك على بوست تريند حقيقي عمره أيام.
      + (b.recent_likes::numeric / sqrt(GREATEST(b.age_hours, 0.5))) * 1.8
      -- إشارة النزاهة المجتمعية: عقاب متدرج (log-dampened) مش استبعاد فوري،
      -- عشان محتوى مثير للجدل (كوميدي/رأي حاد) ما يتمسحش بالكامل غلط
      - ln(1 + b.reject_count) * 4.5
      - (CASE WHEN b.times_seen >= 3 AND NOT b.liked_flag AND NOT b.saved_flag
              THEN LEAST(b.times_seen, 10) * 1.5 ELSE 0 END)
      + (random() - 0.5) * 1.5
    ) AS score
  FROM base b
  ORDER BY score DESC, b.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$function$;

GRANT EXECUTE ON FUNCTION public.get_ranked_feed_v3 TO authenticated;

-- ---------------------------------------------------------------------
-- 2. REELS — VELOCITY + CREATOR QUALITY PRIOR + TAG AFFINITY
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_ranked_reels_v3(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, user_id uuid, video_url text, caption text,
  likes_count integer, comments_count integer, shares_count integer, saves_count integer,
  views_count integer, created_at timestamptz, profile jsonb,
  liked_by_me boolean, saved_by_me boolean, tags text[], score numeric
)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH me AS (SELECT auth.uid() AS uid),
  user_tag_affinity AS (
    SELECT t.name AS tag_name, count(*)::numeric AS strength
    FROM public.likes l
    JOIN public.meme_tags mt ON mt.meme_id = l.meme_id
    JOIN public.tags t ON t.id = mt.tag_id, me
    WHERE l.user_id = me.uid
    GROUP BY t.name
  ),
  excluded_authors AS (
    SELECT target_user_id FROM public.post_negative_feedback, me
    WHERE user_id = me.uid AND feedback_type IN ('snooze_author','not_interested')
      AND (feedback_type = 'not_interested' OR created_at > now() - interval '14 days')
  ),
  excluded_memes AS (
    SELECT meme_id FROM public.post_negative_feedback, me WHERE user_id = me.uid AND feedback_type = 'hide'
  ),
  my_watch AS (
    SELECT meme_id, max(watched_seconds / NULLIF(video_duration,0)) AS my_best_ratio, count(*) AS my_views
    FROM public.reel_watch_events, me WHERE viewer_id = me.uid GROUP BY meme_id
  ),
  global_watch AS (
    SELECT meme_id,
      avg(watched_seconds / NULLIF(video_duration,0)) AS completion_pred,
      avg(CASE WHEN is_rewatch THEN 1.0 ELSE 0.0 END) AS rewatch_rate,
      count(*) AS total_watch_events
    FROM public.reel_watch_events GROUP BY meme_id
  ),
  -- velocity: نسبة مشاهدات آخر ساعتين من إجمالي المشاهدات - فيديو جديد
  -- نسبياً بس بياخد معدل مشاهدة عالي دلوقتي ده بالظبط تعريف "Trending Now"
  -- الحقيقي، مش مجرد إجمالي views تراكمي من الأول
  recent_watch AS (
    SELECT meme_id, count(*) AS recent_views
    FROM public.reel_watch_events
    WHERE created_at > now() - interval '2 hours'
    GROUP BY meme_id
  ),
  -- خبرة صانع المحتوى: متوسط completion على كل فيديوهات نفس الصانع في آخر
  -- 30 يوم. فيديو جديد لسه مفيهوش بيانات مشاهدة كافية (cold start) بياخد
  -- تقدير أعدل من سجل صاحبه بدل ما يتعامل معاه كأنه مجهول الجودة تماماً
  creator_quality AS (
    SELECT m3.user_id,
      avg(rwe.watched_seconds / NULLIF(rwe.video_duration,0)) AS avg_completion
    FROM public.memes m3
    JOIN public.reel_watch_events rwe ON rwe.meme_id = m3.id
    WHERE m3.post_type = 'video' AND m3.created_at > now() - interval '30 days'
    GROUP BY m3.user_id
  )
  SELECT
    m.id, m.user_id, m.video_url, m.caption,
    m.likes_count, m.comments_count, m.shares_count, m.saves_count, m.views_count,
    m.created_at, to_jsonb(p.*) AS profile,
    (l2.user_id IS NOT NULL) AS liked_by_me,
    (sv.user_id IS NOT NULL) AS saved_by_me,
    COALESCE(m_tags.tags, ARRAY[]::text[]) AS tags,
    (
      (CASE WHEN COALESCE(mm.is_pinned,false) THEN 1000 ELSE 0 END) + COALESCE(mm.boost_level,0) * 15
      + COALESCE(gw.completion_pred, 0.45) * 40
      + COALESCE(gw.rewatch_rate, 0) * 25
      + (m.shares_count::numeric / GREATEST(m.views_count,1)) * 500
      + (m.saves_count::numeric / GREATEST(m.views_count,1)) * 350
      + (m.comments_count::numeric / GREATEST(m.views_count,1)) * 200
      + (m.likes_count::numeric / GREATEST(m.views_count,1)) * 60
      + ln(1 + COALESCE(ua.score,0)) * 2
      + (CASE WHEN f.follower_id IS NOT NULL THEN 2 ELSE 0 END)
      -- اهتمامات (tags): كان مفيش خالص في v2 - الريلز بيكتشف محتوى جديد
      -- بره متابعينك، بس ده لسه لازم يتوافق شوية مع نوع المحتوى اللي
      -- بتحبه، مش عشوائي تماماً. وزن أخف بكتير من الفيد (0.9) عشان discovery
      -- يفضل هو الأساس.
      + COALESCE((
          SELECT SUM(LEAST(uta.strength, 5)) FROM user_tag_affinity uta
          WHERE uta.tag_name = ANY(COALESCE(m_tags.tags, ARRAY[]::text[]))
        ), 0) * 0.3
      -- خبرة الصانع: تقدير أعدل لفيديو حديث النشر لسه مفيهوش مشاهدات كفاية
      + LEAST(COALESCE(cq.avg_completion, 0.45), 1.0) * 6
      -- velocity: مشاهدات آخر ساعتين مقسومة على جذر عمر الفيديو (بالساعات)
      -- عشان فيديو عمره كذا يوم ولسه بياخد معدل عالي دلوقتي (breakout حقيقي)
      -- يتصعد، من غير ما فيديو قديم جداً بمشاهدة عرضية واحدة يتظلم
      + (COALESCE(rw.recent_views,0)::numeric / sqrt(GREATEST(extract(epoch FROM (now() - m.created_at))/3600.0, 0.5))) * 3.5
      + (CASE WHEN extract(epoch FROM (now() - m.created_at))/3600.0 < 6
              THEN 8 * (1 - extract(epoch FROM (now() - m.created_at))/3600.0/6.0) ELSE 0 END)
      - (CASE WHEN mw.my_best_ratio IS NOT NULL AND mw.my_best_ratio < 0.2 THEN 20 ELSE 0 END)
      - (CASE WHEN mw.my_views >= 2 THEN mw.my_views * 3 ELSE 0 END)
      + (random() - 0.5) * 3.0
    ) AS score
  FROM public.memes m
  JOIN public.profiles p ON p.id = m.user_id
  CROSS JOIN me
  LEFT JOIN public.follows f ON f.follower_id = me.uid AND f.following_id = m.user_id
  LEFT JOIN public.likes l2 ON l2.meme_id = m.id AND l2.user_id = me.uid
  LEFT JOIN public.saved_memes sv ON sv.meme_id = m.id AND sv.user_id = me.uid
  LEFT JOIN public.user_affinity ua ON ua.user_id = me.uid AND ua.target_id = m.user_id
  LEFT JOIN public.meme_moderation mm ON mm.meme_id = m.id
  LEFT JOIN my_watch mw ON mw.meme_id = m.id
  LEFT JOIN global_watch gw ON gw.meme_id = m.id
  LEFT JOIN recent_watch rw ON rw.meme_id = m.id
  LEFT JOIN creator_quality cq ON cq.user_id = m.user_id
  LEFT JOIN LATERAL (
    SELECT array_agg(t.name) AS tags
    FROM public.meme_tags mt JOIN public.tags t ON t.id = mt.tag_id
    WHERE mt.meme_id = m.id
  ) m_tags ON true
  WHERE m.status = 'approved' AND m.post_type = 'video'
    AND NOT COALESCE(mm.is_hidden, false)
    AND m.user_id NOT IN (SELECT target_user_id FROM excluded_authors WHERE target_user_id IS NOT NULL)
    AND m.id NOT IN (SELECT meme_id FROM excluded_memes WHERE meme_id IS NOT NULL)
  ORDER BY score DESC, m.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$function$;

GRANT EXECUTE ON FUNCTION public.get_ranked_reels_v3 TO authenticated;

-- ---------------------------------------------------------------------
-- 3. STORIES — CLOSE-FRIENDS TIER + MUTE/SNOOZE EXCLUSION
-- ---------------------------------------------------------------------
-- v2 ماكانش فيها أي استبعاد خالص - حتى لو سكتّ حد (snooze_author) في
-- الفيد، حالاته كانت لسه بتظهر عادي في الشريط. دلوقتي بتحترم نفس قرار
-- الاستبعاد في الفيد. وبنضيف طبقة "أصدقاء مقرّبين" (affinity عالي جداً)
-- تتقدم حتى على باقي الغير-مشاهد العاديين، زي الدايرة المقرّبة في واتساب.

CREATE OR REPLACE FUNCTION public.get_ranked_stories_v3()
RETURNS TABLE(
  author_id uuid, profile jsonb, story_count integer, latest_created_at timestamptz,
  has_unseen boolean, affinity_score numeric, is_close_friend boolean, story_ids uuid[]
)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH me AS (SELECT auth.uid() AS uid),
  excluded_authors AS (
    SELECT target_user_id FROM public.post_negative_feedback, me
    WHERE user_id = me.uid AND feedback_type = 'snooze_author'
      AND created_at > now() - interval '14 days'
    UNION
    SELECT target_user_id FROM public.post_negative_feedback, me
    WHERE user_id = me.uid AND feedback_type = 'not_interested'
  ),
  active_stories AS (
    SELECT s.* FROM public.stories s, me
    WHERE s.expires_at > now()
      AND (s.hidden_until IS NULL OR s.hidden_until < now() OR s.user_id = me.uid)
      AND (s.user_id = me.uid OR s.user_id NOT IN (
        SELECT target_user_id FROM excluded_authors WHERE target_user_id IS NOT NULL
      ))
  )
  SELECT
    s.user_id AS author_id,
    to_jsonb(p.*) AS profile,
    count(*)::integer AS story_count,
    max(s.created_at) AS latest_created_at,
    bool_or(sv.viewer_id IS NULL) AS has_unseen,
    COALESCE(max(ua.score), 0) AS affinity_score,
    -- عتبة "صديق مقرّب" مبنية على نفس مقياس الـ affinity المستخدم في الفيد
    -- (>=15 بياخد بونص "close friends" هناك كمان) - قوة علاقة مستمرة
    -- وثنائية حقيقية، مش مجرد متابعة
    COALESCE(max(ua.score), 0) >= 15 AS is_close_friend,
    array_agg(s.id ORDER BY s.created_at ASC) AS story_ids
  FROM active_stories s
  JOIN public.profiles p ON p.id = s.user_id
  CROSS JOIN me
  LEFT JOIN public.story_views sv ON sv.story_id = s.id AND sv.viewer_id = me.uid
  LEFT JOIN public.user_affinity ua ON ua.user_id = me.uid AND ua.target_id = s.user_id
  GROUP BY s.user_id, p.id
  ORDER BY
    (s.user_id = (SELECT uid FROM me)) DESC,
    has_unseen DESC,
    is_close_friend DESC,
    affinity_score DESC,
    latest_created_at DESC;
$function$;

GRANT EXECUTE ON FUNCTION public.get_ranked_stories_v3 TO authenticated;
