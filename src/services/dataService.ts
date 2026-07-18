import { supabase } from "../supabaseClient";
import { Profile, Meme, Comment, Notification, Report } from "../types";
import DOMPurify from "dompurify";

// Removed mock data entirely
export const MOCK_PROFILES: Profile[] = [];
export const MOCK_MEMES: Meme[] = [];
export const MOCK_COMMENTS: Comment[] = [];
export const MOCK_NOTIFICATIONS: Notification[] = [];

export function calculateMemeLevel(points: number): string {
  if (points <= 50) return "مبتدئ";
  if (points <= 150) return "صانع متفاعل";
  if (points <= 350) return "ناشر متميز";
  if (points <= 700) return "أسطورة الكوميديا";
  if (points <= 1500) return "خبير ميمز";
  return "إمبراطور الكوميديا والميمز";
}

export function ensureUUID(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  return "00000000-0000-0000-0000-000000000000"; 
}

export function extractTagsFromCaption(caption: string | null): string[] {
  if (!caption) return [];
  const matches = caption.match(/#[\w\u0600-\u06FF]+/g);
  return matches ? matches.map(m => m.replace("#", "")) : [];
}

/**
 * ضغط الصور قبل الرفع (كانت الصور بترفع بحجمها الأصلي زي ما هي من الموبايل،
 * أحياناً 3-4 ميجا للصورة الواحدة، وده كان بيستهلك مساحة/باندويدث الـ storage
 * بسرعة رهيبة). بنعمل resize لأقصى بعد 1600px وضغط JPEG جودة 0.82،
 * وده بيقلل حجم أغلب صور الموبايل بنسبة 70-90% من غير فرق ملحوظ في الجودة
 * على الشاشة. الفيديو مش بيتضغط هنا (محتاج ffmpeg حقيقي) بس بنفرض حد أقصى
 * على مدته من صفحة إنشاء البوست.
 */
async function compressImage(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  // ملفات GIF بنسيبها زي ما هي عشان الضغط بيكسر الحركة (canvas بياخد فريم واحد بس)
  if (file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file; // لو الضغط زوّد الحجم، سيب الأصلي

    const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch (e) {
    console.warn("Image compression failed, uploading original:", e);
    return file;
  }
}

/**
 * دالة مساعدة للحصول على هوية المستخدم الموثقة من Supabase
 * تمنع ثغرات IDOR عبر التأكد من أن العملية تتم بواسطة صاحب الحساب الحقيقي
 */
async function getAuthenticatedUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("يجب تسجيل الدخول للقيام بهذه العملية.");
  return user.id;
}

export const dataService = {
  extractTagsFromCaption,

  signUp: async (email: string, password: string, username: string, avatarUrl?: string): Promise<Profile> => {
    const defaultAvatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;
    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, avatar_url: defaultAvatar } }
    });

    if (signupError) throw signupError;
    if (!authData.user) throw new Error("تعذّر إنشاء حساب.");

    const { data: profData, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (error || !profData) throw new Error("خطأ في إنشاء ملف المستخدم.");
    return profData as Profile;
  },

  signIn: async (email: string, password: string): Promise<Profile> => {
    const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) throw loginError;
    if (!authData.user) throw new Error("بيانات الاعتماد غير صالحة.");

    const { data: profData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profData) throw new Error("تعذر العثور على ملف المستخدم.");
    return profData as Profile;
  },

  signOut: async (): Promise<void> => {
    await supabase.auth.signOut();
  },

  getCurrentUser: async (): Promise<Profile> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (!error && data) return data as Profile;
    }

    return {
      id: "guest-user-temp",
      username: "زائر_مجهول",
      avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=guest",
      bio: "يتصفح كزائر.",
      website: "",
      role: "user",
      meme_level: "زائر متصفح 👀",
      total_points: 0,
      followers_count: 0,
      following_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  },

  updateProfile: async (profile: Partial<Profile>): Promise<Profile> => {
    const userId = await getAuthenticatedUserId();

    const { data, error } = await supabase
      .from("profiles")
      .update(profile)
      .eq("id", userId)
      .select()
      .single();
    
    if (error) throw error;
    return data as Profile;
  },

  getProfilesList: async (): Promise<Profile[]> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("total_points", { ascending: false });
    if (error) throw error;
    return data as Profile[];
  },

  getFollowingList: async (userId: string): Promise<string[]> => {
    if (userId === "guest-user-temp") return [];
    const { data, error } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", ensureUUID(userId));
    if (error) return [];
    return (data || []).map(f => f.following_id);
  },

  followUser: async (_unusedFollowerId: string, followingId: string): Promise<boolean> => {
    const userId = await getAuthenticatedUserId();
    if (userId === ensureUUID(followingId)) {
      throw new Error("مينفعش تتابع نفسك يا بطل!");
    }

    const { data: existing } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", userId)
      .eq("following_id", ensureUUID(followingId))
      .maybeSingle();
    
    if (existing) {
        await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", ensureUUID(followingId));
        return false;
    }
    
    const { error } = await supabase.from("follows").insert({ follower_id: userId, following_id: ensureUUID(followingId) });
    if (error) throw error;
    return true;
  },

  uploadMemeFile: async (file: File, bucket: string = "memes"): Promise<string> => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
    if (!allowedTypes.includes(file.type)) throw new Error("نوع الملف غير مدعوم.");
    if (file.size > 10 * 1024 * 1024) throw new Error("حجم الملف كبير جداً.");

    // ضغط الصور فقط قبل الرفع (الفيديو بيتفحص/يتحدد مدته من صفحة النشر نفسها)
    const fileToUpload = file.type.startsWith("image/") ? await compressImage(file) : file;

    const fileExt = fileToUpload.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, fileToUpload);
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrl;
  },

  /**
   * رفع صورة البروفايل. كانت ProfilePage.tsx بتستدعي الدالة دي وهي مش موجودة أصلاً
   * (كان فيه uploadMemeFile بس مفيش uploadAvatar)، فكل رفع لصورة شخصية كان بيفشل فوراً
   * بـ TypeError. مفيش bucket منفصل للـ avatars في Supabase، فبنستخدم نفس bucket الميمز
   * الموجود فعلاً وبنحط الملفات في مجلد فرعي avatars/ جواه عشان التنظيم.
   */
  uploadAvatar: async (file: File): Promise<string> => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) throw new Error("نوع الملف غير مدعوم.");
    if (file.size > 5 * 1024 * 1024) throw new Error("حجم الصورة كبير جداً.");

    const userId = await getAuthenticatedUserId();

    // بنجيب رابط الأفتار القديم قبل الرفع عشان نمسحه بعدين ونوفر مساحة/تكلفة storage
    // ملحوظة: ده ملفوف في try/catch منفصل عشان أي فشل في جيب الرابط القديم
    // (زي .single() لو البروفايل مش موجود) ميوقفش رفع الصورة الجديدة خالص.
    let oldAvatarUrl: string | null = null;
    try {
      const { data: oldProfile } = await supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
      oldAvatarUrl = oldProfile?.avatar_url || null;
    } catch (e) {
      console.warn("Could not fetch old avatar (continuing with upload):", e);
    }

    // كان اسم الملف بيتبني بمسار avatars/... جوه bucket اسمه memes، ولو سياسات
    // RLS بتاعت الـ storage محتاجة إن أول مجلد يكون uid المستخدم بالظبط (نمط
    // شائع جداً في قوالب Supabase)، فالرفع تحت مجلد "avatars" كان بيترفض فوراً
    // بصلاحيات (RLS violation) وده اللي كان بيظهر كـ"فشل رفع الصورة" من غير
    // أي تفاصيل. دلوقتي بنحط uid المستخدم هو أول جزء من المسار عشان يتطابق
    // مع النمط ده لو موجود.
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("memes").upload(fileName, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600',
    });
    if (uploadError) {
      console.error("Avatar storage upload error:", uploadError);
      // بنطلع رسالة الخطأ الحقيقية بدل رسالة عامة، عشان السبب الفعلي (صلاحيات
      // RLS، حجم، نوع ملف، إلخ) يبقى واضح وممكن تشخيصه.
      throw new Error(`فشل رفع الصورة: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage.from("memes").getPublicUrl(fileName);
    if (!publicUrl) throw new Error("تم الرفع لكن تعذّر الحصول على رابط الصورة.");

    // مسح الملف القديم (لو كان فعلاً مرفوع في نفس الـ bucket، مش صورة دايسبير الافتراضية)
    // ده بعد نجاح رفع الصورة الجديدة، وملفوف في try/catch عشان لو فشل المسح
    // ميفشلش العملية كلها والصورة الجديدة اتحفظت فعلاً.
    try {
      if (oldAvatarUrl && oldAvatarUrl.includes("/storage/v1/object/public/memes/")) {
        const oldPath = oldAvatarUrl.split("/storage/v1/object/public/memes/")[1];
        if (oldPath) await supabase.storage.from("memes").remove([oldPath]);
      }
    } catch (e) {
      console.warn("Could not delete old avatar file (non-fatal):", e);
    }

    return publicUrl;
  },

  /**
   * جلب بوست واحد بالـ id بتاعه - مستخدمة لما حد يفتح لينك مشاركة
   * (اللينك بيبقى شكله `?meme=<id>`) عشان نفتحله البوست نفسه مباشرة
   * بدل ما يوديه للصفحة الرئيسية بس من غير ما يبان له البوست المقصود.
   */
  getMemeById: async (memeId: string): Promise<Meme | null> => {
    const { data, error } = await supabase
      .from("memes")
      .select("*, profiles!user_id(*)")
      .eq("id", ensureUUID(memeId))
      .maybeSingle();
    if (error || !data) return null;

    const meme = data as Meme;
    const { data: { user } } = await supabase.auth.getUser();
    let liked = false;
    let saved = false;
    if (user) {
      const [{ data: like }, { data: save }] = await Promise.all([
        supabase.from("likes").select("meme_id").eq("user_id", user.id).eq("meme_id", meme.id).maybeSingle(),
        supabase.from("saved_memes").select("meme_id").eq("user_id", user.id).eq("meme_id", meme.id).maybeSingle(),
      ]);
      liked = !!like;
      saved = !!save;
    }

    return {
      ...meme,
      tags: Array.isArray(meme.tags) ? meme.tags : [],
      liked_by_me: liked,
      saved_by_me: saved,
    };
  },

  /**
   * الريلز: فيديوهات المنشورات المعتمدة بس (post_type='video')، بترتيب الأحدث أولاً،
   * لعرضها في فيد رأسي زي التيك توك/الريلز بدل التبويب القديم "الحفظ".
   */
  getVideoMemes: async (page: number = 0, limit: number = 10): Promise<Meme[]> => {
    const { data, error } = await supabase
      .from("memes")
      .select("*, profiles!user_id(*)")
      .eq("status", "approved")
      .eq("post_type", "video")
      .order("created_at", { ascending: false })
      .range(page * limit, page * limit + limit - 1);
    if (error) throw error;
    const memes = (data as Meme[]) || [];

    // كانت liked_by_me/saved_by_me مش بتتحسب هنا خالص (بعكس get_ranked_feed
    // للفيد العادي)، فكل فيديو كان بيظهر دايماً "مش معجب/محفوظ" حتى لو المستخدم
    // فعلياً معجب بيه، وده كان بيخلي زرار اللايك يحس إنه "مش شغال" بصرياً.
    const { data: { user } } = await supabase.auth.getUser();
    let likedIds = new Set<string>();
    let savedIds = new Set<string>();
    if (user && memes.length > 0) {
      const ids = memes.map(m => m.id);
      const [{ data: likes }, { data: saves }] = await Promise.all([
        supabase.from("likes").select("meme_id").eq("user_id", user.id).in("meme_id", ids),
        supabase.from("saved_memes").select("meme_id").eq("user_id", user.id).in("meme_id", ids),
      ]);
      likedIds = new Set((likes || []).map((l: any) => l.meme_id));
      savedIds = new Set((saves || []).map((s: any) => s.meme_id));
    }

    return memes.map(m => ({
      ...m,
      tags: Array.isArray(m.tags) ? m.tags : [],
      liked_by_me: likedIds.has(m.id),
      saved_by_me: savedIds.has(m.id),
    }));
  },

  /**
   * جلب الفيد المُرتَّب بخوارزمية زي انستجرام (get_ranked_feed في Supabase).
   * الفانكشن دي كانت موجودة وجاهزة في الـ DB من الأول وماكنش حد بيناديها؛ الكود القديم
   * كان بيعمل SELECT عادي مرتب بالتاريخ بس، فمكنش فيه أي "خوارزمية" فعلياً.
   * السكور بيتحسب في الداتابيز نفسها: engagement (لايكات/كومنتات/شير/فيوز)
   * ناقص منه decay بالوقت، زائد بونص لو انت متابع صاحب البوست - بالظبط زي فيد انستجرام.
   *
   * ملحوظة: لو userId اتبعت (يعني بروفايل معين) بنرجع لاستعلام مباشر عادي
   * لأن get_ranked_feed مبنية لفيد الصفحة الرئيسية فقط (مفيش فلتر user_id فيها).
   */
  getMemes: async (
    status: string = "approved",
    userId?: string,
    _currentUserId?: string,
    page: number = 0,
    limit: number = 10,
    tag?: string | null,
    search?: string | null
  ): Promise<Meme[]> => {
    // فيد بروفايل مستخدم معين -> استعلام مباشر (RPC مش مخصصة لده)
    if (userId) {
      let query = supabase.from("memes").select("*, profiles!user_id(*)").eq("status", status).eq("user_id", ensureUUID(userId));
      const { data, error } = await query.order("created_at", { ascending: false }).range(page * limit, page * limit + limit - 1);
      if (error) throw error;
      return (data as Meme[]).map(m => ({ ...m, tags: Array.isArray(m.tags) ? m.tags : [] }));
    }

    // الفيد الرئيسي -> بيستخدم الخوارزمية الحقيقية في الداتابيز
    const { data, error } = await supabase.rpc("get_ranked_feed", {
      p_limit: limit,
      p_offset: page * limit,
      p_tag: tag || null,
      p_search: search || null
    });
    if (error) throw error;

    return (data || []).map((m: any) => ({
      ...m,
      profiles: m.profile,
      tags: Array.isArray(m.tags) ? m.tags : []
    })) as Meme[];
  },

  /**
   * الترند الحقيقي: بيجيب من trending_memes (materialized view بتتحدث كل 15 دقيقة
   * تلقائياً عن طريق cron job في Supabase). الفورمولا بتاعتها hot_score بتاخد في الاعتبار
   * اللايكات/الكومنتات/الشير/الحفظ منسوبين لعمر البوست، بالظبط زي "Hot" في Reddit/انستجرام.
   * الكود القديم كان بس بياخد الـ 10 بوستات المحملة في الفيد ويعيد ترتيبهم محلياً!
   */
  getTrendingMemes: async (limit: number = 30): Promise<Meme[]> => {
    const { data, error } = await supabase
      .from("trending_memes")
      .select("*, profiles:user_id(*)")
      .limit(limit);
    if (error) throw error;
    return (data as Meme[]).map(m => ({ ...m, tags: [] }));
  },

  toggleLike: async (memeId: string, _unusedUserId: string): Promise<{ liked: boolean; likesCount: number }> => {
    const userId = await getAuthenticatedUserId();
    const dbMemeId = ensureUUID(memeId);
    
    const { data: existing } = await supabase.from("likes").select("*").eq("meme_id", dbMemeId).eq("user_id", userId).maybeSingle();
    
    if (existing) {
      await supabase.from("likes").delete().eq("meme_id", dbMemeId).eq("user_id", userId);
    } else {
      await supabase.from("likes").insert({ meme_id: dbMemeId, user_id: userId });
    }

    const { data: meme } = await supabase.from("memes").select("likes_count").eq("id", dbMemeId).single();
    return { liked: !existing, likesCount: meme?.likes_count || 0 };
  },

  toggleSave: async (memeId: string, _unusedUserId: string): Promise<boolean> => {
    const userId = await getAuthenticatedUserId();
    const dbMemeId = ensureUUID(memeId);
    
    const { data: existing } = await supabase.from("saved_memes").select("*").eq("meme_id", dbMemeId).eq("user_id", userId).maybeSingle();
    
    if (existing) {
      await supabase.from("saved_memes").delete().eq("meme_id", dbMemeId).eq("user_id", userId);
      return false;
    } else {
      await supabase.from("saved_memes").insert({ meme_id: dbMemeId, user_id: userId });
      return true;
    }
  },

  deleteMeme: async (memeId: string, _unusedUserId: string): Promise<void> => {
    const userId = await getAuthenticatedUserId();
    // Soft delete: بنغيّر الحالة لـ 'deleted' بدل ما نمسح الصف فعلياً
    // (مسح حقيقي كان بيمسح معاه الكومنتات/اللايكات/البلاغات المرتبطة بسبب ON DELETE CASCADE)
    const { error } = await supabase
      .from("memes")
      .update({ status: "deleted" })
      .eq("id", ensureUUID(memeId))
      .eq("user_id", userId);
    if (error) throw error;
  },

  getComments: async (memeId: string): Promise<Comment[]> => {
    const { data, error } = await supabase
      .from("comments")
      .select("*, profiles!user_id(*)")
      .eq("meme_id", ensureUUID(memeId))
      .order("created_at", { ascending: true });
    
    if (error) throw error;
    return data as Comment[];
  },

  addComment: async (memeId: string, _unusedUserId: string, content: string): Promise<Comment> => {
    const userId = await getAuthenticatedUserId();
    
    const { data, error } = await supabase
      .from("comments")
      .insert({
        meme_id: ensureUUID(memeId),
        user_id: userId,
        content: DOMPurify.sanitize(content.trim())
      })
      .select("*, profiles!user_id(*)")
      .single();
    
    if (error) throw error;
    return data as Comment;
  },

  submitReport: async (memeId: string, _unusedUserId: string, reason: string): Promise<void> => {
    const userId = await getAuthenticatedUserId();
    
    const { error } = await supabase
      .from("reports")
      .insert({
        meme_id: ensureUUID(memeId),
        reporter_id: userId,
        reason: reason.trim(),
        status: "open"
      });
    
    if (error) throw error;
  },

  /**
   * تسجيل مشاهدة لبوست (مرة واحدة لكل مستخدم لكل بوست، الـ DB بتتكفل بمنع التكرار).
   * كانت موجودة كـ RPC جاهزة (record_meme_view) ومحدش بينادها، فـ views_count فاضل صفر دايماً.
   */
  recordView: async (memeId: string): Promise<void> => {
    try {
      await supabase.rpc("record_meme_view", { p_meme_id: ensureUUID(memeId) });
    } catch {
      // فشل بسيط في تسجيل مشاهدة مش لازم يكسر تجربة المستخدم
    }
  },

  /**
   * تسجيل مشاركة فعلي في قاعدة البيانات (كانت بس console.log في الكود القديم).
   */
  recordShare: async (memeId: string): Promise<number> => {
    const { data, error } = await supabase.rpc("increment_share_count", { p_meme_id: ensureUUID(memeId) });
    if (error) throw error;
    return data as number;
  },

  /**
   * جلب إشعارات المستخدم (لايك/كومنت/متابعة). كانت الـ triggers شغالة في الداتابيز
   * وبتضيف صفوف فعلية في جدول notifications، بس الفرونت مكنش بيجيبهم خالص.
   */
  getNotifications: async (): Promise<Notification[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("notifications")
      .select("*, actor:actor_id(*)")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) return [];
    return data as Notification[];
  },

  /** تعليم كل الإشعارات كمقروءة - عن طريق RPC جاهزة (mark_all_notifications_read) */
  markAllNotificationsRead: async (): Promise<void> => {
    await supabase.rpc("mark_all_notifications_read");
  }
};
