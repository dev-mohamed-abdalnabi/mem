import React, { useState, useEffect } from "react";
import { AlertTriangle, Users, Trash2, Eye, EyeOff, Pin, Zap, Lock, LogOut, BarChart3, Activity, TrendingUp, MessageSquare, Check, X } from "lucide-react";
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

interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  created_at: string;
}

interface Meme {
  id: string;
  user_id: string;
  caption: string;
  image_url: string;
  created_at: string;
  profiles?: Profile;
}

/**
 * لوحة تحكم المشرف - صفحة محمية بكلمة مرور
 * تتحكم في جميع جوانب الموقع من البلاغات والحسابات والمنشورات
 */
export default function AdminPanel({ currentUser, setActiveTab }: AdminPanelProps) {
  // --- حالات المكون (States) ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setLocalActiveTab] = useState<"reports" | "users" | "memes" | "logs" | "stats">("reports");
  const [reports, setReports] = useState<Report[]>([]);
  const [bannedAccounts, setBannedAccounts] = useState<BannedAccount[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [memes, setMemes] = useState<Meme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stats, setStats] = useState<any>(null);

  // --- التحقق من صلاحيات المشرف ---
  useEffect(() => {
    if (!isAuthenticated) return;
    loadAllData();
  }, [isAuthenticated, activeTab]);

  /**
   * تحميل جميع البيانات المطلوبة
   */
  const loadAllData = async () => {
    setLoading(true);
    try {
      if (activeTab === "reports") loadReports();
      else if (activeTab === "users") loadBannedAccounts();
      else if (activeTab === "memes") loadMemes();
      else if (activeTab === "logs") loadAdminLogs();
      else if (activeTab === "stats") loadStats();
    } finally {
      setLoading(false);
    }
  };

  /**
   * التحقق من كلمة مرور المشرف
   */
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("يجب تسجيل الدخول أولاً");

      const { data: profile, error: profError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profError || !profile || (profile.role !== "admin" && profile.role !== "moderator")) {
        throw new Error("ليس لديك صلاحيات كافية للوصول إلى لوحة التحكم");
      }

      setIsAuthenticated(true);
      setError("");
      setSuccess("تم التحقق من الصلاحيات بنجاح!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * جلب البلاغات المفتوحة
   */
  const loadReports = async () => {
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
    }
  };

  /**
   * جلب الحسابات المحظورة
   */
  const loadBannedAccounts = async () => {
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
    }
  };

  /**
   * جلب المنشورات
   */
  const loadMemes = async () => {
    try {
      const { data, error: err } = await supabase
        .from("memes")
        .select("*, profiles:user_id(*)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (err) throw err;
      setMemes(data || []);
    } catch (e: any) {
      setError(`خطأ في جلب المنشورات: ${e.message}`);
    }
  };

  /**
   * جلب سجل الأنشطة
   */
  const loadAdminLogs = async () => {
    try {
      const { data, error: err } = await supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (err) throw err;
      setAdminLogs(data || []);
    } catch (e: any) {
      setError(`خطأ في جلب السجلات: ${e.message}`);
    }
  };

  /**
   * جلب الإحصائيات
   */
  const loadStats = async () => {
    try {
      const [memeCount, userCount, reportCount, bannedCount] = await Promise.all([
        supabase.from("memes").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("banned_accounts").select("id", { count: "exact", head: true }).eq("is_active", true)
      ]);

      setStats({
        totalMemes: memeCount.count || 0,
        totalUsers: userCount.count || 0,
        openReports: reportCount.count || 0,
        bannedAccounts: bannedCount.count || 0
      });
    } catch (e: any) {
      setError(`خطأ في جلب الإحصائيات: ${e.message}`);
    }
  };

  /**
   * حل البلاغ - حذف المنشور أو رفض البلاغ
   */
  const resolveReport = async (reportId: string, memeId: string, action: "delete" | "dismiss") => {
    try {
      if (action === "delete") {
        // Soft delete بدل الحذف الحقيقي عشان محتفظين بسجل البلاغ والتوثيق
        await supabase.from("memes").update({ status: "deleted" }).eq("id", memeId);
      }

      await supabase
        .from("reports")
        .update({ status: action === "delete" ? "resolved" : "dismissed" })
        .eq("id", reportId);

      await logAdminAction("resolve_report", "report", reportId, { action });

      setSuccess(`تم ${action === "delete" ? "حذف" : "رفض"} البلاغ بنجاح!`);
      loadReports();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(`خطأ: ${e.message}`);
    }
  };

  /**
   * حظر مستخدم بسبب - بناخد السبب من المشرف بسرعة (prompt) عشان الشاشة
   * متتزنقش بمودال إضافي؛ الدالة دي هي اللي بتستخدم banAccount فعلياً
   * (كانت موجودة قبل كده بس مفيش أي زرار في الواجهة بينده عليها أصلاً)
   */
  const promptBanUser = async (userId: string, username?: string) => {
    if (!userId) return;
    const reason = window.prompt(`اكتب سبب حظر ${username ? `"${username}"` : "المستخدم"}:`);
    if (!reason || !reason.trim()) return;
    await banAccount(userId, reason.trim());
  };

  /**
   * حظر مستخدم بسبب
   */
  const banAccount = async (userId: string, reason: string) => {
    try {
      await supabase.from("banned_accounts").insert({
        user_id: userId,
        banned_by: currentUser.id,
        reason,
        ban_type: "permanent"
      });

      await logAdminAction("ban_account", "user", userId, { reason });

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
   * حذف منشور
   */
  const deleteMeme = async (memeId: string) => {
    try {
      // Soft delete بدل الحذف الحقيقي عشان محتفظين بسجل البلاغ والتوثيق
      await supabase.from("memes").update({ status: "deleted" }).eq("id", memeId);
      await logAdminAction("delete_meme", "meme", memeId);
      setSuccess("تم حذف المنشور بنجاح!");
      loadMemes();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(`خطأ: ${e.message}`);
    }
  };

  /**
   * إخفاء منشور
   */
  const hideMeme = async (memeId: string) => {
    try {
      await supabase.from("meme_moderation").upsert({
        meme_id: memeId,
        is_hidden: true,
        hidden_at: new Date().toISOString()
      });
      await logAdminAction("hide_meme", "meme", memeId);
      setSuccess("تم إخفاء المنشور بنجاح!");
      loadMemes();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(`خطأ: ${e.message}`);
    }
  };

  /**
   * تثبيت منشور
   */
  const pinMeme = async (memeId: string) => {
    try {
      await supabase.from("meme_moderation").upsert({
        meme_id: memeId,
        is_pinned: true,
        pinned_at: new Date().toISOString()
      });
      await logAdminAction("pin_meme", "meme", memeId);
      setSuccess("تم تثبيت المنشور بنجاح!");
      loadMemes();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(`خطأ: ${e.message}`);
    }
  };

  /**
   * تعزيز منشور
   */
  const boostMeme = async (memeId: string) => {
    try {
      await supabase.from("meme_moderation").upsert({
        meme_id: memeId,
        is_boosted: true,
        boost_level: 5,
        boosted_at: new Date().toISOString()
      });
      await logAdminAction("boost_meme", "meme", memeId);
      setSuccess("تم تعزيز المنشور بنجاح!");
      loadMemes();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(`خطأ: ${e.message}`);
    }
  };

  /**
   * تسجيل نشاط المشرف
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
            الوصول محصور على حسابات الأدمن/المشرف فقط. لازم تكون مسجل دخول بحساب صلاحياته admin أو moderator.
          </p>

          <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? "جاري التحقق..." : "تحقق من صلاحياتي وادخل"}
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
                    <img loading="lazy" decoding="async"
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
                    <button
                      onClick={() => promptBanUser(report.meme?.user_id)}
                      className="bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      حظر الناشر
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
        ) : activeTab === "memes" ? (
          <div className="space-y-4">
            <h2 className="text-xl font-black mb-4">المنشورات ({memes.length})</h2>
            {memes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">لا توجد منشورات</p>
            ) : (
              memes.map((meme) => (
                <div key={meme.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{meme.profiles?.username}</p>
                      <p className="text-sm text-gray-600 mt-1">{meme.caption?.substring(0, 100)}</p>
                    </div>
                  </div>

                  {meme.image_url && (
                    <img loading="lazy" decoding="async"
                      src={meme.image_url}
                      alt="المنشور"
                      className="w-full max-h-64 object-cover rounded-lg mb-4"
                    />
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => deleteMeme(meme.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف
                    </button>
                    <button
                      onClick={() => hideMeme(meme.id)}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-yellow-700 transition-colors flex items-center gap-2"
                    >
                      <EyeOff className="w-4 h-4" />
                      إخفاء
                    </button>
                    <button
                      onClick={() => pinMeme(meme.id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Pin className="w-4 h-4" />
                      تثبيت
                    </button>
                    <button
                      onClick={() => boostMeme(meme.id)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      تعزيز
                    </button>
                    <button
                      onClick={() => promptBanUser(meme.user_id, meme.profiles?.username)}
                      className="bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      حظر صاحب المنشور
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : activeTab === "logs" ? (
          <div className="space-y-4">
            <h2 className="text-xl font-black mb-4">سجل الأنشطة ({adminLogs.length})</h2>
            {adminLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">لا توجد سجلات</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-2 font-bold">الإجراء</th>
                      <th className="px-4 py-2 font-bold">النوع</th>
                      <th className="px-4 py-2 font-bold">الوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminLogs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2">{log.action}</td>
                        <td className="px-4 py-2">{log.target_type}</td>
                        <td className="px-4 py-2 text-gray-600">{new Date(log.created_at).toLocaleDateString("ar-EG")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === "stats" ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats && [
              { label: "إجمالي المنشورات", value: stats.totalMemes, icon: TrendingUp, color: "blue" },
              { label: "إجمالي المستخدمين", value: stats.totalUsers, icon: Users, color: "green" },
              { label: "البلاغات المفتوحة", value: stats.openReports, icon: AlertTriangle, color: "red" },
              { label: "الحسابات المحظورة", value: stats.bannedAccounts, icon: Lock, color: "yellow" }
            ].map((stat, i) => {
              const Icon = stat.icon;
              const colorClass = {
                blue: "bg-blue-100 text-blue-600",
                green: "bg-green-100 text-green-600",
                red: "bg-red-100 text-red-600",
                yellow: "bg-yellow-100 text-yellow-600"
              }[stat.color];

              return (
                <div key={i} className={`${colorClass} rounded-xl p-6 text-center`}>
                  <Icon className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-2xl font-black">{stat.value}</p>
                  <p className="text-sm font-bold mt-2">{stat.label}</p>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
