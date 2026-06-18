import { supabase } from "../supabaseClient";
import { Profile, Meme, Comment, Notification, Report } from "../types";

// Empty placeholders to strictly comply with "امسح كل الوهمي ده"
export const MOCK_PROFILES: Profile[] = [];
export const MOCK_MEMES: Meme[] = [];
export const MOCK_COMMENTS: Comment[] = [];
export const MOCK_NOTIFICATIONS: Notification[] = [];

// Helper to calculate rank levels based on accumulative XP points
export function calculateMemeLevel(points: number): string {
  if (points <= 50) return "مبتدئ";
  if (points <= 150) return "صانع متفاعل";
  if (points <= 350) return "ناشر متميز";
  if (points <= 700) return "أسطورة الكوميديا";
  if (points <= 1500) return "خبير ميمز";
  return "إمبراطور الكوميديا والميمز";
}

// Helper to convert any simple or local ID string to a valid UUID format
export function ensureUUID(id: string): string {
  if (!id) return "00000000-0000-4000-b500-000500000000";
  if (id.length === 36 && id.includes("-")) return id;
  const digits = id.replace(/[^0-9a-fA-F]/g, "");
  const padded = digits ? digits.padStart(12, "0").slice(-12) : "999999999999";
  return `00000000-0000-4000-b500-${padded}`;
}

// Helper to extract hashtags starting with # from caption
export function extractTagsFromCaption(caption: string | null): string[] {
  if (!caption) return [];
  const matches = caption.match(/#[\w\u0600-\u06FF]+/g);
  return matches ? matches.map(m => m.replace("#", "")) : [];
}

const STORAGE_PREFIX = "memesbook_";

function getStored<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(STORAGE_PREFIX + key);
    return val ? JSON.parse(val) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {}
}

const rateLimitStore: { [userId: string]: { lastMemeTime: number; lastCommentTime: number } } = {};

export const dataService = {
  extractTagsFromCaption,

  // Authentication & Current Profile
  signUp: async (email: string, password: string, username: string, avatarUrl?: string): Promise<Profile> => {
    const defaultAvatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          avatar_url: defaultAvatar
        }
      }
    });

    if (signupError) throw signupError;
    if (!authData.user) throw new Error("تعذّر إنشاء حساب في نظام المصادقة.");

    let profData = null;
    for (let i = 0; i < 6; i++) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .single();
      if (!error && data) {
        profData = data;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!profData) {
      profData = {
        id: authData.user.id,
        username,
        avatar_url: defaultAvatar,
        bio: "عضو مفعّل بالسيرفر 🚀",
        website: "",
        role: "user",
        meme_level: "مبتدئ سكرولر 🥱",
        total_points: 0,
        followers_count: 0,
        following_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    setStored("current_user", profData);
    return profData as Profile;
  },

  signIn: async (email: string, password: string): Promise<Profile> => {
    const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (loginError) throw loginError;
    if (!authData.user) throw new Error("بيانات الاعتماد غير صالحة.");

    const { data: profData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profData) {
      const fallbackProf: Profile = {
        id: authData.user.id,
        username: email.split("@")[0],
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${authData.user.id}`,
        bio: "مستخدم حقيقي بالمنصة",
        website: "",
        role: "user",
        meme_level: "مبتدئ سكرولر 🥱",
        total_points: 0,
        followers_count: 0,
        following_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setStored("current_user", fallbackProf);
      return fallbackProf;
    }

    setStored("current_user", profData);
    return profData as Profile;
  },

  signOut: async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    localStorage.removeItem("memesbook_current_user");
  },

  getCurrentUser: async (): Promise<Profile> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (!error && data) {
          setStored("current_user", data);
          return data as Profile;
        }
      }
    } catch (e) {}

    let currentUser = getStored<Profile | null>("current_user", null);
    if (!currentUser) { 
      currentUser = {
        id: "guest-user-temp",
        username: "زائر_مجهول",
        avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=guest",
        bio: "يتصفح كزائر. سجل حساب لرفع صور حقيقية ومزامنة نقاطك! 🚀",
        website: "",
        role: "user",
        meme_level: "زائر متصفح 👀",
        total_points: 0,
        followers_count: 0,
        following_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setStored("current_user", currentUser);
    }
    return currentUser;
  },

  updateProfile: async (profile: Partial<Profile>): Promise<Profile> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("يجب تسجيل الدخول لتعديل الملف الشخصي.");

    const { data, error } = await supabase
      .from("profiles")
      .update(profile)
      .eq("id", user.id)
      .select()
      .single();
    
    if (error) throw error;
    setStored("current_user", data);
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

  followUser: async (followerId: string, followingId: string): Promise<boolean> => {
    if (followerId === "guest-user-temp") {
      throw new Error("يا غالي، للتفاعل ومتابعة صانعي الكوميديا يرجى إنشاء حساب حقيقي أولاً! 😉");
    }
    
    // Check if already following
    const { data: existing, error: checkError } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .maybeSingle();
    
    if (checkError) throw checkError;
    if (existing) return true; // Already following
    
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: followerId, following_id: followingId });
    
    if (error) throw error;
    
    // Update followers_count and following_count in profiles table
    const { error: updateFollowingError } = await supabase.rpc('increment_following', { user_id: followerId });
    const { error: updateFollowersError } = await supabase.rpc('increment_followers', { user_id: followingId });
    
    // If RPC functions don't exist, update manually
    if (updateFollowingError || updateFollowersError) {
      const { data: followerProfile } = await supabase
        .from("profiles")
        .select("following_count")
        .eq("id", followerId)
        .single();
      
      const { data: followingProfile } = await supabase
        .from("profiles")
        .select("followers_count")
        .eq("id", followingId)
        .single();
      
      if (followerProfile) {
        await supabase
          .from("profiles")
          .update({ following_count: (followerProfile.following_count || 0) + 1 })
          .eq("id", followerId);
      }
      
      if (followingProfile) {
        await supabase
          .from("profiles")
          .update({ followers_count: (followingProfile.followers_count || 0) + 1 })
          .eq("id", followingId);
      }
    }
    
    return true;
  },

  // Memes Content
  /**
   * جلب الميمز مع دعم التحميل التدريجي (Pagination)
   * @param status حالة الميم (افتراضياً approved)
   * @param userId جلب ميمز مستخدم معين
   * @param currentUserId المستخدم الحالي للتحقق من الإعجابات والحفظ
   * @param page رقم الصفحة للتحميل التدريجي
   * @param limit عدد العناصر في كل صفحة
   */
  getMemes: async (
    status: string = "approved", 
    userId?: string, 
    currentUserId?: string, 
    page: number = 0, 
    limit: number = 10
  ): Promise<Meme[]> => {
    const from = page * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("memes")
      .select("*, profiles!user_id(*)")
      .eq("status", status);
    
    if (userId) {
      query = query.eq("user_id", ensureUUID(userId));
    }

    // تطبيق الترتيب والترقيم (Pagination)
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    
    let userLikes: string[] = [];
    let userSaves: string[] = [];
    
    if (currentUserId && currentUserId !== "guest-user-temp") {
      const dbUserId = ensureUUID(currentUserId);
      const { data: likes } = await supabase.from("likes").select("meme_id").eq("user_id", dbUserId);
      const { data: saves } = await supabase.from("saved_memes").select("meme_id").eq("user_id", dbUserId);
      userLikes = (likes || []).map(l => l.meme_id);
      userSaves = (saves || []).map(s => s.meme_id);
    }
    
    return (data as Meme[]).map(m => {
      const extracted = extractTagsFromCaption(m.caption);
      const originalTags = Array.isArray(m.tags) ? m.tags : [];
      return {
        ...m,
        liked_by_me: userLikes.includes(m.id),
        saved_by_me: userSaves.includes(m.id),
        tags: Array.from(new Set([...originalTags, ...extracted]))
      };
    });
  },

  deleteMeme: async (memeId: string, userId: string): Promise<void> => {
    const { error } = await supabase
      .from("memes")
      .delete()
      .eq("id", ensureUUID(memeId))
      .eq("user_id", ensureUUID(userId));
    
    if (error) throw error;
  },

  getTrendingMemes: async (currentUserId?: string): Promise<Meme[]> => {
    const { data, error } = await supabase
      .from("memes")
      .select("*, profiles!user_id(*)")
      .order("likes_count", { ascending: false })
      .limit(20);
    
    if (error) throw error;

    let userLikes: string[] = [];
    let userSaves: string[] = [];
    
    if (currentUserId && currentUserId !== "guest-user-temp") {
      const dbUserId = ensureUUID(currentUserId);
      const { data: likes } = await supabase.from("likes").select("meme_id").eq("user_id", dbUserId);
      const { data: saves } = await supabase.from("saved_memes").select("meme_id").eq("user_id", dbUserId);
      userLikes = (likes || []).map(l => l.meme_id);
      userSaves = (saves || []).map(s => s.meme_id);
    }

    return (data as Meme[]).map(m => {
      const extracted = extractTagsFromCaption(m.caption);
      const originalTags = Array.isArray(m.tags) ? m.tags : [];
      return {
        ...m,
        liked_by_me: userLikes.includes(m.id),
        saved_by_me: userSaves.includes(m.id),
        tags: Array.from(new Set([...originalTags, ...extracted]))
      };
    });
  },

  createMeme: async (meme: Partial<Meme>): Promise<Meme> => {
    const userId = meme.user_id || "";
    if (userId === "guest-user-temp" || !userId) {
      throw new Error("يرجى تسجيل الدخول أو إنشاء حساب أولاً لنشر الكوميكس.");
    }

    const now = Date.now();
    const limits = rateLimitStore[userId] || { lastMemeTime: 0, lastCommentTime: 0 };
    if (now - limits.lastMemeTime < 10000) {
      throw new Error("نعتذر، يرجى الانتظار 10 ثوانٍ بين كل عملية نشر.");
    }
    limits.lastMemeTime = now;
    rateLimitStore[userId] = limits;

    const dbUserId = ensureUUID(userId);
    let tagsToInsert = meme.tags || [];
    const extractedCaps = extractTagsFromCaption(meme.caption || "");
    tagsToInsert = Array.from(new Set([...tagsToInsert, ...extractedCaps]));

      const insertData: any = {
        user_id: dbUserId,
        caption: meme.caption || "",
        status: "approved",
        post_type: meme.post_type || (meme.image_url ? 'image' : 'text'),
        image_url: meme.image_url || null,
        video_url: meme.video_url || null,
        images: meme.images || []
      };

      const { data, error } = await supabase
      .from("memes")
      .insert(insertData)
      .select("*, profiles!user_id(*)")
      .single();
    
    if (error) throw error;
    const insertedMeme = data as Meme;

    // Map tags relationally
    if (tagsToInsert.length > 0) {
      for (const tgName of tagsToInsert) {
        try {
          let { data: existingTag } = await supabase
            .from("tags")
            .select("*")
            .eq("name", tgName)
            .maybeSingle();

          if (!existingTag) {
            const { data: newTag } = await supabase
              .from("tags")
              .insert({ name: tgName })
              .select()
              .single();
            existingTag = newTag;
          }

          if (existingTag) {
            await supabase
              .from("meme_tags")
              .insert({
                meme_id: insertedMeme.id,
                tag_id: existingTag.id
              });
          }
        } catch (tErr) {
          console.warn("Skipping tags mapping:", tErr);
        }
      }
    }

    insertedMeme.tags = tagsToInsert;
    return insertedMeme;
  },

  toggleLike: async (memeId: string, currentUserId: string): Promise<{ likesCount: number; liked: boolean }> => {
    if (currentUserId === "guest-user-temp") {
      throw new Error("يجب تسجيل الدخول أو إنشاء حساب أولاً للإعجاب بالمنشورات.");
    }

    const dbUserId = ensureUUID(currentUserId);
    const dbMemeId = ensureUUID(memeId);

    const { data: existing, error: checkError } = await supabase
      .from("likes")
      .select("*")
      .eq("meme_id", dbMemeId)
      .eq("user_id", dbUserId)
      .maybeSingle();

    if (checkError) throw checkError;

    let liked = false;
    if (existing) {
      const { error: delError } = await supabase.from("likes").delete().eq("id", existing.id);
      if (delError) throw delError;
      liked = false;
    } else {
      const { error: insError } = await supabase.from("likes").insert({ meme_id: dbMemeId, user_id: dbUserId });
      if (insError) throw insError;
      liked = true;
    }

    // Fetch the actual count from database after the operation
    const { data: updatedMeme, error: countError } = await supabase
      .from("memes")
      .select("likes_count")
      .eq("id", dbMemeId)
      .single();
    
    if (countError) {
      console.warn("Failed to fetch updated likes count:", countError);
      return { likesCount: 0, liked };
    }
    
    return { likesCount: updatedMeme?.likes_count ?? 0, liked };
  },

  getLikedByMe: async (memeId: string, currentUserId: string): Promise<boolean> => {
    if (currentUserId === "guest-user-temp") return false;
    const dbUserId = ensureUUID(currentUserId);
    const dbMemeId = ensureUUID(memeId);
    const { data, error } = await supabase
      .from("likes")
      .select("*")
      .eq("meme_id", dbMemeId)
      .eq("user_id", dbUserId)
      .maybeSingle();
    
    if (error) throw error;
    return !!data;
  },

  toggleSave: async (memeId: string, currentUserId: string): Promise<boolean> => {
    if (currentUserId === "guest-user-temp") {
      throw new Error("يجب تسجيل الدخول أو إنشاء حساب أولاً لحفظ الكوميكس.");
    }

    const dbUserId = ensureUUID(currentUserId);
    const dbMemeId = ensureUUID(memeId);

    const { data: existing, error: checkError } = await supabase
      .from("saved_memes")
      .select("*")
      .eq("meme_id", dbMemeId)
      .eq("user_id", dbUserId)
      .maybeSingle();
    
    if (checkError) throw checkError;

    if (existing) {
      const { error } = await supabase.from("saved_memes").delete().eq("meme_id", dbMemeId).eq("user_id", dbUserId);
      if (error) throw error;
      return false;
    } else {
      const { error } = await supabase.from("saved_memes").insert({ meme_id: dbMemeId, user_id: dbUserId });
      if (error) throw error;
      return true;
    }
  },

  getComments: async (memeId: string): Promise<Comment[]> => {
    const { data, error } = await supabase
      .from("comments")
      .select("*, profiles!user_id(*)")
      .eq("meme_id", memeId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data as Comment[];
  },

  signInAnonymously: async (username: string): Promise<Profile> => {
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;
    
    const profile: Profile = {
      id: `anon-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      username,
      avatar_url: defaultAvatar,
      bio: "عضو مجهول بدون حساب حقيقي",
      website: "",
      role: "user",
      meme_level: "مبتدئ سكرولر 🥱",
      total_points: 0,
      followers_count: 0,
      following_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setStored("current_user", profile);
    return profile;
  },

  getFollowingList: async (userId: string): Promise<string[]> => {
    if (userId === "guest-user-temp") return [];
    const dbUserId = ensureUUID(userId);
    const { data, error } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", dbUserId);
    
    if (error) throw error;
    return (data || []).map(f => f.following_id);
  },

  deleteComment: async (commentId: string): Promise<boolean> => {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);
    
    if (error) throw error;
    return true;
  },

  addComment: async (memeId: string, userId: string, content: string): Promise<Comment> => {
    if (userId === "guest-user-temp") {
      throw new Error("يجب تسجيل الدخول أو إنشاء حساب أولاً لإضافة تعليق.");
    }

    const now = Date.now();
    const limits = rateLimitStore[userId] || { lastMemeTime: 0, lastCommentTime: 0 };
    if (now - limits.lastCommentTime < 4000) {
      throw new Error("يرجى الانتظار 4 ثوانٍ بين كل تعليق.");
    }
    limits.lastCommentTime = now;
    rateLimitStore[userId] = limits;

    const dbUserId = ensureUUID(userId);
    const dbMemeId = ensureUUID(memeId);

    const { data, error } = await supabase
      .from("comments")
      .insert({
        meme_id: dbMemeId,
        user_id: dbUserId,
        content
      })
      .select("*, profiles!user_id(*)")
      .single();
    
    if (error) throw error;
    return data as Comment;
  },

  getNotifications: async (userId: string): Promise<Notification[]> => {
    if (userId === "guest-user-temp") return [];
    const dbUserId = ensureUUID(userId);
    const { data, error } = await supabase
      .from("notifications")
      .select("*, actor:actor_id(*), meme:meme_id(*)")
      .eq("recipient_id", dbUserId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return data as Notification[];
  },

  markNotificationRead: async (notifId: string): Promise<boolean> => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notifId);
    return !error;
  },

  markNotificationsAsRead: async (userId: string): Promise<boolean> => {
    if (userId === "guest-user-temp") return true;
    const dbUserId = ensureUUID(userId);
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", dbUserId)
      .eq("is_read", false);
    return !error;
  },

  uploadMemeFile: async (file: File): Promise<string> => {
    // Limit video size/duration (approx 2 mins)
    if (file.type.startsWith('video/')) {
      const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB limit as proxy for 2 mins
      if (file.size > MAX_VIDEO_SIZE) {
        throw new Error("الفيديو كبير جداً، الحد الأقصى حوالي 2 دقيقة.");
      }
    }

    // Basic image compression using Canvas if possible
    let fileToUpload: File | Blob = file;
    
    try {
      if (file.type.startsWith('image/')) {
        const compressedBlob = await new Promise<Blob>((resolve, reject) => {
          const img = new Image();
          img.src = URL.createObjectURL(file);
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(file);
            
            // Limit max dimension to 1200px
            let width = img.width;
            let height = img.height;
            const maxDim = 1200;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height *= maxDim / width;
                width = maxDim;
              } else {
                width *= maxDim / height;
                height = maxDim;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else resolve(file);
            }, 'image/jpeg', 0.8); // 80% quality JPEG
          };
          img.onerror = () => resolve(file);
        });
        fileToUpload = compressedBlob;
      }
    } catch (e) {
      console.warn("Compression failed, uploading original", e);
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `meme_uploads/${fileName}`;

    const { error } = await supabase.storage
      .from("memes")
      .upload(filePath, fileToUpload, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw new Error(`فشل رفع الصورة: ${error.message}. تأكد من وجود Bucket باسم 'memes' في Supabase.`);

    const { data: { publicUrl } } = supabase.storage
      .from("memes")
      .getPublicUrl(filePath);

    return publicUrl;
  },

  uploadAvatar: async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `avatars/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("memes")
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw new Error(`فشل رفع الصورة: ${error.message}`);

    const { data: { publicUrl } } = supabase.storage
      .from("memes")
      .getPublicUrl(fileName);

    return publicUrl;
  },

  // Stories
  getStories: async (): Promise<Story[]> => {
    const { data, error } = await supabase
      .from("stories")
      .select("*, profiles!user_id(*)")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data as Story[];
  },

  createStory: async (userId: string, mediaUrl: string, mediaType: 'image' | 'video'): Promise<Story> => {
    const dbUserId = ensureUUID(userId);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("stories")
      .insert({
        user_id: dbUserId,
        media_url: mediaUrl,
        media_type: mediaType,
        expires_at: expiresAt
      })
      .select("*, profiles!user_id(*)")
      .single();
    
    if (error) throw error;
    return data as Story;
  }
};
