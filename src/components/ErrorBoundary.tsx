import React from "react";
import { RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
}

const CHUNK_RELOAD_FLAG = "mem_chunk_reload_attempted";

/**
 * قبل كده أي خطأ يحصل أثناء الرندر (سواء باج فعلي، أو أشهر حالة: شنك جافاسكريبت
 * قديم اتمسح من السيرفر بعد ديبلوي جديد بينما التطبيق لسه فاتح عند المستخدم -
 * "Failed to fetch dynamically imported module") كان بيوقع شجرة الـ React كلها
 * من غير أي Error Boundary يمسكه، فالمستخدم كان بيشوف شاشة سودة فاضية تماماً
 * (لون الخلفية الداكن) من غير أي رسالة أو زرار يعمل حاجة.
 *
 * دلوقتي: لو الخطأ من نوع "شنك قديم مش موجود"، بنعمل إعادة تحميل تلقائية
 * مرة واحدة بس (عشان مانعملش لووب لانهائي لو فيه باج تاني)، ولو الخطأ غير
 * كده (أو الريلود التلقائي فشل يصلحها) بنوري شاشة واضحة فيها زرار "إعادة تحميل"
 * بدل الشاشة السودة الصامتة.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    const isChunkError = /loading chunk|failed to fetch dynamically imported module|importing a module script failed/i.test(
      message
    );
    return { hasError: true, isChunkError };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("خطأ غير متوقع أوقع التطبيق:", error, info);

    if (this.state.isChunkError) {
      // نحاول ريلود تلقائي مرة واحدة بس - لو حصل تاني في نفس الجلسة يبقى
      // فيه مشكلة تانية غير النسخة القديمة، فنسيب المستخدم يشوف الشاشة بدل
      // ما ندخله في لووب ريلود لا نهائي
      const alreadyAttempted = sessionStorage.getItem(CHUNK_RELOAD_FLAG);
      if (!alreadyAttempted) {
        sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1");
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-[#0b0e11] px-6" dir="rtl">
          <div className="max-w-sm w-full text-center">
            <div className="text-5xl mb-4">😕</div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {this.state.isChunkError ? "فيه تحديث جديد للتطبيق" : "حصل خطأ غير متوقع"}
            </h1>
            <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              {this.state.isChunkError
                ? "التطبيق محتاج تحديث بسيط عشان يشتغل تاني. اضغط الزرار وهيرجعلك تمام."
                : "حاول تعمل إعادة تحميل للصفحة. لو المشكلة استمرت، جرب تتأكد من الاتصال بالنت."}
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold px-6 py-2.5 rounded-full transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
