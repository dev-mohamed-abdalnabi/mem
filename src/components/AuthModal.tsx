import React, { useState } from "react";
import { X, Mail, Lock, User, Sparkles, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { dataService } from "../services/dataService"; // تأكد من صحة المسار حسب مشروعك

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "signin" | "signup";
  authTab?: "signin" | "signup";
  setAuthTab?: (tab: "signin" | "signup") => void;
  setShowAuthModal?: (show: boolean) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  initialTab = "signin",
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  
  // حقول الإدخال
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  
  // حالات الخطأ والتحميل
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (activeTab === "signin") {
        // تسجيل الدخول الحقيقي ومزامنة البيانات
        // ملاحظة: لو مسمي الدالة في الـ dataService اسم تاني غير login أو signIn عدلها هنا
        if (dataService.login) {
          await dataService.login(email, password);
        } else if (dataService.signIn) {
          await dataService.signIn(email, password);
        } else {
          throw new Error("دالة تسجيل الدخول غير معرفة في dataService");
        }
      } else {
        // إنشاء حساب جديد حقيقي
        if (dataService.register) {
          await dataService.register(email, password, username);
        } else if (dataService.signUp) {
          await dataService.signUp(email, password, username);
        } else {
          throw new Error("دالة إنشاء الحساب غير معرفة في dataService");
        }
      }
      
      // لو العملية نجحت، بنعمل ريفريش للصفحة عشان الـ App يلقط الحساب الجديد ويقفل المودال
      window.location.reload();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "حدث خطأ ما، يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all animate-fade-in" dir="rtl">
      
      {/* خلفية الإغلاق عند الضغط خارج المودال */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* جسم المودال بتصميم زجاجي شياكة جداً */}
      <div className="relative w-full max-w-md overflow-hidden bg-white dark:bg-[#16181c] border border-gray-100 dark:border-gray-800/80 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] transition-all animate-scale-up">
        
        {/* إضاءة خفيفة في الخلفية لجمال التصميم */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* زرار الإغلاق العلوي */}
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* الهيدر وعلامة النجوم للشياكة */}
        <div className="flex flex-col items-center text-center mt-4 mb-6">
          <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-2xl mb-3">
            <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white">
            {activeTab === "signin" ? "مرحباً بك مجدداً!" : "إنشاء حساب جديد"}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {activeTab === "signin" ? "سجل دخولك عشان تتابع الميمز وتتفاعل" : "انضم لينا وشارك ميمز حقيقية مع المجتمع"}
          </p>
        </div>

        {/* الأزرار العلوية للتبديل التلقائي بين (تسجيل / إنشاء) */}
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800/60 rounded-xl mb-5">
          <button
            onClick={() => { setActiveTab("signin"); setError(null); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === "signin" 
                ? "bg-white dark:bg-[#1e2026] text-gray-900 dark:text-white shadow-sm" 
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            onClick={() => { setActiveTab("signup"); setError(null); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === "signup" 
                ? "bg-white dark:bg-[#1e2026] text-gray-900 dark:text-white shadow-sm" 
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            حساب جديد
          </button>
        </div>

        {/* رسائل الخطأ إن وجدت */}
        {error && (
          <div className="p-3 mb-4 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-500/20 text-center">
            {error}
          </div>
        )}

        {/* فورم الإدخال */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* حقل اسم المستخدم يظهر فقط في حالة الحساب الجديد */}
          {activeTab === "signup" && (
            <div className="relative">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 mr-1">اسم المستخدم</label>
              <div className="relative flex items-center">
                <User className="absolute right-3.5 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  required
                  placeholder="مثال: meme_king"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#16181c] transition-all"
                />
              </div>
            </div>
          )}

          {/* حقل البريد الإلكتروني */}
          <div className="relative">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 mr-1">البريد الإلكتروني</label>
            <div className="relative flex items-center">
              <Mail className="absolute right-3.5 text-gray-400 w-4 h-4" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pr-10 pl-4 py-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#16181c] transition-all text-left dir-ltr"
              />
            </div>
          </div>

          {/* حقل كلمة المرور */}
          <div className="relative">
            <div className="flex justify-between items-center mb-1.5 mr-1 ml-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400">كلمة المرور</label>
              {activeTab === "signin" && (
                <button type="button" className="text-[11px] text-blue-500 hover:underline">نسيت الباسورد؟</button>
              )}
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute right-3.5 text-gray-400 w-4 h-4" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-10 pl-11 py-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#16181c] transition-all text-left dir-ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* زر التثبيت والتسجيل */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-extrabold py-3.5 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{activeTab === "signin" ? "تسجيل الدخول" : "إنشاء الحساب الحقيقي"}</span>
                <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
