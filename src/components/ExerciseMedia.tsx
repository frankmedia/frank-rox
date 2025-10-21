import { Card } from "@/components/ui/card";

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
  const youtubeId = getYouTubeVideoId(url);

  if (youtubeId) {
    // YouTube video with minimal controls
    return (
      <Card className={`overflow-hidden ${className}`}>
        <div className="relative w-full aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?controls=1&modestbranding=1&rel=0&showinfo=0`}
            title={alt}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </Card>
    );
  }

  // Regular image
  return (
    <Card className={`overflow-hidden ${className}`}>
      <img
        src={url}
        alt={alt}
        className="w-full h-full object-cover aspect-video"
        onError={(e) => {
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

