import { supabase } from "../supabaseClient";
import { Profile, Meme, Comment, Notification, Report, MemeTemplate } from "../types";

// Stable mock fallback data to guarantee immediate high-fidelity rendering if Supabase DB is new or slow
export const MOCK_PROFILES: Profile[] = [
  {
    id: "user1-id-1111",
    username: "كابو_الميمز_99",
    avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150",
    bio: "ملك الكوميديا السكرولر والنشاط الصباحي والمسائي 🕶️",
    website: "memesbook.com/kabo",
    role: "admin",
    meme_level: "إمبراطور الكوميديا الفاخرة 👑",
    total_points: 1540,
    followers_count: 320,
    following_count: 140,
    created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "user2-id-2222",
    username: "اللمبي_الرسمي",
    avatar_url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150",
    bio: "أنا جاي أهزر والنعمة الشريفة! 🎬",
    website: "mohamed-lemby.eg",
    role: "moderator",
    meme_level: "ملك التشيير واللايكات",
    total_points: 320,
    followers_count: 890,
    following_count: 45,
    created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "user3-id-3333",
    username: "دكتورة_ميمز",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
    bio: "بشخص الحالة بالميمز المناسبة 🩺 وكل الميمز هنا معتمدة من الوزارة",
    website: "meme-doctor.com",
    role: "user",
    meme_level: "أسطورة الكوميكس",
    total_points: 480,
    followers_count: 1500,
    following_count: 65,
    created_at: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "user4-id-4444",
    username: "مبرمج_يائس",
    avatar_url: "https://images.unsplash.com/photo-1620121692029-d088224ddc74?auto=format&fit=crop&q=80&w=150",
    bio: "الكود شغال بس مش عارف شغال إزاي. لو اشتغل متلمسوش 💻",
    website: "github.com/depressed-dev",
    role: "user",
    meme_level: "آكل فلافل متفاعل",
    total_points: 120,
    followers_count: 95,
    following_count: 12,
    created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const MOCK_MEMES: Meme[] = [
  {
    id: "meme1-id",
    user_id: "user4-id-4444",
    image_url: "https://images.unsplash.com/photo-1531747118685-ca8fa6e08806?auto=format&fit=crop&q=80&w=800", // confused face expression
    caption: "لما تكتب كود بقالك ٦ ساعات وتعدّل سطر واحد في الفولدر الغلط وتلاقيه اشتغل لوحده من غير إيرور! 🤯😂 #برمجة #طالب_هندسة",
    likes_count: 95,
    comments_count: 4,
    shares_count: 13,
    saves_count: 8,
    views_count: 1240,
    status: "approved",
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    profiles: MOCK_PROFILES[3],
    liked_by_me: false,
    saved_by_me: false,
    tags: ["برمجة", "طالب_هندسة", "شغل"]
  },
  {
    id: "meme2-id",
    user_id: "user2-id-2222",
    image_url: "https://images.unsplash.com/photo-1453227588063-bb302b62f50b?auto=format&fit=crop&q=80&w=800", // funny cat screaming
    caption: "أنا الصبح بعد ما شربت ٣ كوبايات قهوة عشان أركز في الشغل ومكتبي لسه مكركب برضه ☕🐈 #روتين_الصباح #فضفضة",
    likes_count: 142,
    comments_count: 6,
    shares_count: 24,
    saves_count: 11,
    views_count: 3200,
    status: "approved",
    created_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    profiles: MOCK_PROFILES[1],
    liked_by_me: true,
    saved_by_me: false,
    tags: ["روتين_الصباح", "فضفضة", "قطط"]
  },
  {
    id: "meme3-id",
    user_id: "user3-id-3333",
    image_url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=800", // celebration face comedy
    caption: "لما تنجح في الكويز بدرجة الرأفة والمدرس يبصلك بنظرة فخر وإعجاب ممزوجة بالصدمة والذهول! 😎🔥 #دراسة #امتحانات #مصر",
    likes_count: 325,
    comments_count: 14,
    shares_count: 52,
    saves_count: 29,
    views_count: 9800,
    status: "approved",
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    profiles: MOCK_PROFILES[2],
    liked_by_me: false,
    saved_by_me: true,
    tags: ["دراسة", "امتحانات", "مصر"]
  }
];

export const MOCK_COMMENTS: Comment[] = [
  {
    id: "comm1",
    meme_id: "meme1-id",
    user_id: "user1-id-1111",
    content: "والله كأنك بتوصف حياتي اليومية يا زميلي! الكود ده فيه سحر مش علم بكالوريوس خالص 😂🚀",
    created_at: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    profiles: MOCK_PROFILES[0]
  },
  {
    id: "comm2",
    meme_id: "meme1-id",
    user_id: "user2-id-2222",
    content: "متلمسوش بقى! لو غيرت كومنت الكود كله هيقع وهيقولك سريحة وبخرة 😂",
    created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    profiles: MOCK_PROFILES[1]
  },
  {
    id: "comm3",
    meme_id: "meme2-id",
    user_id: "user3-id-3333",
    content: "القطة في الصورة بتمثلي طاقة الغضب اليومية اللي بفرغها في زمايلي 😂🐈❤️",
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    profiles: MOCK_PROFILES[2]
  }
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "notif1",
    recipient_id: "user1-id-1111",
    actor_id: "user2-id-2222",
    type: "like",
    meme_id: "meme2-id",
    content: null,
    is_read: false,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    actor: MOCK_PROFILES[1],
    meme: MOCK_MEMES[1]
  },
  {
    id: "notif2",
    recipient_id: "user1-id-1111",
    actor_id: "user3-id-3333",
    type: "comment",
    meme_id: "meme1-id",
    content: "القطة في الصورة بتمثلي طاقة الغضب...",
    is_read: true,
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    actor: MOCK_PROFILES[2],
    meme: MOCK_MEMES[0]
  },
  {
    id: "notif3",
    recipient_id: "user1-id-1111",
    actor_id: null,
    type: "achievement",
    meme_id: null,
    content: "لقد وصلت لمستوى 'إمبراطور الكوميديا الفاخرة' بتحقيقك أكثر من 1500 نقطة! 🎉👑",
    is_read: false,
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
  }
];

// Helper to determine rank based on points
export function calculateMemeLevel(points: number): string {
  if (points <= 50) return "مبتدئ سكرولر 🥱";
  if (points <= 150) return "آكل فلافل متفاعل 🧆";
  if (points <= 350) return "ملك التشيير واللايكات 👍";
  if (points <= 700) return "أسطورة الكوميكس 🤩";
  if (points <= 1500) return "بابا الميمز والممبرز 👑";
  return "إمبراطور الكوميديا الفاخرة ✨👑";
}

// Global store for client interactions (fallback local storage)
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

// Rates stored per user ID to enforce triggers
const rateLimitStore: { [userId: string]: { lastMemeTime: number; lastCommentTime: number } } = {};

export const dataService = {
  // Authentication & Current Profile
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
          return data as Profile;
        }
      }
    } catch (e) {}

    // Local sandbox mode default user
    let defaultUser = getStored<Profile>("current_user", MOCK_PROFILES[0]);
    return defaultUser;
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
        if (!error && data) return data as Profile;
      }
    } catch (e) {}

    // Fallback Update Local
    let current = getStored<Profile>("current_user", MOCK_PROFILES[0]);
    const updated = { ...current, ...profile, updated_at: new Date().toISOString() };
    setStored("current_user", updated);
    
    // Also sync back in fallback profiles
    let profilesList = getStored<Profile[]>("profiles_list", MOCK_PROFILES);
    profilesList = profilesList.map(p => p.id === updated.id ? updated : p);
    setStored("profiles_list", profilesList);

    return updated;
  },

  getProfilesList: async (): Promise<Profile[]> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("total_points", { ascending: false });
      if (!error && data && data.length > 0) return data as Profile[];
    } catch (e) {}

    return getStored<Profile[]>("profiles_list", MOCK_PROFILES).sort((a,b) => b.total_points - a.total_points);
  },

  followUser: async (followerId: string, followingId: string): Promise<boolean> => {
    try {
      // Real database check/insert
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: followerId, following_id: followingId });
      if (!error) return true;
    } catch (e) {}

    // Fallback logic for point updates and notification creation
    let profilesList = getStored<Profile[]>("profiles_list", MOCK_PROFILES);
    let currentUser = getStored<Profile>("current_user", MOCK_PROFILES[0]);

    profilesList = profilesList.map(p => {
      if (p.id === followerId) {
        const updated = { ...p, following_count: p.following_count + 1 };
        if (p.id === currentUser.id) currentUser = updated;
        return updated;
      }
      if (p.id === followingId) {
        const newPoints = p.total_points + 10;
        const updated = {
          ...p,
          followers_count: p.followers_count + 1,
          total_points: newPoints,
          meme_level: calculateMemeLevel(newPoints)
        };
        // Trigger follow notification
        const notifs = getStored<Notification[]>("notifications_list", MOCK_NOTIFICATIONS);
        notifs.unshift({
          id: `notif-f-${Date.now()}`,
          recipient_id: followingId,
          actor_id: followerId,
          type: "follow",
          meme_id: null,
          content: null,
          is_read: false,
          created_at: new Date().toISOString(),
          actor: currentUser
        });
        setStored("notifications_list", notifs);
        return updated;
      }
      return p;
    });

    setStored("profiles_list", profilesList);
    setStored("current_user", currentUser);
    return true;
  },

  // Memes Content
  getMemes: async (status: string = "approved"): Promise<Meme[]> => {
    try {
      const { data, error } = await supabase
        .from("memes")
        .select("*, profiles(*)")
        .eq("status", status)
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) return data as Meme[];
    } catch (e) {}

    return getStored<Meme[]>("memes_list", MOCK_MEMES);
  },

  getTrendingMemes: async (): Promise<Meme[]> => {
    try {
      const { data, error } = await supabase
        .rpc("refresh_trending_memes") // Refresh materialized view
        .then(() => supabase.from("trending_memes").select("*"));
      if (!error && data && data.length > 0) return data as Meme[];
    } catch (e) {}

    // Fallback sorting trending mock
    const memes = getStored<Meme[]>("memes_list", MOCK_MEMES);
    return [...memes].sort((a, b) => {
      const scoreA = (a.likes_count * 10 + a.comments_count * 15 + a.shares_count * 20 + a.saves_count * 12);
      const scoreB = (b.likes_count * 10 + b.comments_count * 15 + b.shares_count * 20 + b.saves_count * 12);
      return scoreB - scoreA;
    });
  },

  createMeme: async (meme: Partial<Meme>): Promise<Meme> => {
    // Check Anti-spam trigger
    const now = Date.now();
    const userId = meme.user_id || "user1-id-1111";
    const limits = rateLimitStore[userId] || { lastMemeTime: 0, lastCommentTime: 0 };
    if (now - limits.lastMemeTime < 30000) {
      throw new Error("استهدى بالله يا زميلي، مش هترفع ميمز بالسرعة دي! استنى 30 ثانية.");
    }
    limits.lastMemeTime = now;
    rateLimitStore[userId] = limits;

    const newMeme: Meme = {
      id: `meme-${Date.now()}`,
      user_id: userId,
      image_url: meme.image_url || "https://images.unsplash.com/photo-1531747118685-ca8fa6e08806",
      caption: meme.caption || "",
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      saves_count: 0,
      views_count: 1,
      status: "approved", // auto approved for development preview easy use
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: meme.tags || []
    };

    try {
      const { data, error } = await supabase
        .from("memes")
        .insert({ ...meme, status: "approved" })
        .select("*, profiles(*)")
        .single();
      if (!error && data) return data as Meme;
    } catch (e) {}

    // Fallback store list
    const currentList = getStored<Meme[]>("memes_list", MOCK_MEMES);
    const currentUser = getStored<Profile>("current_user", MOCK_PROFILES[0]);
    newMeme.profiles = currentUser;
    currentList.unshift(newMeme);
    setStored("memes_list", currentList);

    return newMeme;
  },

  // Likes & Saves Actions
  toggleLike: async (memeId: string, currentUserId: string): Promise<{ likesCount: number; liked: boolean }> => {
    try {
      // Check if liked already
      const { data: existing } = await supabase
        .from("likes")
        .select("*")
        .eq("meme_id", memeId)
        .eq("user_id", currentUserId)
        .single();

      if (existing) {
        await supabase.from("likes").delete().eq("id", existing.id);
        const { data: updatedMeme } = await supabase.from("memes").select("likes_count").eq("id", memeId).single();
        return { likesCount: updatedMeme?.likes_count || 0, liked: false };
      } else {
        await supabase.from("likes").insert({ meme_id: memeId, user_id: currentUserId });
        const { data: updatedMeme } = await supabase.from("memes").select("likes_count").eq("id", memeId).single();
        return { likesCount: updatedMeme?.likes_count || 0, liked: true };
      }
    } catch (e) {}

    // Fallback store Likes
    let list = getStored<Meme[]>("memes_list", MOCK_MEMES);
    let target = list.find(m => m.id === memeId);
    let liked = false;
    
    if (target) {
      if (target.liked_by_me) {
        target.likes_count = Math.max(0, target.likes_count - 1);
        target.liked_by_me = false;
        liked = false;
      } else {
        target.likes_count += 1;
        target.liked_by_me = true;
        liked = true;

        // Trigger Points & Notification Fallback
        let profilesList = getStored<Profile[]>("profiles_list", MOCK_PROFILES);
        profilesList = profilesList.map(p => {
          if (p.id === target?.user_id) {
            const addedPoints = p.total_points + 5;
            return { ...p, total_points: addedPoints, meme_level: calculateMemeLevel(addedPoints) };
          }
          return p;
        });
        setStored("profiles_list", profilesList);

        // Sync Current User points if creator is current
        let currentUser = getStored<Profile>("current_user", MOCK_PROFILES[0]);
        if (currentUser.id === target.user_id) {
          currentUser.total_points += 5;
          currentUser.meme_level = calculateMemeLevel(currentUser.total_points);
          setStored("current_user", currentUser);
        }

        // Add Notification
        if (target.user_id !== currentUserId) {
          const notifications = getStored<Notification[]>("notifications_list", MOCK_NOTIFICATIONS);
          notifications.unshift({
            id: `notif-l-${Date.now()}`,
            recipient_id: target.user_id,
            actor_id: currentUserId,
            type: "like",
            meme_id: target.id,
            content: null,
            is_read: false,
            created_at: new Date().toISOString(),
            actor: currentUser,
            meme: target
          });
          setStored("notifications_list", notifications);
        }
      }
      setStored("memes_list", list);
    }
    return { likesCount: target?.likes_count || 0, liked };
  },

  toggleSave: async (memeId: string, currentUserId: string): Promise<boolean> => {
    try {
      const { data: existing } = await supabase
        .from("saved_memes")
        .select("*")
        .eq("meme_id", memeId)
        .eq("user_id", currentUserId)
        .single();
      
      if (existing) {
        await supabase.from("saved_memes").delete().eq("meme_id", memeId).eq("user_id", currentUserId);
        return false;
      } else {
        await supabase.from("saved_memes").insert({ meme_id: memeId, user_id: currentUserId });
        return true;
      }
    } catch (e) {}

    // Fallback store Saved State
    let list = getStored<Meme[]>("memes_list", MOCK_MEMES);
    let target = list.find(m => m.id === memeId);
    let saved = false;

    if (target) {
      if (target.saved_by_me) {
        target.saves_count = Math.max(0, target.saves_count - 1);
        target.saved_by_me = false;
        saved = false;
      } else {
        target.saves_count += 1;
        target.saved_by_me = true;
        saved = true;
      }
      setStored("memes_list", list);
    }
    return saved;
  },

  // Comments Operations
  getComments: async (memeId: string): Promise<Comment[]> => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*, profiles(*)")
        .eq("meme_id", memeId)
        .order("created_at", { ascending: true });
      if (!error && data && data.length > 0) return data as Comment[];
    } catch (e) {}

    const comments = getStored<Comment[]>("comments_list", MOCK_COMMENTS);
    return comments.filter(c => c.meme_id === memeId);
  },

  addComment: async (memeId: string, userId: string, content: string): Promise<Comment> => {
    // Check Anti-spam trigger
    const now = Date.now();
    const limits = rateLimitStore[userId] || { lastMemeTime: 0, lastCommentTime: 0 };
    if (now - limits.lastCommentTime < 10000) {
      throw new Error("براحة على الكيبورد! استنى 10 ثواني بين كل كومنت والتاني.");
    }
    limits.lastCommentTime = now;
    rateLimitStore[userId] = limits;

    const newComment: Comment = {
      id: `comm-${Date.now()}`,
      meme_id: memeId,
      user_id: userId,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({ meme_id: memeId, user_id: userId, content })
        .select("*, profiles(*)")
        .single();
      if (!error && data) return data as Comment;
    } catch (e) {}

    // Fallback Store Comment and increment meme counter
    const list = getStored<Comment[]>("comments_list", MOCK_COMMENTS);
    const currentUser = getStored<Profile>("current_user", MOCK_PROFILES[0]);
    newComment.profiles = currentUser;
    list.push(newComment);
    setStored("comments_list", list);

    // Increment Meme comments counter and points
    let memesList = getStored<Meme[]>("memes_list", MOCK_MEMES);
    let targetMeme = memesList.find(m => m.id === memeId);
    if (targetMeme) {
      targetMeme.comments_count += 1;
      setStored("memes_list", memesList);

      // Trigger Points (+2 for Creator)
      let profilesList = getStored<Profile[]>("profiles_list", MOCK_PROFILES);
      profilesList = profilesList.map(p => {
        if (p.id === targetMeme?.user_id) {
          const addedPoints = p.total_points + 2;
          return { ...p, total_points: addedPoints, meme_level: calculateMemeLevel(addedPoints) };
        }
        return p;
      });
      setStored("profiles_list", profilesList);

      // Current User points alignment
      let currentProf = getStored<Profile>("current_user", MOCK_PROFILES[0]);
      if (currentProf.id === targetMeme.user_id) {
        currentProf.total_points += 2;
        currentProf.meme_level = calculateMemeLevel(currentProf.total_points);
        setStored("current_user", currentProf);
      }

      // Notification
      if (targetMeme.user_id !== userId) {
        const notifications = getStored<Notification[]>("notifications_list", MOCK_NOTIFICATIONS);
        notifications.unshift({
          id: `notif-c-${Date.now()}`,
          recipient_id: targetMeme.user_id,
          actor_id: userId,
          type: "comment",
          meme_id: targetMeme.id,
          content: content.substring(0, 50),
          is_read: false,
          created_at: new Date().toISOString(),
          actor: currentUser,
          meme: targetMeme
        });
        setStored("notifications_list", notifications);
      }
    }

    return newComment;
  },

  deleteComment: async (commentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (!error) return true;
    } catch (e) {}

    let comments = getStored<Comment[]>("comments_list", MOCK_COMMENTS);
    comments = comments.filter(c => c.id !== commentId);
    setStored("comments_list", comments);
    return true;
  },

  // Share count tracking
  recordShare: async (memeId: string): Promise<number> => {
    try {
      const { data } = await supabase.rpc("increment_shares", { target_meme_id: memeId });
      if (data) return data;
    } catch (e) {}

    let list = getStored<Meme[]>("memes_list", MOCK_MEMES);
    let target = list.find(m => m.id === memeId);
    if (target) {
      target.shares_count += 1;
      setStored("memes_list", list);
      return target.shares_count;
    }
    return 0;
  },

  // View count tracking
  recordView: async (memeId: string): Promise<void> => {
    try {
      await supabase.rpc("increment_views", { target_meme_id: memeId });
    } catch (e) {}

    let list = getStored<Meme[]>("memes_list", MOCK_MEMES);
    let target = list.find(m => m.id === memeId);
    if (target) {
      target.views_count += 1;
      setStored("memes_list", list);
    }
  },

  // Reports Table Insertion
  submitReport: async (memeId: string, reporterId: string, reason: string): Promise<Report> => {
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

    try {
      const { data, error } = await supabase
        .from("reports")
        .insert({ meme_id: memeId, reporter_id: reporterId, reason })
        .select()
        .single();
      if (!error && data) return data as Report;
    } catch (e) {}

    const reportList = getStored<Report[]>("reports_list", []);
    reportList.push(report);
    setStored("reports_list", reportList);
    return report;
  },

  // Notifications List
  getNotifications: async (recipientId: string): Promise<Notification[]> => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*, actor:profiles(*), meme:memes(*)")
        .eq("recipient_id", recipientId)
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) return data as Notification[];
    } catch (e) {}

    const list = getStored<Notification[]>("notifications_list", MOCK_NOTIFICATIONS);
    return list.filter(n => n.recipient_id === recipientId);
  },

  markNotificationsAsRead: async (recipientId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", recipientId);
      if (!error) return true;
    } catch (e) {}

    let list = getStored<Notification[]>("notifications_list", MOCK_NOTIFICATIONS);
    list = list.map(n => n.recipient_id === recipientId ? { ...n, is_read: true } : n);
    setStored("notifications_list", list);
    return true;
  }
};
