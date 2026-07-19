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

/**
 * طبقة إعادة الترتيب للتنوع (Diversity Re-ranking Pass)
 * ================================================================
 * الـ SQL بيرجع البوستات مرتبة بالسكور الخام بس، وده ممكن يخلي شخص واحد
 * (لو نزل 4-5 بوستات قوية) يسيطر على الفيد كله. الأنظمة الحقيقية بتحل
 * المشكلة دي بطبقة منفصلة بعد الـ scoring مباشرة: بتاخد نافذة منزلقة
 * وتمنع ظهور نفس الشخص (أو نفس التاج) أكتر من مرتين متتاليين، وبتحقن
 * محتوى اكتشاف (discovery) بشكل دوري. دي أرخص وأبسط بكتير من إعادة حساب
 * الـ scoring كله، وده بالظبط سبب فصلهم في مرحلتين منفصلتين في الإنتاج.
 */
function diversityRerank<T extends { user_id: string }>(items: T[], key: keyof T = "user_id" as keyof T): T[] {
  const pool = [...items];
  const result: T[] = [];
  const recentKeys: string[] = []; // آخر مفتاحين (author) اتحطوا في النتيجة
  const MAX_CONSECUTIVE = 2;

  while (pool.length > 0) {
    let pickIndex = pool.findIndex((item) => {
      const k = String(item[key]);
      const consecutiveSame = recentKeys.slice(-MAX_CONSECUTIVE).every((rk) => rk === k);
      return !(consecutiveSame && recentKeys.length >= MAX_CONSECUTIVE);
    });
    if (pickIndex === -1) pickIndex = 0; // مفيش اختيار غير التكرار (باقي كله لنفس الشخص)

    const [picked] = pool.splice(pickIndex, 1);
    result.push(picked);
    recentKeys.push(String(picked[key]));
  }
  return result;
}

export function extractTagsFromCaption(caption: string | null): string[] {
  if (!caption) return [];
  const matches = caption.match(/#[\w\u0600-\u06FF]+/g);
  return matches ? matches.map(m => m.replace("#", "")) : [];
}

/**
 * ضغط الصور قبل الرفع (كانت الصور بترفع بحجمها الأصلي زي ما هي من الموبايل،
 * أحياناً 3-4 ميجا للصورة الواحدة، وده كان بيستهلك مساحة/باندويدث الـ storage
 * بسرعة رهيبة). بنعمل resize لأقصى بعد 1600px وضغط JPEG جودة 0.82، وبعدين
 * لو الملف لسه كبير (صور عالية التفاصيل جداً) بنقلل الجودة تدريجياً لحد
 * أقصى حجم مستهدف - من غير ما ننزل عن حد أدنى للجودة عشان مايبانش تلف واضح.
 * ده بيقلل حجم أغلب صور الموبايل بنسبة 70-90% من غير فرق ملحوظ في الجودة
 * على الشاشة.
 */
async function compressImage(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  // ملفات GIF بنسيبها زي ما هي عشان الضغط بيكسر الحركة (canvas بياخد فريم واحد بس)
  if (file.type === "image/gif") return file;

  const TARGET_MAX_BYTES = 700 * 1024; // ~700KB كحد مستهدف بعد الضغط
  const MIN_QUALITY = 0.55; // مانزلش تحت كده عشان مايبانش تلف واضح في الصورة

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

    let q = quality;
    let blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", q));
    // لو لسه أكبر من الحجم المستهدف، بنقلل الجودة تدريجياً (خطوات صغيرة)
    // لحد ما نوصل للحجم المطلوب أو نوصل للحد الأدنى المسموح للجودة
    while (blob && blob.size > TARGET_MAX_BYTES && q > MIN_QUALITY) {
      q = Math.max(MIN_QUALITY, q - 0.1);
      blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", q));
    }

    if (!blob || blob.size >= file.size) return file; // لو الضغط زوّد الحجم، سيب الأصلي

    const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch (e) {
    console.warn("Image compression failed, uploading original:", e);
    return file;
  }
}

/**
 * ضغط الفيديو قبل الرفع - كان مفيش أي ضغط للفيديو خالص، فيديو الموبايل
 * (خصوصاً لو 4K أو بمعدل بت عالي) كان بيترفع بحجمه الأصلي كامل، وده سبب
 * رئيسي في بطء تحميل الفيديو وقت التشغيل (خصوصاً في الريلز اللي المفروض
 * يشتغل فوراً زي تيك توك). هنا بنعيد رسم الفيديو على canvas بأبعاد أصغر
 * (أقصى بعد 1280px) ومعدل بت محدود، ونسجله بـ MediaRecorder، فبيطلع بحجم
 * أصغر بكتير مع جودة مقبولة بصرياً.
 *
 * ملحوظة مهمة: العملية دي بتعتمد على MediaRecorder + captureStream، ومش
 * كل المتصفحات بتدعمها بنفس الكفاءة (سفاري القديم مثلاً بيدعمها جزئياً).
 * لو أي خطوة فشلت أو المتصفح مش داعم، بنرجع الملف الأصلي زي ما هو من غير
 * ما نوقف عملية الرفع - الضغط تحسين إضافي مش شرط أساسي للنشر.
 */
async function compressVideo(file: File, maxDimension = 1280): Promise<File> {
  if (typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream) {
    return file;
  }

  let objectUrl: string | null = null;
  let audioCtx: AudioContext | null = null;

  try {
    objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = objectUrl;
    video.muted = true; // مكتوم وقت الرسم على الـ canvas بس - الصوت الحقيقي بيتسجل من الـ audio track منفصل
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("تعذر تحميل بيانات الفيديو"));
    });

    const longSide = Math.max(video.videoWidth, video.videoHeight);
    // لو الفيديو أصلاً أصغر من الحد الأقصى، الضغط مش هيفرق كتير - نسيبه زي ما هو
    if (!longSide || longSide <= maxDimension) {
      URL.revokeObjectURL(objectUrl);
      return file;
    }

    const scale = maxDimension / longSide;
    let width = Math.round(video.videoWidth * scale);
    let height = Math.round(video.videoHeight * scale);
    width -= width % 2; // لازم رقم زوجي عشان أغلب الـ encoders
    height -= height % 2;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) { URL.revokeObjectURL(objectUrl); return file; }

    const canvasStream = (canvas as HTMLCanvasElement).captureStream(30);

    // بنحاول نضيف الصوت الأصلي للفيديو الجديد عن طريق AudioContext - لو فشلت
    // (متصفح مش داعم مثلاً) بنكمل بدون صوت بدل ما نوقف الضغط بالكامل
    try {
      audioCtx = new AudioContext();
      const source = audioCtx.createMediaElementSource(video);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      dest.stream.getAudioTracks().forEach(track => canvasStream.addTrack(track));
    } catch (e) {
      console.warn("Video audio capture failed, compressing video without audio:", e);
    }

    const mimeCandidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    const mimeType = mimeCandidates.find(m => MediaRecorder.isTypeSupported(m)) || "video/webm";
    // معدل بت محدود على حسب عدد البكسلات - كافي لجودة مقبولة بصرياً بحجم أصغر بكتير
    const videoBitsPerSecond = Math.min(4_000_000, Math.max(1_200_000, Math.round(width * height * 0.09)));

    const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    const recordingDone = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });

    let stopped = false;
    const drawFrame = () => {
      if (stopped || video.paused || video.ended) return;
      ctx.drawImage(video, 0, 0, width, height);
      requestAnimationFrame(drawFrame);
    };

    recorder.start(250);
    video.currentTime = 0;
    await video.play();
    drawFrame();

    await new Promise<void>((resolve) => {
      video.onended = () => resolve();
    });
    stopped = true;
    recorder.stop();
    video.pause();

    const blob = await recordingDone;
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;

    if (!blob || blob.size === 0 || blob.size >= file.size) return file; // لو الضغط ملوش فايدة، سيب الأصلي

    const newName = file.name.replace(/\.\w+$/, "") + ".webm";
    return new File([blob], newName, { type: mimeType });
  } catch (e) {
    console.warn("Video compression failed, uploading original:", e);
    return file;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (audioCtx) audioCtx.close().catch(() => {});
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
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) throw new Error("نوع الملف غير مدعوم.");

    // حد أقصى لحجم الملف الأصلي قبل الضغط - أكبر بكتير للفيديو عشان فيديوهات
    // الموبايل الحديثة (4K مثلاً) بتبقى كبيرة بطبيعتها قبل ما نضغطها هنا
    const maxOriginalSize = file.type.startsWith("video/") ? 200 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxOriginalSize) throw new Error("حجم الملف كبير جداً.");

    // ضغط الصور والفيديوهات قبل الرفع فعلياً (كان الفيديو بيترفع بحجمه الأصلي
    // كامل من غير أي ضغط، وده سبب رئيسي في بطء التحميل والتشغيل)
    const fileToUpload = file.type.startsWith("image/")
      ? await compressImage(file)
      : file.type.startsWith("video/")
        ? await compressVideo(file)
        : file;

    // بعد الضغط، بنتأكد إن الحجم بقى معقول للرفع (الضغط ممكن يفشل ويرجع
    // الملف الأصلي كامل لو المتصفح مش داعم، فلازم نتأكد تاني هنا)
    const maxUploadSize = 30 * 1024 * 1024;
    if (fileToUpload.size > maxUploadSize) {
      throw new Error("الملف لسه كبير بعد الضغط، جرب فيديو أقصر أو بجودة أقل من الموبايل.");
    }

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
    // ملحوظة: صورة البروفايل عمداً من غير ضغط - بترفع بالجودة اللي القص
    // (Canvas 300x300 كوالتي 0.9) طلعها بيها زي ما هي، عكس باقي الصور
    // والفيديوهات اللي بتتضغط في uploadMemeFile
    const fileToUpload = file;

    const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("memes").upload(fileName, fileToUpload, {
      upsert: true,
      contentType: fileToUpload.type,
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
   * الريلز: فيديوهات المنشورات المعتمدة بس (post_type='video'). كانت بترتيب
   * الأحدث بس من غير أي خوارزمية خالص، فكانت بتبدأ دايماً بنفس آخر فيديو نزل
   * مهما عملت ريفريش. دلوقتي بتستخدم نفس فانكشن الترتيب اللي بتستخدمها الفيد
   * العادي (get_ranked_feed مع p_post_type='video') واللي بقت فيها عشوائية
   * خفيفة حقيقية من جوه الداتابيز، فكل ريفريش بيدّي ترتيب متنوع شوية.
   */
  getVideoMemes: async (page: number = 0, limit: number = 10): Promise<Meme[]> => {
    // بيستخدم get_ranked_reels_v2: خوارزمية مخصصة للريلز مبنية على completion
    // rate / rewatch rate / share rate (مش لايكات خام زي الفيد العادي) - راجع
    // ملف RANKING_ALGORITHMS.md للتفاصيل.
    const { data, error } = await supabase.rpc("get_ranked_reels_v2", {
      p_limit: limit * 2, // نجيب ضعف العدد عشان نقدر نعمل diversity re-rank
      p_offset: page * limit,
    });
    if (error) throw error;

    const mapped = (data || []).map((m: any) => ({
      ...m,
      profiles: m.profile,
      tags: [],
    })) as Meme[];

    return diversityRerank(mapped, "user_id").slice(0, limit);
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

    // الفيد الرئيسي -> get_ranked_feed_v2: خوارزمية متعددة الإشارات (affinity،
    // meaningful interactions، video completion، تكرار الظهور، negative
    // feedback...) راجع RANKING_ALGORITHMS.md للتفاصيل الكاملة. بنجيب مجموعة
    // أوسع من اللازم عشان طبقة الـ diversity re-ranking تشتغل عليها (منع تكرار
    // نفس الشخص أكتر من مرتين ورا بعض) قبل ما نقص للحجم المطلوب - بالظبط زي ما
    // أنظمة الترتيب الحقيقية بتفصل بين مرحلة الـ scoring ومرحلة الـ business
    // rules re-ranking.
    const { data, error } = await supabase.rpc("get_ranked_feed_v2", {
      p_limit: limit * 2,
      p_offset: page * limit,
      p_tag: tag || null,
      p_search: search || null,
      p_post_type: null,
    });
    if (error) throw error;

    const mapped = (data || []).map((m: any) => ({
      ...m,
      profiles: m.profile,
      tags: Array.isArray(m.tags) ? m.tags : []
    })) as Meme[];

    return diversityRerank(mapped, "user_id").slice(0, limit);
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

  /**
   * بترجع التعليقات مرتبة في هيكل شجري: التعليقات الأساسية بس في المستوى
   * الأول، وكل تعليق فيه مصفوفة replies بتاعته. كمان بتحسب liked_by_me
   * لكل تعليق (كان مش موجود خالص قبل كده، فزرار الإعجاب بالتعليق ماكانش
   * ينفع يتعمله أصلاً).
   */
  getComments: async (memeId: string): Promise<Comment[]> => {
    const { data, error } = await supabase
      .from("comments")
      .select("*, profiles!user_id(*)")
      .eq("meme_id", ensureUUID(memeId))
      .order("created_at", { ascending: true });
    
    if (error) throw error;
    const all = (data as Comment[]) || [];

    const { data: { user } } = await supabase.auth.getUser();
    let likedIds = new Set<string>();
    if (user && all.length > 0) {
      const { data: likes } = await supabase
        .from("comment_likes")
        .select("comment_id")
        .eq("user_id", user.id)
        .in("comment_id", all.map(c => c.id));
      likedIds = new Set((likes || []).map((l: any) => l.comment_id));
    }

    const withLikes = all.map(c => ({ ...c, liked_by_me: likedIds.has(c.id) }));
    const topLevel = withLikes.filter(c => !c.parent_comment_id);
    const byParent = new Map<string, Comment[]>();
    withLikes.filter(c => c.parent_comment_id).forEach(c => {
      const list = byParent.get(c.parent_comment_id!) || [];
      list.push(c);
      byParent.set(c.parent_comment_id!, list);
    });
    return topLevel.map(c => ({ ...c, replies: byParent.get(c.id) || [] }));
  },

  /**
   * ضفنا parentCommentId اختياري عشان ينفع ترد على تعليق معين (بيتسجل رد
   * جوه نفس جدول comments بربط parent_comment_id بيه) بدل ما التعليق كان
   * بس مستوى واحد من غير أي رد ممكن.
   */
  addComment: async (memeId: string, _unusedUserId: string, content: string, parentCommentId?: string | null): Promise<Comment> => {
    const userId = await getAuthenticatedUserId();
    
    const { data, error } = await supabase
      .from("comments")
      .insert({
        meme_id: ensureUUID(memeId),
        user_id: userId,
        content: DOMPurify.sanitize(content.trim()),
        parent_comment_id: parentCommentId ? ensureUUID(parentCommentId) : null,
      })
      .select("*, profiles!user_id(*)")
      .single();
    
    if (error) throw error;
    return data as Comment;
  },

  /**
   * إعجاب/إلغاء إعجاب بتعليق معين - مكنش موجود خالص، التفاعل كان مقصور
   * على المنشور نفسه بس من غير ما ينفع تتفاعل مع تعليق بعينه.
   */
  toggleCommentLike: async (commentId: string): Promise<boolean> => {
    const userId = await getAuthenticatedUserId();
    const { data: existing } = await supabase
      .from("comment_likes")
      .select("comment_id")
      .eq("comment_id", ensureUUID(commentId))
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("comment_likes").delete().eq("comment_id", ensureUUID(commentId)).eq("user_id", userId);
      if (error) throw error;
      return false;
    } else {
      const { error } = await supabase.from("comment_likes").insert({ comment_id: ensureUUID(commentId), user_id: userId });
      if (error) throw error;
      return true;
    }
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
  },

  // ==================================================================
  // إشارات خوارزمية الترتيب (feedback loop) - راجع RANKING_ALGORITHMS.md
  // ==================================================================

  /**
   * الـ feedback السلبي: "مش عايز أشوف البوست ده" / "مش مهتم بمحتوى زي ده"
   * / "اسكت المستخدم ده مؤقتاً". ده أهم حاجة كانت ناقصة في أي خوارزمية بتعتمد
   * على engagement بس - من غيره مفيش طريقة تقول للنظام "لا" غير إنك تتجاهل
   * البوست وتفضل تتفرج على نفس النوع كتير.
   */
  submitNegativeFeedback: async (
    memeId: string,
    feedbackType: "hide" | "not_interested" | "snooze_author"
  ): Promise<void> => {
    const { error } = await supabase.rpc("submit_negative_feedback", {
      p_meme_id: ensureUUID(memeId),
      p_feedback_type: feedbackType,
    });
    if (error) throw error;
  },

  /**
   * تسجيل مدة مشاهدة الريلز (watch time). ده أقوى إشارة تستخدمها خوارزمية
   * الريلز الحقيقية - completion rate و rewatch rate بيتحسبوا من هنا.
   * لازم تتنادى من CustomVideoPlayer/ReelsPage لما الفيديو يخلص أو المستخدم يعدي.
   */
  logReelWatch: async (
    memeId: string,
    watchedSeconds: number,
    videoDuration: number,
    isRewatch: boolean = false
  ): Promise<void> => {
    try {
      await supabase.rpc("log_reel_watch", {
        p_meme_id: ensureUUID(memeId),
        p_watched_seconds: Math.max(0, watchedSeconds),
        p_video_duration: Math.max(0, videoDuration),
        p_is_rewatch: isRewatch,
      });
    } catch {
      // فشل تسجيل watch-time مش لازم يوقف تشغيل الفيديو للمستخدم
    }
  },

  /**
   * الحالات مرتبة بخوارزمية حقيقية (get_ranked_stories_v2): مين ما شافش
   * حالته لسه بيتقدم الأول، وبعدين حسب قوة العلاقة (affinity) مش مجرد
   * تاريخ آخر حالة. حالاتك انت شخصياً دايماً أول واحدة.
   */
  getRankedStories: async () => {
    const { data, error } = await supabase.rpc("get_ranked_stories_v2");
    if (error) throw error;
    return (data || []) as {
      author_id: string;
      profile: Profile;
      story_count: number;
      latest_created_at: string;
      has_unseen: boolean;
      affinity_score: number;
      story_ids: string[];
    }[];
  },
};
