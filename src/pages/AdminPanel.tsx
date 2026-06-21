import React, { useState, useEffect } from "react";
import { AlertTriangle, Users, Trash2, Eye, EyeOff, Pin, Zap, Lock, LogOut, BarChart3, Activity } from "lucide-react";
import { supabase } from "../supabaseClient";
import { Profile } from "../types";

interface AdminPanelProps {
  currentUser: Profile;
  setActiveTab: (tab: string) => void;
}

interface Report {
  id: string;
  meme_id: string;
  reporter_id: string;
  reason: string;
  status: string;
  created_at: string;
  meme?: any;
  reporter?: Profile;
}

interface BannedAccount {
  id: string;
  user_id: string;
  reason: string;
  ban_type: string;
  banned_at: string;
  expires_at?: string;
}

/**
 * لوحة تحكم المشرف - صفحة محمية بكلمة مرور
 * تتحكم في جميع جوانب الموقع من البلاغات والحسابات والمنشورات
 */
export default function AdminPanel({ currentUser, setActiveTab }: AdminPanelProps) {
  // --- حالات المكون (States) ---
  const [adminPassword, setAdminPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setLocalActiveTab] = useState<"reports" | "users" | "memes" | "logs" | "stats">("reports");
  const [reports, setReports] = useState<Report[]>([]);
  const [bannedAccounts, setBannedAccounts] = useState<BannedAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // --- التحقق من صلاحيات المشرف ---
  useEffect(() => {
    if (!isAuthenticated) return;
    loadReports();
    loadBannedAccounts();
  }, [isAuthenticated, activeTab]);

  /**
   * التحقق من كلمة مرور المشرف
   * كلمة المرور يجب تغييرها في الإنتاج
   */
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // كلمة المرور الافتراضية (يجب تغييرها في الإنتاج)
    const ADMIN_PASSWORD = "mem_admin_2026_secure";
    
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError("");
      setSuccess("تم تسجيل الدخول بنجاح!");
      setTimeout(() => setSuccess(""), 3000);
    } else {
      setError("كلمة المرور غير صحيحة!");
      setAdminPassword("");
    }
  };

  /**
   * جلب البلاغات المفتوحة من قاعدة البيانات
   */
  const loadReports = async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("reports")
        .select("*, meme:meme_id(*), reporter:reporter_id(*)")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (err) throw err;
      setReports(data || []);
    } catch (e: any) {
      setError(`خطأ في جلب البلاغات: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * جلب الحسابات المحظورة
   */
  const loadBannedAccounts = async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("banned_accounts")
        .select("*")
        .eq("is_active", true)
        .order("banned_at", { ascending: false });

      if (err) throw err;
      setBannedAccounts(data || []);
    } catch (e: any) {
      setError(`خطأ في جلب الحسابات المحظورة: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * حل البلاغ - حذف المنشور أو رفض البلاغ
   */
  const resolveReport = async (reportId: string, memeId: string, action: "delete" | "dismiss") => {
    try {
      if (action === "delete") {
        // حذف المنشور من قاعدة البيانات
        await supabase.from("memes").delete().eq("id", memeId);
      }

      // تحديث حالة البلاغ
      await supabase
        .from("reports")
        .update({ status: action === "delete" ? "resolved" : "dismissed" })
        .eq("id", reportId);

      // تسجيل النشاط في السجل
      await logAdminAction("resolve_report", "report", reportId, { action });

      setSuccess(`تم ${action === "delete" ? "حذف" : "رفض"} البلاغ بنجاح!`);
      loadReports();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(`خطأ: ${e.message}`);
    }
  };

  /**
   * حظر حساب مستخدم
   */
  const banAccount = async (userId: string, reason: string) => {
    try {
      await supabase.from("banned_accounts").insert({
        user_id: userId,
        banned_by: currentUser.id,
        reason,
        ban_type: "permanent"
      });

      setSuccess("تم حظر الحساب بنجاح!");
      loadBannedAccounts();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(`خطأ: ${e.message}`);
    }
  };

  /**
   * فك الحظر عن حساب
   */
  const unbanAccount = async (banId: string) => {
    try {
      await supabase
        .from("banned_accounts")
        .update({ is_active: false })
        .eq("id", banId);

      setSuccess("تم فك الحظر بنجاح!");
      loadBannedAccounts();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(`خطأ: ${e.message}`);
    }
  };

  /**
   * تسجيل نشاط المشرف في السجل
   */
  const logAdminAction = async (action: string, targetType: string, targetId: string, details?: any) => {
    try {
      await supabase.from("admin_logs").insert({
        admin_id: currentUser.id,
        action,
        target_type: targetType,
        target_id: targetId,
        details: details || {}
      });
    } catch (e) {
      console.error("خطأ في تسجيل النشاط:", e);
    }
  };

  // --- إذا لم يتم المصادقة - عرض نموذج تسجيل الدخول ---
  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-12">
        <div className="bg-white border border-red-200 rounded-2xl p-8 shadow-lg text-right">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Lock className="w-6 h-6 text-red-600" />
            <h2 className="text-2xl font-black text-gray-900">لوحة تحكم المشرف</h2>
          </div>

          <p className="text-sm text-gray-600 mb-6 text-center">
            هذه الصفحة محمية بكلمة مرور قوية. يمكن الوصول إليها من قبل المشرفين فقط.
          </p>

          <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="أدخل كلمة المرور"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-right outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}

            <button
              type="submit"
              className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors"
            >
              دخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- لوحة التحكم الرئيسية ---
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => {
            setIsAuthenticated(false);
            setAdminPassword("");
          }}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 font-bold"
        >
          <LogOut className="w-5 h-5" />
          تسجيل خروج
        </button>
        <h1 className="text-3xl font-black text-gray-900">لوحة تحكم المشرف</h1>
      </div>

      {/* رسائل النجاح والخطأ */}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 font-bold">{success}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 font-bold">{error}</div>}

      {/* التبويبات */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {[
          { id: "reports", label: "البلاغات", icon: AlertTriangle },
          { id: "users", label: "الحسابات", icon: Users },
          { id: "memes", label: "المنشورات", icon: Eye },
          { id: "logs", label: "السجلات", icon: Activity },
          { id: "stats", label: "الإحصائيات", icon: BarChart3 }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setLocalActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* محتوى التبويبات */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin"></div>
            <p className="text-gray-600 mt-4">جاري التحميل...</p>
          </div>
        ) : activeTab === "reports" ? (
          <div className="space-y-4">
            <h2 className="text-xl font-black mb-4">البلاغات المفتوحة ({reports.length})</h2>
            {reports.length === 0 ? (
              <p className="text-gray-500 text-center py-8">لا توجد بلاغات معلقة</p>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">السبب: {report.reason}</p>
                      <p className="text-sm text-gray-600 mt-1">من: {report.reporter?.username}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(report.created_at).toLocaleDateString("ar-EG")}</p>
                    </div>
                  </div>

                  {report.meme?.image_url && (
                    <img
                      src={report.meme.image_url}
                      alt="المنشور المبلغ عنه"
                      className="w-full max-h-64 object-cover rounded-lg mb-4"
                    />
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => resolveReport(report.id, report.meme_id, "delete")}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف المنشور
                    </button>
                    <button
                      onClick={() => resolveReport(report.id, report.meme_id, "dismiss")}
                      className="flex-1 bg-gray-300 text-gray-900 px-4 py-2 rounded-lg font-bold hover:bg-gray-400 transition-colors"
                    >
                      رفض البلاغ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : activeTab === "users" ? (
          <div className="space-y-4">
            <h2 className="text-xl font-black mb-4">الحسابات المحظورة ({bannedAccounts.length})</h2>
            {bannedAccounts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">لا توجد حسابات محظورة</p>
            ) : (
              bannedAccounts.map((ban) => (
                <div key={ban.id} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">السبب: {ban.reason}</p>
                    <p className="text-sm text-gray-600">{ban.ban_type === "permanent" ? "حظر دائم" : "حظر مؤقت"}</p>
                  </div>
                  <button
                    onClick={() => unbanAccount(ban.id)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors"
                  >
                    فك الحظر
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <p className="text-gray-600 text-center py-12">هذا القسم قيد التطوير</p>
        )}
      </div>
    </div>
  );
}
