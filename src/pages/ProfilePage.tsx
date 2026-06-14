import React, { useState, useEffect } from "react";
import { Camera, CheckCircle2, PlusCircle, MessageCircle, Edit2, Award, Clock, Users, Flame, Check, X } from "lucide-react";
import { Profile, Meme } from "../types";
import MemeCard from "../components/MemeCard";
import { dataService } from "../services/dataService";
import { socialService } from "../services/socialService";

interface ProfilePageProps {
  profile: Profile;
  currentUser: Profile;
  isOwnProfile: boolean;
  isRealUser: boolean;
  userMemes: Meme[];
  followingIds: string[];
  setCurrentUser: React.Dispatch<React.SetStateAction<Profile>>;
  setProfiles: React.Dispatch<React.SetStateAction<Profile[]>>;
  setShowAuthModal: (show: boolean) => void;
  handleFollowToggle: (followerId: string, followingId: string) => Promise<void>;
  handleLikeToggle: (id: string) => Promise<void>;
  handleSaveToggle: (id: string) => Promise<void>;
  setSelectedTag: (tag: string | null) => void;
  handleReportSubmit: (id: string, reason: string) => void;
  handleShareCompleted: (id: string) => Promise<void>;
  handleDeleteMeme: (id: string) => Promise<void>;
  setSelectedProfileId: (id: string | null) => void;
  setActiveTab: (tab: string) => void;
  setLightboxImage: (url: string | null) => void;
}

export default function ProfilePage({
  profile,
  currentUser,
  isOwnProfile,
  isRealUser,
  userMemes,
  followingIds,
  setCurrentUser,
  setProfiles,
  setShowAuthModal,
  handleFollowToggle,
  handleLikeToggle,
  handleSaveToggle,
  setSelectedTag,
  handleReportSubmit,
  handleShareCompleted,
  handleDeleteMeme,
  setSelectedProfileId,
  setActiveTab,
  setLightboxImage,
}: ProfilePageProps) {
  
  // الـ States الخاصة بالتعديل والتبويبات
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempBio, setTempBio] = useState(profile.bio || "");
  const [tempName, setTempName] = useState(profile.username);
  
  // تبويب محلي آمن عشان نمنع الكراش الأسود نهائياً
  const [currentTab, setCurrentTab] = useState<"posts" | "about">("posts");
  const [localUserMemes, setLocalUserMemes] = useState<Meme[]>(userMemes);
  const [isLoadingMemes, setIsLoadingMemes] = useState(false);

  useEffect(() => {
    const fetchUserMemes = async () => {
      if (profile.id) {
        setIsLoadingMemes(true);
        try {
          const memes = await dataService.getMemes("approved", profile.id, currentUser.id);
          setLocalUserMemes(memes);
        } catch (err) {
          console.error("Error fetching user memes:", err);
        } finally {
          setIsLoadingMemes(false);
        }
      }
    };
    fetchUserMemes();
  }, [profile.id, currentUser.id]);

  const onFollowClick = async () => {
    if (!isRealUser) {
      setShowAuthModal(true);
      return;
    }
    await handleFollowToggle(currentUser.id, profile.id);
  };

  // حفظ الاسم
  const handleSaveName = async () => {
    if (!tempName.trim()) return;
    try {
      setCurrentUser(prev => ({ ...prev, username: tempName }));
      setProfiles(prev => prev.map(p => p.id === currentUser.id ? { ...p, username: tempName } : p));
      await dataService.updateProfile({ username: tempName });
      setIsEditingName(false);
    } catch (err) {
      alert("فشل حفظ الاسم");
    }
  };

  // حفظ النبذة
  const handleSaveBio = async () => {
    try {
      setCurrentUser(prev => ({ ...prev, bio: tempBio }));
      setProfiles(prev => prev.map(p => p.id === currentUser.id ? { ...p, bio: tempBio } : p));
      await dataService.updateProfile({ bio: tempBio });
      setIsEditingBio(false);
    } catch (err) {
      alert("فشل حفظ النبذة");
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F0F2F5] dark:bg-[#0B0F19] text-gray-950 dark:text-gray-100 font-sans pb-12">
      
      {/* هيدر البروفايل */}
      <div className="w-full bg-white dark:bg-[#111827] shadow-md border-b border-gray-200 dark:border-gray-800/60 rounded-b-2xl sm:rounded-b-[2rem]">
        <div className="max-w-5xl mx-auto relative">
          
          {/* صورة الغلاف */}
          <div
            className="w-full h-52 sm:h-80 bg-gradient-to-r from-blue-600 to-indigo-700 relative bg-cover bg-center sm:rounded-b-2xl overflow-hidden cursor-pointer group"
            style={profile.cover_url ? { backgroundImage: `url(${profile.cover_url})` } : undefined}
            onClick={() => profile.cover_url && setLightboxImage(profile.cover_url)}
          >
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all" />
            
            {isOwnProfile && (
              <label className="absolute bottom-4 left-4 bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all border border-white/20 active:scale-95" onClick={(e) => e.stopPropagation()}>
                <Camera className="w-4 h-4" />
                <span>تحديث الغلاف</span>
                <input
                  type="file" className="hidden" accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const url = await socialService.uploadCover(currentUser.id, file);
                        const updated = { ...currentUser, cover_url: url };
                        setCurrentUser(updated);
                        setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
                      } catch (err) { alert("فشل رفع الغلاف"); }
                    }
                  }}
                />
              </label>
            )}
          </div>

          {/* تفاصيل الهيدر السفلي الأنيق */}
          <div className="px-4 sm:px-8 pb-2 flex flex-col md:flex-row items-center md:items-end justify-between relative -mt-20 sm:-mt-24 gap-6">
            
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-right w-full min-w-0">
              
              {/* صورة الأفاتار */}
              <div className="relative shrink-0 group">
                <div
                  className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 border-white dark:border-[#111827] bg-gray-100 dark:bg-gray-800 shadow-xl overflow-hidden cursor-pointer relative"
                  onClick={() => setLightboxImage(profile.avatar_url || null)}
                >
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl font-black bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 text-gray-500">{profile.username[0]}</div>
                  )}
                </div>
                
                {isOwnProfile && (
                  <label className="absolute bottom-2 right-2 bg-[#1877F2] hover:bg-[#166FE5] text-white p-3 rounded-full cursor-pointer shadow-lg border-4 border-white dark:border-[#111827] transition-all active:scale-90" onClick={(e) => e.stopPropagation()}>
                    <Camera className="w-4 h-4" />
                    <input
                      type="file" className="hidden" accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const url = await dataService.uploadAvatar(file);
                            setCurrentUser(prev => ({ ...prev, avatar_url: url }));
                            await dataService.updateProfile({ avatar_url: url });
                          } catch (err) { alert("فشل الرفع"); }
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* نصوص الحساب والاسم */}
              <div className="pb-2 min-w-0 flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1 min-h-[44px]">
                  {isEditingName ? (
                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-lg border border-gray-300 dark:border-gray-700 w-full max-w-sm">
                      <input
                        type="text" value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 font-bold text-lg text-gray-900 dark:text-white px-2 py-1 w-full"
                      />
                      <button onClick={handleSaveName} className="p-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"><Check className="w-4 h-4" /></button>
                      <button onClick={() => { setTempName(profile.username); setIsEditingName(false); }} className="p-1.5 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-300 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white truncate">{profile.username}</h1>
                      {isOwnProfile && (
                        <button onClick={() => setIsEditingName(true)} className="p-1 text-gray-400 hover:text-blue-500 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      )}
                      <Flame className="w-5 h-5 text-orange-500 shrink-0 animate-pulse" />
                    </>
                  )}
                </div>

                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                  {profile.followers_count} متابع كفو • {profile.following_count || 0} يتابع
                </p>
                
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-900/50 shadow-sm">
                  <Award className="w-3.5 h-3.5" />
                  {profile.meme_level}
                </span>
              </div>
            </div>

            {/* أزرار التحكم الرئيسية (تم تصليح الزرار الكبير هنا) */}
            <div className="flex gap-2 w-full md:w-auto justify-center shrink-0 mb-2">
              {!isOwnProfile && isRealUser ? (
                <>
                  <button
                    onClick={onFollowClick}
                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 ${
                      followingIds.includes(profile.id)
                        ? "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-200"
                        : "bg-[#1877F2] text-white hover:bg-[#166FE5]"
                    }`}
                  >
                    {followingIds.includes(profile.id) ? <><CheckCircle2 className="w-4 h-4" /> يتابع</> : <><PlusCircle className="w-4 h-4" /> متابعة</>}
                  </button>
                  <button className="flex-1 sm:flex-none bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-5 py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95">
                    <MessageCircle className="w-4 h-4" /> <span>مراسلة</span>
                  </button>
                </>
              ) : isOwnProfile && !isRealUser ? (
                <button onClick={() => setShowAuthModal(true)} className="w-full sm:w-auto bg-[#1877F2] hover:bg-[#166FE5] text-white px-8 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 shadow-md">
                  تسجيل الدخول للمجرة
                </button>
              ) : isOwnProfile ? (
                /* زرار التعديل الكبير شغال ويقوم بفتح تعديل النبذة تلقائياً */
                <button 
                  onClick={() => {
                    setIsEditingBio(true);
                    // لو النبذة تحت في الصفحة مش باينة، هنعمل Scroll خفيف ليها
                    document.getElementById("bio-section")?.scrollIntoView({ behavior: "smooth" });
                  }} 
                  className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-5 py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95 border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  <Edit2 className="w-4 h-4 text-blue-500" /> <span>تعديل السيرة والنبذة</span>
                </button>
              ) : null}
            </div>

          </div>

          {/* شريط التبويبات الفيس بوكي - آمن تماماً ضد الكراشات */}
          <div className="flex items-center px-4 sm:px-8 border-t border-gray-100 dark:border-gray-800/60 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setCurrentTab("posts")}
              className={`px-4 py-4 font-black text-sm whitespace-nowrap transition-all border-b-4 ${
                currentTab === "posts" ? "text-[#1877F2] border-[#1877F2]" : "text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              المنشورات
            </button>
            <button
              onClick={() => setCurrentTab("about")}
              className={`px-4 py-4 font-black text-sm whitespace-nowrap transition-all border-b-4 ${
                currentTab === "about" ? "text-[#1877F2] border-[#1877F2]" : "text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              حول العضو ومعلوماته
            </button>
          </div>

        </div>
      </div>

      {/* المحتوى الفعلي حسب التبويب المختار */}
      <div className="max-w-5xl mx-auto w-full p-4 mt-2">
        {currentTab === "posts" ? (
          <div className="w-full flex flex-col md:flex-row gap-5">
            
            {/* اللوحة التعريفية الجانبية */}
            <div id="bio-section" className="w-full md:w-[350px] shrink-0 flex flex-col gap-4">
              <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800/60 p-5 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-lg text-gray-900 dark:text-white">اللوحة التعريفية</h3>
                  {isOwnProfile && !isEditingBio && (
                    <button onClick={() => setIsEditingBio(true)} className="text-xs text-[#1877F2] font-bold hover:underline">تعديل</button>
                  )}
                </div>
                
                {isEditingBio ? (
                  <div className="space-y-2">
                    <textarea
                      value={tempBio}
                      onChange={(e) => setTempBio(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 p-3 text-sm text-gray-800 dark:text-gray-200 rounded-xl resize-none text-center font-medium"
                      placeholder="اكتب إيفيه أو نبذة عنك يا أسطورة..." rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setTempBio(profile.bio || ""); setIsEditingBio(false); }} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg text-xs font-bold">إلغاء</button>
                      <button onClick={handleSaveBio} className="px-4 py-1.5 bg-[#1877F2] text-white hover:bg-[#166FE5] rounded-lg text-xs font-bold shadow-sm">حفظ</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center leading-relaxed bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800/40">
                    {profile.bio || "مفيش كابشن.. العضو ده بيمسي عليكم في صمت."}
                  </p>
                )}

                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800/60 space-y-3.5 text-sm font-bold text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-yellow-500 shrink-0" />
                    <span>الرصيد القتالي: <strong className="text-gray-900 dark:text-white font-black">{profile.total_points} XP</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-500 shrink-0" />
                    <span>انضم للمجرة: <strong className="text-gray-900 dark:text-white font-black">{new Date(profile.created_at).getFullYear()}</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span>الجمهور: <strong className="text-gray-900 dark:text-white font-black">{profile.followers_count}</strong> أساطير</span>
                  </div>
                </div>
              </div>
            </div>

            {/* الفيد الرئيسي للميمز المنشورة */}
            <div className="flex-1 flex flex-col gap-4">
              <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800/60 p-4 rounded-2xl shadow-sm flex items-center justify-between">
                <h3 className="font-black text-gray-900 dark:text-white text-base">أرشيف الإيفيهات المرفوعة</h3>
                <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-900/40">
                  {localUserMemes.length} ميم قتالي
                </span>
              </div>

              {isLoadingMemes ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : localUserMemes.length === 0 ? (
                <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800/60 rounded-2xl p-16 text-center text-gray-400 font-black shadow-sm text-lg">
                  العضو ده لسه منشرش ضحك هنا.. شكله مكسل! 😴
                </div>
              ) : (
                <div className="flex flex-col gap-4 w-full">
                  {localUserMemes.map((meme) => (
                    <div key={meme.id} className="w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800/60 rounded-2xl shadow-sm overflow-hidden p-1">
                      <MemeCard
                        meme={meme} currentUser={currentUser} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle} onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag}
                        onDeleteComment={() => {}} onReportSubmit={handleReportSubmit} onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme}
                        onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }}
                        isFollowingCreator={followingIds.includes(meme.user_id)}
                        onImageClick={setLightboxImage}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : (
          /* تبويب "حول العضو" الفرعي */
          <div className="w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800/60 p-6 rounded-2xl shadow-sm animate-fade-in">
            <h3 className="font-black text-xl mb-4 text-gray-900 dark:text-white">تفاصيل ومجرة {profile.username}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-bold text-gray-600 dark:text-gray-300">
              <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl">
                <p className="text-xs text-gray-400 mb-1">المستوى الحالي في الميمز</p>
                <p className="text-lg font-black text-blue-600 dark:text-blue-400">{profile.meme_level}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl">
                <p className="text-xs text-gray-400 mb-1">الرصيد الكلي للنقاط</p>
                <p className="text-lg font-black text-yellow-500">{profile.total_points} XP</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl">
                <p className="text-xs text-gray-400 mb-1">تاريخ الهبوط في الكوكب</p>
                <p className="text-base text-gray-800 dark:text-white">{new Date(profile.created_at).toLocaleDateString("ar-EG")}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl">
                <p className="text-xs text-gray-400 mb-1">القوة الجماهيرية</p>
                <p className="text-base text-gray-800 dark:text-white">يتابع {profile.following_count || 0} شخص ومتبوع بواسطة {profile.followers_count} مقاتل</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
