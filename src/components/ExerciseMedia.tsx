import { useState } from "react";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

interface ExerciseMediaProps {
  url: string;
  alt: string;
  className?: string;
}

/**
 * Detects if URL is a YouTube link and extracts video ID
 */
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

export function ExerciseMedia({ url, alt, className = "" }: ExerciseMediaProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const youtubeId = getYouTubeVideoId(url);

  if (youtubeId) {
    // YouTube video with loading state
    return (
      <Card className={`overflow-hidden ${className} relative`}>
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 w-full aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center z-10"
            >
              <Loader2 className="w-12 h-12 animate-spin text-yellow-500" />
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: isLoading ? 0 : 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative w-full aspect-video bg-black"
        >
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?controls=1&modestbranding=1&rel=0&showinfo=0`}
            title={alt}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
            onLoad={() => setIsLoading(false)}
          />
        </motion.div>
      </Card>
    );
  }

  // Regular image with loading state
  if (hasError) return null;
  
  return (
    <Card className={`overflow-hidden ${className} relative`}>
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 w-full aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center z-10"
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 animate-spin text-yellow-500" />
              <p className="text-sm text-gray-400 animate-pulse">Loading...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.img
        src={url}
        alt={alt}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: isLoading ? 0 : 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full h-full object-cover aspect-video"
        onLoad={() => setIsLoading(false)}
        onError={(e) => {
          setHasError(true);
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </Card>
  );
}

/**
 * Thumbnail version for cards - smaller, fixed height
 */
export function ExerciseMediaThumbnail({ url, alt }: ExerciseMediaProps) {
  const youtubeId = getYouTubeVideoId(url);

  if (youtubeId) {
    // YouTube thumbnail
    return (
      <div className="w-full h-32 bg-black rounded-t-lg overflow-hidden">
        <img
          src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
          alt={alt}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Regular image thumbnail
  return (
    <div className="w-full h-32 overflow-hidden rounded-t-lg">
      <img
        src={url}
        alt={alt}
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}

