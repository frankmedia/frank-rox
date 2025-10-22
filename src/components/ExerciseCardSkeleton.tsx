export const ExerciseCardSkeleton = () => {
  return (
    <div className="rounded-lg border border-border p-4 animate-pulse">
      <div className="flex items-start gap-3">
        {/* Icon skeleton */}
        <div className="flex-shrink-0 w-10 h-10 bg-muted rounded-full" />
        
        <div className="flex-1 space-y-3">
          {/* Title skeleton */}
          <div className="h-6 bg-muted rounded w-3/4" />
          
          {/* Details skeleton */}
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </div>
        
        {/* Arrow skeleton */}
        <div className="w-5 h-5 bg-muted rounded" />
      </div>
    </div>
  );
};

export const ExerciseListSkeleton = ({ count = 5 }: { count?: number }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ExerciseCardSkeleton key={i} />
      ))}
    </div>
  );
};

