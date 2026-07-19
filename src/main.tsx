import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// أول ما الصفحة تفتح، ولسه محدش دوس على زرار "فاتح/داكن" (يعني مفيش
// كلاس .dark ولا .light على <html>)، بنحدد الثيم الأولي حسب ثيم
// النظام/المتصفح ونثبته كـ كلاس فعلي - عشان كل كلاسات "dark:" في
// Tailwind (اللي بقت مربوطة بالكلاس بعد إضافة @custom-variant) تشتغل
// صح من أول تحميل، مش بس بعد أول دوسة يدوية على الزرار.
if (typeof document !== "undefined") {
  const root = document.documentElement;
  if (!root.classList.contains("dark") && !root.classList.contains("light")) {
    const savedTheme = localStorage.getItem("theme"); // "dark" | "light" | null (لسه ماخترش)
    const theme =
      savedTheme === "dark" || savedTheme === "light"
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    root.classList.add(theme);
  }
}

// بنمنع قائمة المتصفح (تحميل الصورة/الفيديو، فتح في تاب جديد، إلخ) اللي
// بتظهر مع الضغطة المطولة (لمس) أو الرايت كليك على أي صورة أو فيديو في
// التطبيق كله. حط الاستماع هنا مرة واحدة بدل ما نكرره في كل مكون بيعرض ميديا.
document.addEventListener("contextmenu", (e) => {
  const target = e.target as HTMLElement;
  if (target && (target.tagName === "IMG" || target.tagName === "VIDEO")) {
    e.preventDefault();
  }
});

// تسجيل الـService Worker عشان المتصفح (خصوصاً كروم/أندرويد) يعتبر
// الموقع "قابل للتثبيت" كتطبيق (Add to Home Screen / Install App)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
