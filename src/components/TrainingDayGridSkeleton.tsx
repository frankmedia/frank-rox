export const TrainingDayGridSkeleton = ({ count = 14 }: { count?: number }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className="rounded-lg border-2 border-border p-6 animate-pulse"
        >
          <div className="flex flex-col items-center justify-center text-center space-y-2">
            <div className="h-12 w-12 bg-muted rounded-full" />
            <div className="h-3 w-20 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

