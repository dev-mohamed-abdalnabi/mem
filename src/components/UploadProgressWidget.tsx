import React from "react";
import { X, Check, AlertCircle } from "lucide-react";
import { useUploadManager } from "../contexts/UploadManagerContext";

export default function UploadProgressWidget() {
  const { uploads, dismissUpload } = useUploadManager();
  if (uploads.length === 0) return null;

  return (
    <div className="fixed left-0 right-0 bottom-[76px] z-[90] px-3 flex flex-col gap-2 items-center pointer-events-none">
      {uploads.map((u) => {
        const circumference = 2 * Math.PI * 15;
        const offset = circumference - (Math.min(u.progress, 100) / 100) * circumference;
        return (
          <div
            key={u.id}
            className="pointer-events-auto w-full max-w-sm bg-white/95 dark:bg-[#181a20]/95 backdrop-blur-md border border-gray-200 dark:border-gray-800 shadow-lg shadow-black/10 rounded-2xl px-3 py-2.5 flex items-center gap-3 animate-slide-up"
          >
            <div className="relative w-11 h-11 shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
              {u.thumbnail && (
                <img src={u.thumbnail} alt="" className="w-full h-full object-cover" />
              )}
              {u.status !== "done" && u.status !== "error" && (
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                  <svg width="34" height="34" className="-rotate-90">
                    <circle cx="17" cy="17" r="15" stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="none" />
                    <circle
                      cx="17" cy="17" r="15"
                      stroke="#1d9bf0" strokeWidth="3" fill="none"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 150ms linear" }}
                    />
                  </svg>
                </div>
              )}
              {u.status === "done" && (
                <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}
              {u.status === "error" && (
                <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 text-right">
              <p className={`text-xs font-bold truncate ${u.status === "error" ? "text-red-500" : "text-gray-900 dark:text-white"}`}>
                {u.status === "error" ? (u.error || u.label) : u.label}
              </p>
              {u.status === "uploading" && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{u.progress}% • تقدر تكمل تصفح عادي</p>
              )}
            </div>

            {(u.status === "done" || u.status === "error") && (
              <button
                onClick={() => dismissUpload(u.id)}
                className="shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
