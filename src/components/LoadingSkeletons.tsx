import React from "react";

export const MemeCardSkeleton = () => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800 mb-4 p-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-2" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
        </div>
      </div>

      {/* Caption skeleton */}
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full" />
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-5/6" />
      </div>

      {/* Image skeleton */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-3 max-h-[500px] w-full bg-gray-100 dark:bg-gray-800 h-64" />

      {/* Actions skeleton */}
      <div className="flex gap-4 py-2">
        <div className="h-5 w-5 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-5 w-5 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-5 w-5 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-5 w-5 bg-gray-200 dark:bg-gray-800 rounded" />
      </div>
    </div>
  );
};

export const FeedLoadingSkeleton = () => {
  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto pb-20 lg:pb-8 px-4 md:px-0">
      {[1, 2, 3].map((i) => (
        <MemeCardSkeleton key={i} />
      ))}
    </div>
  );
};

export const ProfileHeaderSkeleton = () => {
  return (
    <div className="w-full bg-white dark:bg-gray-900 shadow-md border-b border-gray-200 dark:border-gray-800 rounded-b-2xl animate-pulse">
      <div className="max-w-5xl mx-auto">
        {/* Cover image skeleton */}
        <div className="w-full h-52 sm:h-80 bg-gray-200 dark:bg-gray-800 rounded-b-2xl" />

        {/* Profile info skeleton */}
        <div className="px-4 sm:px-8 pb-2 flex flex-col md:flex-row items-center md:items-end justify-between relative -mt-20 sm:-mt-24 gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-right w-full">
            {/* Avatar skeleton */}
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-800 shrink-0" />

            {/* Name and info skeleton */}
            <div className="pb-2 min-w-0 flex-1">
              <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-2" />
              <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
            </div>
          </div>

          {/* Buttons skeleton */}
          <div className="flex gap-2 w-full md:w-auto">
            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl w-24" />
            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl w-24" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const LeaderboardSkeleton = () => {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-1" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
          </div>
          <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-12" />
        </div>
      ))}
    </div>
  );
};

export const PageLoadingOverlay = () => {
  return (
    <div className="fixed inset-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-800" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">جاري التحميل...</p>
      </div>
    </div>
  );
};

export const MemeLoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-gray-800" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
      </div>
    </div>
  );
};
