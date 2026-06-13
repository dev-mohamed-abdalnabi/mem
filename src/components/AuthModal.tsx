import React from 'react';

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4">تسجيل الدخول</h2>
        <button onClick={onClose} className="bg-blue-600 text-white w-full py-2 rounded-xl">إغلاق</button>
      </div>
    </div>
  );
}
