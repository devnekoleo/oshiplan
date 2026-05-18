import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-100",
        className
      )}
    />
  );
}

export function PlanCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <Skeleton className="mb-2 h-4 w-24" />
      <Skeleton className="mb-1 h-5 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
