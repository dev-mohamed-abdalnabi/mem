-- =====================================================================
-- fix_security_v5.sql
-- تصليح شامل لكل الملاحظات الأمنية في "فحص شامل جديد لمشروع mem"
-- شغّل الملف ده كامل مرة واحدة من Supabase → SQL Editor.
-- آمن يتشغل أكتر من مرة (idempotent) - مفيش حاجة هتتكرر أو تتكسر.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) ملحوظة: "Leaked Password Protection" مش بتتفعل بـ SQL، لازم يدوي من
--    الداشبورد: Authentication → Policies/Providers → فعّل
--    "Leaked password protection". دقيقتين وصفر تكلفة، افتحها بنفسك.
-- ---------------------------------------------------------------------


-- ---------------------------------------------------------------------
-- 1) الحل الجذري لمشكلة "~20 دالة SECURITY DEFINER متاحة لـ anon":
--    بدل ما نراجع كل دالة يدوي، بنسحب صلاحية التنفيذ (EXECUTE) من PUBLIC
--    و anon على *كل* الدوال SECURITY DEFINER في schema public دفعة واحدة،
--    ونمنحها فقط لـ authenticated. ده افتراضياً بيقفل أي دالة حساسة قدام
--    زوار مش مسجلين (mark_conversation_read, get_total_unread_messages,
--    record_meme_view, hide_story, mark_all_notifications_read, is_staff،
--    إلخ) من غير ما نحتاج نعرف اسم كل دالة أو نلمس منطقها الداخلي.
--
--    الدوال اللي المفروض تكون عامة فعلاً (زي عرض فيد/ريلز/ستوريز/ترند لو
--    قررت تسمح بتصفح من غير حساب) بنعيد فتحها بوضوح تحت في القسم 4.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.proname AS fname, pg_get_function_identity_arguments(p.oid) AS fargs
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true               -- SECURITY DEFINER بس
      AND p.prokind = 'f'                   -- دوال عادية (مش aggregate/window)
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon;',
      r.fname, r.fargs
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated;',
      r.fname, r.fargs
    );
  END LOOP;
END $$;


-- ---------------------------------------------------------------------
-- 2) طبقة حماية إضافية (defense in depth) جوه الدوال اللي بترجع بيانات
--    شخصية (رسائل/إشعارات) - حتى لو حصل خطأ يوم من الأيام في الـ GRANTs
--    فوق، الدالة نفسها بترفض تنفذ أي حاجة لمستخدم مش مسجل دخول.
--    (بنعيد إنشاء نفس الدوال الموجودة في messages_migration.sql بإضافة
--    الفحص، من غير أي تغيير في المنطق الأساسي.)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_unread_message_counts()
RETURNS TABLE(conversation_id uuid, unread_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.conversation_id, count(*)::bigint AS unread_count
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  WHERE auth.uid() IS NOT NULL
    AND m.sender_id <> auth.uid()
    AND m.read_at IS NULL
    AND (c.user_one = auth.uid() OR c.user_two = auth.uid())
  GROUP BY m.conversation_id;
$$;

CREATE OR REPLACE FUNCTION public.get_total_unread_messages()
RETURNS bigint
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN 0 ELSE COALESCE(count(*), 0) END::bigint
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  WHERE auth.uid() IS NOT NULL
    AND m.sender_id <> auth.uid()
    AND m.read_at IS NULL
    AND (c.user_one = auth.uid() OR c.user_two = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  UPDATE public.messages
    SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id <> auth.uid()
    AND read_at IS NULL
    -- تأكيد إضافي إن المستخدم فعلاً طرف في المحادثة دي قبل التعديل
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = p_conversation_id
        AND (c.user_one = auth.uid() OR c.user_two = auth.uid())
    );
END;
$$;

-- get_or_create_conversation أصلاً بيرفض auth.uid() IS NULL (شايفينها في
-- messages_migration.sql) فمحتاجاش نعيد إنشاءها.

REVOKE EXECUTE ON FUNCTION public.get_unread_message_counts() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_total_unread_messages() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_conversation_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unread_message_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_unread_messages() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;


-- ---------------------------------------------------------------------
-- 3) تأمين trending_memes: منع القراءة المباشرة من REST API، والاستبدال
--    بدالة RPC. الفرونت اتعدّل فعلاً عشان ينادي get_trending_memes_v1.
--
--    ملحوظة: الأعمدة تحت مبنية على افتراض إن trending_memes نفس أعمدة
--    جدول memes + hot_score (زي ما موضح في تعليقات dataService.ts). لو
--    عندك أعمدة مختلفة فعلياً، افتح trending_memes من Table Editor وعدّل
--    قايمة الأعمدة تحت لتطابقها قبل التشغيل.
-- ---------------------------------------------------------------------

REVOKE SELECT ON public.trending_memes FROM anon, authenticated, PUBLIC;

CREATE OR REPLACE FUNCTION public.get_trending_memes_v1(p_limit integer DEFAULT 30)
RETURNS TABLE(
  id uuid, user_id uuid, image_url text, video_url text, images text[], caption text,
  likes_count integer, comments_count integer, shares_count integer, saves_count integer,
  views_count integer, status meme_status, post_type text, created_at timestamptz, updated_at timestamptz,
  profile jsonb, hot_score numeric
)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT
    tm.id, tm.user_id, tm.image_url, tm.video_url, tm.images, tm.caption,
    tm.likes_count, tm.comments_count, tm.shares_count, tm.saves_count, tm.views_count,
    tm.status, tm.post_type, tm.created_at, tm.updated_at,
    to_jsonb(p.*) AS profile, tm.hot_score
  FROM public.trending_memes tm
  JOIN public.profiles p ON p.id = tm.user_id
  ORDER BY tm.hot_score DESC
  LIMIT p_limit;
$$;

REVOKE EXECUTE ON FUNCTION public.get_trending_memes_v1(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trending_memes_v1(integer) TO authenticated;


-- ---------------------------------------------------------------------
-- 4) إعادة فتح الدوال اللي *لازم* تفضل عامة (عرض فيد/ريلز/ستوريز/ترند)
--    لـ authenticated فقط - زي ما هي أصلاً في ranking_v3.sql. متسيبهاش
--    مفتوحة لـ anon إلا لو فعلاً عايز تصفح بدون تسجيل دخول، وفي الحالة
--    دي بس ضيف GRANT ... TO anon يدوي للدالة اللي محتاجاها.
-- ---------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_ranked_feed_v3 TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ranked_reels_v3 TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ranked_stories_v3 TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_negative_feedback TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_reel_watch TO authenticated;


-- ---------------------------------------------------------------------
-- 5) Rate limiting على مستوى قاعدة البيانات لمنشورات/كومنتات/لايكات (كان
--    موجود على stories بس - enforce_rate_limit_stories - مش على الباقي).
--    دالة trigger عامة قابلة لإعادة الاستخدام على أي جدول فيه عمود
--    user_id و created_at.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_rate_limit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  max_count integer := TG_ARGV[0]::integer;
  window_seconds integer := TG_ARGV[1]::integer;
  recent_count integer;
BEGIN
  EXECUTE format(
    'SELECT count(*) FROM public.%I WHERE user_id = $1 AND created_at > now() - interval ''%s seconds''',
    TG_TABLE_NAME, window_seconds
  ) INTO recent_count USING NEW.user_id;

  IF recent_count >= max_count THEN
    RAISE EXCEPTION 'تم تجاوز الحد المسموح من العمليات، حاول تاني بعد شوية';
  END IF;

  RETURN NEW;
END;
$$;

-- ميمز: أقصى 10 منشورات كل 5 دقايق للمستخدم الواحد
DROP TRIGGER IF EXISTS trg_rate_limit_memes ON public.memes;
CREATE TRIGGER trg_rate_limit_memes
  BEFORE INSERT ON public.memes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit(10, 300);

-- كومنتات: أقصى 20 كومنت كل دقيقة للمستخدم الواحد
DROP TRIGGER IF EXISTS trg_rate_limit_comments ON public.comments;
CREATE TRIGGER trg_rate_limit_comments
  BEFORE INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit(20, 60);

-- لايكات: أقصى 60 لايك كل دقيقة للمستخدم الواحد (رقم كبير عشان مايأثرش
-- على استخدام طبيعي حتى لو حد بيلايك بسرعة على فيد طويل، بس بيوقف البوتات)
DROP TRIGGER IF EXISTS trg_rate_limit_likes ON public.likes;
CREATE TRIGGER trg_rate_limit_likes
  BEFORE INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit(60, 60);


-- ---------------------------------------------------------------------
-- 6) تذكير عملي: بعد ما تشغل الملف ده، افتح Supabase → Database →
--    Functions وشوف قايمة الدوال اللي عندها SECURITY DEFINER، وراجع بس
--    اللي مش معمول عليها GRANT صريح فوق - المفروض دلوقتي كلها authenticated
--    بس بفضل القسم (1)، لكن يفضل كويس تتأكد بعينك مرة واحدة إن مفيش دالة
--    فاتت الفحص التلقائي (مثلاً لو prokind != 'f' لسبب غريب).
-- ---------------------------------------------------------------------
