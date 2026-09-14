type LoadingSkeletonProps = {
  rows?: number;
};

export function LoadingSkeleton({ rows = 5 }: LoadingSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-12 animate-pulse rounded-md bg-background-soft"
        />
      ))}
    </div>
  );
}
