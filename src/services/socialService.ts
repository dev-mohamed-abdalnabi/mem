import { supabase } from "../supabaseClient";
import { Profile, Story, Meme } from "../types";

export const socialService = {
  // Stories (Status) logic
  async getStories(): Promise<Story[]> {
    const { data, error } = await supabase
      .from("stories")
      .select("*, profiles!user_id(*)")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching stories:", error);
      return [];
    }
    return data as Story[];
  },

  async createStory(userId: string, mediaUrl: string, mediaType: 'image' | 'video'): Promise<Story> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      throw new Error("سجل دخول الأول يا بطل عشان ترفع حالة!");
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("stories")
      .insert({
        user_id: userId,
        media_url: mediaUrl,
        media_type: mediaType,
        expires_at: expiresAt
      })
      .select("*, profiles!user_id(*)")
      .single();
    
    if (error) throw error;
    return data as Story;
  },

  /**
   * تسجيل مشاهدة حالة فعلياً في الداتابيز (جدول story_views كان موجود
   * جاهز في الداتابيز بس محدش كان بينادي عليه، فالحالات المشاهدة كانت
   * بترجع "مش متشافة" تاني بمجرد ما تعمل ريفريش للصفحة).
   */
  async markStoryViewed(storyId: string, viewerId: string): Promise<void> {
    if (!viewerId || viewerId === "guest-user-temp") return;
    const { error } = await supabase
      .from("story_views")
      .upsert({ story_id: storyId, viewer_id: viewerId }, { onConflict: "story_id,viewer_id", ignoreDuplicates: true });
    if (error) console.error("Error marking story viewed:", error);
  },

  /**
   * جلب كل الحالات اللي المستخدم الحالي شافها بالفعل (عشان نعرض الحلقة الرمادية
   * بستايل واتساب بشكل دائم مش بس لحد ما تعمل ريفريش).
   */
  async getViewedStoryIds(viewerId: string): Promise<string[]> {
    if (!viewerId || viewerId === "guest-user-temp") return [];
    const { data, error } = await supabase
      .from("story_views")
      .select("story_id")
      .eq("viewer_id", viewerId);
    if (error) {
      console.error("Error fetching viewed stories:", error);
      return [];
    }
    return (data || []).map((r: any) => r.story_id);
  },

  /**
   * إرسال/تحديث تفاعل (إيموجي) على حالة، بستايل واتساب (تفاعل واحد لكل مستخدم لكل حالة).
   */
  async reactToStory(storyId: string, userId: string, emoji: string): Promise<void> {
    if (!userId || userId === "guest-user-temp") {
      throw new Error("سجل دخول الأول عشان تتفاعل مع الحالة!");
    }
    const { error } = await supabase
      .from("story_reactions")
      .upsert({ story_id: storyId, user_id: userId, emoji }, { onConflict: "story_id,user_id" });
    if (error) throw error;
  },

  /**
   * جلب تفاعل المستخدم الحالي على مجموعة حالات (عشان نلون الإيموجي اللي اختاره قبل كده).
   */
  async getMyStoryReactions(userId: string): Promise<Record<string, string>> {
    if (!userId || userId === "guest-user-temp") return {};
    const { data, error } = await supabase
      .from("story_reactions")
      .select("story_id, emoji")
      .eq("user_id", userId);
    if (error) return {};
    return (data || []).reduce((acc: Record<string, string>, r: any) => {
      acc[r.story_id] = r.emoji;
      return acc;
    }, {});
  },

  // Banner / Cover upload logic
  async uploadCover(userId: string, file: File): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      throw new Error("غير مصرح لك بتعديل هذا الملف الشخصي.");
    }

    if (!file) {
      throw new Error("لم يتم اختيار ملف");
    }

    // Check file size (max 5MB for cover)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("حجم الصورة كبير جداً. الحد الأقصى 5MB.");
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      throw new Error("يجب أن يكون الملف صورة (JPG, PNG, إلخ)");
    }

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `covers/${userId}_${Date.now()}.${fileExt}`;

    try {
      // بنجيب الغلاف القديم عشان نمسحه بعد نجاح الرفع (نفس مشكلة تسريب مساحة الـ storage)
      const { data: oldProfile } = await supabase.from("profiles").select("cover_url").eq("id", userId).single();

      const { error: uploadError } = await supabase.storage
        .from("memes")
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`فشل رفع الصورة: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from("memes")
        .getPublicUrl(fileName);

      if (!publicUrl) {
        throw new Error("فشل في الحصول على رابط الصورة");
      }

      // Update profile with cover URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ cover_url: publicUrl })
        .eq("id", userId);

      if (updateError) {
        console.error("Database update error:", updateError);
        throw new Error(`فشل حفظ الغلاف في قاعدة البيانات: ${updateError.message}`);
      }

      // دلوقتي نمسح الغلاف القديم بعد ما اتأكدنا إن الجديد اتحفظ صح
      if (oldProfile?.cover_url && oldProfile.cover_url.includes("/storage/v1/object/public/memes/")) {
        const oldPath = oldProfile.cover_url.split("/storage/v1/object/public/memes/")[1];
        if (oldPath) await supabase.storage.from("memes").remove([oldPath]);
      }

      return publicUrl;
    } catch (error) {
      console.error("Cover upload error:", error);
      throw error;
    }
  }, // <--- 🟢 تم إضافة الفاصلة هنا

  // Post logic (Text only, Video, etc.)
  async createPost(post: Partial<Meme>): Promise<Meme> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== post.user_id) {
      throw new Error("سجل دخول الأول عشان تنشر!");
    }

    const insertData: Partial<Meme> = {
      user_id: post.user_id,
      caption: post.caption || "",
      status: "pending", // Posts should be pending by default for server-side approval
      post_type: post.post_type || (post.image_url ? 'image' : (post.video_url ? 'video' : 'text')),
      image_url: post.image_url || null,
      video_url: post.video_url || null,
      images: post.images || [],
      tags: post.tags || [] // كانت الهاشتاجات بتتحسب في الواجهة وميتبعتش خالص للداتابيز
    };

    const { data, error } = await supabase
      .from("memes")
      .insert(insertData)
      .select("*, profiles!user_id(*)")
      .single();
    
    if (error) throw error;
    return data as Meme;
  }
};
