interface FlameLoaderProps {
  size?: number;
  message?: string;
}

export const FlameLoader = ({ size = 200, message }: FlameLoaderProps) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black z-50">
      <div 
        style={{ width: size, height: size }}
        className="animate-pulse"
      >
        <img 
          src="/flame-loader.svg" 
          alt="Loading..." 
          className="w-full h-full"
        />
      </div>
      {message && (
        <p className="mt-6 text-primary text-lg font-semibold animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};

