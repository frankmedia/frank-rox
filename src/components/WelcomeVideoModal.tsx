import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type WelcomeVideoModalProps = {
  open: boolean;
  onClose: () => void;
  url?: string | null;
  title?: string | null;
};

const extractYouTubeId = (url?: string | null): string | null => {
  if (!url) return null;
  const regex =
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/;
  const match = url.match(regex);
  return match?.[1] ?? null;
};

export const WelcomeVideoModal = ({ open, onClose, url, title }: WelcomeVideoModalProps) => {
  const videoId = extractYouTubeId(url || undefined);
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&playsinline=1`
    : null;

  return (
    <Dialog open={open} onOpenChange={(openState) => (!openState ? onClose() : undefined)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title || "Welcome to ROXPT"}</DialogTitle>
          <DialogDescription>
            {embedUrl
              ? "Watch this quick intro before starting your first block."
              : "Add a YouTube URL in the admin console to greet new athletes."}
          </DialogDescription>
        </DialogHeader>

        {embedUrl ? (
          <div className="w-full aspect-video rounded-xl overflow-hidden bg-black">
            <iframe
              className="w-full h-full"
              src={embedUrl}
              title={title || "Welcome video"}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300">
            No welcome video has been configured yet. Head to the admin dashboard and paste a
            YouTube link to greet first-time users.
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

