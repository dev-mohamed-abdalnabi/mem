-- =====================================================================
-- username_management.sql
-- نظام تغيير اسم المستخدم: حد أقصى لعدد الحروف، فلتر كلمات ممنوعة، حد
-- أقصى مرتين تغيير في الشهر، وحفظ كل الأسماء القديمة بشكل دائم.
-- شغّل الملف ده كامل مرة واحدة من Supabase → SQL Editor.
-- آمن يتشغل أكتر من مرة (idempotent) - مفيش حاجة هتتكرر أو تتكسر.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) أعمدة جديدة في profiles:
--    - previous_usernames: كل الأسماء القديمة (تاريخياً، من غير حذف) -
--      بتفضل موجودة في معلومات الحساب حتى لو المستخدم غيّر اسمه أكتر من مرة.
--    - username_change_count: عدد مرات التغيير في الفترة الحالية (شهر).
--    - username_period_started_at: بداية الفترة الحالية (بيتصفّر تلقائي
--      بعد ما يعدي شهر من أول تغيير فيها).
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS previous_usernames text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS username_change_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS username_period_started_at timestamptz NOT NULL DEFAULT now();

-- اسم المستخدم لازم يكون فريد (بدون حساسية لحالة الأحرف) عشان منقعش نبدل
-- لاسم مستخدم بالفعل من حد تاني.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique_idx
  ON public.profiles (lower(username));

-- ---------------------------------------------------------------------
-- 2) قايمة كلمات ممنوعة أساسية (فلتر أول خط دفاع، بيشتغل فوراً من غير
--    استدعاء أي خدمة خارجية). ده بيغطي الألفاظ الواضحة بس - للفلترة
--    الأذكى (سياق/تورية/إساءة غير مباشرة) لازم تتضاف طبقة AI فوق كده من
--    الفرونت إند قبل النداء على الدالة دي (راجع ملاحظة "AI moderation"
--    تحت في نهاية الملف).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.banned_username_words (
  word text PRIMARY KEY
);

INSERT INTO public.banned_username_words (word) VALUES
  ('admin'), ('moderator'), ('mod'), ('support'), ('adminmem'), ('official'),
  ('ادمن'), ('مشرف'), ('ادارة'), ('الدعم'), ('رسمي')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 3) دالة تغيير اسم المستخدم - بتعمل كل التحقق دفعة واحدة داخل الداتابيز
--    (مش بس في الفرونت إند) عشان محدش يقدر يتحايل عليها بطلب API مباشر.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.change_username(p_new_username text)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_clean text := trim(p_new_username);
  v_period_age interval;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'مينفعش تغيّر الاسم من غير تسجيل دخول';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'الحساب مش موجود';
  END IF;

  -- طول الاسم: من 3 لـ 20 حرف
  IF char_length(v_clean) < 3 OR char_length(v_clean) > 20 THEN
    RAISE EXCEPTION 'الاسم لازم يكون من 3 لـ 20 حرف';
  END IF;

  -- أحرف مسموحة بس: عربي، إنجليزي، أرقام، شرطة سفلية ونقطة (زي يوزرات
  -- انستجرام تقريباً) - عشان منسمحش برموز أو مسافات ممكن تتسبب في مشاكل
  -- عرض أو انتحال شخصية (مثلاً اسم فيه مسافات زيادة يشبه اسم حد تاني).
  IF v_clean !~ '^[a-zA-Z0-9_\.\u0600-\u06FF]+$' THEN
    RAISE EXCEPTION 'الاسم يقبل بس حروف عربي/إنجليزي وأرقام و . _';
  END IF;

  -- فلتر الكلمات الممنوعة (case-insensitive, substring match)
  IF EXISTS (
    SELECT 1 FROM public.banned_username_words b
    WHERE lower(v_clean) LIKE '%' || lower(b.word) || '%'
  ) THEN
    RAISE EXCEPTION 'الاسم ده مش مسموح، جرّب اسم تاني';
  END IF;

  -- فريد؟ (متجاهلين حالة الأحرف)
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(username) = lower(v_clean) AND id <> v_user_id
  ) THEN
    RAISE EXCEPTION 'الاسم ده مستخدم بالفعل';
  END IF;

  -- نفس الاسم الحالي؟ مفيش داعي نعمل أي حاجة
  IF lower(v_clean) = lower(v_profile.username) THEN
    RETURN v_profile;
  END IF;

  -- حد التغيير: مرتين كحد أقصى كل 30 يوم (بيتصفّر تلقائي بعد ما تعدي
  -- الفترة، مش شرط أول يوم في الشهر التقويمي).
  v_period_age := now() - v_profile.username_period_started_at;
  IF v_period_age > interval '30 days' THEN
    v_profile.username_change_count := 0;
    v_profile.username_period_started_at := now();
  END IF;

  IF v_profile.username_change_count >= 2 THEN
    RAISE EXCEPTION 'وصلت للحد الأقصى (مرتين في الشهر) لتغيير الاسم - حاول تاني بعد %',
      to_char(v_profile.username_period_started_at + interval '30 days', 'YYYY-MM-DD');
  END IF;

  UPDATE public.profiles
  SET
    previous_usernames = CASE
      WHEN v_profile.username = ANY(previous_usernames) THEN previous_usernames
      ELSE array_append(previous_usernames, v_profile.username)
    END,
    username = v_clean,
    username_change_count = v_profile.username_change_count + 1,
    username_period_started_at = v_profile.username_period_started_at,
    updated_at = now()
  WHERE id = v_user_id
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.change_username(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_username(text) TO authenticated;

-- =====================================================================
-- ملاحظة عن فلتر الـ AI:
-- الفلتر اللي فوق فلتر كلمات بسيط (substring match) - سريع ومجاني وشغال
-- فوراً جوه الداتابيز، لكنه مش "ذكي" (مش هيمسك إساءة مبطنة أو بالعامية
-- بطرق ملتوية). لو محتاج فلترة أذكى فعلاً، الطريقة الصح إنك تضيف Edge
-- Function (زي اللي في supabase/functions/) بتستدعي أي API فلترة محتوى
-- (مثلاً OpenAI Moderation API أو أي بديل) قبل ما تنادي RPC
-- change_username من الفرونت إند - وده محتاج API key تحطه في Supabase
-- secrets. الكود بتاع الفرونت إند (dataService.changeUsername) مجهز
-- بمكان واضح تضيف فيه النداء ده لو حبيت.
-- =====================================================================
