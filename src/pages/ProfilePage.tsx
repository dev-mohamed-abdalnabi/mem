import React from "react";
import { Camera, CheckCircle2, PlusCircle, MessageCircle, Edit2, Award, Clock } from "lucide-react";
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
    <div className="flex flex-col w-full animate-fade-in md:pb-10">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm mb-4 pb-6 md:rounded-b-2xl">
        {/* الغلاف */}
        <div
          className="w-full h-48 sm:h-72 bg-gray-200 dark:bg-gray-800 relative group bg-cover bg-center"
          style={(profile as any).cover_url ? { backgroundImage: `url(${(profile as any).cover_url})` } : { backgroundImage: 'linear-gradient(to right, #3b82f6, #8b5cf6)' }}
        >
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all pointer-events-none"></div>
          {isOwnProfile && (
            <label className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-10">
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

        {/* الكانتينر المصلح لحل مشكلة الأسامي الطويلة والأزرار */}
        <div className="px-4 sm:px-8 max-w-5xl mx-auto flex flex-col md:flex-row items-center md:items-end justify-between relative -mt-16 sm:-mt-20 gap-4">
          
          {/* اسم العضو والأفاتار مع الـ truncate الذكي */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-right min-w-0 flex-1 w-full">
            <div className="relative shrink-0">
              <div
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800 shadow-md overflow-hidden cursor-pointer"
                onClick={() => setLightboxImage(profile.avatar_url || null)}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-gray-300 dark:text-gray-600">{profile.username[0]}</div>
                )}
              </div>
              {isOwnProfile && (
                <label className="absolute bottom-2 right-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white p-2 rounded-full cursor-pointer shadow border-2 border-white dark:border-gray-900 transition-colors">
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

            {/* هنا السحر: الاسم هينكمش بأناقة لو طويل بدون ما يطرد الأزرار */}
            <div className="pb-2 min-w-0 flex-1 w-full">
              {isOwnProfile ? (
                <input
                  type="text" value={profile.username}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setCurrentUser(prev => ({ ...prev, username: newName }));
                    dataService.updateProfile({ username: newName });
                  }}
                  className="bg-transparent border-none focus:ring-2 focus:ring-blue-400 p-0 text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white text-center sm:text-right w-full mb-1 truncate"
                />
              ) : (
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-1 truncate">{profile.username}</h1>
              )}
              <p className="text-sm font-bold text-gray-500 mb-2">{profile.followers_count} متابع • {profile.following_count || 0} يتابع</p>
              <span className="inline-block text-xs text-blue-700 dark:text-blue-300 font-bold bg-blue-50 dark:bg-blue-900/40 px-2.5 py-1 rounded-md border border-blue-100 dark:border-blue-800/50">
                {profile.meme_level}
              </span>
            </div>
          </div>

          {/* الأزرار ثابتة لا تنكمش أبدًا (shrink-0) */}
          <div className="flex gap-2 w-full md:w-auto justify-center pb-2 shrink-0">
            {!isOwnProfile && isRealUser ? (
              <>
                <button
                  onClick={() => handleFollowToggle(currentUser.id, profile.id)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shrink-0 ${
                    followingIds.includes(profile.id)
                      ? "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/10"
                  }`}
                >
                  {followingIds.includes(profile.id) ? <><CheckCircle2 className="w-4 h-4" /> يتابع</> : <><PlusCircle className="w-4 h-4" /> متابعة</>}
                </button>
                <button className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shrink-0">
                  <MessageCircle className="w-4 h-4" /> <span>مراسلة</span>
                </button>
              </>
            ) : isOwnProfile && !isRealUser ? (
              <button onClick={() => setShowAuthModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shrink-0">تسجيل الدخول</button>
            ) : isOwnProfile ? (
              <button className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors w-full sm:w-auto shrink-0">
                <Edit2 className="w-4 h-4" /> تعديل النبذة شخصياً
              </button>
            ) : null}
          </div>

        </div>
      </div>

      {/* بقية محتوى الصفحة */}
      <div className="flex flex-col md:flex-row gap-5 px-4 md:px-0">
        <div className="w-full md:w-[320px] shrink-0 flex flex-col gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-sm">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3">اللوحة التعريفية</h3>
            {isOwnProfile ? (
              <textarea
                value={profile.bio || ""}
                onChange={(e) => {
                  const newBio = e.target.value;
                  setCurrentUser(prev => ({ ...prev, bio: newBio }));
                  dataService.updateProfile({ bio: newBio });
                }}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-400 p-2.5 text-sm text-gray-800 dark:text-gray-200 rounded-xl resize-none"
                placeholder="اكتب شيئاً عنك يا أسطورة الميمز..." rows={3}
              />
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-300 text-center leading-relaxed">{profile.bio || "لا يوجد وصف حالياً لهذا العضو المجهول."}</p>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-500" />
                <span>الرصيد القتالي: <strong className="text-gray-900 dark:text-white">{profile.total_points} XP</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>انضم للمجرة في {new Date(profile.created_at).getFullYear()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* خلاصة منشورات العضو */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-white">أرشيف الإيفيهات المرفوعة</h3>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md">{userMemes.length} ميم</span>
          </div>

          {userMemes.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center text-gray-400 font-bold shadow-sm">
              العضو ده لسه معملش ريفريش لضحك المجتمع.
            </div>
          ) : (
            userMemes.map(meme => (
              <div key={meme.id} className="post-wrapper w-full">
                <MemeCard
                  meme={meme} currentUser={currentUser} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle} onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag}
                  onDeleteComment={() => {}} onReportSubmit={handleReportSubmit} onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme}
                  onUserProfileClick={(uid) => { setSelectedProfileId(uid); setActiveTab("user-profile"); }}
                  isFollowingCreator={followingIds.includes(meme.user_id)}
                  onImageClick={setLightboxImage}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
