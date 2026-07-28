import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // بيفصل مكتبات الـ vendor الكبيرة (react, supabase, motion) في ملفات
      // منفصلة عن كود التطبيق نفسه، عشان المتصفح يقدر يعمل cache لها لوحدها
      // من غير ما تتحمل تاني كل ما تعمل نشر جديد لكود التطبيق بس.
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-motion': ['motion'],
          },
        },
      },
    },
  };
});
