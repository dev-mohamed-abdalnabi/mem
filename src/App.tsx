import React, { useState, useEffect } from "react";
import { 
  Home, Flame, Trophy, Bookmark, Cpu, 
  AlertTriangle, ShieldAlert, Sparkles, X, 
  Clock, PlusCircle, CheckCircle2, Award, 
  HelpCircle, MessageCircle, AlertCircle, Trash2, User
} from "lucide-react";

import { Profile, Meme, Notification, Report, UserRole } from "./types";
import { dataService, calculateMemeLevel } from "./services/dataService";

import Header from "./components/Header.tsx";
import Sidebar from "./components/Sidebar.tsx";
import MemeCard from "./components/MemeCard.tsx";
import MemeCreator from "./components/MemeCreator.tsx";
import Leaderboard from "./components/Leaderboard.tsx";

const initialGuestProfile: Profile = {
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

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("feed");
  const [currentUser, setCurrentUser] = useState<Profile>(initialGuestProfile);
  const [memes, setMemes] = useState<Meme[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);
  
  // Interaction and filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // New Post Widget inputs
  const [newPostImage, setNewPostImage] = useState("");
  const [newPostCaption, setNewPostCaption] = useState("");
  const [newPostTags, setNewPostTags] = useState("");
  const [postError, setPostError] = useState("");
  const [postSuccess, setPostSuccess] = useState(false);
  const [quickPostFile, setQuickPostFile] = useState<File | null>(null);

  // Supabase Authentications Modal state values
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Level Up overlay / state
  const [prevPoints, setPrevPoints] = useState(0);
  const [showLevelUpAlert, setShowLevelUpAlert] = useState(false);
  const [newLevelName, setNewLevelName] = useState("");

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const dbCurrentUser = await dataService.getCurrentUser();
      setCurrentUser(dbCurrentUser);
      setPrevPoints(dbCurrentUser.total_points);

      const dbMemes = await dataService.getMemes();
      setMemes(dbMemes);

      const dbProfiles = await dataService.getProfilesList();
      setProfiles(dbProfiles);

      const dbNotifs = await dataService.getNotifications(dbCurrentUser.id);
      setNotifications(dbNotifs);

      // Read reports
      const savedReports = localStorage.getItem("memesbook_reports_list");
      setReports(savedReports ? JSON.parse(savedReports) : []);
    } catch (e: any) {
      console.warn("Database connection initialization warning:", e);
      setDbError(e.message || "فشلت الاتصالات المباشرة بجداول Supabase. يرجى تهيئة الجداول.");
    } finally {
      setLoading(false);
    }
  };

  // Check if current user leveled up when actions occur
  const checkLevelUp = (oldPts: number, newPts: number) => {
    const getLevel = (pts: number) => {
      if (pts <= 50) return "مبتدئ سكرولر 🥱";
      if (pts <= 150) return "آكل فلافل متفاعل 🧆";
      if (pts <= 350) return "ملك التشيير واللايكات 👍";
      if (pts <= 700) return "أسطورة الكوميكس 🤩";
      if (pts <= 1500) return "بابا الميمز والممبرز 👑";
      return "إمبراطور الكوميديا الفاخرة ✨👑";
    };

    const oldLvl = getLevel(oldPts);
    const newLvl = getLevel(newPts);

    if (oldLvl !== newLvl) {
      setNewLevelName(newLvl);
      setShowLevelUpAlert(true);
    }
  };

  // Sync points inside real UI state
  const updateUserPointsInState = (addedPoints: number) => {
    const oldPts = currentUser.total_points;
    const newPts = oldPts + addedPoints;
    
    const updatedUser = {
      ...currentUser,
      total_points: newPts,
      meme_level: calculateMemeLevel(newPts)
    };

    setCurrentUser(updatedUser);
    setProfiles((prev) => prev.map(p => p.id === currentUser.id ? updatedUser : p));
    localStorage.setItem("memesbook_current_user", JSON.stringify(updatedUser));
    
    checkLevelUp(oldPts, newPts);
  };

  const handleLikeToggle = async (memeId: string) => {
    if (!memeId) {
      // Cooldown helper / refresh trigger
      loadAllData();
      return;
    }

    try {
      const { liked } = await dataService.toggleLike(memeId, currentUser.id);
      
      // Update local UI representation dynamically
      setMemes((prev) => 
        prev.map((m) => {
          if (m.id === memeId) {
            const isLiked = !m.liked_by_me;
            return {
              ...m,
              likes_count: isLiked ? m.likes_count + 1 : Math.max(0, m.likes_count - 1),
              liked_by_me: isLiked
            };
          }
          return m;
        })
      );

      // Update points in state (+5 on like for post creator)
      const targetMeme = memes.find(m => m.id === memeId);
      if (targetMeme && targetMeme.user_id === currentUser.id) {
        updateUserPointsInState(liked ? 5 : -5);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveToggle = async (memeId: string) => {
    try {
      const saved = await dataService.toggleSave(memeId, currentUser.id);
      setMemes((prev) => 
        prev.map((m) => {
          if (m.id === memeId) {
            return {
              ...m,
              saves_count: saved ? m.saves_count + 1 : Math.max(0, m.saves_count - 1),
              saved_by_me: saved
            };
          }
          return m;
        })
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleFollowToggle = async (followerId: string, followingId: string) => {
    try {
      const success = await dataService.followUser(followerId, followingId);
      if (success) {
        setFollowingIds((prev) => [...prev, followingId]);
        
        // Dynamic increments of following-counts inside profiles
        setProfiles((prev) => prev.map((p) => {
          if (p.id === followerId) return { ...p, following_count: p.following_count + 1 };
          if (p.id === followingId) return { ...p, followers_count: p.followers_count + 1, total_points: p.total_points + 10 };
          return p;
        }));

        if (currentUser.id === followerId) {
          setCurrentUser(prev => ({ ...prev, following_count: prev.following_count + 1 }));
        }

        if (currentUser.id === followingId) {
          updateUserPointsInState(10);
        }

        // Add real notification
        const followActor = profiles.find(p => p.id === followerId) || currentUser;
        const newNotif: Notification = {
          id: `notif-f-${Date.now()}`,
          recipient_id: followingId,
          actor_id: followerId,
          type: "follow",
          meme_id: null,
          content: null,
          is_read: false,
          created_at: new Date().toISOString(),
          actor: followActor
        };
        setNotifications((prev) => [newNotif, ...prev]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePublishMeme = async (caption: string, imageUrl: string, tags: string[]) => {
    try {
      const newMeme = await dataService.createMeme({
        user_id: currentUser.id,
        image_url: imageUrl,
        caption,
        tags
      });

      // Insert on the feed
      setMemes((prev) => [newMeme, ...prev]);
      updateUserPointsInState(5); // +5 Points for creating a funny meme!
    } catch (err: any) {
      throw err; // bubble up rating errors to MemeCreator
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setPostError("يا رايق حجم ملف الميم ده كبير بزيادة! الحد الأقصى هو 8 ميجابايت.");
        return;
      }
      setQuickPostFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setNewPostImage(event.target.result as string);
          setPostError("");
        }
      };
      reader.onerror = () => {
        setPostError("فشل قراءة الصورة المرفوعة.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuickPostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostImage.trim()) {
      setPostError("يا رايق، لازم ترفع صورة الميم أو تختار ملف من جهازك الأول عشان ننشرها!");
      return;
    }

    setPostError("");
    setPostSuccess(false);

    try {
      let finalImageUrl = newPostImage.trim();
      if (quickPostFile) {
        finalImageUrl = await dataService.uploadMemeFile(quickPostFile);
      }

      const splitTags = newPostTags
        .split(" ")
        .filter(t => t.startsWith("#"))
        .map(t => t.replace("#", ""));

      await handlePublishMeme(newPostCaption.trim(), finalImageUrl, splitTags);
      
      setPostSuccess(true);
      setNewPostImage("");
      setNewPostCaption("");
      setNewPostTags("");
      setQuickPostFile(null);
      
      setTimeout(() => setPostSuccess(false), 4400);
    } catch (err: any) {
      setPostError(err.message || "حدث خطأ أثناء النشر.");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");
    try {
      const profile = await dataService.signIn(authEmail, authPassword);
      setCurrentUser(profile);
      setPrevPoints(profile.total_points);
      setAuthSuccess("تم تسجيل الدخول بنجاح! نورت منصتك يا غالي 🎉");
      setAuthEmail("");
      setAuthPassword("");
      setTimeout(() => {
        setShowAuthModal(false);
        loadAllData();
      }, 1500);
    } catch (err: any) {
      setAuthError(err.message || "فشل تسجيل الدخول. تأكد من البريد والرمز السري.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUsername.trim()) {
      setAuthError("يا غالي من فضلك اكتب اسم مستخدم مميز لك!");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");
    try {
      const profile = await dataService.signUp(authEmail, authPassword, authUsername.trim());
      setCurrentUser(profile);
      setPrevPoints(profile.total_points);
      setAuthSuccess("تم إنشاء الحساب بنجاح! أهلاً بك في العائلة 😄🎉");
      setAuthEmail("");
      setAuthPassword("");
      setAuthUsername("");
      setTimeout(() => {
        setShowAuthModal(false);
        loadAllData();
      }, 1500);
    } catch (err: any) {
      setAuthError(err.message || "تعذّر إنشاء الحساب. تأكد من البيانات أو طول الرقم السري (6 رموز على الأقل).");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOutReal = async () => {
    try {
      await dataService.signOut();
      const guest: Profile = {
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
      setCurrentUser(guest);
      setPrevPoints(0);
      loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReportSubmit = (memeId: string, reason: string) => {
    // Save report to state lists
    const newReport: Report = {
      id: `report-${Date.now()}`,
      meme_id: memeId,
      reporter_id: currentUser.id,
      reason,
      status: "open",
      resolved_by: null,
      resolution_note: null,
      created_at: new Date().toISOString()
    };

    const updatedReports = [...reports, newReport];
    setReports(updatedReports);
    localStorage.setItem("memesbook_reports_list", JSON.stringify(updatedReports));
  };

  const handleShareCompleted = async (memeId: string) => {
    await dataService.recordShare(memeId);
    setMemes((prev) => 
      prev.map(m => m.id === memeId ? { ...m, shares_count: m.shares_count + 1 } : m)
    );
  };

  const handleMarkNotificationsRead = async () => {
    await dataService.markNotificationsAsRead(currentUser.id);
    setNotifications((prev) => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleUserSwitch = (newProf: Profile) => {
    setCurrentUser(newProf);
    localStorage.setItem("memesbook_current_user", JSON.stringify(newProf));
    setPrevPoints(newProf.total_points);

    // Reload specific user data
    dataService.getNotifications(newProf.id).then(notifs => setNotifications(notifs));
  };

  // Feed Filter Query calculations
  const filteredMemes = memes.filter((meme) => {
    // Filter out mock soft deleted items
    if (meme.status === "deleted" || meme.status === "rejected") return false;

    // Filter by tag if selected
    if (selectedTag) {
      const lowerTag = selectedTag.toLowerCase();
      const match = meme.tags?.some(t => t.toLowerCase() === lowerTag) || 
                    meme.caption?.toLowerCase().includes(`#${lowerTag}`);
      if (!match) return false;
    }

    // Filter by general search text (caption, tag, creator)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const userMatch = meme.profiles?.username.toLowerCase().includes(q);
      const capMatch = meme.caption?.toLowerCase().includes(q);
      const tagMatch = meme.tags?.some(t => t.toLowerCase().includes(q));
      return userMatch || capMatch || tagMatch;
    }

    return true;
  });

  const savedMemesCount = memes.filter(m => m.saved_by_me).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none pb-20 md:pb-6" dir="rtl">
      {/* Level Up Notification Banners */}
      {showLevelUpAlert && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center border border-gray-100 shadow-2xl relative">
            <button 
              onClick={() => setShowLevelUpAlert(false)}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-900 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto text-yellow-500 animate-bounce shadow">
              <Award className="w-10 h-10" />
            </div>

            <h3 className="font-extrabold text-xl text-gray-900 mt-4 leading-tight">
              ألف مبروك يا الغالي! ترقيت في مستويات الميمز 🚀🔥
            </h3>
            
            <p className="text-xs text-blue-600 font-extrabold mt-1.5 uppercase tracking-wide">
              المستوى الجديد المحقق
            </p>

            <div className="bg-blue-50 border border-blue-100 py-3 px-5 rounded-2xl inline-block mt-3 text-blue-700 font-extrabold text-lg">
              {newLevelName}
            </div>

            <p className="text-xs text-gray-500 font-semibold leading-relaxed mt-4">
              إمكانيات ميمزبوك بتفتح معاك! استمر بنشر أحلى الإفيهات عشان توصل لمستوى الأباطرة الأعلى وتقفّل اللعبة! 😎👑
            </p>

            <button
              onClick={() => setShowLevelUpAlert(false)}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-2xl text-sm shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              جاهز لتجربة الرتبة الجديدة! 👍
            </button>
          </div>
        </div>
      )}

      {/* Header bar component */}
      <Header
        currentUser={currentUser}
        notifications={notifications}
        onNavigate={(tab) => {
          setActiveTab(tab);
          setSelectedTag(null); // Clear tag filter on navigation
        }}
        onSearch={(query) => setSearchQuery(query)}
        activeTab={activeTab}
        onUserSwitch={handleUserSwitch}
        availableProfiles={profiles}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        onShowAuthModal={() => {
          setShowAuthModal(true);
          setAuthTab("signin");
          setAuthError("");
          setAuthSuccess("");
        }}
        onSignOutReal={handleSignOutReal}
        isRealUser={currentUser ? currentUser.id !== "guest-user-temp" : false}
      />

      {/* Main stage layout block */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 flex gap-6">
        {/* Right side helper columns (Meme Ministers rules & shortcuts) on desktop */}
        <div className="w-64 shrink-0 hidden lg:flex flex-col gap-6 order-3">
          {/* Top 3 Active MemeLords Widget */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-right">
            <h4 className="font-extrabold text-xs text-gray-900 flex items-center justify-end gap-1.5 mb-3">
              <span>وزراء الكوميديا والضحك 👑</span>
              <Trophy className="w-4 h-4 text-yellow-500" />
            </h4>
            
            <div className="flex flex-col gap-2.5">
              {profiles.slice(0, 3).map((prof, index) => (
                <div key={prof.id} className="flex items-center gap-2.5 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                  <div className="text-xs font-black text-gray-400 font-mono">#{index + 1}</div>
                  {prof.avatar_url ? (
                    <img
                      src={prof.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gray-200" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate leading-tight">{prof.username}</p>
                    <p className="text-[9px] text-orange-500 font-bold leading-none mt-0.5">{prof.total_points} XP</p>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => setActiveTab("leaderboard")}
              className="w-full text-center text-xs text-blue-600 font-bold hover:underline mt-4 cursor-pointer block"
            >
              عرض الترتيب الكامل للرتب
            </button>
          </div>

          {/* Golden Rules of Meme Ministry Egypt panel */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-right flex flex-col gap-3">
            <h4 className="font-extrabold text-xs text-gray-950 flex items-center justify-end gap-1.5 border-b border-gray-50 pb-2">
              <span>تعليمات معالي وزير الميمز 📜</span>
              <HelpCircle className="w-4 h-4 text-blue-500" />
            </h4>

            <ul className="text-[11px] text-gray-500 flex flex-col gap-2 font-bold leading-relaxed pr-2 list-disc list-inside">
              <li>الميمز الكرينج بتدخل فريق الإشراف في غيبوبة فنية!</li>
              <li>يرجى كتابة الكلمات بالخط العريض في استوديو الميمز.</li>
              <li>التحفيل مسموح طالما أنه في نطاق الضحك والهزار الراقي.</li>
              <li>فيوزات ميمزبوك محمية ضد الإفراط بمعدل رفع الكوميكس.</li>
            </ul>
          </div>
        </div>

        {/* Central main viewport panel: Feed items or selected tab components */}
        <div className="flex-1 max-w-full md:max-w-2xl order-2">
          {dbError && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 mb-6 text-right text-gray-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-extrabold text-amber-950 text-sm">تهيئة جداول قاعدة البيانات بـ Supabase 🛠️</h3>
                  <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                    تحذير: لم يُعثر على جداول قاعدة البيانات الحقيقية في مشروع Supabase الخاص بك. لتفعيل الحسابات ونشر ميمز وحفظ حقيقي دائم، يرجى نسخ وتشغيل الكود التالي في لوحة تحكم Supabase (SQL Editor):
                  </p>

                  {/* Copyable SQL snippet */}
                  <pre className="bg-gray-950 text-gray-100 text-[10px] font-mono leading-normal p-3.5 rounded-xl border border-gray-800 text-left overflow-x-auto mt-3 max-h-48 text-right [direction:ltr]">
{`-- 1. Create Profiles Table (Retained for Auth Users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  bio text,
  website text,
  role text default 'user',
  meme_level text default 'مبتدئ سكرولر 🥱',
  total_points integer default 0,
  followers_count integer default 0,
  following_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Create Memes Table
create table if not exists public.memes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  image_url text not null,
  caption text,
  likes_count integer default 0,
  comments_count integer default 0,
  shares_count integer default 0,
  saves_count integer default 0,
  views_count integer default 0,
  status text default 'approved',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  tags text[] default '{}'
);

-- 3. Create Comments Table
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  meme_id uuid references public.memes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Create Likes Table
create table if not exists public.likes (
  id uuid default gen_random_uuid() primary key,
  meme_id uuid references public.memes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  unique (meme_id, user_id)
);

-- 5. Create Saved Memes Table
create table if not exists public.saved_memes (
  id uuid default gen_random_uuid() primary key,
  meme_id uuid references public.memes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  unique (meme_id, user_id)
);

-- 6. Create Follows Table
create table if not exists public.follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  unique (follower_id, following_id)
);

-- 7. Create Notifications Table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  meme_id uuid references public.memes(id) on delete cascade,
  content text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);`}
                  </pre>

                  <div className="flex gap-2.5 mt-4">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  bio text,
  website text,
  role text default 'user',
  meme_level text default 'مبتدئ سكرولر 🥱',
  total_points integer default 0,
  followers_count integer default 0,
  following_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.memes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  image_url text not null,
  caption text,
  likes_count integer default 0,
  comments_count integer default 0,
  shares_count integer default 0,
  saves_count integer default 0,
  views_count integer default 0,
  status text default 'approved',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  tags text[] default '{}'
);

create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  meme_id uuid references public.memes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.likes (
  id uuid default gen_random_uuid() primary key,
  meme_id uuid references public.memes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  unique (meme_id, user_id)
);

create table if not exists public.saved_memes (
  id uuid default gen_random_uuid() primary key,
  meme_id uuid references public.memes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  unique (meme_id, user_id)
);

create table if not exists public.follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  unique (follower_id, following_id)
);

create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  meme_id uuid references public.memes(id) on delete cascade,
  content text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);`);
                        alert("تم نسخ الكود بنجاح! الصقه في الـ SQL Editor لـ Supabase وشغّله.");
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      📋 نسخ كود الـ SQL
                    </button>
                    
                    <button
                      onClick={() => loadAllData()}
                      className="bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-extrabold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      🔄 تحديث بعد تشغيل السكربت
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTag && (
            <div className="bg-blue-50 border border-blue-100 px-4 py-3 rounded-2xl text-xs sm:text-sm text-blue-700 font-extrabold flex items-center justify-between mb-4 animate-fade-in shadow-sm">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>عرض الميمز المصفاة بالهاشتاج:</span>
                <strong className="text-blue-900 bg-white border border-blue-200 px-2 py-0.5 rounded-lg">#{selectedTag}</strong>
              </span>
              <button 
                onClick={() => setSelectedTag(null)}
                className="text-blue-500 hover:text-blue-800 hover:scale-110 transition-transform p-1 rounded-full cursor-pointer"
                title="إلغاء التصفية"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === "feed" && (
            <div className="flex flex-col gap-4">
              {/* Simple Facebook-Style New Post widget */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-right flex flex-col gap-3.5">
                <div className="flex gap-3">
                  {currentUser.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.username}
                      className="w-10 h-10 rounded-xl object-cover shrink-0 border border-gray-150"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-black shrink-0">
                      U
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 font-bold">مشاركة ميم جديد فوري</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">انشر قفشة جديدة حية لتراها باقي العقول المفرفشة!</p>
                  </div>
                </div>

                <form onSubmit={handleQuickPostSubmit} className="flex flex-col gap-3">
                  {/* File Upload Selector & Preview Section */}
                  <div className="flex flex-col gap-3">
                    {!newPostImage ? (
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 hover:border-blue-500 hover:bg-blue-50/20 bg-gray-50 rounded-2xl py-6 px-4 cursor-pointer text-center transition-all group">
                        <PlusCircle className="w-8 h-8 text-blue-500 mb-2 group-hover:scale-110 transition-transform animate-pulse" />
                        <span className="text-xs font-black text-gray-800">📁 اضغط لتنزيل أو اختيار ملف ميم حقيقي من موبايلك أو جهازك</span>
                        <span className="text-[10px] text-gray-400 mt-1 font-semibold">تترفع فوراً وتظهر في الفيد الحقيقي!</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden border border-gray-100 max-h-64 bg-gray-900 flex items-center justify-center p-2">
                        <img
                          src={newPostImage}
                          alt="preview"
                          className="max-h-60 object-contain rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setNewPostImage("")}
                          className="absolute top-3 left-3 bg-red-600 hover:bg-red-700 text-white rounded-full px-3 py-1.5 shadow-lg cursor-pointer hover:scale-105 transition-all font-black text-[10px] flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>تغيير الصورة ❌</span>
                        </button>
                      </div>
                    )}

                    {/* Meta Input Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="اكتب تعليق مضحك أو إفه يكمل الصورة... 💬"
                        value={newPostCaption}
                        onChange={(e) => setNewPostCaption(e.target.value)}
                        className="bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs font-extrabold text-gray-950"
                      />
                      <input
                        type="text"
                        placeholder="هاشتاجات مرافقة: #برمجة #طالب (مسافة للفصل) 🏷️"
                        value={newPostTags}
                        onChange={(e) => setNewPostTags(e.target.value)}
                        className="bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-950"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-50">
                    <span className="text-[10px] text-gray-500 font-bold">
                       {newPostImage ? "✨ مبروك! الصورة جاهزة للبلع والنشر" : "⚠️ يرجى اختيار ملف صورة ميم أولاً"}
                    </span>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-blue-100 hover:scale-[1.03] active:scale-95"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>انشر الكوميك الحقيقي 🚀</span>
                    </button>
                  </div>
                </form>

                {postError && (
                  <p className="text-xs text-red-600 font-extrabold bg-red-50 border border-red-100 p-2 rounded-xl flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                    <span>{postError}</span>
                  </p>
                )}

                {postSuccess && (
                  <p className="text-xs text-green-700 font-black bg-green-50 border border-green-100 p-2 rounded-xl animate-fade-in flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    <span>تم النشر بنجاح زائد نقاط إضافية! فرفش الضحكة 🚀</span>
                  </p>
                )}
                
                {/* Visual helper to MemeCreator Studio */}
                <div className="pt-2 border-t border-gray-50 flex justify-end">
                  <button
                    onClick={() => setActiveTab("creator")}
                    className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>أو اصنع كارت مضحك في استوديو الميمز الاحترافي المدمج 🎨</span>
                  </button>
                </div>
              </div>

              {/* Feed Meme items render */}
              {loading ? (
                <div className="text-center py-12 text-gray-400">جاري تحميل ميم الفيد الحقيقي...</div>
              ) : filteredMemes.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-400 flex flex-col items-center gap-3">
                  <Clock className="w-10 h-10 text-gray-300 animate-spin" />
                  <p className="font-extrabold text-sm text-gray-700">مفيش ميمز تطابق استعلامك خالص!</p>
                  <p className="text-xs text-gray-400 max-w-xs">جرب ابحث بكلمات مختلفة أو انضم بنفسك واعمل أحلى ميم للأصدقاء!</p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedTag(null);
                    }}
                    className="mt-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-xl text-xs font-bold"
                  >
                    إعادة تعيين الفيد بالكامل
                  </button>
                </div>
              ) : (
                filteredMemes.map((meme) => (
                  <MemeCard
                    key={meme.id}
                    meme={meme}
                    currentUser={currentUser}
                    onLikeToggle={handleLikeToggle}
                    onSaveToggle={handleSaveToggle}
                    onFollowToggle={handleFollowToggle}
                    onTagClick={(tag) => setSelectedTag(tag)}
                    onDeleteComment={() => {
                      // Decrement comment counter locally
                      setMemes(prev => 
                        prev.map(m => m.id === meme.id ? { ...m, comments_count: Math.max(0, m.comments_count - 1) } : m)
                      );
                    }}
                    onReportSubmit={handleReportSubmit}
                    onShareCompleted={handleShareCompleted}
                    isFollowingCreator={followingIds.includes(meme.user_id)}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === "trending" && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="bg-white border border-gray-100 rounded-3xl p-5 text-right flex flex-col gap-2 mb-2">
                <span className="text-[10px] bg-red-100 border border-red-200 text-red-600 font-black px-2.5 py-1 rounded-full uppercase w-max">
                  التريند الأقوى حالياً 🔥
                </span>
                <h2 className="font-extrabold text-xl text-gray-900 mt-1">الميمز صاحبة الأعلى تفاعل</h2>
                <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                  تحتوي لوحة التريند على أعلى الميمز حصدًا لنسب التفاعل (النقاط، الشير المتكرر، المحفوظات والكومنت العريق) حسب خوارزمية الوزارة.
                </p>
              </div>

              {/* Just Reuse MemeCards sorted by trending weight */}
              {[...memes]
                .sort((a,b) => {
                  const scoreA = (a.likes_count * 10 + a.comments_count * 15 + a.shares_count * 20 + a.saves_count * 12);
                  const scoreB = (b.likes_count * 10 + b.comments_count * 15 + b.shares_count * 20 + b.saves_count * 12);
                  return scoreB - scoreA;
                })
                .map((m) => (
                  <MemeCard
                    key={m.id}
                    meme={m}
                    currentUser={currentUser}
                    onLikeToggle={handleLikeToggle}
                    onSaveToggle={handleSaveToggle}
                    onFollowToggle={handleFollowToggle}
                    onTagClick={(tag) => setSelectedTag(tag)}
                    onDeleteComment={() => {
                      setMemes(prev => 
                        prev.map(item => item.id === m.id ? { ...item, comments_count: Math.max(0, item.comments_count - 1) } : item)
                      );
                    }}
                    onReportSubmit={handleReportSubmit}
                    onShareCompleted={handleShareCompleted}
                    isFollowingCreator={followingIds.includes(m.user_id)}
                  />
                ))
              }
            </div>
          )}

          {activeTab === "creator" && (
            <MemeCreator
              currentUser={currentUser}
              onPublishMeme={handlePublishMeme}
              onNavigate={(tab) => {
                setActiveTab(tab);
                setSelectedTag(null);
              }}
            />
          )}

          {activeTab === "leaderboard" && (
            <Leaderboard
              profiles={profiles}
              currentUser={currentUser}
              onNavigate={setActiveTab}
              onFollowToggle={handleFollowToggle}
              followingIds={followingIds}
            />
          )}

          {activeTab === "saves" && (
            <div className="flex flex-col gap-4">
              <div className="bg-white border border-gray-100 rounded-3xl p-5 text-right flex flex-col gap-2">
                <span className="text-[10px] bg-orange-100 border border-orange-200 text-orange-600 font-black px-2.5 py-1 rounded-full uppercase w-max">
                  الميمز المحفوظة بالدرج 💾
                </span>
                <h2 className="font-extrabold text-xl text-gray-900 mt-1">كراسة الإحتفاظ بالضحك</h2>
                <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                  جميع الميمز والقفشات التي ضغطت عليها "حفظ الكوميكس" لتصفحها أوفلاين كمرجع سريع للضحك والهزار مع صحابك.
                </p>
              </div>

              {memes.filter(m => m.saved_by_me).length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center text-gray-400">
                  <Bookmark className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="font-extrabold text-sm text-gray-700">لم تقم بحفظ أي ميم حتى الآن يا كابتن!</p>
                  <p className="text-xs text-gray-400 mt-1">تصفح الفيد الرئيسي واضغط "حفظ الميم" لتخزينه هنا فوراً.</p>
                  <button
                    onClick={() => setActiveTab("feed")}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-xl text-xs"
                  >
                    ارجع للفيد وتصفَّح
                  </button>
                </div>
              ) : (
                memes.filter(m => m.saved_by_me).map((savedMeme) => (
                  <MemeCard
                    key={savedMeme.id}
                    meme={savedMeme}
                    currentUser={currentUser}
                    onLikeToggle={handleLikeToggle}
                    onSaveToggle={handleSaveToggle}
                    onFollowToggle={handleFollowToggle}
                    onTagClick={(tag) => setSelectedTag(tag)}
                    onDeleteComment={() => {}}
                    onReportSubmit={handleReportSubmit}
                    onShareCompleted={handleShareCompleted}
                    isFollowingCreator={followingIds.includes(savedMeme.user_id)}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === "profile" && (
            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 text-right flex flex-col gap-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-center gap-5 border-b border-gray-100 pb-6 text-center sm:text-right">
                {currentUser.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.username}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-blue-100 text-blue-600 font-extrabold flex items-center justify-center text-xl">U</div>
                )}
                
                <div className="flex-1">
                  <h2 className="font-black text-xl text-gray-900">{currentUser.username}</h2>
                  <p className="text-xs text-gray-400 font-mono mt-1">ID: {currentUser.id}</p>
                  <p className="bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-full text-xs inline-block mt-2 font-semibold">
                    الدور بالمنصة: {currentUser.role === 'admin' ? "مشرف رئيسي (كل الصلاحيات لك)" : "عضو نشط بالوزارة"}
                  </p>
                </div>
              </div>

              {/* Score indicators */}
              <div className="grid grid-cols-3 gap-3 bg-gray-50 border border-gray-100 p-4 rounded-2xl text-center">
                <div>
                  <h4 className="text-[11px] text-gray-400 font-bold">إجمالي النقاط (XP)</h4>
                  <p className="text-lg font-black text-blue-600 font-mono">{currentUser.total_points}</p>
                </div>
                <div>
                  <h4 className="text-[11px] text-gray-400 font-bold">المتابِعون</h4>
                  <p className="text-lg font-black text-gray-900 font-mono">{currentUser.followers_count}</p>
                </div>
                <div>
                  <h4 className="text-[11px] text-gray-400 font-bold">تتابعهم</h4>
                  <p className="text-lg font-black text-gray-900 font-mono">{currentUser.following_count}</p>
                </div>
              </div>

              {/* Bio & Details updates forms */}
              <div className="flex flex-col gap-3">
                <h3 className="font-extrabold text-sm text-gray-800">بيانات كارت التعريف الشخصي:</h3>
                
                <div>
                  <label className="block text-xs text-gray-500 mb-1">النبذة التعريفية (Bio)</label>
                  <textarea
                    value={currentUser.bio || "ملك الميمز السكرولر والروح الرياضية الفكاهية 🕶️"}
                    onChange={(e) => {
                      const updated = { ...currentUser, bio: e.target.value };
                      setCurrentUser(updated);
                      localStorage.setItem("memesbook_current_user", JSON.stringify(updated));
                    }}
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">رابط الموقع الشخصي (Website)</label>
                  <input
                    type="text"
                    value={currentUser.website || "memesbook.com/my-acc"}
                    onChange={(e) => {
                      const updated = { ...currentUser, website: e.target.value };
                      setCurrentUser(updated);
                      localStorage.setItem("memesbook_current_user", JSON.stringify(updated));
                    }}
                    className="w-full bg-gray-50 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              {/* User Levels Milestones details */}
              <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                <h3 className="font-extrabold text-sm text-gray-800">مستواك الحالي وتطورك بالمنصة:</h3>
                
                <div className="bg-blue-50 border border-blue-100 px-4 py-3 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-blue-500 font-bold">اسم المستوى</p>
                    <p className="font-bold text-sm text-blue-800 leading-tight mt-0.5">{currentUser.meme_level}</p>
                  </div>
                  <Award className="w-8 h-8 text-blue-600 fill-blue-100 shrink-0" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "moderation" && (
            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 text-right flex flex-col gap-5 animate-fade-in">
              <div>
                <h2 className="font-black text-xl text-gray-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span>لوحة طوارئ فحص البلاغات والكرينج</span>
                </h2>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  تظهر هنا البلاغات التي يرسلها صناع الكوميكس عن الميمز الكرينج والمكررة أو المخالفة للذوق العام، بصلاحيات الإشراف الممنوحة لك يمكنك تصفيتها فوراً.
                </p>
              </div>

              {reports.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2 animate-bounce" />
                  <p className="font-extrabold text-sm text-gray-700">لا توجد بلاغات معلقة للفرز والبلع! 🎉</p>
                  <p className="text-xs text-gray-400 mt-1">جميع الميمز الحالية ملائمة ومضمونة من وزارة مكافحة الكرينج.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {reports.map((rep) => {
                    const reportedMeme = memes.find(m => m.id === rep.meme_id);
                    return (
                      <div key={rep.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-right">
                        <div className="flex justify-between items-center bg-white p-2 rounded-xl mb-3">
                          <span className="text-[10px] text-gray-500 font-mono">رقم البلاغ: {rep.id}</span>
                          <span className="bg-red-50 border border-red-100 text-red-600 font-black text-[9px] px-2 py-0.5 rounded-full">
                            بانتظار فرز المشرف
                          </span>
                        </div>

                        <p className="text-xs text-gray-700 font-bold">
                          السبب المذكور: <span className="text-red-600">"{rep.reason}"</span>
                        </p>

                        {/* Meme Image Preview */}
                        {reportedMeme ? (
                          <div className="my-3 flex gap-3 bg-white p-2 rounded-xl border border-gray-50 items-center">
                            <img
                              src={reportedMeme.image_url}
                              alt=""
                              className="w-14 h-14 object-cover rounded-lg shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-gray-400 font-bold">كارت الميم المشتبه به:</p>
                              <p className="text-xs font-bold text-gray-800 truncate">{reportedMeme.caption || "بدون عنوان مخصص"}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-400 my-2 italic">لقد تمت إزالة أو حذف الميم بالفعل مسبقًا.</p>
                        )}

                        {/* Controls */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              // Hard dynamic delete from memes list
                              if (reportedMeme) {
                                setMemes(memes.map(m => m.id === reportedMeme.id ? { ...m, status: "deleted" } : m));
                              }
                              // Clear report
                              const updated = reports.filter(r => r.id !== rep.id);
                              setReports(updated);
                              localStorage.setItem("memesbook_reports_list", JSON.stringify(updated));
                            }}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2 text-xs font-black transition-all cursor-pointer shadow-sm shadow-red-100"
                          >
                            موافقة على البلاغ وحذف الميم
                          </button>

                          <button
                            onClick={() => {
                              // dismiss report
                              const updated = reports.filter(r => r.id !== rep.id);
                              setReports(updated);
                              localStorage.setItem("memesbook_reports_list", JSON.stringify(updated));
                            }}
                            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl py-2 text-xs font-black transition-all cursor-pointer"
                          >
                            تجاهل البلاغ وبقاء الميم كما هو
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Left panel list */}
        <Sidebar
          currentUser={currentUser}
          activeTab={activeTab}
          onNavigate={(tab) => {
            setActiveTab(tab);
            setSelectedTag(null);
          }}
          savedCount={savedMemesCount}
        />
      </main>

      {/* iOS/Android style bottom navigation bar for absolute mobile-friendly compliance */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-xl flex items-center justify-around py-3 md:hidden">
        <button
          onClick={() => {
            setActiveTab("feed");
            setSelectedTag(null);
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer w-10 ${activeTab === 'feed' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[9px] font-bold">الرئيسية</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("trending");
            setSelectedTag(null);
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer w-10 ${activeTab === 'trending' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <Flame className="w-5 h-5" />
          <span className="text-[9px] font-bold">التريند</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("creator");
            setSelectedTag(null);
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer w-10 ${activeTab === 'creator' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <Cpu className="w-5 h-5" />
          <span className="text-[9px] font-bold">مصمم ميمز</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("leaderboard");
            setSelectedTag(null);
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer w-10 ${activeTab === 'leaderboard' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <Trophy className="w-5 h-5" />
          <span className="text-[9px] font-bold">المتصدرين</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("saves");
            setSelectedTag(null);
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer w-10 ${activeTab === 'saves' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <Bookmark className="w-5 h-5" />
          <span className="text-[9px] font-bold">المحفوظات</span>
        </button>
      </nav>

      {/* Authentic Supabase Signin / Signup Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 shadow-2xl" dir="rtl">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-right border border-gray-100 shadow-2xl relative animate-fade-in">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-905 cursor-pointer pointer-events-auto p-1.5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600 mb-2">
                <User className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-lg text-gray-950">
                انضم لعشاق الضحك والكوميديا الحقيقية 🎭
              </h3>
              <p className="text-xs text-gray-400 mt-1.5">
                سجل بحساب حقيقي ومستقل في داتابيز ميمزبوك لترفع الصور الحقيقية من جهازك مباشرة وتجمع نقاط XP متزامنة مع السيرفر!
              </p>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-2xl mb-4">
              <button
                onClick={() => { setAuthTab("signin"); setAuthError(""); setAuthSuccess(""); }}
                className={`flex-1 text-center py-2 text-xs font-black rounded-xl cursor-pointer transition-all ${
                  authTab === "signin" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                تسجيل الدخول 👋
              </button>
              <button
                onClick={() => { setAuthTab("signup"); setAuthError(""); setAuthSuccess(""); }}
                className={`flex-1 text-center py-2 text-xs font-black rounded-xl cursor-pointer transition-all ${
                  authTab === "signup" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                إنشاء حساب جديد 🚀
              </button>
            </div>

            <form onSubmit={authTab === "signin" ? handleSignIn : handleSignUp} className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-extrabold text-gray-500 mb-1">البريد الإلكتروني 📧</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs text-gray-900"
                />
              </div>

              {authTab === "signup" && (
                <div>
                  <label className="block text-[11px] font-extrabold text-gray-500 mb-1">الاسم المستعار / اليوزر نيم 🎭</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: وزير_الميمز_المصري"
                    value={authUsername}
                    onChange={(e) => {
                      setAuthUsername(e.target.value.replace(/\s+/g, '_'));
                    }}
                    className="w-full bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-905"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-extrabold text-gray-500 mb-1">الرقم السري 🔒</label>
                <input
                  type="password"
                  required
                  placeholder="••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-900"
                />
              </div>

              {authError && (
                <div className="text-xs text-red-600 font-extrabold bg-red-50 border border-red-100 p-2.5 rounded-xl flex items-center gap-1.5 mt-1 leading-relaxed">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="text-xs text-green-700 font-black bg-green-50 border border-green-100 p-2.5 rounded-xl flex items-center gap-1.5 mt-1 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <span>{authSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black py-3 rounded-2xl text-xs shadow-md shadow-blue-100 cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{authTab === "signin" ? "اعتماد تسجيل الدخول 👍" : "إنشاء حسابي وتفعيل الرتبة 🚀"}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
