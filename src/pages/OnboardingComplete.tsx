import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Activity, Heart, Camera } from "lucide-react";
import { toast } from "sonner";
import { AppHealth } from "@/services/appHealth";
import { Capacitor } from "@capacitor/core";

export default function OnboardingComplete() {
  const navigate = useNavigate();
  const [healthConnected, setHealthConnected] = useState(false);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const isNative = Capacitor.isNativePlatform();
  const healthSupported = isNative && Capacitor.getPlatform() === "android";

  useEffect(() => {
    // Check if already connected
    const healthFlag = localStorage.getItem("health_connected");
    const stravaFlag = localStorage.getItem("strava_connected");
    setHealthConnected(healthFlag === "true");
    setStravaConnected(stravaFlag === "true");
  }, []);

  const handleConnectHealth = async () => {
    setLoading(true);
    try {
      if (!healthSupported) {
        toast.error("Health not supported", { 
          description: "Health Connect not available on this device",
          duration: 10000
        });
        return;
      }
      
      const canRequest = typeof (AppHealth as any)?.requestHealthPermissions === 'function';
      if (!canRequest) {
        toast.error("Health plugin unavailable", { description: "Install or enable Health Connect, then try again." });
        return;
      }
      const result = await AppHealth.requestHealthPermissions();
      
      if (!result.granted) {
        const openSettings = async () => {
          try {
            await AppHealth.openHealthConnectSettings();
            toast.info("Enable 'Steps' permission for RoxPT", { duration: 5000 });
          } catch (e) {
            toast.error("Could not open settings");
          }
        };
        
        toast.error("Permission Required", { 
          description: "You need to allow Health Connect access. Click to open settings.",
          duration: 10000,
          action: {
            label: "Open Settings",
            onClick: openSettings
          }
        });
        return;
      }
      
      toast.success("Permissions granted!", { duration: 2000 });
      setHealthConnected(true);
      localStorage.setItem("health_connected", "true");
      toast.success("Health connected!", { duration: 3000 });
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      toast.error("Failed to connect", { 
        description: errorMsg,
        duration: 10000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStrava = () => {
    const clientId = (import.meta as any).env?.VITE_STRAVA_CLIENT_ID as string;
    const defaultRedirect = `${window.location.origin}/auth/strava/callback`;
    const redirectUri = ((import.meta as any).env?.VITE_STRAVA_REDIRECT_URI as string) || defaultRedirect;
    if (!clientId) {
      toast.error("Missing Strava config", { description: "Set VITE_STRAVA_CLIENT_ID and VITE_STRAVA_REDIRECT_URI in your env" });
      return;
    }
    const params = new URLSearchParams({
      client_id: String(clientId),
      redirect_uri: redirectUri,
      response_type: "code",
      approval_prompt: "auto",
      scope: "read,profile:read_all,activity:read_all"
    });
    window.location.href = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="mr-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Connect Your Data</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-32">
        <div className="container max-w-3xl mx-auto px-4 py-8 space-y-6">
          {/* Success Message */}
          <Card className="mt-10 p-6 bg-zinc-900 border-zinc-800 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🎉</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">You're All Set!</h2>
              <p className="text-white/70 text-sm">
                Your personalized training programme is ready. Connect your fitness data to track your progress automatically.
              </p>
            </div>
          </Card>

          {/* Health Connect (Native Android only) */}
          {healthSupported && (
            <Card className="p-6 bg-zinc-900 border-zinc-800">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-6 h-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">Health Connect</h3>
                  <p className="text-sm text-white/70 mb-4">
                    {healthConnected 
                      ? "Connected! Your health data will sync automatically."
                      : "Track steps, heart rate, sleep, and more from your wearable devices."}
                  </p>
                  <Button
                    onClick={handleConnectHealth}
                    disabled={loading || healthConnected}
                    className="w-full h-12 text-base font-bold"
                    style={{ backgroundColor: healthConnected ? "#10b981" : "#FFCC00", color: "#000" }}
                  >
                    {healthConnected ? "✓ Connected" : "Connect Health"}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Strava (Web/PWA) */}
          {!isNative && (
            <Card className="p-6 bg-zinc-900 border-zinc-800">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-6 h-6 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">Strava</h3>
                  <p className="text-sm text-white/70 mb-4">
                    {stravaConnected
                      ? "Connected! Your activities will sync automatically."
                      : "Import your runs, rides, and workouts from Strava."}
                  </p>
                  <Button
                    onClick={handleConnectStrava}
                    disabled={stravaConnected}
                    className="w-full h-12 text-base font-bold"
                    style={{ backgroundColor: stravaConnected ? "#fc5200" : "#FFCC00", color: stravaConnected ? "#fff" : "#000" }}
                  >
                    {stravaConnected ? "✓ Connected" : "Connect Strava"}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Camera/Share Preview (Native Only) */}
          {isNative && (
            <Card className="p-6 bg-zinc-900 border-yellow-500/30">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                  <Camera className="w-6 h-6 text-yellow-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">Share Your Progress 📸</h3>
                  <p className="text-sm text-white/70 mb-3">
                    Camera access to take selfies and share your workout on social media.
                  </p>
                  <p className="text-xs text-white/50">
                    Camera access will be requested when you use this feature for the first time.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Skip Option */}
          <div className="text-center">
            <p className="text-sm text-white/50 mb-2">
              You can always connect these later in your Profile settings.
            </p>
          </div>
        </div>
      </main>

      {/* Fixed Bottom Button */}
      <div className="fixed left-0 right-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="container max-w-3xl mx-auto px-4 pb-4">
          <div className="bg-background/95 backdrop-blur border border-border rounded-xl p-2 shadow-lg">
            <Button
              className="w-full h-14 text-lg font-bold"
              style={{ backgroundColor: "#FFCC00", color: "#000" }}
              onClick={() => navigate("/programme-builder")}
            >
              Let's Go 🚀
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

