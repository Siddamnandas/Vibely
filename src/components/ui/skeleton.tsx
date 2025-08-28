import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-white/10",
        className
      )}
      {...props}
    />
  );
}

// Card skeleton for music tracks
export function TrackCardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/20 backdrop-blur-sm rounded-2xl overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          {/* Album art skeleton */}
          <Skeleton className="w-32 h-32 flex-shrink-0 rounded-2xl" />
          
          {/* Content skeleton */}
          <div className="flex-grow text-center sm:text-left w-full">
            <div className="flex items-center gap-2 mb-3 justify-center sm:justify-start">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-8 w-48 mb-2 mx-auto sm:mx-0" />
            <Skeleton className="h-6 w-32 mb-4 mx-auto sm:mx-0" />
            <Skeleton className="h-10 w-28 rounded-full mx-auto sm:mx-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Photo grid skeleton
export function PhotoGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-2xl" />
      ))}
    </div>
  );
}

// Story card skeleton
export function StoryCardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="relative">
            <Skeleton className="aspect-[9/16] rounded-2xl" />
            <div className="absolute bottom-3 left-3 right-3">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Profile stats skeleton
export function ProfileStatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="text-center">
          <Skeleton className="h-8 w-16 mb-1 mx-auto" />
          <Skeleton className="h-4 w-20 mx-auto" />
        </div>
      ))}
    </div>
  );
}

// Subscription card skeleton
export function SubscriptionCardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-4 w-full mb-4" />
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}

// Generated cover skeleton
export function GeneratedCoverSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-gradient-to-br from-white/5 to-white/10 border border-white/20 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
          <Skeleton className="aspect-square w-full rounded-2xl mb-4" />
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Navigation skeleton
export function NavigationSkeleton() {
  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 h-20 w-[95%] max-w-md rounded-full border border-white/10 bg-black/30 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-md items-center justify-around px-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className={`rounded-full ${i === 0 ? 'h-16 w-16 -mt-8' : 'h-14 w-14'}`} />
        ))}
      </div>
    </nav>
  );
}

// Swipeable cards skeleton
export function SwipeableCardsSkeleton() {
  return (
    <div className="relative h-[600px] flex items-center justify-center">
      {/* Background cards */}
      <div className="absolute inset-0 flex items-center justify-center">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton 
            key={i}
            className="absolute w-80 h-96 rounded-3xl"
            style={{
              transform: `translateX(${i * 8}px) translateY(${i * 4}px) rotate(${i * 2}deg)`,
              zIndex: 3 - i,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Mini player skeleton
export function MiniPlayerSkeleton() {
  return (
    <div className="fixed bottom-24 left-4 right-4 z-40">
      <div className="bg-gradient-to-r from-black/80 to-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="flex-grow">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
        </div>
        <div className="mt-3">
          <Skeleton className="h-1 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Loading screen skeleton
export function LoadingScreenSkeleton() {
  return (
    <div className="min-h-screen bg-[#0E0F12] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#9FFFA2]/30 border-t-[#9FFFA2] rounded-full animate-spin mx-auto mb-6"></div>
        <Skeleton className="h-6 w-48 mx-auto mb-2" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}

export { Skeleton };