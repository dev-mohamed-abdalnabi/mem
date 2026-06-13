import React from "react";
import { Camera, CheckCircle2, PlusCircle, MessageCircle, Edit2, Award, Clock, Users, ImageIcon, MoreHorizontal } from "lucide-react";
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
    // الخلفية الرمادية المميزة لفيسبوك
    <div className="flex flex-col w-full min-h-screen bg-[#F0F2F5] dark:bg-[#18191A] animate-fade-in font-sans">
      
      {/* قسم الهيدر (الغلاف والمعلومات) - خلفية بيضاء */}
      <div className="bg-white dark:bg-[#242526] shadow-sm">
        <div className="max-w-6xl mx-auto px-0 sm:px-4">
          
          {/* الغلاف */}
          <div
            className="w-full h-[250px] sm:h-[350px] bg-gray-200 dark:bg-gray-800 relative group bg-cover bg-center sm:rounded-b-lg"
            style={(profile as any).cover_url ? { backgroundImage: `url(${(profile as any).cover_url})` } : { backgroundImage: 'linear-gradient(to right, #1877F2, #2851A3)' }}
          >
            <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-all pointer-events-none sm:rounded-b-lg"></div>
            {isOwnProfile && (
              <label className="absolute bottom-4 left-4 sm:right-4 sm:left-auto bg-white dark:bg-[#3A3B3C] text-gray-900 dark:text-gray-200 px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-sm hover:bg-gray-100 dark:hover:bg-[#4E4F50] transition-colors z-10">
                <Camera className="w-5 h-5" />
                <span className="hidden sm:inline">تعديل صورة الغلاف</span>
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

          {/* تفاصيل الحساب أسفل الغلاف مباشرة */}
          <div className="px-4 sm:px-8 flex flex-col md:flex-row items-center md:items-end justify-between relative pb-4 border-b border-gray-300 dark:border-[#3E4042]">
            
            <div className="flex flex-col md:flex-row items-center md:items-end gap-4 text-center md:text-right w-full">
              {/* الصورة الشخصية متداخلة مع الغلاف */}
              <div className="relative shrink-0 -mt-20 md:-mt-10 z-10">
                <div
                  className="w-[168px] h-[168px] rounded-full border-4 border-white dark:border-[#242526] bg-gray-100 dark:bg-gray-800 shadow-sm overflow-hidden cursor-pointer"
                  onClick={() => setLightboxImage(profile.avatar_url || null)}
                >
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover hover:opacity-90 transition-opacity" referrerPolicy="no-referrer" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-gray-400 dark:text-gray-500">{profile.username[0]}</div>
                  )}
                </div>
                {isOwnProfile && (
                  <label className="absolute bottom-2 left-2 bg-gray-200 hover:bg-gray-300 dark:bg-[#3A3B3C] dark:hover:bg-[#4E4F50] text-gray-900 dark:text-white p-2.5 rounded-full cursor-pointer shadow-sm border-2 border-white dark:border-[#242526] transition-colors">
                    <Camera className="w-5 h-5" />
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

              {/* الاسم والإحصائيات */}
              <div className="pb-2 md:pb-4 min-w-0 flex-1 w-full mt-2 md:mt-0">
                {isOwnProfile ? (
                  <input
                    type="text" value={profile.username}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setCurrentUser(prev => ({ ...prev, username: newName }));
                      dataService.updateProfile({ username: newName });
                    }}
                    className="bg-transparent border-none focus:ring-0 p-0 text-3xl font-bold text-gray-900 dark:text-[#E4E6EB] text-center md:text-right w-full mb-1 truncate"
                  />
                ) : (
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-[#E4E6EB] mb-1 truncate">{profile.username}</h1>
                )}
                <p className="text-[15px] font-semibold text-gray-500 dark:text-[#B0B3B8] mb-1">
                  {profile.followers_count} متابع • {profile.following_count || 0} يتابع
                </p>
                <div className="flex justify-center md:justify-start items-center gap-2">
                  <span className="inline-block text-xs font-bold text-[#1877F2] bg-[#E7F3FF] dark:bg-[#1877F2]/10 px-2 py-1 rounded">
                    {profile.meme_level}
                  </span>
                </div>
              </div>
            </div>

            {/* أزرار الإجراءات (الستايل الخاص بفيسبوك) */}
            <div className="flex gap-2 w-full md:w-auto justify-center md:justify-end pb-4 md:pb-5 shrink-0 mt-4 md:mt-0">
              {!isOwnProfile && isRealUser ? (
                <>
                  <button
                    onClick={() => handleFollowToggle(currentUser.id, profile.id)}
                    className={`px-4 py-2 rounded-md text-[15px] font-semibold flex items-center justify-center gap-2 transition-all shrink-0 ${
                      followingIds.includes(profile.id)
                        ? "bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-[#3A3B3C] dark:text-[#E4E6EB] dark:hover:bg-[#4E4F50]"
                        : "bg-[#1877F2] text-white hover:bg-[#166FE5]"
                    }`}
                  >
                    {followingIds.includes(profile.id) ? <><CheckCircle2 className="w-4 h-4" /> يتابع</> : <><PlusCircle className="w-4 h-4" /> متابعة</>}
                  </button>
                  <button className="bg-gray-200 hover:bg-gray-300 dark:bg-[#3A3B3C] dark:hover:bg-[#4E4F50] text-gray-900 dark:text-[#E4E6EB] px-4 py-2 rounded-md text-[15px] font-semibold flex items-center gap-2 transition-colors shrink-0">
                    <MessageCircle className="w-4 h-4" /> <span>مراسلة</span>
                  </button>
                </>
              ) : isOwnProfile && !isRealUser ? (
                <button onClick={() => setShowAuthModal(true)} className="bg-[#1877F2] hover:bg-[#166FE5] text-white px-8 py-2 rounded-md text-[15px] font-semibold shrink-0">
                  تسجيل الدخول
                </button>
              ) : isOwnProfile ? (
                <>
                  <button className="bg-[#1877F2] hover:bg-[#166FE5] text-white px-4 py-2 rounded-md text-[15px] font-semibold flex items-center justify-center gap-2 transition-colors shrink-0">
                    <PlusCircle className="w-4 h-4" /> إضافة ميم جديد
                  </button>
                  <button className="bg-gray-200 hover:bg-gray-300 dark:bg-[#3A3B3C] dark:hover:bg-[#4E4F50] text-gray-900 dark:text-[#E4E6EB] px-4 py-2 rounded-md text-[15px] font-semibold flex items-center justify-center gap-2 transition-colors shrink-0">
                    <Edit2 className="w-4 h-4" /> تعديل الملف
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {/* شريط التبويبات السفلي */}
          <div className="flex items-center px-4 md:px-8 gap-1 pt-1 overflow-x-auto no-scrollbar">
            <button className="px-4 py-4 text-[#1877F2] border-b-[3px] border-[#1877F2] font-semibold whitespace-nowrap">المنشورات</button>
            <button className="px-4 py-4 text-gray-600 dark:text-[#B0B3B8] font-semibold hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-lg mb-1 transition-colors whitespace-nowrap">حول</button>
            <button className="px-4 py-4 text-gray-600 dark:text-[#B0B3B8] font-semibold hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-lg mb-1 transition-colors whitespace-nowrap">المتابعون</button>
            <button className="px-4 py-4 text-gray-600 dark:text-[#B0B3B8] font-semibold hover:bg-gray-100 dark:hover:bg-[#3A3B3C] rounded-lg mb-1 transition-colors whitespace-nowrap">الصور</button>
          </div>
        </div>
      </div>

      {/* المحتوى السفلي (العمودين) */}
      <div className="max-w-6xl mx-auto w-full flex flex-col md:flex-row gap-4 p-4 md:py-6">
        
        {/* العمود الجانبي (النبذة) */}
        <div className="w-full md:w-[360px] shrink-0 flex flex-col gap-4">
          <div className="bg-white dark:bg-[#242526] p-4 rounded-xl shadow-sm border border-gray-200 dark:border-[#3E4042]">
            <h3 className="text-[20px] font-bold text-gray-900 dark:text-[#E4E6EB] mb-4">النبذة التعريفية</h3>
            
            {isOwnProfile ? (
              <div className="mb-4">
                <textarea
                  value={profile.bio || ""}
                  onChange={(e) => {
                    const newBio = e.target.value;
                    setCurrentUser(prev => ({ ...prev, bio: newBio }));
                    dataService.updateProfile({ bio: newBio });
                  }}
                  className="w-full bg-gray-100 dark:bg-[#3A3B3C] border-none focus:ring-0 p-3 text-[15px] text-gray-800 dark:text-[#E4E6EB] rounded-lg resize-none text-center"
                  placeholder="اكتب شيئاً عنك يا أسطورة الميمز..." rows={3}
                />
                <button className="w-full mt-2 bg-gray-200 hover:bg-gray-300 dark:bg-[#3A3B3C] dark:hover:bg-[#4E4F50] text-gray-900 dark:text-[#E4E6EB] font-semibold py-1.5 rounded-md transition-colors">
                  حفظ السيرة الذاتية
                </button>
              </div>
            ) : (
              <p className="text-[15px] text-gray-700 dark:text-[#E4E6EB] text-center leading-relaxed mb-4">
                {profile.bio || "لا يوجد وصف حالياً لهذا العضو المجهول."}
              </p>
            )}

            <div className="space-y-4 text-[15px] text-gray-900 dark:text-[#E4E6EB]">
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-gray-400 dark:text-[#8C939D]" />
                <span>الرصيد القتالي: <strong>{profile.total_points} XP</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400 dark:text-[#8C939D]" />
                <span>انضم للمجرة في {new Date(profile.created_at).getFullYear()}</span>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-400 dark:text-[#8C939D]" />
                <span>يتابعه {profile.followers_count} شخص</span>
              </div>
            </div>
            
            {isOwnProfile && (
              <button className="w-full mt-4 bg-gray-200 hover:bg-gray-300 dark:bg-[#3A3B3C] dark:hover:bg-[#4E4F50] text-gray-900 dark:text-[#E4E6EB] font-semibold py-2 rounded-md transition-colors">
                تعديل التفاصيل
              </button>
            )}
          </div>

          {/* مربع صور خفيف لتعزيز شكل فيسبوك */}
          <div className="hidden md:block bg-white dark:bg-[#242526] p-4 rounded-xl shadow-sm border border-gray-200 dark:border-[#3E4042]">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-[20px] font-bold text-gray-900 dark:text-[#E4E6EB]">الصور</h3>
               <button className="text-[#1877F2] hover:bg-gray-100 dark:hover:bg-[#3A3B3C] px-2 py-1 rounded">عرض الكل</button>
             </div>
             <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
                {userMemes.slice(0, 9).map((meme, idx) => (
                  <div key={idx} className="aspect-square bg-gray-200 dark:bg-gray-700">
                    <img src={meme.image_url} alt="" className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition" onClick={() => setLightboxImage(meme.image_url)} />
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* عمود المنشورات (الفيد) */}
        <div className="flex-1 flex flex-col gap-4">
          
          {/* صندوق إنشاء منشور (وهمي شكلاً للحفاظ على تجربة فيس بوك) */}
          {isOwnProfile && (
            <div className="bg-white dark:bg-[#242526] p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200 dark:border-[#3E4042]">
              <div className="flex items-center gap-2 mb-3">
                <img src={profile.avatar_url || ""} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 bg-[#F0F2F5] dark:bg-[#3A3B3C] hover:bg-[#E4E6EB] dark:hover:bg-[#4E4F50] cursor-pointer text-gray-500 dark:text-[#B0B3B8] rounded-full py-2.5 px-4 text-[15px] transition-colors">
                  بم تفكر يا أسطورة؟
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-[#3E4042] pt-3 flex justify-between">
                <button className="flex-1 flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-[#3A3B3C] py-2 rounded-lg text-gray-600 dark:text-[#B0B3B8] font-semibold transition-colors">
                  <ImageIcon className="w-6 h-6 text-green-500" />
                  <span>صورة/ميم</span>
                </button>
              </div>
            </div>
          )}

          {/* عنوان الأرشيف */}
          <div className="bg-white dark:bg-[#242526] p-4 rounded-xl shadow-sm border border-gray-200 dark:border-[#3E4042] flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-[#E4E6EB]">أرشيف الإيفيهات المرفوعة</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-600 dark:text-[#E4E6EB] bg-gray-100 dark:bg-[#3A3B3C] px-3 py-1 rounded-md">{userMemes.length} ميم</span>
              <button className="p-1.5 bg-gray-100 dark:bg-[#3A3B3C] hover:bg-gray-200 dark:hover:bg-[#4E4F50] rounded-md transition-colors">
                <MoreHorizontal className="w-5 h-5 text-gray-600 dark:text-[#B0B3B8]" />
              </button>
            </div>
          </div>

          {/* قائمة الميمز */}
          {userMemes.length === 0 ? (
            <div className="bg-white dark:bg-[#242526] border border-gray-200 dark:border-[#3E4042] rounded-xl p-12 text-center text-gray-500 dark:text-[#B0B3B8] font-bold shadow-sm text-lg">
              العضو ده لسه معملش ريفريش لضحك المجتمع.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {userMemes.map(meme => (
                <div key={meme.id} className="w-full">
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
    </div>
  );
}
