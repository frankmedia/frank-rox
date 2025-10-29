import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ExternalLink, LogOut, Mail, User as UserIcon, ClipboardCheck, HeartPulse, Link2, Smartphone, Trophy, Calendar, Save, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { usePWAInstall } from "@/utils/pwaInstall";
import { isHealthAvailable, requestHealthPermissions, getHealthDataForAssessment } from "@/services/healthKit";
import { importRecentActivities, saveActivitiesToLog } from "@/services/strava";
import { supabase } from "@/utils/supabaseClient";

const Profile = () => {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const { installable, installed, promptInstall } = usePWAInstall();
  const [loading, setLoading] = useState(false);
  const [healthSupported, setHealthSupported] = useState<boolean>(false);
  const [healthConnected, setHealthConnected] = useState<boolean>(false);
  const [stravaConnected, setStravaConnected] = useState<boolean>(false);
  const [raceName, setRaceName] = useState<string>("");
  const [raceDate, setRaceDate] = useState<string>("");
  const [savingRace, setSavingRace] = useState<boolean>(false);
  const [allRaces, setAllRaces] = useState<Array<{ id: number; race_name: string; race_date: string }>>([]);
  const [showAllRaces, setShowAllRaces] = useState<boolean>(false);

  const user = {
    email: authUser?.email || "frank@example.com",
    name: authUser?.name || "Frank",
    avatarUrl: "",
  };

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

  // Read Strava connected flag
  useEffect(() => {
    try {
      const flag = localStorage.getItem("strava_connected");
      setStravaConnected(flag === "true");
    } catch {}
  }, []);

  // Load all upcoming races
  const loadAllRaces = async () => {
    if (!authUser?.clientId) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('races')
        .select('id, race_name, race_date')
        .eq('client_id', authUser.clientId)
        .gte('race_date', today)
        .order('race_date', { ascending: true });
      
      if (!error && data) {
        setAllRaces(data);
        // Set the first race as the current race in the form
        if (data.length > 0) {
          setRaceName(data[0].race_name || "");
          setRaceDate(data[0].race_date || "");
        }
      }
    } catch (e) {
      console.error("Error loading races:", e);
    }
  };

  useEffect(() => {
    loadAllRaces();
  }, [authUser?.clientId]);

  const handleSignOut = () => {
    logout();
    toast.success("Signed out successfully");
    navigate("/login");
  };

  // Password management
  const [editingPassword, setEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [clientPassword, setClientPassword] = useState<string>("");

  // Load client password
  useEffect(() => {
    const loadClientPassword = async () => {
      if (!authUser?.clientId) return;
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("password")
          .eq("id", authUser.clientId)
          .single();
        
        if (!error && data) {
          setClientPassword(data.password || "");
        }
      } catch (e) {
        console.error("Failed to load password:", e);
      }
    };
    loadClientPassword();
  }, [authUser?.clientId]);

  const handleSavePassword = async () => {
    if (!authUser?.clientId) return;
    if (!newPassword.trim()) {
      toast.error("Password cannot be empty");
      return;
    }
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from("clients")
        .update({ password: newPassword })
        .eq("id", authUser.clientId);
      
      if (error) throw error;
      
      setClientPassword(newPassword);
      setEditingPassword(false);
      setNewPassword("");
      toast.success("Password updated successfully");
    } catch (e: any) {
      toast.error("Failed to update password", { description: e.message });
    } finally {
      setLoading(false);
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

  const handleSyncStrava = async () => {
    try {
      const r = await importRecentActivities();
      const result = await saveActivitiesToLog(r.activities);
      toast.success(`Synced Strava: saved ${result.saved}, skipped ${result.skipped}`);
    } catch (e: any) {
      toast.error("Strava sync failed", { description: e?.message || String(e) });
    }
  };

  const handleSaveRace = async () => {
    if (!authUser?.clientId) {
      toast.error("Not logged in");
      return;
    }

    if (!raceName.trim()) {
      toast.error("Please enter a race name");
      return;
    }

    if (!raceDate) {
      toast.error("Please select a race date");
      return;
    }

    try {
      setSavingRace(true);
      
      // Check if a race already exists for this date
      const { data: existing } = await supabase
        .from('races')
        .select('id')
        .eq('client_id', authUser.clientId)
        .eq('race_date', raceDate)
        .single();

      if (existing) {
        // Update existing race
        const { error } = await supabase
          .from('races')
          .update({
            race_name: raceName.trim(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new race
        const { error } = await supabase
          .from('races')
          .insert({
            client_id: authUser.clientId,
            race_name: raceName.trim(),
            race_date: raceDate
          });

        if (error) throw error;
      }

      toast.success("Race saved successfully!");
      // Clear form and reload all races
      setRaceName("");
      setRaceDate("");
      await loadAllRaces();
    } catch (e: any) {
      toast.error("Failed to save race", { description: e?.message || String(e) });
    } finally {
      setSavingRace(false);
    }
  };

  const handleDeleteRace = async (raceId: number) => {
    try {
      const { error } = await supabase
        .from('races')
        .delete()
        .eq('id', raceId);

      if (error) throw error;

      toast.success("Race deleted");
      await loadAllRaces();
    } catch (e: any) {
      toast.error("Failed to delete race", { description: e?.message || String(e) });
    }
  };

  const calculateDaysUntil = (raceDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const race = new Date(raceDate);
    race.setHours(0, 0, 0, 0);
    const diffTime = race.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
            {Capacitor.isNativePlatform() && (
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
            )}

            {/* Web/PWA: Strava */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Link2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Strava</p>
                  <p className="text-xs text-muted-foreground">{stravaConnected ? "Connected" : "Connect to import activities"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleConnectStrava}>
                  {stravaConnected ? "Reconnect" : "Connect"}
                </Button>
                {stravaConnected && (
                  <Button size="sm" onClick={handleSyncStrava}>Sync</Button>
                )}
              </div>
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

        {/* Next Race */}
        <Card className="p-6 mb-4 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="text-sm font-semibold text-muted-foreground">Next Race</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Race Name
              </label>
              <Input
                placeholder="e.g. HYROX London"
                value={raceName}
                onChange={(e) => setRaceName(e.target.value)}
                className="bg-background"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Race Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  value={raceDate}
                  onChange={(e) => setRaceDate(e.target.value)}
                  className="bg-background pl-10"
                />
              </div>
            </div>

            <Button
              onClick={handleSaveRace}
              disabled={savingRace}
              className="w-full"
              size="lg"
            >
              {savingRace ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Race
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* All Upcoming Races */}
        {allRaces.length > 0 && (
          <Card className="p-6 mb-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Upcoming Races ({allRaces.length})
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllRaces(!showAllRaces)}
              >
                {showAllRaces ? 'Hide' : 'Show'}
              </Button>
            </div>

            {showAllRaces && (
              <div className="space-y-3">
                {allRaces.map((race) => {
                  const daysUntil = calculateDaysUntil(race.race_date);
                  return (
                    <div
                      key={race.id}
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 border border-yellow-500/30 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-foreground">{race.race_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(race.race_date).toLocaleDateString('en-GB', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-yellow-500">{daysUntil}</div>
                          <div className="text-xs text-muted-foreground">
                            {daysUntil === 1 ? 'day' : 'days'}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRace(race.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* Account Credentials Section */}
        <Card className="p-6 mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Login Credentials</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div className="flex items-center gap-3 flex-1">
                <UserIcon className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Username</p>
                  <p className="text-xl font-bold text-foreground">{user.name}</p>
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
                  {editingPassword ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="max-w-xs"
                      />
                      <Button
                        onClick={handleSavePassword}
                        disabled={loading}
                        size="sm"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </Button>
                      <Button
                        onClick={() => {
                          setEditingPassword(false);
                          setNewPassword("");
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <p className="text-xl font-bold text-foreground font-mono">{clientPassword || '••••••••'}</p>
                      <Button
                        onClick={() => {
                          setEditingPassword(true);
                          setNewPassword(clientPassword);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Edit
                      </Button>
                    </div>
                  )}
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

