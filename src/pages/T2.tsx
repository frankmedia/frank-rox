import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const T2 = () => {
  const navigate = useNavigate();

  // Freeze page scroll while mounted
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlHeight = document.documentElement.style.height;
    const prevBodyHeight = document.body.style.height;
    const prevOverscroll = (document.body.style as any).overscrollBehaviorY;
    
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.height = "100%";
    document.body.style.height = "100%";
    (document.body.style as any).overscrollBehaviorY = "none";
    
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.height = prevHtmlHeight;
      document.body.style.height = prevBodyHeight;
      (document.body.style as any).overscrollBehaviorY = prevOverscroll || "";
    };
  }, []);
  return (
    <div className="fixed inset-0 bg-background overflow-hidden" style={{ touchAction: 'none' }}>
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold">Test UI — T2</h1>
            <Button variant="outline" size="sm" onClick={() => navigate('/overview')}>
              Back
            </Button>
          </div>
        </div>
      </header>
      {/* Centered content area; page is frozen (no scrolling) */}
      <main
        className="container max-w-2xl mx-auto px-6 pt-10 pb-40 flex flex-col items-center justify-center text-center"
        style={{ height: 'calc(var(--app-height, 100vh) - 4rem)' }}
      >
        <div className="space-y-3">
          <h2 className="text-3xl font-extrabold tracking-tight">Frozen Page</h2>
          <p className="text-lg text-muted-foreground">
            This page does not scroll. The three actions stay fixed at the bottom.
          </p>
        </div>
      </main>
      {/* Fixed 3-button action bar above the global bottom nav (h-16) */}
      <div className="fixed left-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40">
        <div className="container max-w-2xl mx-auto px-4 pb-2">
          <div className="bg-background/95 backdrop-blur border border-border rounded-xl p-2 shadow-lg">
            <div className="flex items-center gap-2">
              <Button className="flex-1 h-14 text-lg font-bold">Action 1</Button>
              <Button variant="secondary" className="flex-1 h-14 text-lg font-bold">Action 2</Button>
              <Button variant="outline" className="flex-1 h-14 text-lg font-bold">Action 3</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default T2;


