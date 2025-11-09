import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { T1Showcase } from "@/components/T1Showcase";

const T1 = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold">Test UI — T1</h1>
            <Button variant="outline" size="sm" onClick={() => navigate("/overview")}>
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-2 sm:px-4 py-4 space-y-8">
        <T1Showcase />
      </main>
    </div>
  );
};

export default T1;


