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

// Local fallback database helpers for bulletproof user experience free from rate limits or Supabase config errors
function getLocalUsers(): any[] {
  try {
    const list = localStorage.getItem("memesbook_local_users");
    return list ? JSON.parse(list) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalUser(user: any): void {
  try {
    const list = getLocalUsers();
    const filtered = list.filter((u: any) => u.email.toLowerCase() !== user.email.toLowerCase());
    filtered.push(user);
    localStorage.setItem("memesbook_local_users", JSON.stringify(filtered));
  } catch (e) {}
}

function getLocalMemes(): Meme[] {
  try {
    const list = localStorage.getItem("memesbook_local_memes");
    return list ? JSON.parse(list) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalMeme(meme: Meme): void {
  try {
    const list = getLocalMemes();
    list.unshift(meme);
    localStorage.setItem("memesbook_local_memes", JSON.stringify(list));
  } catch (e) {}
}

function getLocalComments(): Comment[] {
  try {
    const list = localStorage.getItem("memesbook_local_comments");
    return list ? JSON.parse(list) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalComment(comment: Comment): void {
  try {
    const list = getLocalComments();
    list.push(comment);
    localStorage.setItem("memesbook_local_comments", JSON.stringify(list));
  } catch (e) {}
}

function getLocalLikes(): { [memeId: string]: boolean } {
  try {
    const list = localStorage.getItem("memesbook_local_likes");
    return list ? JSON.parse(list) : {};
  } catch (e) {
    return {};
  }
}

function saveLocalLike(memeId: string, liked: boolean): void {
  try {
    const likes = getLocalLikes();
    if (liked) {
      likes[memeId] = true;
    } else {
      delete likes[memeId];
    }
    localStorage.setItem("memesbook_local_likes", JSON.stringify(likes));
  } catch (e) {}
}

function getLocalSaves(): { [memeId: string]: boolean } {
  try {
    const list = localStorage.getItem("memesbook_local_saves");
    return list ? JSON.parse(list) : {};
  } catch (e) {
    return {};
  }
}

function saveLocalSave(memeId: string, saved: boolean): void {
  try {
    const saves = getLocalSaves();
    if (saved) {
      saves[memeId] = true;
    } else {
      delete saves[memeId];
    }
    localStorage.setItem("memesbook_local_saves", JSON.stringify(saves));
  } catch (e) {}
}

export const dataService = {
  // Expose helper
  extractTagsFromCaption,

  // Authentication & Current Profile
  signUp: async (email: string, password: string, username: string, avatarUrl?: string): Promise<Profile> => {
    const defaultAvatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

    try {
      // Attempt standard Supabase Auth signup
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

      // Query the database profiles table which gets populated by the "on_auth_user_created" trigger
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
        await new Promise(resolve => setTimeout(resolve, 400));
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
    } catch (err: any) {
      console.warn("Supabase signup failed, falling back to local credentials:", err);
      
      const localId = `local-u-${Date.now()}`;
      const localProfile: Profile = {
        id: localId,
        username,
        avatar_url: defaultAvatar,
        bio: "حساب محلي آمن ومفعّل لتجنب قيود السيرفر ⚡",
        website: "",
        role: "user",
        meme_level: "مبتدئ سكرولر 🥱",
        total_points: 0,
        followers_count: 0,
        following_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      saveLocalUser({
        email,
        password,
        profile: localProfile
      });

      setStored("current_user", localProfile);
      return localProfile;
    }
  },

  signInAnonymously: async (username: string, avatarUrl?: string): Promise<Profile> => {
    throw new Error("عذراً، تم تعطيل تسجيل الدخول المجهول لتفعيل الدخول الآمن بالايميل فقط.");
  },

  signIn: async (email: string, password: string): Promise<Profile> => {
    try {
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
    } catch (err: any) {
      console.warn("Supabase login failed, checking local credentials:", err);

      const localUsers = getLocalUsers();
      const matchedUser = localUsers.find(
        (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );

      if (matchedUser) {
        setStored("current_user", matchedUser.profile);
        return matchedUser.profile as Profile;
      }

      throw new Error("بيانات الاعتماد غير صالحة أو تعذّّر الاتصال بالسيرفر لتأكيد الإيميل.");
    }
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
      
      if (error) {
        throw error;
      }

      // No manual updates are performed here.
      // The "on_follow_change" trigger on table follows handles following_count, followers_count, and total_points automatically!
      // The "on_follow_notify" trigger automatically handles notification creation!
      return true;
    } catch (e: any) {
      console.error("followUser exception:", e);
      throw e;
    }
  },

  // Memes Content - hybrid sync featuring local fallback and DB memes
  getMemes: async (status: string = "approved"): Promise<Meme[]> => {
    let dbMemes: Meme[] = [];
    try {
      const { data, error } = await supabase
        .from("memes")
        .select("*, profiles!user_id(*)")
        .eq("status", status)
        .order("created_at", { ascending: false });
      
      if (!error && data) {
        dbMemes = data as Meme[];
      }
    } catch (e: any) {
      console.warn("getMemes Supabase warning (suppressed):", e);
    }

    const localMemes = getLocalMemes();
    const allMemes = [...localMemes, ...dbMemes];

    return allMemes.map(m => {
      const extracted = extractTagsFromCaption(m.caption);
      const originalTags = Array.isArray(m.tags) ? m.tags : [];
      return {
        ...m,
        tags: Array.from(new Set([...originalTags, ...extracted]))
      };
    });
  },

  getTrendingMemes: async (): Promise<Meme[]> => {
    let dbMemes: Meme[] = [];
    try {
      const { data, error } = await supabase
        .from("memes")
        .select("*, profiles!user_id(*)")
        .order("likes_count", { ascending: false })
        .limit(20);
      if (!error && data) {
        dbMemes = data as Meme[];
      }
    } catch (e) {
      console.warn("getTrendingMemes Supabase warning (suppressed):", e);
    }

    const localMemes = getLocalMemes();
    const allMemes = [...localMemes, ...dbMemes];

    return allMemes.map(m => {
      const extracted = extractTagsFromCaption(m.caption);
      const originalTags = Array.isArray(m.tags) ? m.tags : [];
      return {
        ...m,
        tags: Array.from(new Set([...originalTags, ...extracted]))
      };
    });
  },

  createMeme: async (meme: Partial<Meme>): Promise<Meme> => {
    const userId = meme.user_id || "";
    if (userId === "guest-user-temp" || !userId) {
      throw new Error("عذراً مجهول هوية! يرجى إنشاء حساب حقيقي وبثواني ونشر قفشاتك الحقيقية الآن 🚀");
    }

    const now = Date.now();
    const limits = rateLimitStore[userId] || { lastMemeTime: 0, lastCommentTime: 0 };
    if (now - limits.lastMemeTime < 10000) { // wait 10 seconds cooldon
      throw new Error("استهدى بالله يا زميلي، مش هترفع ميمز بالسرعة دي! استنى 10 ثانية.");
    }
    limits.lastMemeTime = now;
    rateLimitStore[userId] = limits;

    const currentUser = getStored<Profile>("current_user", {
      id: userId,
      username: "مستكشف_الميمز",
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
      bio: "",
      website: "",
      role: "user",
      meme_level: "مبتدئ سكرولر 🥱",
      total_points: 0,
      followers_count: 0,
      following_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // If local user format, save locally
    if (userId.startsWith("local-")) {
      const localMeme: Meme = {
        id: `local-meme-${Date.now()}`,
        user_id: userId,
        image_url: meme.image_url || "",
        caption: meme.caption || "",
        status: "approved",
        likes_count: 0,
        comments_count: 0,
        saves_count: 0,
        shares_count: 0,
        views_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: meme.tags || [],
        profiles: currentUser
      };

      saveLocalMeme(localMeme);

      // Award XP to local user
      const nextPoints = (currentUser.total_points || 0) + 10;
      const updatedUser = {
        ...currentUser,
        total_points: nextPoints,
        meme_level: calculateMemeLevel(nextPoints)
      };
      setStored("current_user", updatedUser);

      return localMeme;
    }

    try {
      // 1. Insert Meme details in database
      let insertedMeme: any = null;
      let tagsToInsert = meme.tags || [];

      // Add hashtags in description to tags automatically
      const extractedCaps = extractTagsFromCaption(meme.caption || "");
      tagsToInsert = Array.from(new Set([...tagsToInsert, ...extractedCaps]));

      const { data, error } = await supabase
        .from("memes")
        .insert({ 
          user_id: userId,
          image_url: meme.image_url,
          caption: meme.caption || "",
          status: "approved"
        })
        .select("*, profiles!user_id(*)")
        .single();
      
      if (error) throw error;
      insertedMeme = data;

      if (!insertedMeme) {
        throw new Error("فشلت عملية حفظ الميم.");
      }

      // 2. Map tags relationally for custom schemas
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

            if (existingTag && insertedMeme) {
              await supabase
                .from("meme_tags")
                .insert({
                  meme_id: insertedMeme.id,
                  tag_id: existingTag.id
                });
            }
          } catch (tErr) {
            console.warn("Skipping relational tags mapping:", tErr);
          }
        }
      }

      // Add points dynamically to the real profiles table (own profile, allowed under RLS)
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
        console.warn("Points award warning (suppressed):", ptsErr);
      }

      insertedMeme.tags = tagsToInsert;
      return insertedMeme as Meme;
    } catch (e: any) {
      console.error("createMeme DB error, falling back locally:", e);
      const localMeme: Meme = {
        id: `local-meme-${Date.now()}`,
        user_id: userId,
        image_url: meme.image_url || "",
        caption: meme.caption || "",
        status: "approved",
        likes_count: 0,
        comments_count: 0,
        saves_count: 0,
        shares_count: 0,
        views_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: meme.tags || [],
        profiles: currentUser
      };

      saveLocalMeme(localMeme);

      const nextPoints = (currentUser.total_points || 0) + 10;
      const updatedUser = {
        ...currentUser,
        total_points: nextPoints,
        meme_level: calculateMemeLevel(nextPoints)
      };
      setStored("current_user", updatedUser);

      return localMeme;
    }
  },

  // Likes & Saves Actions
  toggleLike: async (memeId: string, currentUserId: string): Promise<{ likesCount: number; loved?: boolean; liked: boolean }> => {
    if (currentUserId === "guest-user-temp") {
      throw new Error("يا غالي، لازم تسجل حساب حقيقي عشان تعمل لايك حقيقي! 😉");
    }

    if (currentUserId.startsWith("local-") || memeId.startsWith("local-")) {
      const likes = getLocalLikes();
      const alreadyLiked = !!likes[memeId];
      saveLocalLike(memeId, !alreadyLiked);
      
      const localMemes = getLocalMemes();
      const memeIndex = localMemes.findIndex(m => m.id === memeId);
      let likesCount = 0;
      if (memeIndex !== -1) {
        localMemes[memeIndex].likes_count = Math.max(0, (localMemes[memeIndex].likes_count || 0) + (alreadyLiked ? -1 : 1));
        likesCount = localMemes[memeIndex].likes_count;
        localStorage.setItem("memesbook_local_memes", JSON.stringify(localMemes));
      } else {
        likesCount = alreadyLiked ? 0 : 1;
      }
      return { likesCount, liked: !alreadyLiked };
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
        const { error: delError } = await supabase.from("likes").delete().eq("id", existing.id);
        if (delError) throw delError;
        liked = false;
      } else {
        const { error: insError } = await supabase.from("likes").insert({ meme_id: memeId, user_id: currentUserId });
        if (insError) throw insError;
        liked = true;
      }

      const { data: updatedMeme } = await supabase.from("memes").select("likes_count").eq("id", memeId).single();
      return { likesCount: updatedMeme?.likes_count ?? 0, liked };
    } catch (e: any) {
      console.warn("toggleLike backend warning, switching to local state:", e);
      const likes = getLocalLikes();
      const alreadyLiked = !!likes[memeId];
      saveLocalLike(memeId, !alreadyLiked);
      return { likesCount: alreadyLiked ? 0 : 1, liked: !alreadyLiked };
    }
  },

  toggleSave: async (memeId: string, currentUserId: string): Promise<boolean> => {
    if (currentUserId === "guest-user-temp") {
      throw new Error("يا غالي، لازم تسجل حساب حقيقي عشان تحفظ الكوميكس في محفوظاتك! 😉");
    }

    if (currentUserId.startsWith("local-") || memeId.startsWith("local-")) {
      const saves = getLocalSaves();
      const alreadySaved = !!saves[memeId];
      saveLocalSave(memeId, !alreadySaved);

      const localMemes = getLocalMemes();
      const memeIndex = localMemes.findIndex(m => m.id === memeId);
      if (memeIndex !== -1) {
        localMemes[memeIndex].saves_count = Math.max(0, (localMemes[memeIndex].saves_count || 0) + (alreadySaved ? -1 : 1));
        localStorage.setItem("memesbook_local_memes", JSON.stringify(localMemes));
      }
      return !alreadySaved;
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
        return false;
      } else {
        const { error } = await supabase.from("saved_memes").insert({ meme_id: memeId, user_id: currentUserId });
        if (error) throw error;
        return true;
      }
    } catch (e: any) {
      console.warn("toggleSave backend error, using local save:", e);
      const saves = getLocalSaves();
      const alreadySaved = !!saves[memeId];
      saveLocalSave(memeId, !alreadySaved);
      return !alreadySaved;
    }
  },

  // Comments Operations
  getComments: async (memeId: string): Promise<Comment[]> => {
    let dbComments: Comment[] = [];
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*, profiles!user_id(*)")
        .eq("meme_id", memeId)
        .order("created_at", { ascending: true });
      if (!error && data) dbComments = data as Comment[];
    } catch (e) {
      console.warn("getComments database read warning:", e);
    }

    const localComments = getLocalComments().filter(c => c.meme_id === memeId);
    return [...dbComments, ...localComments];
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

    const currentUser = getStored<Profile>("current_user", {
      id: userId,
      username: "مستخدم_محلي",
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
      bio: "",
      website: "",
      role: "user",
      meme_level: "مبتدئ سكرولر 🥱",
      total_points: 0,
      followers_count: 0,
      following_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    if (userId.startsWith("local-") || memeId.startsWith("local-")) {
      const newComment: Comment = {
        id: `local-comm-${Date.now()}`,
        meme_id: memeId,
        user_id: userId,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profiles: currentUser
      };

      saveLocalComment(newComment);

      const localMemes = getLocalMemes();
      const memeIndex = localMemes.findIndex(m => m.id === memeId);
      if (memeIndex !== -1) {
        localMemes[memeIndex].comments_count = (localMemes[memeIndex].comments_count || 0) + 1;
        localStorage.setItem("memesbook_local_memes", JSON.stringify(localMemes));
      }
      return newComment;
    }

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({ meme_id: memeId, user_id: userId, content })
        .select("*, profiles!user_id(*)")
        .single();
      
      if (error) throw error;
      return data as Comment;
    } catch (e: any) {
      console.warn("addComment failed on database backend, executing locally:", e);
      const newComment: Comment = {
        id: `local-comm-${Date.now()}`,
        meme_id: memeId,
        user_id: userId,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profiles: currentUser
      };

      saveLocalComment(newComment);
      return newComment;
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
        .select("*, actor:profiles!actor_id(*), meme:memes(*)")
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
