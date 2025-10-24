import { useEffect, useMemo, useState } from "react";
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

  const [status, setStatus] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    const exchange = async () => {
      if (!code) return;
      try {
        setStatus("Exchanging code for tokens...");
        const resp = await fetch("/api/strava-exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          setErrorMsg(data?.error || "Token exchange failed");
          setStatus("");
          return;
        }
        setStatus("Connected! Tokens received.");
        // Mark client-side as connected for UI (tokens should be stored server-side)
        try {
          localStorage.setItem("strava_connected", "true");
        } catch {}
        setTimeout(() => navigate("/profile"), 1000);
      } catch (e: any) {
        setErrorMsg(e?.message || String(e));
        setStatus("");
      }
    };
    exchange();
  }, [code, navigate]);

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
            <p className="text-muted-foreground mb-6">{status || "Code received. Finalizing connection..."}</p>
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            {errorMsg && <p className="text-xs text-red-500 mb-2">{errorMsg}</p>}
            {scope && <p className="text-xs text-muted-foreground mb-2">Scope: {scope}</p>}
          </>
        )}
        <Button onClick={() => navigate("/profile")} className="w-full">Back to Profile</Button>
      </Card>
    </div>
  );
};

export default AuthStravaCallback;


