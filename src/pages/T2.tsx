import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const T2 = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
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
      <main className="container max-w-2xl mx-auto px-2 sm:px-4 py-4 space-y-4">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-2">Layout Sandbox</h2>
          <p className="text-muted-foreground">
            Use this page to test spacing, typography, and components.
          </p>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 text-center">Card A</Card>
          <Card className="p-4 text-center">Card B</Card>
          <Card className="p-4 text-center">Card C</Card>
          <Card className="p-4 text-center">Card D</Card>
        </div>
        <div className="flex gap-3">
          <Button className="flex-1">Primary</Button>
          <Button variant="outline" className="flex-1">Outline</Button>
        </div>
      </main>
    </div>
  );
};

export default T2;


