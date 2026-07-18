import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// بنمنع قائمة المتصفح (تحميل الصورة/الفيديو، فتح في تاب جديد، إلخ) اللي
// بتظهر مع الضغطة المطولة (لمس) أو الرايت كليك على أي صورة أو فيديو في
// التطبيق كله. حط الاستماع هنا مرة واحدة بدل ما نكرره في كل مكون بيعرض ميديا.
document.addEventListener("contextmenu", (e) => {
  const target = e.target as HTMLElement;
  if (target && (target.tagName === "IMG" || target.tagName === "VIDEO")) {
    e.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
