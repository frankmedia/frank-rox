import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const T3 = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold">Test UI — T3</h1>
            <Button variant="outline" size="sm" onClick={() => navigate('/overview')}>
              Back
            </Button>
          </div>
        </div>
      </header>
      <main className="container max-w-2xl mx-auto px-2 sm:px-4 py-4 space-y-4">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-2">Interaction Sandbox</h2>
          <p className="text-muted-foreground">
            Use this page to test interactivity, hover/touch states, and animations.
          </p>
        </Card>
        <div className="grid gap-4">
          <Button className="h-14 text-xl">Big CTA</Button>
          <Button variant="secondary" className="h-14 text-xl">Secondary CTA</Button>
          <Button variant="ghost" className="h-14 text-xl">Ghost</Button>
        </div>
      </main>
    </div>
  );
};

export default T3;


