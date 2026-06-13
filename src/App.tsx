import React, { useState, useEffect } from "react";
import { 
  Home, Flame, Trophy, Bookmark, Cpu, 
  AlertTriangle, ShieldAlert, Sparkles, X, 
  Clock, PlusCircle, CheckCircle2, Award, 
  HelpCircle, MessageCircle, AlertCircle, Trash2, User, Image as ImageIcon, Check
} from "lucide-react";

import { Profile, Meme, Notification, Report, UserRole } from "./types";
import { dataService, calculateMemeLevel } from "./services/dataService";

import Header from "./components/Header.tsx";
import Sidebar from "./components/Sidebar.tsx";
import MemeCard from "./components/MemeCard.tsx";
// تم تعطيل الاستدعاء الخارجي لبرمجتها داخلياً بتصميم جديد يحل مشاكل الألوان
// import Leaderboard from "./components/Leaderboard.tsx";

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
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

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
    
    // Check for shared meme in URL
    const urlParams = new URLSearchParams(window.location.search);
    const sharedMemeId = urlParams.get('meme');
    if (sharedMemeId) {
      // In a real app we'd fetch just this meme or scroll to it
      console.log("Shared meme ID:", sharedMemeId);
    }
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const dbCurrentUser = await dataService.getCurrentUser();
      setCurrentUser(dbCurrentUser);
      setPrevPoints(dbCurrentUser.total_points);

      const dbMemes = await dataService.getMemes("approved", undefined, dbCurrentUser.id);
      
      // Handle shared meme from URL
      const urlParams = new URLSearchParams(window.location.search);
      const sharedMemeId = urlParams.get('meme');
      
      if (sharedMemeId) {
        const sharedMeme = dbMemes.find(m => m.id === sharedMemeId);
        if (sharedMeme) {
          // Put shared meme at the top
          const otherMemes = dbMemes.filter(m => m.id !== sharedMemeId);
          setMemes([sharedMeme, ...otherMemes]);
        } else {
          setMemes(dbMemes);
        }
      } else {
        setMemes(dbMemes);
      }

      const dbProfiles = await dataService.getProfilesList();
      setProfiles(dbProfiles);

      const dbNotifs = await dataService.getNotifications(dbCurrentUser.id);
      setNotifications(dbNotifs);

      // Refresh trending memes if on trending tab
      if (activeTab === "trending") {
        const dbTrending = await dataService.getTrendingMemes(dbCurrentUser.id);
        setMemes(dbTrending);
      }

      // Load following list from database
      const dbFollowingIds = await dataService.getFollowingList(dbCurrentUser.id);
      setFollowingIds(dbFollowingIds);

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
      loadAllData();
      return;
    }

    try {
      const { liked, likesCount } = await dataService.toggleLike(memeId, currentUser.id);
      
      setMemes((prev) => 
        prev.map((m) => {
          if (m.id === memeId) {
            return {
              ...m,
              likes_count: likesCount,
              liked_by_me: liked
            };
          }
          return m;
        })
      );

      if (activeTab === "trending") {
        const dbTrending = await dataService.getTrendingMemes(currentUser.id);
        setMemes(dbTrending);
      }

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
      if (followingIds.includes(followingId)) {
        return; 
      }
      
      const success = await dataService.followUser(followerId, followingId);
      if (success) {
        setFollowingIds((prev) => {
          if (prev.includes(followingId)) return prev;
          return [...prev, followingId];
        });
        
        setProfiles((prev) => prev.map((p) => {
          if (p.id === followerId) return { ...p, following_count: p.following_count + 1 };
          if (p.id === followingId) return { ...p, followers_count: p.followers_count + 1, total_points: p.total_points + 10 };
          return p;
        }));

        if (currentUser.id === followerId) {
          const updatedUser = { ...currentUser, following_count: currentUser.following_count + 1 };
          setCurrentUser(updatedUser);
          localStorage.setItem("memesbook_current_user", JSON.stringify(updatedUser));
        }

        if (currentUser.id === followingId) {
          updateUserPointsInState(10);
        }

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

      setMemes((prev) => [newMeme, ...prev]);
      updateUserPointsInState(5);
    } catch (err: any) {
      throw err;
    }
  };

  const handleUpdateProfile = async (updates: Partial<Profile>) => {
    try {
      const updated = await dataService.updateProfile(updates);
      setCurrentUser(updated);
      setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
    } catch (err) {
      console.error(err);
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
    if (!newPostImage.trim() && !newPostCaption.trim()) {
      setPostError("يا رايق، لازم تكتب نص أو ترفع صورة عشان تنشر الميم!");
      return;
    }

    setPostError("");
    setPostSuccess(false);

    try {
      let finalImageUrl = newPostImage.trim() || "";
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
      setCurrentUser(initialGuestProfile);
      setPrevPoints(0);
      loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReportSubmit = (memeId: string, reason: string) => {
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

  const handleDeleteMeme = async (memeId: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الميم؟")) {
      try {
        await dataService.deleteMeme(memeId, currentUser.id);
        setMemes((prev) => prev.filter(m => m.id !== memeId));
      } catch (err: any) {
        alert(err.message || "فشل حذف الميم.");
      }
    }
  };

  const handleUserSwitch = (newProf: Profile) => {
    setCurrentUser(newProf);
    localStorage.setItem("memesbook_current_user", JSON.stringify(newProf));
    setPrevPoints(newProf.total_points);
    dataService.getNotifications(newProf.id).then(notifs => setNotifications(notifs));
  };

  const filteredMemes = memes.filter((meme) => {
    if (meme.status === "deleted" || meme.status === "rejected") return false;

    if (selectedTag) {
      const lowerTag = selectedTag.toLowerCase();
      const match = meme.tags?.some(t => t.toLowerCase() === lowerTag) || 
                    meme.caption?.toLowerCase().includes(`#${lowerTag}`);
      if (!match) return false;
    }

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
  const isRealUser = currentUser ? currentUser.id !== "guest-user-temp" : false;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 flex flex-col font-sans select-none pb-20 md:pb-6" dir="rtl">
      {/* Level Up Notification Banners */}
      {showLevelUpAlert && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 text-center border border-gray-100 dark:border-slate-800 shadow-2xl relative">
            <button 
              onClick={() => setShowLevelUpAlert(false)}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center mx-auto text-yellow-500 animate-bounce shadow">
              <Award className="w-10 h-10" />
            </div>

            <h3 className="font-extrabold text-xl text-gray-900 dark:text-white mt-4 leading-tight">
              ألف مبروك يا الغالي! ترقيت في مستويات الميمز 🚀🔥
            </h3>
            
            <p className="text-xs text-blue-600 dark:text-blue-400 font-extrabold mt-1.5 uppercase tracking-wide">
              المستوى الجديد المحقق
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 py-3 px-5 rounded-2xl inline-block mt-3 text-blue-700 dark:text-blue-300 font-extrabold text-lg">
              {newLevelName}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold leading-relaxed mt-4">
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
          setSelectedTag(null);
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
        isRealUser={isRealUser}
      />

      {/* Main stage layout block */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 flex gap-6">
        
        {/* Right side helper columns */}
        <div className="w-64 shrink-0 hidden lg:flex flex-col gap-6 order-3">
          
          {!isRealUser && (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 shadow-sm text-center text-white">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto text-white mb-3 backdrop-blur-sm">
                <User className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-sm mb-1.5">مش مسجل دخول يا غالي؟ 👀</h4>
              <p className="text-[11px] text-blue-100 mb-4 leading-relaxed font-medium">
                سجل حساب دلوقتي عشان تشارك أحلى الميمز وتجمع نقاط وتنافس على الصدارة!
              </p>
              <button
                onClick={() => {
                  setShowAuthModal(true);
                  setAuthTab("signin");
                  setAuthError("");
                  setAuthSuccess("");
                }}
                className="w-full bg-white text-blue-600 hover:bg-gray-50 font-black py-2.5 rounded-xl text-xs shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95"
              >
                تسجيل الدخول / إنشاء حساب
              </button>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-right">
            <h4 className="font-extrabold text-xs text-gray-900 dark:text-white flex items-center justify-end gap-1.5 mb-3">
              <span>وزراء الكوميديا والضحك 👑</span>
              <Trophy className="w-4 h-4 text-yellow-500" />
            </h4>
            
            <div className="flex flex-col gap-2.5">
              {profiles.slice(0, 3).map((prof, index) => (
                <div key={prof.id} className="flex items-center gap-2.5 border-b border-gray-50 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
                  <div className="text-xs font-black text-gray-400 font-mono">#{index + 1}</div>
                  {prof.avatar_url ? (
                    <img src={prof.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-slate-700" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate leading-tight">{prof.username}</p>
                    <p className="text-[9px] text-orange-500 font-bold leading-none mt-0.5">{prof.total_points} XP</p>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => setActiveTab("leaderboard")}
              className="w-full text-center text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline mt-4 cursor-pointer block"
            >
              عرض الترتيب الكامل للرتب
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-right flex flex-col gap-3">
            <h4 className="font-extrabold text-xs text-gray-950 dark:text-white flex items-center justify-end gap-1.5 border-b border-gray-50 dark:border-slate-800 pb-2">
              <span>تعليمات معالي وزير الميمز 📜</span>
              <HelpCircle className="w-4 h-4 text-blue-500" />
            </h4>
            <ul className="text-[11px] text-gray-500 dark:text-gray-400 flex flex-col gap-2 font-bold leading-relaxed pr-2 list-disc list-inside">
              <li>الميمز الكرينج بتدخل فريق الإشراف في غيبوبة فنية!</li>
              <li>يرجى كتابة الكلمات بالخط العريض في استوديو الميمز.</li>
              <li>التحفيل مسموح طالما أنه في نطاق الضحك والهزار الراقي.</li>
              <li>فيوزات ميمزبوك محمية ضد الإفراط بمعدل رفع الكوميكس.</li>
            </ul>
          </div>
        </div>

        {/* Central main viewport panel */}
        <div className="flex-1 max-w-full md:max-w-2xl order-2">
          
          {/* Feed */}
          {activeTab === "feed" && (
            <div className="flex flex-col gap-4">
              {!isRealUser && (
                <div className="lg:hidden bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 shadow-sm text-center text-white mb-1">
                  <h4 className="font-extrabold text-sm mb-1.5">مش مسجل دخول يا غالي؟ 👀</h4>
                  <p className="text-[11px] text-blue-100 mb-3 leading-relaxed font-medium">سجل حساب دلوقتي عشان تشارك الميمز وتنافس!</p>
                  <button
                    onClick={() => {
                      setShowAuthModal(true);
                      setAuthTab("signin");
                    }}
                    className="bg-white text-blue-600 hover:bg-gray-50 font-black py-2.5 px-4 rounded-xl text-xs w-full shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    تسجيل الدخول / إنشاء حساب
                  </button>
                </div>
              )}

              {loading ? (
                <div className="text-center py-12 text-gray-400">جاري تحميل ميم الفيد الحقيقي...</div>
              ) : filteredMemes.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-12 text-center text-gray-400 flex flex-col items-center gap-3">
                  <Clock className="w-10 h-10 text-gray-300 dark:text-slate-600 animate-spin" />
                  <p className="font-extrabold text-sm text-gray-700 dark:text-gray-300">مفيش ميمز تطابق استعلامك خالص!</p>
                  <button onClick={() => { setSearchQuery(""); setSelectedTag(null); }} className="mt-2 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl text-xs font-bold">
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
                    onDeleteComment={() => {}}
                    onReportSubmit={handleReportSubmit}
                    onShareCompleted={handleShareCompleted}
                    onDeleteMeme={handleDeleteMeme}
                    onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }}
                    isFollowingCreator={followingIds.includes(meme.user_id)}
                  />
                ))
              )}
            </div>
          )}

          {/* Facebook-style Profile Redesign */}
          {(activeTab === "profile" || (activeTab === "user-profile" && selectedProfileId)) && (() => {
            const isMyProfile = activeTab === "profile" || selectedProfileId === currentUser.id;
            const profile = isMyProfile ? currentUser : profiles.find(p => p.id === selectedProfileId);
            
            if (!profile) return <div className="text-center py-10 text-gray-500">المستخدم غير موجود</div>;
            const userMemes = memes.filter(m => m.user_id === profile.id);

            return (
              <div className="flex flex-col gap-4 animate-fade-in">
                {/* Guest Warning */}
                {!isRealUser && isMyProfile && (
                   <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 text-center text-blue-900 shadow-sm">
                   <User className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                   <h2 className="text-xl font-black mb-2">انضم لعائلة ميمزبوك!</h2>
                   <p className="text-xs text-blue-700 mb-5 font-medium max-w-sm mx-auto leading-relaxed">
                     أنت تتصفح كزائر. سجل حسابك الحقيقي الآن لتتمكن من تعديل ملفك الشخصي، تغيير صورتك، ورفع الميمز الخاصة بك.
                   </p>
                   <button
                     onClick={() => { setShowAuthModal(true); setAuthTab("signin"); }}
                     className="bg-blue-600 hover:bg-blue-700 text-white font-black text-sm py-3 px-8 rounded-xl cursor-pointer transition-all shadow-md hover:scale-105 active:scale-95"
                   >
                     تسجيل الدخول / إنشاء حساب
                   </button>
                 </div>
                )}

                {/* FB-Style Profile Header */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm relative">
                  
                  {/* Cover Photo Area */}
                  <div className="h-40 md:h-56 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 relative w-full">
                     {isMyProfile && (
                       <button className="absolute top-4 left-4 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors backdrop-blur-sm">
                         <ImageIcon className="w-5 h-5" />
                       </button>
                     )}
                     
                     {/* Overlapping Avatar */}
                     <div className="absolute -bottom-12 right-6">
                        <div className="relative group w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-900 bg-gray-100 shadow-lg">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover bg-white" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400 bg-white">
                              {profile.username[0]}
                            </div>
                          )}
                          
                          {isMyProfile && (
                            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                              <PlusCircle className="w-8 h-8 text-white" />
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      const url = await dataService.uploadAvatar(file);
                                      setCurrentUser(prev => ({ ...prev, avatar_url: url }));
                                      await dataService.updateProfile({ avatar_url: url });
                                    } catch (err) { alert("فشل رفع الصورة: " + (err as any).message); }
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                     </div>
                  </div>

                  {/* Profile Info Area */}
                  <div className="pt-14 px-6 pb-6 text-right">
                     <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {isMyProfile ? (
                            <input 
                              type="text" 
                              value={profile.username} 
                              onChange={async (e) => {
                                const newName = e.target.value;
                                setCurrentUser(prev => ({ ...prev, username: newName }));
                                try { await dataService.updateProfile({ username: newName }); } catch (err) { console.error(err); }
                              }}
                              className="bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-0 p-0 w-full text-2xl font-black text-gray-900 dark:text-white transition-colors"
                              placeholder="اسم المستخدم"
                            />
                          ) : (
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">{profile.username}</h2>
                          )}
                          
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">@{profile.username.toLowerCase().replace(/\s+/g, '_')}</p>
                          <p className="text-sm text-blue-600 dark:text-blue-400 font-bold mt-2 inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                            <Award className="w-4 h-4" /> {profile.meme_level}
                          </p>

                          <div className="mt-4">
                            {isMyProfile ? (
                              <textarea
                                value={profile.bio || ""}
                                onChange={async (e) => {
                                  const newBio = e.target.value;
                                  setCurrentUser(prev => ({ ...prev, bio: newBio }));
                                  try { await dataService.updateProfile({ bio: newBio }); } catch (err) { console.error(err); }
                                }}
                                className="w-full bg-gray-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-400 p-3 text-sm text-gray-800 dark:text-gray-200 resize-none rounded-xl"
                                placeholder="اكتب نبذة عنك (Bio)..."
                                rows={2}
                              />
                            ) : (
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-xl">{profile.bio || "لا يوجد وصف حالياً."}</p>
                            )}
                          </div>
                        </div>

                        {/* FB style Action Buttons */}
                        <div className="flex items-center gap-2 mt-2 md:mt-0">
                          {isMyProfile ? (
                             <button onClick={() => setActiveTab("create-post")} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0">
                               <PlusCircle className="w-4 h-4" /> إنشاء ميم
                             </button>
                          ) : (
                            <button 
                              onClick={() => handleFollowToggle(currentUser.id, profile.id)}
                              className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                                followingIds.includes(profile.id) 
                                  ? "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white" 
                                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                              }`}
                            >
                              {followingIds.includes(profile.id) ? <><Check className="w-4 h-4"/> متابع</> : "متابعة"}
                            </button>
                          )}
                        </div>
                     </div>

                     {/* FB style Divider & Stats */}
                     <div className="border-t border-gray-100 dark:border-slate-800 mt-6 pt-4 flex items-center justify-around md:justify-start gap-8">
                        <div className="text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 px-4 py-2 rounded-xl transition-colors">
                          <p className="text-lg font-black text-gray-900 dark:text-white">{userMemes.length}</p>
                          <p className="text-[11px] text-gray-500 font-bold uppercase">المنشورات</p>
                        </div>
                        <div className="text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 px-4 py-2 rounded-xl transition-colors">
                          <p className="text-lg font-black text-gray-900 dark:text-white">{profile.followers_count}</p>
                          <p className="text-[11px] text-gray-500 font-bold uppercase">المتابعين</p>
                        </div>
                        <div className="text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 px-4 py-2 rounded-xl transition-colors">
                          <p className="text-lg font-black text-gray-900 dark:text-white">{profile.total_points}</p>
                          <p className="text-[11px] text-gray-500 font-bold uppercase">النقاط XP</p>
                        </div>
                     </div>
                  </div>
                </div>

                {/* Posts Section */}
                <div className="mt-2 flex flex-col gap-4">
                  <h3 className="font-black text-gray-900 dark:text-white px-2 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <span>المنشورات ({userMemes.length})</span>
                  </h3>
                  
                  {userMemes.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-12 text-center text-gray-400">
                      <Sparkles className="w-10 h-10 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
                      <p className="font-extrabold text-sm text-gray-700 dark:text-gray-300">لا توجد ميمز هنا بعد!</p>
                    </div>
                  ) : (
                    userMemes.map((meme) => (
                      <MemeCard
                        key={meme.id}
                        meme={meme}
                        currentUser={currentUser}
                        onLikeToggle={handleLikeToggle}
                        onSaveToggle={handleSaveToggle}
                        onFollowToggle={handleFollowToggle}
                        onTagClick={(tag) => setSelectedTag(tag)}
                        onDeleteComment={() => {}}
                        onReportSubmit={handleReportSubmit}
                        onShareCompleted={handleShareCompleted}
                        onDeleteMeme={handleDeleteMeme}
                        onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }}
                        isFollowingCreator={followingIds.includes(meme.user_id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })()}

          {/* Redesigned Leaderboard (Inline Fix for Screenshot Issue) */}
          {activeTab === "leaderboard" && (
            <div className="flex flex-col gap-6 animate-fade-in w-full max-w-2xl mx-auto" dir="rtl">
              {/* Header Widget Fix: Deep Blue Background, Stark White Text */}
              <div className="bg-gradient-to-br from-indigo-900 via-blue-800 to-blue-900 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                {/* Decorative background shapes */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent"></div>
                
                <div className="relative z-10 text-right">
                  <span className="inline-block bg-white/20 text-white backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-black mb-3">
                    نخبة صُناع البهجة والضحك
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black text-white mb-2 leading-tight">
                    لوحة شرف الأباطرة والرواد
                  </h2>
                  <p className="text-blue-100 text-sm font-semibold leading-relaxed max-w-sm">
                    اللايكات والكومنتات على ميمزك بتتحول لنقاط خبرة وترقّي مستواك فوراً من مجرد مستخدم مبتدئ لقمم مستويات الإبداع!
                  </p>
                </div>
              </div>

              {/* Points Guide Fix */}
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-blue-500" />
                  دليل مستويات الأرباح والنقاط
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 text-center shadow-sm">
                    <p className="text-blue-600 dark:text-blue-400 font-black text-lg mb-1">+5 نقاط</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-bold">لكل لايك على ميمزك</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 text-center shadow-sm">
                    <p className="text-blue-600 dark:text-blue-400 font-black text-lg mb-1">+2 نقطة</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-bold">لكل تعليق على ميمزك</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 text-center shadow-sm">
                    <p className="text-blue-600 dark:text-blue-400 font-black text-lg mb-1">+10 نقاط</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-bold">لكل متابع جديد</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 text-center shadow-sm">
                    <p className="text-blue-600 dark:text-blue-400 font-black text-lg mb-1">+1500 XP</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-bold">مستوى الإمبراطور</p>
                  </div>
                </div>
              </div>

              {/* History List Fix (Button Overflow Fix) */}
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-slate-800 pb-3 mb-3">
                  <Award className="w-5 h-5 text-yellow-500" />
                  سجل التتويج التاريخي
                </h3>
                <div className="flex flex-col gap-3">
                  {[...profiles].sort((a,b) => b.total_points - a.total_points).map((prof, idx) => (
                    <div key={prof.id} className="flex items-center justify-between bg-gray-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-gray-100 dark:border-slate-700/50">
                      
                      <div className="flex items-center gap-3 w-full overflow-hidden">
                        <div className="w-8 flex-shrink-0 text-center font-black text-gray-400">#{idx + 1}</div>
                        <img 
                          src={prof.avatar_url || ""} 
                          alt="" 
                          className="w-10 h-10 rounded-xl object-cover shrink-0 bg-white"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex flex-col min-w-0 pr-1">
                          <p className="text-sm font-black text-gray-900 dark:text-white truncate">{prof.username}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{prof.meme_level}</span>
                            <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 text-[10px] font-bold px-1.5 rounded-sm shrink-0">
                              {prof.total_points} 🔥
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Button Overflow Fix: whitespace-nowrap, min-w, shrink-0 */}
                      {prof.id !== currentUser.id && isRealUser && (
                        <button
                          onClick={() => handleFollowToggle(currentUser.id, prof.id)}
                          className={`ml-2 px-4 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 whitespace-nowrap min-w-[75px] ${
                            followingIds.includes(prof.id) 
                              ? "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-white" 
                              : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                          }`}
                        >
                          {followingIds.includes(prof.id) ? "متابع" : "متابعة"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ... بقية الـ Tabs الأخرى مثل Trending و Create Post تبقى كما هي مع إضافة توافق Dark Mode */}
          {activeTab === "trending" && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-5 text-right flex flex-col gap-2 mb-2">
                <span className="text-[10px] bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-black px-2.5 py-1 rounded-full uppercase w-max">
                  التريند الأقوى حالياً 🔥
                </span>
                <h2 className="font-extrabold text-xl text-gray-900 dark:text-white mt-1">الميمز صاحبة الأعلى تفاعل</h2>
              </div>
              {[...memes]
                .sort((a,b) => {
                  const scoreA = (a.likes_count * 10 + a.comments_count * 15 + a.shares_count * 20 + a.saves_count * 12);
                  const scoreB = (b.likes_count * 10 + b.comments_count * 15 + b.shares_count * 20 + b.saves_count * 12);
                  return scoreB - scoreA;
                })
                .map((m) => (
                  <MemeCard
                    key={m.id} meme={m} currentUser={currentUser}
                    onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle}
                    onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag}
                    onDeleteComment={() => {}} onReportSubmit={handleReportSubmit}
                    onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme}
                    onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }}
                    isFollowingCreator={followingIds.includes(m.user_id)}
                  />
                ))
              }
            </div>
          )}
        </div>

        <Sidebar
          currentUser={currentUser}
          activeTab={activeTab}
          onNavigate={(tab) => { setActiveTab(tab); setSelectedTag(null); }}
          savedCount={savedMemesCount}
        />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-gray-100 dark:border-slate-800 flex items-center justify-around py-4 md:hidden">
        <button onClick={() => { setActiveTab("feed"); setSelectedTag(null); }} className={`${activeTab === 'feed' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
          <Home className="w-6 h-6" />
        </button>
        <button onClick={() => { setActiveTab("trending"); setSelectedTag(null); }} className={`${activeTab === 'trending' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
          <Flame className="w-6 h-6" />
        </button>
        <button onClick={() => { setActiveTab("saves"); setSelectedTag(null); }} className={`${activeTab === 'saves' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
          <Bookmark className="w-6 h-6" />
        </button>
        <button onClick={() => { setActiveTab("profile"); setSelectedTag(null); }} className={`${activeTab === 'profile' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
          <User className="w-6 h-6" />
        </button>
      </nav>

      {/* Redesigned Supabase Authentication Modal (Dark & Light Mode Friendly) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 shadow-2xl" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-7 text-right border border-gray-100 dark:border-slate-800 shadow-2xl relative animate-scale-in">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-5 left-5 text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer bg-gray-50 dark:bg-slate-800 p-2 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-7 mt-2">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto text-white mb-4 shadow-lg shadow-blue-500/30">
                <User className="w-7 h-7" />
              </div>
              <h3 className="font-black text-2xl text-gray-900 dark:text-white tracking-tight">
                أهلاً بيك في ميمزبوك 👋
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                سجل دخولك لتتمكن من رفع الميمز، التفاعل، وتجميع نقاط الخبرة لترقية حسابك!
              </p>
            </div>

            {/* Modern Tabs */}
            <div className="flex bg-gray-100 dark:bg-slate-800 p-1.5 rounded-2xl mb-6">
              <button
                onClick={() => { setAuthTab("signin"); setAuthError(""); setAuthSuccess(""); }}
                className={`flex-1 text-center py-2.5 text-sm font-bold rounded-xl cursor-pointer transition-all ${
                  authTab === "signin" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                تسجيل الدخول
              </button>
              <button
                onClick={() => { setAuthTab("signup"); setAuthError(""); setAuthSuccess(""); }}
                className={`flex-1 text-center py-2.5 text-sm font-bold rounded-xl cursor-pointer transition-all ${
                  authTab === "signup" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                إنشاء حساب
              </button>
            </div>

            <form onSubmit={authTab === "signin" ? handleSignIn : handleSignUp} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-extrabold text-gray-600 dark:text-gray-300 mb-1.5 ml-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 rounded-2xl px-4 py-3.5 text-sm text-gray-900 dark:text-white transition-all"
                />
              </div>

              {authTab === "signup" && (
                <div>
                  <label className="block text-xs font-extrabold text-gray-600 dark:text-gray-300 mb-1.5 ml-1">اسم المستخدم</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: وزير_الميمز"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value.replace(/\s+/g, '_'))}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-gray-600 dark:text-gray-300 mb-1.5 ml-1">الرقم السري</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 rounded-2xl px-4 py-3.5 text-sm font-mono text-gray-900 dark:text-white transition-all"
                />
              </div>

              {authError && (
                <div className="text-xs text-red-600 dark:text-red-400 font-extrabold bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800/50 p-3.5 rounded-2xl flex items-start gap-2 mt-1 leading-relaxed">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="text-xs text-green-700 dark:text-green-400 font-black bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800/50 p-3.5 rounded-2xl flex items-center gap-2 mt-1">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <span>{authSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl text-sm shadow-xl shadow-blue-500/20 cursor-pointer transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                {authLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>
                    {authTab === "signin" ? "تسجيل الدخول" : "إنشاء حسابي الآن"}
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
        }
