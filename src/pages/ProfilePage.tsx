import React from "react";
import { Camera, CheckCircle2, PlusCircle, MessageCircle, Edit2, Award, Clock, Users, Flame } from "lucide-react";
import { Profile, Meme } from "../types";
import MemeCard from "../components/MemeCard";
import { dataService } from "../services/dataService";

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
  
  // تشغيل زرار المتابعة بشكل صريح ومضمون
  const onFollowClick = async () => {
    if (!isRealUser) {
      setShowAuthModal(true);
      return;
    }
    await handleFollowToggle(currentUser.id, profile.id);
  };

  return (
    <div className="w-full min-h-screen bg-[#F0F2F5] dark:bg-[#0B0F19] text-gray-950 dark:text-gray-100 font-sans pb-12">
      
      {/* هيدر فيسبوك البرو */}
      <div className="w-full bg-white dark:bg-[#111827] shadow-md border-b border-gray-200 dark:border-gray-800/60 rounded-b-2xl sm:rounded-b-[2rem]">
        <div className="max-w-5xl mx-auto relative">
          
          {/* كفر الغلاف الصايع */}
          <div
            className="w-full h-52 sm:h-80 bg-gradient-to-r from-blue-600 to-indigo-700 relative bg-cover bg-center sm:rounded-b-2xl overflow-hidden cursor-pointer group"
            style={(profile as any).cover_url ? { backgroundImage: `url(${(profile as any).cover_url})` } : undefined}
            onClick={() => (profile as any).cover_url && setLightboxImage((profile as any).cover_url)}
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
                        const url = await dataService.uploadAvatar(file);
                        const updated = { ...currentUser, cover_url: url } as any;
                        setCurrentUser(updated);
                        setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
                        await dataService.updateProfile({ cover_url: url } as any);
                      } catch (err) { alert("فشل رفع الغلاف"); }
                    }
                  }}
                />
              </label>
            )}
          </div>

          {/* الداتا والأزرار الشخصية */}
          <div className="px-4 sm:px-8 pb-6 flex flex-col md:flex-row items-center md:items-end justify-between relative -mt-20 sm:-mt-24 gap-6">
            
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-right w-full min-w-0">
              
              {/* الأفاتار المدور - فيسبوك ستايل */}
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

              {/* الاسم واللقب القتالي */}
              <div className="pb-2 min-w-0 flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  {isOwnProfile ? (
                    <input
                      type="text" value={profile.username}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setCurrentUser(prev => ({ ...prev, username: newName }));
                        dataService.updateProfile({ username: newName });
                      }}
                      className="bg-transparent border-none focus:ring-2 focus:ring-blue-500 font-black text-2xl sm:text-3xl text-gray-900 dark:text-white text-center sm:text-right w-full max-w-sm rounded-lg p-1"
                    />
                  ) : (
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white truncate">{profile.username}</h1>
                  )}
                  <Flame className="w-6 h-6 text-orange-500 shrink-0 animate-pulse" />
                </div>

                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">
                  {profile.followers_count} متابع كفو • {profile.following_count || 0} يتابع
                </p>
                
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-900/50 shadow-sm">
                  <Award className="w-3.5 h-3.5" />
                  {profile.meme_level}
                </span>
              </div>
            </div>

            {/* الأزرار التفاعلية - شغالة طلقة */}
            <div className="flex gap-2 w-full md:w-auto justify-center shrink-0 mt-2 md:mt-0">
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
                <div className="text-xs font-extrabold text-blue-500 bg-blue-50 dark:bg-blue-950/30 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-900/40">
                  حسابك الشخصي يا غالي 👑
                </div>
              ) : null}
            </div>

          </div>

          {/* شريط الأقسام السريعة */}
          <div className="flex items-center px-4 sm:px-8 border-t border-gray-100 dark:border-gray-800/60 overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab("posts")} className="px-4 py-4 text-[#1877F2] border-b-4 border-[#1877F2] font-black text-sm whitespace-nowrap">المنشورات</button>
            <button className="px-4 py-4 text-gray-500 dark:text-gray-400 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl my-1 transition-colors whitespace-nowrap">السجل الكامل</button>
          </div>

        </div>
      </div>

      {/* الجسم السفلي (التقسيمة المظبوطة) */}
      <div className="max-w-5xl mx-auto w-full flex flex-col md:flex-row gap-5 p-4 mt-2">
        
        {/* الشمال: كارت النبذة والهيبة */}
        <div className="w-full md:w-[350px] shrink-0 flex flex-col gap-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800/60 p-5 rounded-2xl shadow-sm">
            <h3 className="font-black text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>اللوحة التعريفية</span>
            </h3>
            
            {isOwnProfile ? (
              <div className="space-y-2">
                <textarea
                  value={profile.bio || ""}
                  onChange={(e) => {
                    const newBio = e.target.value;
                    setCurrentUser(prev => ({ ...prev, bio: newBio }));
                    dataService.updateProfile({ bio: newBio });
                  }}
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 p-3 text-sm text-gray-800 dark:text-gray-200 rounded-xl resize-none text-center font-medium"
                  placeholder="اكتب إيفيه أو نبذة عنك يا أسطورة..." rows={3}
                />
                <div className="text-[10px] text-gray-400 text-center font-bold">التعديل بيحفظ تلقائي 😉</div>
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

        {/* اليمين: فيد الإيفيهات والميمز العظيمة */}
        <div className="flex-1 flex flex-col gap-4">
          
          {/* شريط فرز الداتا */}
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800/60 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <h3 className="font-black text-gray-900 dark:text-white text-base">أرشيف الإيفيهات المرفوعة</h3>
            <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-900/40">
              {userMemes.length} ميم قتالي
            </span>
          </div>

          {/* رندرة المنشورات والميمز بالملي */}
          {userMemes.length === 0 ? (
            <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800/60 rounded-2xl p-16 text-center text-gray-400 font-black shadow-sm text-lg">
              العضو ده لسه منشرش ضحك هنا.. شكله مكسل! 😴
            </div>
          ) : (
            <div className="flex flex-col gap-4 w-full">
              {userMemes.map((meme) => (
                <div key={meme.id} className="w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800/60 rounded-2xl shadow-sm overflow-hidden p-1">
                  <MemeCard
                    meme={meme} 
                    currentUser={currentUser} 
                    onLikeToggle={handleLikeToggle} 
                    onSaveToggle={handleSaveToggle} 
                    onFollowToggle={handleFollowToggle} 
                    onTagClick={setSelectedTag}
                    onDeleteComment={() => {}} 
                    onReportSubmit={handleReportSubmit} 
                    onShareCompleted={handleShareCompleted} 
                    onDeleteMeme={handleDeleteMeme}
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
    </div>
  );
}
