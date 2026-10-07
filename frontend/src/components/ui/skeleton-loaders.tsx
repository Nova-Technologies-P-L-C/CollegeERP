import { Skeleton } from "./skeleton"

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-system-strokecard bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton variant="heading" className="w-48" />
          <Skeleton variant="text" lines={2} />
        </div>
        <Skeleton variant="circle" className="h-12 w-12" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-system-strokecard bg-card shadow-sm">
      <div className="border-b border-system-strokecard p-4">
        <Skeleton variant="heading" className="w-32" />
      </div>
      <div className="p-4">
        <div className="flex flex-col gap-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton variant="circle" className="h-10 w-10" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton variant="text-sm" className="w-1/3" />
                <Skeleton variant="text-sm" className="w-1/2" />
              </div>
              <Skeleton variant="button" className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Skeleton variant="avatar" className="h-20 w-20" />
        <div className="flex flex-col gap-2">
          <Skeleton variant="heading" className="w-48" />
          <Skeleton variant="text" className="w-32" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton variant="text" lines={3} />
      </div>
      <div className="flex gap-2">
        <Skeleton variant="button" />
        <Skeleton variant="button" />
      </div>
    </div>
  )
}

export function StatsCardSkeleton() {
  return (
    <div className="rounded-none border-2 border-border bg-card p-5 shadow-[3px_3px_0px_0px_var(--border)] select-none animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1 mr-4">
          <Skeleton variant="text-sm" className="w-1/2 h-3" />
          <Skeleton variant="heading" className="w-2/3 h-8" />
          <div className="flex items-center gap-1.5 mt-2">
            <Skeleton variant="circle" className="h-4 w-4" />
            <Skeleton variant="text-sm" className="w-1/3 h-3" />
          </div>
        </div>
        <div className="h-12 w-12 rounded-none border-2 border-border bg-muted shrink-0 animate-pulse" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-none border-2 border-border bg-card p-5 shadow-[3px_3px_0px_0px_var(--border)] select-none animate-pulse">
      <Skeleton variant="heading" className="w-1/3 mb-4" />
      <Skeleton variant="rectangle" className="h-[280px] w-full bg-muted" />
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="rounded-none border-2 border-border bg-card p-5 shadow-[3px_3px_0px_0px_var(--border)] select-none animate-pulse">
      <Skeleton variant="heading" className="w-1/3 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-none p-3 bg-muted/20 border-2 border-dashed border-border/20">
            <Skeleton variant="circle" className="h-9 w-9 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text-sm" className="w-1/3 h-3" />
              <Skeleton variant="text-sm" className="w-1/2 h-2.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-none border-2 border-border bg-card p-5 shadow-[3px_3px_0px_0px_var(--border)] animate-pulse">
          <Skeleton variant="heading" className="w-2/3 mb-3" />
          <Skeleton variant="text-sm" className="w-1/2 mb-2" />
          <Skeleton variant="text" lines={2} className="mb-4" />
          <Skeleton variant="button" className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}
