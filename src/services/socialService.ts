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
    // Check if it's a guest user
    if (userId === "guest-user-temp" || !userId) {
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

  // Banner / Cover upload logic
  async uploadCover(userId: string, file: File): Promise<string> {
    // Validate file
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

      return publicUrl;
    } catch (error) {
      console.error("Cover upload error:", error);
      throw error;
    }
  }

  // Post logic (Text only, Video, etc.)
  async createPost(post: Partial<Meme>): Promise<Meme> {
    if (!post.user_id || post.user_id === "guest-user-temp") {
      throw new Error("سجل دخول الأول عشان تنشر!");
    }

    const insertData: any = {
      user_id: post.user_id,
      caption: post.caption || "",
      status: "approved",
      post_type: post.post_type || (post.image_url ? 'image' : (post.video_url ? 'video' : 'text')),
      image_url: post.image_url || null,
      video_url: post.video_url || null,
      images: post.images || []
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
