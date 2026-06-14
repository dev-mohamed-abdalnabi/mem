import React, { useState, useEffect, useRef } from "react";
import { Camera, MessageCircle, Award, Clock, X, Check, CalendarDays, Users, UserPlus, Image as ImageIcon } from "lucide-react";
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
  
  // تبويبات الصفحة
  const [activeProfileTab, setActiveProfileTab] = useState<"posts" | "info">("posts");
  const [localUserMemes, setLocalUserMemes] = useState<Meme[]>(userMemes);
  const [isLoadingMemes, setIsLoadingMemes] = useState(false);

  // --- حالات أداة قص الصورة (Cropper) ---
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  // منع السكرول عند فتح شاشة الصورة
  useEffect(() => {
    if (avatarPreview) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => { document.body.style.overflow = "auto"; };
  }, [avatarPreview]);

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

  // --- دوال قص الصورة ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile || !imageRef.current) return;
    setIsUploadingAvatar(true);
    
    try {
      // إنشاء Canvas لقص الصورة بالأبعاد والتحريك اللي اختاره المستخدم
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const size = 300; // حجم الصورة النهائي
      canvas.width = size;
      canvas.height = size;

      if (ctx) {
        // حساب الأبعاد
        const img = imageRef.current;
        const scale = zoom;
        const width = img.naturalWidth * scale;
        const height = img.naturalHeight * scale;
        
        // رسم الصورة مع تطبيق التحريك
        ctx.drawImage(
          img,
          (size - width) / 2 + position.x,
          (size - height) / 2 + position.y,
          width,
          height
        );

        // تحويل الـ Canvas لـ File ورفعه
        canvas.toBlob(async (blob) => {
          if (blob) {
            const croppedFile = new File([blob], "avatar.jpg", { type: "image/jpeg" });
            const url = await dataService.uploadAvatar(croppedFile);
            setCurrentUser(prev => ({ ...prev, avatar_url: url }));
            await dataService.updateProfile({ avatar_url: url });
            setAvatarPreview(null);
            setSelectedFile(null);
          }
        }, "image/jpeg", 0.9);
      }
    } catch (err) {
      alert("فشل رفع الصورة.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // تنسيق تاريخ الانضمام
  const joinDate = profile.created_at 
    ? new Date(profile.created_at).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
    : "غير محدد";

  return (
    <div className="w-full pb-20 text-gray-900 dark:text-gray-100 font-sans">
      
      {/* شاشة قص الصورة (Cropper Modal) */}
      {avatarPreview && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm flex flex-col items-center">
            <h3 className="text-white text-lg font-bold mb-2">ضبط الصورة الشخصية</h3>
            <p className="text-gray-400 text-sm mb-6">قم بتحريك وتكبير الصورة لتناسب الدائرة</p>
            
            {/* حاوية القص الدائرية */}
            <div 
              className="w-64 h-64 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 bg-black relative touch-none cursor-move shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <img 
                ref={imageRef}
                src={avatarPreview} 
                alt="Crop preview" 
                className="absolute top-1/2 left-1/2 origin-center max-w-none pointer-events-none"
                style={{
                  transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${zoom})`,
                  minWidth: '100%',
                  minHeight: '100%',
                }}
              />
            </div>

            {/* التحكم في الزوم */}
            <div className="w-full mt-8 px-4 flex items-center gap-3">
              <span className="text-white text-xl">-</span>
              <input 
                type="range" 
                min="0.5" 
                max="3" 
                step="0.1" 
                value={zoom} 
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-[#1d9bf0]"
              />
              <span className="text-white text-xl">+</span>
            </div>

            {/* أزرار الحفظ والإلغاء مع تأثير التحميل */}
            <div className="flex gap-3 w-full mt-8">
              <button 
                disabled={isUploadingAvatar}
                onClick={() => { setAvatarPreview(null); setSelectedFile(null); }}
                className="flex-1 py-3 rounded-full font-bold bg-gray-800 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button 
                disabled={isUploadingAvatar}
                onClick={handleConfirmUpload}
                className="flex-1 py-3 rounded-full font-bold bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUploadingAvatar ? <Clock className="w-5 h-5 animate-spin" /> : "حفظ الصورة"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* الهيدر العلوي */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex justify-between items-start mb-3">
          
          <div className="relative group">
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden cursor-pointer relative ${isUploadingAvatar && !avatarPreview ? 'opacity-50' : ''}`}
              onClick={() => !isUploadingAvatar && setLightboxImage(profile.avatar_url || null)}
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">{profile.username[0]}</div>
              )}
              {isUploadingAvatar && !avatarPreview && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Clock className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
            
            {isOwnProfile && !isUploadingAvatar && (
              <label className="absolute bottom-0 right-0 bg-gray-900 dark:bg-white p-1.5 sm:p-2 rounded-full cursor-pointer shadow-md border-2 border-white dark:border-[#16181c]">
                <Camera className="w-4 h-4 text-white dark:text-black" />
                <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
              </label>
            )}
          </div>

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
                onClick={() => { setIsEditing(true); setActiveProfileTab("info"); }}
                className="px-4 py-1.5 border border-gray-400 dark:border-gray-600 text-gray-900 dark:text-white rounded-full font-bold text-[14px] hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                تعديل الملف الشخصي
              </button>
            ) : null}
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-5">{profile.username}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[14px] text-gray-500" dir="ltr">@{profile.username.replace(/\s+/g, '_').toLowerCase()}</span>
          </div>
        </div>
      </div>

      {/* شريط التبويبات */}
      <div className="flex w-full border-b border-gray-200 dark:border-gray-800 mt-2">
        <button
          onClick={() => setActiveProfileTab("posts")}
          className={`flex-1 text-center py-3 text-[15px] font-bold transition-colors relative hover:bg-gray-100 dark:hover:bg-white/5 ${activeProfileTab === "posts" ? "text-gray-900 dark:text-white" : "text-gray-500"}`}
        >
          المنشورات
          {activeProfileTab === "posts" && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-[#1d9bf0] rounded-t-full"></div>}
        </button>
        <button
          onClick={() => setActiveProfileTab("info")}
          className={`flex-1 text-center py-3 text-[15px] font-bold transition-colors relative hover:bg-gray-100 dark:hover:bg-white/5 ${activeProfileTab === "info" ? "text-gray-900 dark:text-white" : "text-gray-500"}`}
        >
          معلومات الحساب
          {activeProfileTab === "info" && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-[#1d9bf0] rounded-t-full"></div>}
        </button>
      </div>

      {/* محتوى التبويبات */}
      <div className="pb-10 pt-4 bg-gray-50/50 dark:bg-transparent min-h-screen">
        
        {/* المنشورات (شكل كروت) */}
        {activeProfileTab === "posts" && (
          <div className="space-y-4 px-2 sm:px-4">
            {isLoadingMemes ? (
              <div className="text-center py-10"><Clock className="w-6 h-6 text-gray-400 mx-auto animate-spin" /></div>
            ) : localUserMemes.length > 0 ? (
              localUserMemes.map(meme => (
                <div key={meme.id} className="bg-white dark:bg-[#16181c] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                  <MemeCard
                    meme={meme} currentUser={currentUser} onLikeToggle={handleLikeToggle} onSaveToggle={handleSaveToggle}
                    onFollowToggle={handleFollowToggle} onTagClick={setSelectedTag} onDeleteComment={() => {}}
                    onReportSubmit={handleReportSubmit} onShareCompleted={handleShareCompleted} onDeleteMeme={handleDeleteMeme}
                    onUserProfileClick={setSelectedProfileId} isFollowingCreator={followingIds.includes(meme.user_id)} onImageClick={setLightboxImage}
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

        {/* معلومات الحساب (ستايل فيسبوك النظيف) */}
        {activeProfileTab === "info" && (
          <div className="px-4">
            {isEditing ? (
              <div className="space-y-4 bg-white dark:bg-[#16181c] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="الاسم" className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 outline-none text-gray-900 dark:text-white" />
                <textarea value={tempBio} onChange={(e) => setTempBio(e.target.value)} placeholder="النبذة الشخصية..." className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 outline-none resize-none h-20 text-gray-900 dark:text-white" />
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setIsEditing(false)} className="px-5 py-2 rounded-full font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">إلغاء</button>
                  <button onClick={handleSaveProfile} className="px-5 py-2 bg-[#1d9bf0] text-white rounded-full font-bold">حفظ التغييرات</button>
                </div>
              </div>
            ) : (
              // تصميم المعلومات الجديد (بدون مربعات، ستايل ليست زي الفيسبوك)
              <div className="space-y-6">
                
                {/* النبذة */}
                <div className="border-b border-gray-200 dark:border-gray-800 pb-5">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">نبذة</h2>
                  <p className="text-[15px] text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {profile.bio || "لا توجد نبذة شخصية."}
                  </p>
                </div>

                {/* التفاصيل (قائمة) */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">التفاصيل</h2>
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3">
                      <Award className="w-6 h-6 text-gray-400 dark:text-gray-500 shrink-0" />
                      <span className="text-[15px] text-gray-900 dark:text-white">المستوى الحالي: <strong>{profile.meme_level}</strong></span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Users className="w-6 h-6 text-gray-400 dark:text-gray-500 shrink-0" />
                      <span className="text-[15px] text-gray-900 dark:text-white">يتابعه <strong>{profile.followers_count}</strong> شخص</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <UserPlus className="w-6 h-6 text-gray-400 dark:text-gray-500 shrink-0" />
                      <span className="text-[15px] text-gray-900 dark:text-white">يتابع <strong>{profile.following_count || 0}</strong> شخص</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <ImageIcon className="w-6 h-6 text-gray-400 dark:text-gray-500 shrink-0" />
                      <span className="text-[15px] text-gray-900 dark:text-white">نشر <strong>{localUserMemes.length}</strong> منشورات</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CalendarDays className="w-6 h-6 text-gray-400 dark:text-gray-500 shrink-0" />
                      <span className="text-[15px] text-gray-900 dark:text-white">انضم في <strong>{joinDate}</strong></span>
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
