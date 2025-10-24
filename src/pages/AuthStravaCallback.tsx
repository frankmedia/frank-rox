import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const AuthStravaCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { code, scope, error } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      code: params.get("code"),
      scope: params.get("scope"),
      error: params.get("error"),
    };
  }, [location.search]);

  useEffect(() => {
    // Placeholder: this is where we'd call a server API to exchange code -> tokens
    // e.g. await fetch('/api/strava/exchange-token', { method: 'POST', body: JSON.stringify({ code }) })
  }, [code]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="p-6 max-w-md w-full text-center">
        {error ? (
          <>
            <h1 className="text-2xl font-bold mb-2">Strava Connection Failed</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2">Strava Connected</h1>
            <p className="text-muted-foreground mb-6">Code received. Finalizing connection...</p>
            {scope && <p className="text-xs text-muted-foreground mb-2">Scope: {scope}</p>}
          </>
        )}
        <Button onClick={() => navigate("/profile")} className="w-full">Back to Profile</Button>
      </Card>
    </div>
  );
};

export default AuthStravaCallback;


