import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, LogOut, Mail, User as UserIcon, ClipboardCheck, HeartPulse, Link2, Smartphone } from "lucide-react";
import { getUserSheet } from "@/services/googleSheets";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { isPWA, usePWAInstall } from "@/utils/pwaInstall";
import { isHealthAvailable, requestHealthPermissions, getHealthDataForAssessment } from "@/services/healthKit";

const Profile = () => {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const { installable, installed, promptInstall } = usePWAInstall();
  const [userSheet, setUserSheet] = useState<{
    user: string;
    password: string;
    sheetUrl: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthSupported, setHealthSupported] = useState<boolean>(false);
  const [healthConnected, setHealthConnected] = useState<boolean>(false);

  const user = {
    email: authUser?.email || "frank@example.com",
    name: authUser?.name || "Frank",
    avatarUrl: "",
  };

  useEffect(() => {
    const loadUserSheet = async () => {
      try {
        setLoading(true);
        const sheet = await getUserSheet();
        setUserSheet(sheet);
      } catch (error) {
        console.error("Error loading user sheet:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserSheet();
  }, []);

  // Detect native and health availability
  useEffect(() => {
    const detect = async () => {
      try {
        const native = Capacitor.isNativePlatform();
        if (!native) {
          setHealthSupported(false);
          return;
        }
        const { available } = await isHealthAvailable();
        setHealthSupported(!!available);
      } catch (e) {
        setHealthSupported(false);
      }
    };
    detect();
  }, []);

  const handleSignOut = () => {
    logout();
    toast.success("Signed out successfully");
    navigate("/login");
  };

  const handleOpenSheets = () => {
    if (userSheet?.sheetUrl) {
      window.open(userSheet.sheetUrl, "_blank");
    }
  };

  const handleConnectHealth = async () => {
    try {
      if (!healthSupported) {
        toast.error("Health not available", { description: "Install the native app to connect Apple Health / Health Connect" });
        return;
      }
      const ok = await requestHealthPermissions();
      if (!ok) {
        toast.error("Permissions denied", { description: "Please enable permissions in your Health app" });
        return;
      }
      // Optional: light import to confirm connectivity
      await getHealthDataForAssessment();
      setHealthConnected(true);
      toast.success("Health connected", { description: "You're ready to sync sleep and HR data" });
    } catch (e) {
      toast.error("Failed to connect health");
    }
  };

  const handleConnectStrava = () => {
    const clientId = (import.meta as any).env?.VITE_STRAVA_CLIENT_ID;
    const defaultRedirect = `${window.location.origin}/auth/strava/callback`;
    const redirectUri = (import.meta as any).env?.VITE_STRAVA_REDIRECT_URI || defaultRedirect;
    if (!clientId) {
      toast.error("Missing Strava config", { description: "Set VITE_STRAVA_CLIENT_ID in your env" });
      return;
    }
    const params = new URLSearchParams({
      client_id: String(clientId),
      redirect_uri: redirectUri,
      response_type: "code",
      approval_prompt: "auto",
      scope: "read"
    });
    window.location.href = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  };

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-gradient-to-b from-primary/10 to-background pt-8 pb-12">
        <div className="container max-w-2xl mx-auto px-4">
          <div className="flex flex-col items-center">
            <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-bold text-foreground mt-4">{user.name}</h1>
            <Badge variant="secondary" className="mt-2">
              <Mail className="w-3 h-3 mr-1" />
              {user.email}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 -mt-6">
        {/* Connections */}
        <Card className="p-6 mb-4 shadow-lg">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Connections</h3>
          <div className="space-y-3">
            {/* Native: Health Connect / HealthKit */}
            {Capacitor.isNativePlatform() ? (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <HeartPulse className={`w-5 h-5 ${healthConnected ? "text-green-500" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Health (Apple / Android)</p>
                    <p className="text-xs text-muted-foreground">
                      {healthSupported ? (healthConnected ? "Connected" : "Available") : "Not available on this device"}
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={handleConnectHealth} disabled={!healthSupported}>
                  {healthConnected ? "Reconnect" : "Connect"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <HeartPulse className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Health (Apple / Android)</p>
                    <p className="text-xs text-muted-foreground">Install the native app to connect</p>
                  </div>
                </div>
                {!installed && (
                  <Button size="sm" variant="outline" onClick={promptInstall}>
                    Install App
                  </Button>
                )}
              </div>
            )}

            {/* Web/PWA: Strava */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Link2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Strava</p>
                  <p className="text-xs text-muted-foreground">Connect to import activities</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={handleConnectStrava}>
                Connect Strava
              </Button>
            </div>

            {/* PWA install (Web only) */}
            {!Capacitor.isNativePlatform() && !installed && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Install RoxPT</p>
                    <p className="text-xs text-muted-foreground">Add to your home screen for faster access</p>
                  </div>
                </div>
                {installable && (
                  <Button size="sm" onClick={promptInstall}>
                    Install
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>
        {/* HYROX Assessment - Entire card is clickable */}
        <Card 
          className="p-6 mb-4 shadow-lg bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border-2 border-yellow-500 cursor-pointer hover:border-yellow-400 hover:shadow-xl active:scale-[0.98] transition-all duration-200"
          onClick={() => navigate("/assessment")}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardCheck className="w-7 h-7 text-yellow-500" />
                <h3 className="text-xl font-bold text-white">HYROX Athlete Assessment</h3>
              </div>
              <p className="text-base text-white/80">
                Complete your 25-question profile to get personalized training insights
              </p>
            </div>
            <div className="ml-4 text-yellow-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Workout Sheet Info */}
        <Card className="p-6 mb-4 shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">
                Workout Sheet
              </h3>
              {loading ? (
                <p className="text-foreground">Loading...</p>
              ) : userSheet ? (
                <p className="text-foreground font-medium">{userSheet.user}'s Training Plan</p>
              ) : (
                <p className="text-muted-foreground text-sm">Not configured</p>
              )}
            </div>
            {userSheet && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenSheets}
                className="ml-2"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open
              </Button>
            )}
          </div>
          
          {userSheet && (
            <div className="text-xs text-muted-foreground font-mono bg-secondary/30 p-2 rounded truncate">
              {userSheet.sheetUrl}
            </div>
          )}
        </Card>

        {/* Account Section */}
        <Card className="p-6 mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Login Credentials</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div className="flex items-center gap-3 flex-1">
                <UserIcon className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Username</p>
                  <p className="text-xl font-bold text-foreground">{userSheet?.user || user.name}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3 flex-1">
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Password</p>
                  <p className="text-xl font-bold text-foreground font-mono">{userSheet?.password || '••••••••'}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* App Info */}
        <Card className="p-6 mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">About</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data Source</span>
              <span className="font-medium">Google Sheets</span>
            </div>
          </div>
        </Card>

        {/* Sign Out */}
        <Button
          variant="destructive"
          className="w-full"
          size="lg"
          onClick={handleSignOut}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sign Out
        </Button>
      </main>
    </div>
  );
};

export default Profile;

