import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, SkipForward, SkipBack } from "lucide-react";

interface ExerciseMediaProps {
  url?: string;
  alt?: string;
  className?: string;
}

/**
 * Detects if URL is a YouTube link and extracts video ID
 */
function getYouTubeVideoId(url: string | undefined): string | null {
  if (!url) return null;
  
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
  const [showSkipBack, setShowSkipBack] = useState(false);
  const [showSkipForward, setShowSkipForward] = useState(false);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Return null if no URL provided
  if (!url) return null;
  
  const youtubeId = getYouTubeVideoId(url);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!youtubeId) return;
    
    // Load the IFrame Player API code asynchronously
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
    
    // Create player when API is ready
    const initPlayer = () => {
      if ((window as any).YT && (window as any).YT.Player) {
        playerRef.current = new (window as any).YT.Player(`youtube-player-${youtubeId}`, {
          events: {
            onReady: () => {
              console.log('YouTube player ready');
            }
          }
        });
      }
    };
    
    if ((window as any).YT && (window as any).YT.Player) {
      setTimeout(initPlayer, 1000);
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }
  }, [youtubeId]);
  
  const handleSkip = (seconds: number) => {
    if (!playerRef.current || !playerRef.current.getCurrentTime) return;
    
    try {
      const currentTime = playerRef.current.getCurrentTime();
      const newTime = Math.max(0, currentTime + seconds);
      playerRef.current.seekTo(newTime, true);
      
      if (seconds < 0) {
        setShowSkipBack(true);
        setTimeout(() => setShowSkipBack(false), 400);
      } else {
        setShowSkipForward(true);
        setTimeout(() => setShowSkipForward(false), 400);
      }
    } catch (e) {
      console.log('Skip not available yet');
    }
  };

  if (youtubeId) {
    // YouTube video with tap-to-skip zones
    return (
      <Card className={`overflow-hidden ${className} relative`} ref={containerRef}>
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
            id={`youtube-player-${youtubeId}`}
            src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&controls=0&modestbranding=1&rel=0&showinfo=0&fs=0&iv_load_policy=3&disablekb=1&playsinline=1`}
            title={alt}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            className="absolute inset-0 w-full h-full"
            onLoad={() => setIsLoading(false)}
          />
          
          {/* Tap zones for skip */}
          <div className="absolute inset-0 pointer-events-none z-20">
            {/* Left tap zone - skip back 10s */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-1/3 pointer-events-auto cursor-pointer"
              onClick={() => handleSkip(-10)}
            >
              <AnimatePresence>
                {showSkipBack && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/40"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <SkipBack className="w-12 h-12 text-white drop-shadow-lg" />
                      <span className="text-white text-sm font-bold drop-shadow-lg">10s</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Right tap zone - skip forward 10s */}
            <div 
              className="absolute right-0 top-0 bottom-0 w-1/3 pointer-events-auto cursor-pointer"
              onClick={() => handleSkip(10)}
            >
              <AnimatePresence>
                {showSkipForward && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/40"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <SkipForward className="w-12 h-12 text-white drop-shadow-lg" />
                      <span className="text-white text-sm font-bold drop-shadow-lg">10s</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
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

