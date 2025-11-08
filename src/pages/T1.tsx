import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HorizontalRow = ({
  title,
  itemPrefix,
  itemCount = 8,
}: {
  title: string;
  itemPrefix: string;
  itemCount?: number;
}) => {
  const items = Array.from({ length: itemCount }).map((_, i) => `${itemPrefix} ${i + 1}`);
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
          View all <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      <div
        className="relative -mx-2 px-2"
      >
        {/* Horizontal scroll container with snapping and hidden scrollbar */}
        <div
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1
          [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="list"
          aria-label={title}
        >
          {items.map((label, idx) => (
            <Card
              key={idx}
              role="listitem"
              className="snap-center shrink-0 w-[78vw] sm:w-[420px] p-5 bg-card/80 border
              flex flex-col justify-between"
            >
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Card</p>
                <h4 className="text-2xl font-extrabold">{label}</h4>
                <p className="text-foreground/80">
                  This is a horizontally scrollable card. Swipe to browse more.
                </p>
              </div>
              <div className="mt-4">
                <Button className="w-full">Open</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

const T1 = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header (matches other pages style) */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold">Test UI — T1</h1>
            <Button variant="outline" size="sm" onClick={() => navigate('/overview')}>
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-2 sm:px-4 py-4 space-y-8">
        <p className="text-muted-foreground">
          This page demonstrates mobile-style horizontal scrolling rows (PWA-friendly).
          Swipe each row horizontally.
        </p>

        <HorizontalRow title="Featured" itemPrefix="Featured item" />
        <HorizontalRow title="Trending" itemPrefix="Trending item" />
        <HorizontalRow title="Suggestions" itemPrefix="Suggestion" />
      </main>
    </div>
  );
};

export default T1;


