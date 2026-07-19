-- =====================================================================
-- RANKING ALGORITHMS V2  — Feed / Stories / Reels
-- Modeled on the publicly-documented principles Meta has described for
-- News Feed & Reels ranking (multi-signal scoring, relationship
-- affinity, meaningful-interaction weighting, time decay, integrity
-- signals, exploration/exploitation, diversity re-ranking).
-- This is an original implementation — NOT Facebook's proprietary code
-- (that has never been published and isn't something anyone outside
-- Meta has access to).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. NEW SIGNAL TABLES
-- ---------------------------------------------------------------------

-- pairwise relationship strength between two users, incrementally
-- updated by triggers every time someone interacts with someone else.
-- this is the core of "affinity" (EdgeRank's "u" term / Meta's
-- relationship-strength feature family).
CREATE TABLE IF NOT EXISTS public.user_affinity (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  last_interaction_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_id)
);
CREATE INDEX IF NOT EXISTS idx_user_affinity_user ON public.user_affinity(user_id);

-- explicit negative feedback: "hide this post", "not interested in this
-- kind of content", "snooze this author for a while". this is the
-- single biggest thing missing from a naive engagement-only ranker.
CREATE TABLE IF NOT EXISTS public.post_negative_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meme_id uuid REFERENCES public.memes(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  feedback_type text NOT NULL CHECK (feedback_type IN ('hide','not_interested','snooze_author')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_neg_feedback_user ON public.post_negative_feedback(user_id, meme_id);
CREATE INDEX IF NOT EXISTS idx_neg_feedback_author ON public.post_negative_feedback(user_id, target_user_id);

-- per-view watch-time telemetry for video/reels. completion rate &
-- rewatch rate are the strongest predictors real short-video ranking
-- systems use — far stronger than likes.
CREATE TABLE IF NOT EXISTS public.reel_watch_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meme_id uuid NOT NULL REFERENCES public.memes(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  watched_seconds numeric NOT NULL DEFAULT 0,
  video_duration numeric NOT NULL DEFAULT 0,
  is_rewatch boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reel_watch_meme ON public.reel_watch_events(meme_id);
CREATE INDEX IF NOT EXISTS idx_reel_watch_viewer ON public.reel_watch_events(viewer_id, meme_id);

ALTER TABLE public.user_affinity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_negative_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_watch_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own affinity read" ON public.user_affinity;
CREATE POLICY "own affinity read" ON public.user_affinity FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own negative feedback" ON public.post_negative_feedback;
CREATE POLICY "own negative feedback" ON public.post_negative_feedback
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own watch events" ON public.reel_watch_events;
CREATE POLICY "own watch events" ON public.reel_watch_events
  FOR ALL USING (auth.uid() = viewer_id) WITH CHECK (auth.uid() = viewer_id);

-- ---------------------------------------------------------------------
-- 2. AFFINITY ENGINE
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bump_affinity(p_user uuid, p_target uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF p_user IS NULL OR p_target IS NULL OR p_user = p_target THEN
    RETURN;
  END IF;
  INSERT INTO public.user_affinity(user_id, target_id, score, last_interaction_at)
  VALUES (p_user, p_target, GREATEST(p_amount, 0), now())
  ON CONFLICT (user_id, target_id) DO UPDATE
    SET score = GREATEST(public.user_affinity.score * 0.985 + p_amount, 0),
        last_interaction_at = now();
END;
$$;

-- reaction weight table: some reactions carry more emotional signal
CREATE OR REPLACE FUNCTION public._reaction_weight(p_reaction text)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_reaction
    WHEN 'love' THEN 2.2
    WHEN 'wow' THEN 1.6
    WHEN 'haha' THEN 1.6
    WHEN 'sad' THEN 1.4
    WHEN 'angry' THEN 1.2
    ELSE 1.0
  END;
$$;

CREATE OR REPLACE FUNCTION public.trg_affinity_on_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_author uuid;
BEGIN
  SELECT user_id INTO v_author FROM public.memes WHERE id = NEW.meme_id;
  PERFORM public.bump_affinity(NEW.user_id, v_author, 1.0 * public._reaction_weight(NEW.reaction_type));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_like_affinity ON public.likes;
CREATE TRIGGER on_like_affinity AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.trg_affinity_on_like();

CREATE OR REPLACE FUNCTION public.trg_affinity_on_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_author uuid;
BEGIN
  SELECT user_id INTO v_author FROM public.memes WHERE id = NEW.meme_id;
  PERFORM public.bump_affinity(NEW.user_id, v_author, 4.0);
  -- a reply on someone's comment is a strong two-way signal
  IF NEW.parent_comment_id IS NOT NULL THEN
    PERFORM public.bump_affinity(NEW.user_id,
      (SELECT user_id FROM public.comments WHERE id = NEW.parent_comment_id), 5.0);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_comment_affinity ON public.comments;
CREATE TRIGGER on_comment_affinity AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_affinity_on_comment();

CREATE OR REPLACE FUNCTION public.trg_affinity_on_save()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_author uuid;
BEGIN
  SELECT user_id INTO v_author FROM public.memes WHERE id = NEW.meme_id;
  PERFORM public.bump_affinity(NEW.user_id, v_author, 3.0);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_save_affinity ON public.saved_memes;
CREATE TRIGGER on_save_affinity AFTER INSERT ON public.saved_memes
  FOR EACH ROW EXECUTE FUNCTION public.trg_affinity_on_save();

CREATE OR REPLACE FUNCTION public.trg_affinity_on_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.bump_affinity(NEW.follower_id, NEW.following_id, 6.0);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_follow_affinity ON public.follows;
CREATE TRIGGER on_follow_affinity AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.trg_affinity_on_follow();

CREATE OR REPLACE FUNCTION public.trg_affinity_on_story_reaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_author uuid;
BEGIN
  SELECT user_id INTO v_author FROM public.stories WHERE id = NEW.story_id;
  PERFORM public.bump_affinity(NEW.user_id, v_author, 3.0);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_story_reaction_affinity ON public.story_reactions;
CREATE TRIGGER on_story_reaction_affinity AFTER INSERT ON public.story_reactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_affinity_on_story_reaction();

-- DMs are the single strongest "these two people actually know each
-- other" signal, so it's weighted heavily both directions.
CREATE OR REPLACE FUNCTION public.trg_affinity_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_other uuid;
BEGIN
  SELECT CASE WHEN user_one = NEW.sender_id THEN user_two ELSE user_one END
    INTO v_other FROM public.conversations WHERE id = NEW.conversation_id;
  PERFORM public.bump_affinity(NEW.sender_id, v_other, 3.0);
  PERFORM public.bump_affinity(v_other, NEW.sender_id, 3.0);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_message_affinity ON public.messages;
CREATE TRIGGER on_message_affinity AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_affinity_on_message();

-- shares = the highest-intent "meaningful social interaction" signal.
-- extend the existing share RPC instead of replacing it.
CREATE OR REPLACE FUNCTION public.increment_share_count(p_meme_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  new_count integer;
  v_author uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;
  UPDATE public.memes SET shares_count = COALESCE(shares_count, 0) + 1
  WHERE id = p_meme_id
  RETURNING shares_count, user_id INTO new_count, v_author;
  PERFORM public.bump_affinity(auth.uid(), v_author, 7.0);
  RETURN new_count;
END;
$$;

-- ---------------------------------------------------------------------
-- 3. NEGATIVE FEEDBACK API
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_negative_feedback(p_meme_id uuid, p_feedback_type text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_author uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'يجب تسجيل الدخول'; END IF;
  IF p_feedback_type NOT IN ('hide','not_interested','snooze_author') THEN
    RAISE EXCEPTION 'نوع غير معروف';
  END IF;
  SELECT user_id INTO v_author FROM public.memes WHERE id = p_meme_id;
  INSERT INTO public.post_negative_feedback(user_id, meme_id, target_user_id, feedback_type)
  VALUES (auth.uid(), p_meme_id, v_author, p_feedback_type);
  IF p_feedback_type IN ('not_interested','snooze_author') THEN
    PERFORM public.bump_affinity(auth.uid(), v_author, -12.0);
  END IF;
END;
$$;

-- ---------------------------------------------------------------------
-- 4. WATCH-TIME LOGGING (Reels / video)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_reel_watch(
  p_meme_id uuid, p_watched_seconds numeric, p_video_duration numeric, p_is_rewatch boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_author uuid; v_ratio numeric;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.reel_watch_events(meme_id, viewer_id, watched_seconds, video_duration, is_rewatch)
  VALUES (p_meme_id, auth.uid(), GREATEST(p_watched_seconds,0), GREATEST(p_video_duration,0), p_is_rewatch);

  v_ratio := CASE WHEN p_video_duration > 0 THEN p_watched_seconds / p_video_duration ELSE 0 END;
  SELECT user_id INTO v_author FROM public.memes WHERE id = p_meme_id;
  -- completing/rewatching a video is an implicit positive signal, like it or not
  IF v_ratio >= 0.9 THEN
    PERFORM public.bump_affinity(auth.uid(), v_author, 1.5);
  END IF;
END;
$$;

-- ---------------------------------------------------------------------
-- 5. FEED RANKING  (get_ranked_feed_v2)
-- ---------------------------------------------------------------------
-- Stage A (this function): broad candidate generation + per-candidate
--   relevance scoring, returns a wide pool ordered by score.
-- Stage B (application layer): author/content-type diversity
--   re-ranking + pagination slicing (see dataService.ts). Real systems
--   split retrieval/scoring and business-logic re-ranking into
--   separate passes for exactly this reason — it's cheap to recompute
--   diversity rules without re-running the expensive scoring query.

CREATE OR REPLACE FUNCTION public.get_ranked_feed_v2(
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
      COALESCE(rw.avg_completion, 0.42) AS avg_completion
    FROM public.memes m
    JOIN public.profiles p ON p.id = m.user_id
    CROSS JOIN me
    LEFT JOIN public.follows f ON f.follower_id = me.uid AND f.following_id = m.user_id
    LEFT JOIN public.likes l2 ON l2.meme_id = m.id AND l2.user_id = me.uid
    LEFT JOIN public.saved_memes sv ON sv.meme_id = m.id AND sv.user_id = me.uid
    LEFT JOIN public.user_affinity ua ON ua.user_id = me.uid AND ua.target_id = m.user_id
    LEFT JOIN public.meme_moderation mm ON mm.meme_id = m.id
    LEFT JOIN exposure ex ON ex.meme_id = m.id
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
      -- editorial boosts always win
      (CASE WHEN b.pinned_flag THEN 1000 ELSE 0 END)
      + b.boost_lvl * 15
      -- core quality score: log-dampened weighted engagement
      -- (shares > saves > comments > likes > raw views, mirrors
      -- Meta's published "meaningful social interaction" weighting)
      + ln(1 + b.likes_count * 1.0 + b.comments_count * 4.0 + b.shares_count * 6.0
            + b.saves_count * 5.0 + b.views_count * 0.05)
        * (1 + ln(1 + b.affinity_score) * 0.35)
      -- relationship signals
      + (CASE WHEN b.following_flag THEN 6 ELSE 0 END)
      -- tag-interest match
      + COALESCE((
          SELECT SUM(LEAST(uta.strength, 5)) FROM user_tag_affinity uta
          WHERE uta.tag_name = ANY(b.tag_list)
        ), 0) * 0.9
      -- video-quality bonus: rewards content people actually finish
      + (CASE WHEN b.post_type = 'video' THEN LEAST(b.avg_completion, 2.0) * 10 ELSE 0 END)
      -- time decay (steeper for older content, evergreen-friendly exponent)
      - power(GREATEST(extract(epoch FROM (now() - b.created_at)) / 3600.0, 0.01), 1.35) * 0.12
      -- repeat-exposure fatigue: seen many times & never engaged -> demote
      - (CASE WHEN b.times_seen >= 3 AND NOT b.liked_flag AND NOT b.saved_flag
              THEN LEAST(b.times_seen, 10) * 1.5 ELSE 0 END)
      -- small exploration jitter so the feed isn't 100% deterministic
      + (random() - 0.5) * 1.5
    ) AS score
  FROM base b
  ORDER BY score DESC, b.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$function$;

-- ---------------------------------------------------------------------
-- 6. REELS RANKING  (get_ranked_reels_v2)
-- ---------------------------------------------------------------------
-- Short-video ranking cares much more about completion/rewatch/share
-- rate than raw like counts, leans discovery-first (affinity matters
-- less than in Feed), and treats a fast skip as a real negative signal.

CREATE OR REPLACE FUNCTION public.get_ranked_reels_v2(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, user_id uuid, video_url text, caption text,
  likes_count integer, comments_count integer, shares_count integer, saves_count integer,
  views_count integer, created_at timestamptz, profile jsonb,
  liked_by_me boolean, saved_by_me boolean, score numeric
)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH me AS (SELECT auth.uid() AS uid),
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
      avg(CASE WHEN is_rewatch THEN 1.0 ELSE 0.0 END) AS rewatch_rate
    FROM public.reel_watch_events GROUP BY meme_id
  )
  SELECT
    m.id, m.user_id, m.video_url, m.caption,
    m.likes_count, m.comments_count, m.shares_count, m.saves_count, m.views_count,
    m.created_at, to_jsonb(p.*) AS profile,
    (l2.user_id IS NOT NULL) AS liked_by_me,
    (sv.user_id IS NOT NULL) AS saved_by_me,
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
  WHERE m.status = 'approved' AND m.post_type = 'video'
    AND NOT COALESCE(mm.is_hidden, false)
    AND m.user_id NOT IN (SELECT target_user_id FROM excluded_authors WHERE target_user_id IS NOT NULL)
    AND m.id NOT IN (SELECT meme_id FROM excluded_memes WHERE meme_id IS NOT NULL)
  ORDER BY score DESC, m.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$function$;

-- ---------------------------------------------------------------------
-- 7. STORIES RANKING  (get_ranked_stories_v2)
-- ---------------------------------------------------------------------
-- Bucketed like real Stories trays: unseen-before-seen, then sorted by
-- relationship affinity ("close friends" float to the front), then
-- recency. Your own stories are always first.

CREATE OR REPLACE FUNCTION public.get_ranked_stories_v2()
RETURNS TABLE(
  author_id uuid, profile jsonb, story_count integer, latest_created_at timestamptz,
  has_unseen boolean, affinity_score numeric, story_ids uuid[]
)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH me AS (SELECT auth.uid() AS uid),
  active_stories AS (
    SELECT s.* FROM public.stories s, me
    WHERE s.expires_at > now()
      AND (s.hidden_until IS NULL OR s.hidden_until < now() OR s.user_id = me.uid)
  )
  SELECT
    s.user_id AS author_id,
    to_jsonb(p.*) AS profile,
    count(*)::integer AS story_count,
    max(s.created_at) AS latest_created_at,
    bool_or(sv.viewer_id IS NULL) AS has_unseen,
    COALESCE(max(ua.score), 0) AS affinity_score,
    array_agg(s.id ORDER BY s.created_at ASC) AS story_ids
  FROM active_stories s
  JOIN public.profiles p ON p.id = s.user_id
  CROSS JOIN me
  LEFT JOIN public.story_views sv ON sv.story_id = s.id AND sv.viewer_id = me.uid
  LEFT JOIN public.user_affinity ua ON ua.user_id = me.uid AND ua.target_id = s.user_id
  GROUP BY s.user_id, p.id
  ORDER BY (s.user_id = (SELECT uid FROM me)) DESC, has_unseen DESC, affinity_score DESC, latest_created_at DESC;
$function$;

-- ---------------------------------------------------------------------
-- 8. helper indexes for the raw signal tables the scoring queries hit hardest
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_meme_views_viewer ON public.meme_views(viewer_id, meme_id);
CREATE INDEX IF NOT EXISTS idx_memes_status_type_created ON public.memes(status, post_type, created_at DESC);

GRANT EXECUTE ON FUNCTION public.get_ranked_feed_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ranked_reels_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ranked_stories_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_negative_feedback TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_reel_watch TO authenticated;
