import React from "react";
import Header from "../Header";
import RightSidebar from "../RightSidebar";
import AuthModal from "../AuthModal";
import Lightbox from "../Lightbox";
import BottomNavigation from "../BottomNavigation";
import { Profile, Notification, Meme } from "../../types";

/**
 * واجهة الخصائص لمكون التخطيط الرئيسي
 */
interface MainLayoutProps {
  children: React.ReactNode; // المحتوى الذي سيتم عرضه داخل التخطيط
  currentUser: Profile; // المستخدم الحالي
  notifications: Notification[]; // الإشعارات
  activeTab: string; // التبويب النشط حالياً
  isRealUser: boolean; // هل المستخدم مسجل دخول فعلياً
  profiles: Profile[]; // قائمة البروفايلات المتاحة
  showAuthModal: boolean; // حالة إظهار مودال تسجيل الدخول
  authTab: "signin" | "signup"; // التبويب النشط في مودال الدخول
  lightboxImage: string | null; // رابط الصورة في اللايت بوكس
  lightboxMediaType: 'image' | 'video' | null; // نوع الوسائط في اللايت بوكس
  lightboxMeme?: Meme | null; // البوست اللي بتاعه الصورة/الفيديو المفتوح، عشان أزرار التفاعل تشتغل فعلياً
  onLightboxLikeToggle?: (memeId: string) => void;
  onLightboxSaveToggle?: (memeId: string) => void;
  onLightboxShareCompleted?: (memeId: string) => void;
  onLightboxOpenComments?: (meme: Meme) => void;
  onNavigate: (tab: string, options?: { profileId?: string }) => void; // وظيفة التنقل بين التبويبات
  onSearch: (query: string) => void; // وظيفة البحث
  onUserSwitch: (profile: Profile) => void; // وظيفة تبديل المستخدم
  onMarkNotificationsRead: () => void; // وظيفة وضع علامة مقروء على الإشعارات
  onNotificationClick?: (notif: Notification) => void; // وظيفة الانتقال لمكان الإشعار (البوست أو البروفايل)
  onShowAuthModal: () => void; // وظيفة إظهار مودال الدخول
  onCloseAuthModal: () => void; // وظيفة إغلاق مودال الدخول
  setAuthTab: (tab: "signin" | "signup") => void; // وظيفة تغيير تبويب الدخول
  setShowAuthModal: (show: boolean) => void; // وظيفة التحكم في إظهار مودال الدخول
  onSignOutReal: () => void; // وظيفة تسجيل الخروج
  setSelectedProfileId: (id: string | null) => void; // وظيفة تحديد بروفايل مستخدم
  onCloseLightbox: () => void; // وظيفة إغلاق اللايت بوكس
  unreadMessagesCount?: number; // عدد الرسايل الغير مقروءة
}

/**
 * مكون التخطيط الرئيسي (MainLayout)
 * هذا المكون يجمع الهيدر، القائمة الجانبية، والمودالات في مكان واحد
 */
const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  currentUser,
  notifications,
  activeTab,
  isRealUser,
  profiles,
  showAuthModal,
  authTab,
  lightboxImage,
  lightboxMediaType,
  lightboxMeme,
  onLightboxLikeToggle,
  onLightboxSaveToggle,
  onLightboxShareCompleted,
  onLightboxOpenComments,
  onNavigate,
  onSearch,
  onUserSwitch,
  onMarkNotificationsRead,
  onNotificationClick,
  onShowAuthModal,
  onCloseAuthModal,
  setAuthTab,
  setShowAuthModal,
  onSignOutReal,
  setSelectedProfileId,
  onCloseLightbox,
  unreadMessagesCount = 0
}) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col antialiased" dir="rtl">
      
      {/* مودال تسجيل الدخول وإنشاء الحساب */}
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={onCloseAuthModal} 
          initialTab={authTab}
          authTab={authTab}
          setAuthTab={setAuthTab}
          setShowAuthModal={setShowAuthModal}
        />
      )}

      {/* مكون عرض الصور والفيديوهات بشكل مكبر (Lightbox) */}
      {lightboxImage && (
        <Lightbox
          mediaUrl={lightboxImage}
          mediaType={lightboxMediaType || 'image'}
          meme={lightboxMeme || null}
          onClose={onCloseLightbox}
          onLikeToggle={onLightboxLikeToggle}
          onSaveToggle={onLightboxSaveToggle}
          onShareCompleted={onLightboxShareCompleted}
          onOpenComments={onLightboxOpenComments}
        />
      )}

      {/* الشريط السفلي للموبايل (BottomNavigation) */}
      <BottomNavigation
        activeTab={activeTab}
        onNavigate={onNavigate}
        currentUser={currentUser}
        isRealUser={isRealUser}
        onShowAuthModal={onShowAuthModal}
      />

      {/* الهيدر العلوي (Header) */}
      <Header
        currentUser={currentUser} 
        notifications={notifications} 
        activeTab={activeTab} 
        isRealUser={isRealUser} 
        availableProfiles={profiles}
        onNavigate={onNavigate} 
        onSearch={onSearch}
        onUserSwitch={onUserSwitch} 
        onMarkNotificationsRead={onMarkNotificationsRead}
        onNotificationClick={onNotificationClick}
        onShowAuthModal={onShowAuthModal} 
        onSignOutReal={onSignOutReal}
        unreadMessagesCount={unreadMessagesCount}
      />

      {/* جسد التطبيق والمحتوى الرئيسي */}
      {/* صفحة الرسايل بتاخد المساحة كلها بار-تو-بار من غير الصندوق المتوسط
          والـ padding والـ sidebar - عشان تحس إنها صفحة قائمة بذاتها مش
          ودجت جوه صفحة تانية */}
      {activeTab === "messages" ? (
        <main className="w-full flex-1 flex flex-col min-h-0">
          {children}
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-0 md:px-4 py-6 w-full flex-1 flex lg:flex-row flex-col gap-6 items-start">
          {/* القائمة الجانبية (Sidebar) */}
          <RightSidebar
            isRealUser={isRealUser} 
            profiles={profiles}
            onShowAuthModal={onShowAuthModal}
            setSelectedProfileId={setSelectedProfileId} 
            setActiveTab={onNavigate}
            activeTab={activeTab} 
          />

          {/* مساحة عرض الصفحات (Content Area) */}
          <div className="flex-1 max-w-full lg:max-w-2xl mx-auto w-full">
            {children}
          </div>
        </main>
      )}
    </div>
  );
};

export default MainLayout;
