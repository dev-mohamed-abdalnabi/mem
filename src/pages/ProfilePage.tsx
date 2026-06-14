import React, { useState, useEffect } from "react";
import { Camera, MessageCircle, Award, Clock, X, Check, Activity, CalendarDays, Shield } from "lucide-react";
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
  setLightboxImage,
}: ProfilePageProps) {
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempBio, setTempBio] = useState(profile.bio || "");
  const [tempName, setTempName] = useState(profile.username);
  
  // رفع الصورة والمعاينة
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // تبويبات الصفحة
  const [activeProfileTab, setActiveProfileTab] = useState<"posts" | "info">("posts");
  
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
          console.error(err);
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

  const handleSaveProfile = async () => {
    if (!tempName.trim()) return;
    try {
      setCurrentUser(prev => ({ ...prev, username: tempName, bio: tempBio }));
      setProfiles(prev => prev.map(p => p.id === currentUser.id ? { ...p, username: tempName, bio: tempBio } : p));
      await dataService.updateProfile({ username: tempName, bio: tempBio });
      setIsEditing(false);
    } catch (err) {
      alert("فشل حفظ التعديلات");
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    setActiveProfileTab("info");
  };

  // اختيار الصورة للمعاينة
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // تأكيد رفع الصورة
  const handleConfirmUpload = async () => {
    if (!selectedFile) return;
    setAvatarPreview(null);
    setIsUploadingAvatar(true);
    try {
      const url = await dataService.uploadAvatar(selectedFile);
      setCurrentUser(prev => ({ ...prev, avatar_url: url }));
      await dataService.updateProfile({ avatar_url: url });
    } catch (err) {
      alert("فشل رفع الصورة. تأكد من حجمها وأنها صورة صالحة.");
    } finally {
      setIsUploadingAvatar(false);
      setSelectedFile(null);
    }
  };

  return (
    <div className="w-full pb-20 text-gray-900 dark:text-gray-100 font-sans">
      
      {/* شاشة معاينة الصورة (تظهر فقط عند اختيار صورة) */}
      {avatarPreview && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#16181c] rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">معاينة الصورة الشخصية</h3>
            <p className="text-sm text-gray-500 mb-6 text-center">سيتم قص الصورة لتظهر بهذا الشكل الدائري في ملفك الشخصي.</p>
            
            {/* دائرة المعاينة */}
            <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-gray-200 dark:border-gray-700 shadow-inner mb-8">
              <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
            </div>

            <div className="flex gap-3 w-full">
              <button 
                onClick={() => { setAvatarPreview(null); setSelectedFile(null); }}
                className="flex-1 py-2.5 rounded-xl font-bold border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" /> إلغاء
              </button>
              <button 
                onClick={handleConfirmUpload}
                className="flex-1 py-2.5 rounded-xl font-bold bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* الهيدر العلوي */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex justify-between items-start mb-3">
          
          {/* الصورة الشخصية */}
          <div className="relative group">
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden cursor-pointer relative ${isUploadingAvatar ? 'opacity-50' : ''}`}
              onClick={() => !isUploadingAvatar && setLightboxImage(profile.avatar_url || null)}
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">{profile.username[0]}</div>
              )}
              
              {/* تأثير التحميل */}
              {isUploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Clock className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
            
            {/* زر تغيير الصورة */}
            {isOwnProfile && !isUploadingAvatar && (
              <label className="absolute bottom-0 right-0 bg-gray-900 dark:bg-white p-1.5 sm:p-2 rounded-full cursor-pointer transition-transform hover:scale-110 shadow-md border-2 border-white dark:border-[#16181c]">
                <Camera className="w-4 h-4 text-white dark:text-black" />
                <input
                  type="file" className="hidden" accept="image/*"
                  onChange={handleFileSelect}
                />
              </label>
            )}
          </div>

          {/* أزرار الإجراءات */}
          <div className="pt-2">
            {!isOwnProfile && isRealUser ? (
              <div className="flex gap-2">
                <button className="p-1.5 border border-gray-400 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <MessageCircle className="w-5 h-5 text-gray-900 dark:text-white" />
                </button>
                <button
                  onClick={onFollowClick}
                  className={`px-5 py-1.5 rounded-full font-bold text-[14px] transition-colors border ${
                    followingIds.includes(profile.id)
                      ? "border-gray-400 dark:border-gray-600 text-gray-900 dark:text-white hover:text-red-500 hover:border-red-500 hover:bg-red-500/10"
                      : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white"
                  }`}
                >
                  {followingIds.includes(profile.id) ? "يتابع" : "متابعة"}
                </button>
              </div>
            ) : isOwnProfile && !isRealUser ? (
              <button onClick={() => setShowAuthModal(true)} className="bg-[#1d9bf0] text-white px-5 py-1.5 rounded-full font-bold text-[14px]">
                تسجيل الدخول
              </button>
            ) : isOwnProfile ? (
              <button 
                onClick={startEditing}
                className="px-4 py-1.5 border border-gray-400 dark:border-gray-600 text-gray-900 dark:text-white rounded-full font-bold text-[14px] hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                تعديل الملف الشخصي
              </button>
            ) : null}
          </div>
        </div>

        {/* الاسم واليوزر */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-5">
            {profile.username}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[14px] text-gray-500" dir="ltr">@{profile.username.replace(/\s+/g, '_').toLowerCase()}</span>
          </div>
        </div>
      </div>

      {/* شريط التبويبات */}
      <div className="flex w-full border-b border-gray-200 dark:border-gray-800 mt-2">
        <button
          onClick={() => setActiveProfileTab("posts")}
          className={`flex-1 text-center py-3 text-[15px] font-bold transition-colors relative hover:bg-gray-100 dark:hover:bg-white/5 ${
            activeProfileTab === "posts" ? "text-gray-900 dark:text-white" : "text-gray-500"
          }`}
        >
          المنشورات
          {activeProfileTab === "posts" && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-[#1d9bf0] rounded-t-full"></div>
          )}
        </button>
        <button
          onClick={() => setActiveProfileTab("info")}
          className={`flex-1 text-center py-3 text-[15px] font-bold transition-colors relative hover:bg-gray-100 dark:hover:bg-white/5 ${
            activeProfileTab === "info" ? "text-gray-900 dark:text-white" : "text-gray-500"
          }`}
        >
          معلومات الحساب
          {activeProfileTab === "info" && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-[#1d9bf0] rounded-t-full"></div>
          )}
        </button>
      </div>

      {/* محتوى التبويبات */}
      <div className="pb-10 pt-4 px-2 sm:px-4 bg-gray-50 dark:bg-transparent min-h-screen">
        
        {/* تاب المنشورات (تم تحويلها لستايل Cards) */}
        {activeProfileTab === "posts" && (
          <div className="space-y-4">
            {isLoadingMemes ? (
              <div className="text-center py-10">
                <Clock className="w-6 h-6 text-gray-400 mx-auto animate-spin" />
              </div>
            ) : localUserMemes.length > 0 ? (
              localUserMemes.map(meme => (
                // تصميم الكارت المنفصل للمنشور
                <div key={meme.id} className="bg-white dark:bg-[#16181c] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
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
                    onUserProfileClick={setSelectedProfileId}
                    isFollowingCreator={followingIds.includes(meme.user_id)}
                    onImageClick={setLightboxImage}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-16 bg-white dark:bg-[#16181c] rounded-2xl border border-gray-200 dark:border-gray-800">
                <p className="text-gray-500 text-[15px]">لا توجد منشورات.</p>
              </div>
            )}
          </div>
        )}

        {/* تاب المعلومات (تم زيادة التفاصيل وتنسيقها) */}
        {activeProfileTab === "info" && (
          <div className="bg-white dark:bg-[#16181c] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5 shadow-sm">
            {isEditing ? (
              // وضع تعديل المعلومات
              <div className="space-y-5">
                <div>
                  <label className="block text-[13px] font-bold text-gray-500 mb-1.5 px-1">الاسم بالكامل</label>
                  <input
                    type="text" value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 focus:border-[#1d9bf0] focus:ring-1 focus:ring-[#1d9bf0] outline-none text-[15px] text-gray-900 dark:text-white transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-500 mb-1.5 px-1">النبذة الشخصية</label>
                  <textarea
                    value={tempBio}
                    onChange={(e) => setTempBio(e.target.value)}
                    placeholder="اكتب شيئاً عن نفسك..."
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 focus:border-[#1d9bf0] focus:ring-1 focus:ring-[#1d9bf0] outline-none resize-none h-24 text-[15px] text-gray-900 dark:text-white transition-shadow"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 rounded-xl text-[14px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">إلغاء</button>
                  <button onClick={handleSaveProfile} className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-[14px] font-bold hover:opacity-90 transition-opacity">حفظ التغييرات</button>
                </div>
              </div>
            ) : (
              // عرض المعلومات بتفاصيل غنية
              <div className="space-y-8">
                
                {/* قسم النبذة */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-5 h-5 text-[#1d9bf0]" />
                    <h3 className="text-[16px] font-bold text-gray-900 dark:text-white">عن المستخدم</h3>
                  </div>
                  <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                    {profile.bio || "هذا المستخدم يفضل الصمت ولم يكتب نبذة شخصية بعد."}
                  </p>
                </div>

                {/* قسم الإحصائيات (Grid) */}
                <div>
                  <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-3">نظرة عامة</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center">
                      <span className="text-2xl font-black text-gray-900 dark:text-white mb-1">{profile.followers_count}</span>
                      <span className="text-[13px] text-gray-500 font-bold">متابعون</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center">
                      <span className="text-2xl font-black text-gray-900 dark:text-white mb-1">{profile.following_count || 0}</span>
                      <span className="text-[13px] text-gray-500 font-bold">يتابع</span>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 flex flex-col items-center text-center col-span-2">
                      <Award className="w-8 h-8 text-[#1d9bf0] mb-2" />
                      <span className="text-lg font-black text-[#1d9bf0] mb-1">{profile.meme_level}</span>
                      <span className="text-[13px] text-blue-600 dark:text-blue-400 font-bold">المستوى الحالي في المجرة</span>
                    </div>
                  </div>
                </div>

                {/* قسم تفاصيل الحساب */}
                <div>
                  <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-3">تفاصيل الحساب</h3>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-[14px] text-gray-600 dark:text-gray-400">
                      <Shield className="w-4 h-4" />
                      <span>حالة الحساب: </span>
                      <strong className="text-green-600 dark:text-green-400 font-bold">نشط</strong>
                    </li>
                    <li className="flex items-center gap-3 text-[14px] text-gray-600 dark:text-gray-400">
                      <CalendarDays className="w-4 h-4" />
                      <span>عدد المنشورات المعتمدة: </span>
                      <strong className="text-gray-900 dark:text-white font-bold">{localUserMemes.length} منشور</strong>
                    </li>
                  </ul>
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
              }
