import React from "react";
import { Camera, CheckCircle2, PlusCircle, MessageCircle, Edit2, Award, Clock, Users } from "lucide-react";
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
  return (
    <div className="flex flex-col w-full min-h-screen bg-gray-100 dark:bg-gray-950 animate-fade-in">
      
      {/* هيدر الصفحة المستوحى من فيسبوك */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto">
          
          {/* الغلاف (Cover Photo) */}
          <div
            className="w-full h-48 sm:h-80 bg-gray-300 dark:bg-gray-800 relative group bg-cover bg-center md:rounded-b-xl"
            style={(profile as any).cover_url ? { backgroundImage: `url(${(profile as any).cover_url})` } : { backgroundImage: 'linear-gradient(to right, #1877F2, #0056B3)' }}
          >
            {isOwnProfile && (
              <label className="absolute bottom-4 left-4 bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow border border-gray-300 dark:border-gray-600 transition-colors z-10">
                <Camera className="w-4 h-4" />
                <span>تعديل الغلاف</span>
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

          {/* بيانات الحساب والأزرار التشغيلية */}
          <div className="px-4 sm:px-8 pb-4 flex flex-col md:flex-row items-center md:items-end justify-between relative -mt-16 sm:-mt-24 gap-4 border-b border-gray-100 dark:border-gray-800">
            
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-right min-w-0 flex-1 w-full">
              {/* الأفاتار الشخصي الدائري */}
              <div className="relative shrink-0 z-10">
                <div
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-800 shadow-md overflow-hidden cursor-pointer"
                  onClick={() => setLightboxImage(profile.avatar_url || null)}
                >
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-gray-400 dark:text-gray-500">{profile.username[0]}</div>
                  )}
                </div>
                {isOwnProfile && (
                  <label className="absolute bottom-1 right-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white p-2 rounded-full cursor-pointer shadow border border-gray-300 dark:border-gray-600 transition-colors">
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

              {/* الاسم والعدادات */}
              <div className="pb-2 min-w-0 flex-1 w-full">
                {isOwnProfile ? (
                  <input
                    type="text" value={profile.username}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setCurrentUser(prev => ({ ...prev, username: newName }));
                      dataService.updateProfile({ username: newName });
                    }}
                    className="bg-transparent border-none focus:ring-2 focus:ring-blue-500 p-0 text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white text-center sm:text-right w-full mb-1 truncate"
                  />
                ) : (
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-1 truncate">{profile.username}</h1>
                )}
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                  {profile.followers_count} متابع • {profile.following_count || 0} يتابع
                </p>
                <span className="inline-block text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-md border border-blue-100 dark:border-blue-900/30">
                  {profile.meme_level}
                </span>
              </div>
            </div>

            {/* أزرار تفاعلية حقيقية تعمل 100% بناءً على الصلاحيات */}
            <div className="flex gap-2 w-full md:w-auto justify-center pb-2 shrink-0">
              {!isOwnProfile && isRealUser ? (
                <>
                  <button
                    onClick={() => handleFollowToggle(currentUser.id, profile.id)}
                    className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shrink-0 ${
                      followingIds.includes(profile.id)
                        ? "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        : "bg-[#1877F2] text-white hover:bg-[#166FE5]"
                    }`}
                  >
                    {followingIds.includes(profile.id) ? <><CheckCircle2 className="w-4 h-4" /> يتابع</> : <><PlusCircle className="w-4 h-4" /> متابعة</>}
                  </button>
                  <button className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shrink-0">
                    <MessageCircle className="w-4 h-4" /> <span>مراسلة</span>
                  </button>
                </>
              ) : isOwnProfile && !isRealUser ? (
                <button onClick={() => setShowAuthModal(true)} className="bg-[#1877F2] hover:bg-[#166FE5] text-white px-6 py-2 rounded-lg text-sm font-bold shrink-0">
                  تسجيل الدخول
                </button>
              ) : isOwnProfile ? (
                <div className="text-xs text-gray-400 italic dark:text-gray-500 font-semibold self-center bg-gray-50 dark:bg-gray-800/40 px-3 py-1.5 rounded-md">
                  الملف الشخصي لك
                </div>
              ) : null}
            </div>

          </div>

          {/* شريط التبويبات الفيس بوكي النظيف */}
          <div className="flex items-center px-4 sm:px-6 gap-2 text-sm font-bold text-gray-600 dark:text-gray-400">
            <button onClick={() => setActiveTab("posts")} className="px-4 py-3 text-[#1877F2] border-b-2 border-[#1877F2] transition-colors">المنشورات</button>
            <button className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg my-1 transition-colors">حول</button>
            <button className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg my-1 transition-colors">الأصدقاء</button>
          </div>

        </div>
      </div>

      {/* تقسيم الشاشة السفلي: جانبين (فيسبوك ستايل) */}
      <div className="max-w-5xl mx-auto w-full flex flex-col md:flex-row gap-4 p-4">
        
        {/* الشمال الكلاسيكي للفيس بوك: معلومات الحساب والنبذة */}
        <div className="w-full md:w-[360px] shrink-0 flex flex-col gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-xl shadow-sm">
            <h3 className="font-extrabold text-xl text-gray-900 dark:text-white mb-3">المعلومات الشخصية</h3>
            
            {isOwnProfile ? (
              <div className="space-y-2">
                <textarea
                  value={profile.bio || ""}
                  onChange={(e) => {
                    const newBio = e.target.value;
                    setCurrentUser(prev => ({ ...prev, bio: newBio }));
                    dataService.updateProfile({ bio: newBio });
                  }}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 p-2.5 text-sm text-gray-800 dark:text-gray-200 rounded-lg resize-none text-center"
                  placeholder="اكتب شيئاً عنك يا أسطورة الميمز..." rows={3}
                />
                <p className="text-[11px] text-gray-400 text-center">سيتم حفظ التغييرات تلقائياً</p>
              </div>
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-300 text-center leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                {profile.bio || "لا يوجد وصف حالياً لهذا العضو المجهول."}
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-yellow-500 shrink-0" />
                <span>الرصيد القتالي: <strong className="text-gray-900 dark:text-white">{profile.total_points} XP</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-500 shrink-0" />
                <span>انضم للمجرة في <strong className="text-gray-900 dark:text-white">{new Date(profile.created_at).getFullYear()}</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-green-500 shrink-0" />
                <span>يتابعه <strong className="text-gray-900 dark:text-white">{profile.followers_count}</strong> أساطير</span>
              </div>
            </div>
          </div>
        </div>

        {/* اليمين: فيد المنشورات والميمز المرفوعة */}
        <div className="flex-1 flex flex-col gap-4">
          
          {/* شريط الإحصائيات السريع للمنشورات */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <h3 className="font-extrabold text-gray-900 dark:text-white">المنشورات والميمز</h3>
            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
              {userMemes.length} منشور
            </span>
          </div>

          {/* خلاصة المنشورات */}
          {userMemes.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center text-gray-400 font-bold shadow-sm">
              العضو ده لسه معملش ريفريش لضحك المجتمع.
            </div>
          ) : (
            <div className="flex flex-col gap-4 w-full">
              {userMemes.map(meme => (
                <div key={meme.id} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
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
