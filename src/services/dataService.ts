import { supabase } from "../supabaseClient";
import { Profile, Meme, Comment, Notification, Report } from "../types";

// Empty placeholders to strictly comply with "امسح كل الوهمي ده" (deleting any simulated fake items)
export const MOCK_PROFILES: Profile[] = [];
export const MOCK_MEMES: Meme[] = [];
export const MOCK_COMMENTS: Comment[] = [];
export const MOCK_NOTIFICATIONS: Notification[] = [];

// Helper to calculate rank levels based on accumulative XP points
export function calculateMemeLevel(points: number): string {
  if (points <= 50) return "مبتدئ سكرولر 🥱";
  if (points <= 150) return "آكل فلافل متفاعل 🧆";
  if (points <= 350) return "ملك التشيير واللايكات 👍";
  if (points <= 700) return "أسطورة الكوميكس 🤩";
  if (points <= 1500) return "بابا الميمز والممبرز 👑";
  return "إمبراطور الكوميديا الفاخرة ✨👑";
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
  // Authentication & Current Profile
  signUp: async (email: string, password: string, username: string, avatarUrl?: string): Promise<Profile> => {
    // Attempt standard Supabase Auth signup
    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          avatar_url: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`
        }
      }
    });

    if (signupError) throw signupError;
    if (!authData.user) throw new Error("تعذّر إنشاء حساب في نظام المصادقة.");

    const defaultAvatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;
    const newProfile: Profile = {
      id: authData.user.id,
      username,
      avatar_url: defaultAvatar,
      bio: "صانع ميمز حقيقي بالمنصة ومسجل بالسيرفر 🚀",
      website: "",
      role: "user",
      meme_level: "مبتدئ سكرولر 🥱",
      total_points: 0,
      followers_count: 0,
      following_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Store in public.profiles table
    const { data: profData, error: profileError } = await supabase
      .from("profiles")
      .insert(newProfile)
      .select()
      .single();

    if (profileError) {
      console.warn("Retrying profile creation with update/upsert:", profileError);
      const { data: retryData, error: retryError } = await supabase
        .from("profiles")
        .upsert(newProfile)
        .select()
        .single();
      if (!retryError && retryData) {
        setStored("current_user", retryData);
        return retryData as Profile;
      }
    }

    if (profData) {
      setStored("current_user", profData);
      return profData as Profile;
    }

    setStored("current_user", newProfile);
    return newProfile;
  },

  signIn: async (email: string, password: string): Promise<Profile> => {
    const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (loginError) throw loginError;
    if (!authData.user) throw new Error("بيانات الاعتماد غير صالحة.");

    // Load actual profile details from Postgres db
    const { data: profData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profData) {
      // Auto-recreate profiles row if missing
      const fallbackProf: Profile = {
        id: authData.user.id,
        username: email.split("@")[0],
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${authData.user.id}`,
        bio: "مستخدم حقيقي بالوزارة",
        website: "",
        role: "user",
        meme_level: "مبتدئ سكرولر 🥱",
        total_points: 0,
        followers_count: 0,
        following_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await supabase.from("profiles").upsert(fallbackProf);
      setStored("current_user", fallbackProf);
      return fallbackProf;
    }

    setStored("current_user", profData);
    return profData as Profile;
  },

  signOut: async (): Promise<void> => {
    await supabase.auth.signOut();
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

    // Clean Local Guest user local state, avoiding hardcoded fake users
    let guestUser = getStored<Profile | null>("current_user", null);
    if (!guestUser || guestUser.id.startsWith("user")) { 
      guestUser = {
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
      setStored("current_user", guestUser);
    }
    return guestUser;
  },

  updateProfile: async (profile: Partial<Profile>): Promise<Profile> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .update(profile)
          .eq("id", user.id)
          .select()
          .single();
        if (!error && data) {
          setStored("current_user", data);
          return data as Profile;
        }
      }
    } catch (e) {}

    let current = getStored<Profile>("current_user", {
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
    });
    
    const updated = { ...current, ...profile, updated_at: new Date().toISOString() };
    setStored("current_user", updated);
    return updated;
  },

  getProfilesList: async (): Promise<Profile[]> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("total_points", { ascending: false });
      if (!error && data) return data as Profile[];
      if (error) throw error;
    } catch (e) {
      console.error("error fetching profiles list:", e);
      throw e;
    }
    return [];
  },

  followUser: async (followerId: string, followingId: string): Promise<boolean> => {
    if (followerId === "guest-user-temp") {
      throw new Error("يا غالي، للتفاعل ومتابعة صانعي الكوميديا يرجى إنشاء حساب حقيقي أولاً! 😉");
    }
    try {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: followerId, following_id: followingId });
      
      // Auto add point to following
      const { data: followingProfile } = await supabase.from("profiles").select("total_points").eq("id", followingId).single();
      if (followingProfile) {
        const nextPoints = (followingProfile.total_points || 0) + 10;
        await supabase.from("profiles").update({ 
          total_points: nextPoints, 
          meme_level: calculateMemeLevel(nextPoints) 
        }).eq("id", followingId);
      }

      // Real DB notifications
      try {
        await supabase.from("notifications").insert({
          recipient_id: followingId,
          actor_id: followerId,
          type: "follow",
        });
      } catch (notifErr) {
        console.error("Fail follow notification:", notifErr);
      }

      return !error;
    } catch (e: any) {
      console.error("followUser exception:", e);
      throw e;
    }
  },

  // Memes Content - strictly fetch 100% database memes
  getMemes: async (status: string = "approved"): Promise<Meme[]> => {
    try {
      const { data, error } = await supabase
        .from("memes")
        .select("*, profiles(*)")
        .eq("status", status)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Supabase memes fetch error details:", error);
        throw error;
      }
      return (data || []) as Meme[];
    } catch (e: any) {
      console.error("getMemes error:", e);
      throw e;
    }
  },

  getTrendingMemes: async (): Promise<Meme[]> => {
    try {
      const { data, error } = await supabase
        .from("memes")
        .select("*, profiles(*)")
        .order("likes_count", { ascending: false })
        .limit(20);
      if (!error && data) return data as Meme[];
      if (error) throw error;
    } catch (e) {
      console.error("getTrendingMemes error:", e);
    }
    return [];
  },

  createMeme: async (meme: Partial<Meme>): Promise<Meme> => {
    const userId = meme.user_id || "";
    if (userId === "guest-user-temp" || !userId) {
      throw new Error("عذراً مجهول هويا! يرجى إنشاء حساب حقيقي وبثواني ونشر قفشاتك الحقيقية الآن 🚀");
    }

    const now = Date.now();
    const limits = rateLimitStore[userId] || { lastMemeTime: 0, lastCommentTime: 0 };
    if (now - limits.lastMemeTime < 10000) { // wait 10 seconds cooldon
      throw new Error("استهدى بالله يا زميلي، مش هترفع ميمز بالسرعة دي! استنى 10 ثانية.");
    }
    limits.lastMemeTime = now;
    rateLimitStore[userId] = limits;

    try {
      // 1. Insert Meme details in database
      const { data, error } = await supabase
        .from("memes")
        .insert({ 
          user_id: userId,
          image_url: meme.image_url,
          caption: meme.caption || "",
          tags: meme.tags || [],
          status: "approved"
        })
        .select("*, profiles(*)")
        .single();
      
      if (error) {
        console.error("createMeme DB error details:", error);
        throw error;
      }

      // Add points dynamically to the real profiles table
      try {
        const { data: prof } = await supabase.from("profiles").select("total_points").eq("id", userId).single();
        if (prof) {
          const nextPoints = (prof.total_points || 0) + 5;
          await supabase.from("profiles").update({ 
            total_points: nextPoints, 
            meme_level: calculateMemeLevel(nextPoints) 
          }).eq("id", userId);
        }
      } catch (ptsErr) {
        console.error("Points award error:", ptsErr);
      }

      return data as Meme;
    } catch (e: any) {
      console.error("createMeme error:", e);
      throw e;
    }
  },

  // Likes & Saves Actions
  toggleLike: async (memeId: string, currentUserId: string): Promise<{ likesCount: number; loved?: boolean; liked: boolean }> => {
    if (currentUserId === "guest-user-temp") {
      throw new Error("يا غالي، لازم تسجل حساب حقيقي عشان تعمل لايك حقيقي! 😉");
    }

    try {
      const { data: existing, error: checkError } = await supabase
        .from("likes")
        .select("*")
        .eq("meme_id", memeId)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (checkError) throw checkError;

      let liked = false;
      if (existing) {
        // Delete Like
        const { error: delError } = await supabase.from("likes").delete().eq("id", existing.id);
        if (delError) throw delError;
        liked = false;
      } else {
        // Insert Like
        const { error: insError } = await supabase.from("likes").insert({ meme_id: memeId, user_id: currentUserId });
        if (insError) throw insError;
        liked = true;

        // real notifications
        try {
          const { data: memeObj } = await supabase.from("memes").select("user_id").eq("id", memeId).single();
          if (memeObj && memeObj.user_id !== currentUserId) {
            await supabase.from("notifications").insert({
              recipient_id: memeObj.user_id,
              actor_id: currentUserId,
              type: "like",
              meme_id: memeId,
            });
            // Update points of creator
            const { data: creatorProf } = await supabase.from("profiles").select("total_points").eq("id", memeObj.user_id).single();
            if (creatorProf) {
              const nextPoints = (creatorProf.total_points || 0) + 5;
              await supabase.from("profiles").update({ 
                total_points: nextPoints, 
                meme_level: calculateMemeLevel(nextPoints) 
              }).eq("id", memeObj.user_id);
            }
          }
        } catch (notifErr) {
          console.error("Fail sending like notification:", notifErr);
        }
      }

      // Read real count back from memes
      const { data: updatedMeme } = await supabase.from("memes").select("likes_count").eq("id", memeId).single();
      return { likesCount: updatedMeme?.likes_count ?? 0, liked };
    } catch (e: any) {
      console.error("toggleLike error:", e);
      throw e;
    }
  },

  toggleSave: async (memeId: string, currentUserId: string): Promise<boolean> => {
    if (currentUserId === "guest-user-temp") {
      throw new Error("يا غالي، لازم تسجل حساب حقيقي عشان تحفظ الكوميكس في محفوظاتك! 😉");
    }

    try {
      const { data: existing, error: checkError } = await supabase
        .from("saved_memes")
        .select("*")
        .eq("meme_id", memeId)
        .eq("user_id", currentUserId)
        .maybeSingle();
      
      if (checkError) throw checkError;

      if (existing) {
        const { error } = await supabase.from("saved_memes").delete().eq("meme_id", memeId).eq("user_id", currentUserId);
        if (error) throw error;
        // decrement saves count
        const { data: m } = await supabase.from("memes").select("saves_count").eq("id", memeId).single();
        if (m) {
          await supabase.from("memes").update({ saves_count: Math.max(0, (m.saves_count || 0) - 1) }).eq("id", memeId);
        }
        return false;
      } else {
        const { error } = await supabase.from("saved_memes").insert({ meme_id: memeId, user_id: currentUserId });
        if (error) throw error;
        // increment saves count
        const { data: m } = await supabase.from("memes").select("saves_count").eq("id", memeId).single();
        if (m) {
          await supabase.from("memes").update({ saves_count: (m.saves_count || 0) + 1 }).eq("id", memeId);
        }
        return true;
      }
    } catch (e: any) {
      console.error("toggleSave error:", e);
      throw e;
    }
  },

  // Comments Operations
  getComments: async (memeId: string): Promise<Comment[]> => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*, profiles(*)")
        .eq("meme_id", memeId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Comment[];
    } catch (e) {
      console.error("getComments database error:", e);
      throw e;
    }
  },

  addComment: async (memeId: string, userId: string, content: string): Promise<Comment> => {
    if (userId === "guest-user-temp") {
      throw new Error("يا غالي، يجب تسجيل الدخول أو إنشاء حساب حقيقي أولاً لتكتب تعليق! 💬");
    }

    const now = Date.now();
    const limits = rateLimitStore[userId] || { lastMemeTime: 0, lastCommentTime: 0 };
    if (now - limits.lastCommentTime < 4000) { // wait 4 seconds cooldown
      throw new Error("براحة على الكيبورد يا غالي! استنى 4 ثواني بين كل تعليق.");
    }
    limits.lastCommentTime = now;
    rateLimitStore[userId] = limits;

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({ meme_id: memeId, user_id: userId, content })
        .select("*, profiles(*)")
        .single();
      
      if (error) throw error;

      // Real Notifications and Award points to creator
      try {
        const { data: m } = await supabase.from("memes").select("user_id").eq("id", memeId).single();
        if (m && m.user_id !== userId) {
          await supabase.from("notifications").insert({
            recipient_id: m.user_id,
            actor_id: userId,
            type: "comment",
            meme_id: memeId,
            content: content.substring(0, 50),
          });

          // Award creator +2 XP
          const { data: creatorProf } = await supabase.from("profiles").select("total_points").eq("id", m.user_id).single();
          if (creatorProf) {
            const nextPoints = (creatorProf.total_points || 0) + 2;
            await supabase.from("profiles").update({ 
              total_points: nextPoints, 
              meme_level: calculateMemeLevel(nextPoints) 
            }).eq("id", m.user_id);
          }
        }
      } catch (notifErr) {
        console.error("Fail comment notifications DB:", notifErr);
      }

      return data as Comment;
    } catch (e: any) {
      console.error("addComment error:", e);
      throw e;
    }
  },

  deleteComment: async (commentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("deleteComment error:", e);
      throw e;
    }
  },

  // Share count tracking
  recordShare: async (memeId: string): Promise<number> => {
    try {
      const { data: meme, error: fetchErr } = await supabase.from("memes").select("shares_count").eq("id", memeId).single();
      if (!fetchErr && meme) {
        const nextShareCount = (meme.shares_count || 0) + 1;
        await supabase.from("memes").update({ shares_count: nextShareCount }).eq("id", memeId);
        return nextShareCount;
      }
    } catch (e) {}
    return 0;
  },

  // View count tracking
  recordView: async (memeId: string): Promise<void> => {
    try {
      const { data: meme, error: fetchErr } = await supabase.from("memes").select("views_count").eq("id", memeId).single();
      if (!fetchErr && meme) {
        await supabase.from("memes").update({ views_count: (meme.views_count || 0) + 1 }).eq("id", memeId);
      }
    } catch (e) {}
  },

  // Reports Table Insertion
  submitReport: async (memeId: string, reporterId: string, reason: string): Promise<Report> => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .insert({ meme_id: memeId, reporter_id: reporterId, reason })
        .select()
        .single();
      if (error) throw error;
      return data as Report;
    } catch (e: any) {
      console.error("submitReport DB error:", e);
      // local memory storage fallback for development preview if reports table isn't created
      const report: Report = {
        id: `report-${Date.now()}`,
        meme_id: memeId,
        reporter_id: reporterId,
        reason,
        status: "open",
        resolved_by: null,
        resolution_note: null,
        created_at: new Date().toISOString()
      };
      const reportList = getStored<Report[]>("reports_list", []);
      reportList.push(report);
      setStored("reports_list", reportList);
      return report;
    }
  },

  // Notifications List
  getNotifications: async (recipientId: string): Promise<Notification[]> => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*, actor:profiles(*), meme:memes(*)")
        .eq("recipient_id", recipientId)
        .order("created_at", { ascending: false });
      if (!error && data) return data as Notification[];
      if (error) throw error;
    } catch (e) {
      console.error("getNotifications db error:", e);
    }
    return [];
  },

  markNotificationsAsRead: async (recipientId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", recipientId);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("markNotificationsAsRead db error:", e);
      return false;
    }
  },

  // Real Supabase storage file manager upload with client fallback
  uploadMemeFile: async (file: File): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `meme_uploads/${fileName}`;

      // Upload file directly into 'memes' bucket
      const { data, error } = await supabase.storage
        .from("memes")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.warn("Supabase Storage direct bucket upload error, using local base64 preview:", error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("memes")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      // Bulletproof local fallback for instant rendering if bucket doesn't exist
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            resolve(e.target.result as string);
          } else {
            reject(new Error("تعذر قراءة ملف الصورة."));
          }
        };
        reader.onerror = () => reject(new Error("فشلت قراءة الصورة."));
        reader.readAsDataURL(file);
      });
    }
  }
};
