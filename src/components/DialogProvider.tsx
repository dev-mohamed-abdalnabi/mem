import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * بديل كامل لنوافذ المتصفح الأصلية (alert / confirm / prompt) اللي شكلها
 * غريب عن التطبيق ومش قابلة للتنسيق (كل متصفح وموبايل بيعرضها بشكل مختلف).
 * بدالها مودال مبني بنفس ستايل مودال الإبلاغ بالظبط (بطاقة في النص، خلفية
 * معتمة، أزرار حقيقية) - عشان أي "اختيار" أو تأكيد أو إدخال نص في التطبيق
 * كله يبقى ليه نفس الشكل الموحد.
 */

type DialogState =
  | { type: "alert"; message: string; title?: string }
  | { type: "confirm"; message: string; title?: string; danger?: boolean }
  | { type: "prompt"; message: string; title?: string; placeholder?: string; defaultValue?: string };

interface DialogContextValue {
  alertDialog: (message: string, title?: string) => Promise<void>;
  confirmDialog: (message: string, opts?: { title?: string; danger?: boolean }) => Promise<boolean>;
  promptDialog: (message: string, opts?: { title?: string; placeholder?: string; defaultValue?: string }) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog لازم يتستخدم جوه DialogProvider");
  return ctx;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [inputValue, setInputValue] = useState("");
  const resolverRef = useRef<((value: any) => void) | null>(null);

  const close = useCallback((result: any) => {
    setDialog(null);
    resolverRef.current?.(result);
    resolverRef.current = null;
  }, []);

  const alertDialog = useCallback((message: string, title?: string) => {
    return new Promise<void>((resolve) => {
      resolverRef.current = () => resolve();
      setDialog({ type: "alert", message, title });
    });
  }, []);

  const confirmDialog = useCallback((message: string, opts?: { title?: string; danger?: boolean }) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = (v: boolean) => resolve(v);
      setDialog({ type: "confirm", message, title: opts?.title, danger: opts?.danger });
    });
  }, []);

  const promptDialog = useCallback((message: string, opts?: { title?: string; placeholder?: string; defaultValue?: string }) => {
    return new Promise<string | null>((resolve) => {
      resolverRef.current = (v: string | null) => resolve(v);
      setInputValue(opts?.defaultValue || "");
      setDialog({ type: "prompt", message, title: opts?.title, placeholder: opts?.placeholder, defaultValue: opts?.defaultValue });
    });
  }, []);

  return (
    <DialogContext.Provider value={{ alertDialog, confirmDialog, promptDialog }}>
      {children}
      {dialog &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => {
              // تفلت من الـ alert والـ confirm بالنقر برة، بس مش الـ prompt عشان مايفلتش
              // بغلطة وهو نص كتابة
              if (dialog.type !== "prompt") close(dialog.type === "confirm" ? false : undefined);
            }}
          >
            <div
              className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              {dialog.title && (
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{dialog.title}</h3>
              )}
              <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line mb-4">{dialog.message}</p>

              {dialog.type === "prompt" && (
                <input
                  autoFocus
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={dialog.placeholder}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") close(inputValue.trim() || null);
                    if (e.key === "Escape") close(null);
                  }}
                  className="w-full mb-4 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}

              <div className="flex justify-end gap-2">
                {dialog.type === "alert" && (
                  <button
                    onClick={() => close(undefined)}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold"
                  >
                    تمام
                  </button>
                )}

                {dialog.type === "confirm" && (
                  <>
                    <button
                      onClick={() => close(false)}
                      className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-bold"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => close(true)}
                      className={`px-4 py-2 rounded-lg text-white text-sm font-bold ${
                        dialog.danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      تأكيد
                    </button>
                  </>
                )}

                {dialog.type === "prompt" && (
                  <>
                    <button
                      onClick={() => close(null)}
                      className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-bold"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => close(inputValue.trim() || null)}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold"
                    >
                      تأكيد
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </DialogContext.Provider>
  );
}
