import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ExternalLink, LogOut, Mail, User as UserIcon, ClipboardCheck, HeartPulse, Link2, Smartphone, Trophy, Calendar, Save, Loader2, Trash2, Flame, Activity, Heart, Moon, MapPin, Footprints, RefreshCw, Gauge, Info, Ruler } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { usePWAInstall } from "@/utils/pwaInstall";
import { AppHealth } from "@/services/appHealth";
import { importRecentActivities, saveActivitiesToLog } from "@/services/strava";
import { supabase } from "@/utils/supabaseClient";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: authUser, logout } = useAuth();
  const { installable, installed, promptInstall } = usePWAInstall();
  const [loading, setLoading] = useState(false);
  const [healthSupported, setHealthSupported] = useState<boolean>(false);
  const [healthConnected, setHealthConnected] = useState<boolean>(false);
  const [stravaConnected, setStravaConnected] = useState<boolean>(false);
  const [healthData, setHealthData] = useState<{
    steps: number;
    heartRate: { average: number; max: number; min: number; samples: number } | null;
    distance: number;
    calories: number;
    sleep: number;
    sleepScore: number;
    readiness: number;
    sleepEfficiency: number;
    recoveryScore: number;
    sleepStages: {
      remMinutes: number;
      deepMinutes: number;
      lightMinutes: number;
      awakeMinutes: number;
      outOfBedMinutes: number;
    };
  }>({
    steps: 0,
    heartRate: null,
    distance: 0,
    calories: 0,
    sleep: 0,
    sleepScore: 0,
    readiness: 0,
    sleepEfficiency: 0,
    recoveryScore: 0,
    sleepStages: {
      remMinutes: 0,
      deepMinutes: 0,
      lightMinutes: 0,
      awakeMinutes: 0,
      outOfBedMinutes: 0,
    },
  });
  const [refreshing, setRefreshing] = useState(false);
  const [raceName, setRaceName] = useState<string>("");
  const [raceDate, setRaceDate] = useState<string>("");
  const [savingRace, setSavingRace] = useState<boolean>(false);
  const [allRaces, setAllRaces] = useState<Array<{ id: number; race_name: string; race_date: string }>>([]);
  const [showAllRaces, setShowAllRaces] = useState<boolean>(false);
  const [sleepInsightOpen, setSleepInsightOpen] = useState<boolean>(false);
  const [onboardingProfile, setOnboardingProfile] = useState<any>(null);

  const triggerInsightHaptic = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.warn("Haptics not available", error);
    }
  }, []);

  const handleSleepSheetChange = useCallback((open: boolean) => {
    setSleepInsightOpen(open);

    const next = new URLSearchParams(searchParams);

    if (open) {
      if (searchParams.get("insight") !== "sleep") {
        next.set("insight", "sleep");
        setSearchParams(next, { replace: true });
      }
      triggerInsightHaptic();
    } else {
      if (searchParams.get("insight")) {
        next.delete("insight");
        setSearchParams(next, { replace: true });
      }
    }
  }, [searchParams, setSearchParams, triggerInsightHaptic]);

  useEffect(() => {
    const insight = searchParams.get("insight");
    if (insight === "sleep" && !sleepInsightOpen) {
      setSleepInsightOpen(true);
      triggerInsightHaptic();
    } else if (insight !== "sleep" && sleepInsightOpen) {
      setSleepInsightOpen(false);
    }
  }, [searchParams, sleepInsightOpen, triggerInsightHaptic]);

  // Load onboarding profile (sex/age) from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("onboarding_profile");
      if (raw) setOnboardingProfile(JSON.parse(raw));
    } catch {}
  }, []);

  // Extract sex and age from onboarding profile
  const onboardingSex = onboardingProfile?.answers?.gender || null;
  const onboardingAge = onboardingProfile?.answers?.age || null;

  const formatMetric = useCallback((value: number, formatter?: (value: number) => string) => {
    if (!value || Number.isNaN(value) || value <= 0) return "--";
    return formatter ? formatter(value) : Math.round(value).toString();
  }, []);

  const sleepStageTotals = useMemo(() => {
    const stages = healthData.sleepStages;
    const base = [
      {
        key: 'rem',
        label: 'REM',
        minutes: stages.remMinutes,
        color: '#a855f7',
        cardClass: 'bg-purple-500/10 border border-purple-500/30',
        textClass: 'text-purple-300',
      },
      {
        key: 'deep',
        label: 'Deep',
        minutes: stages.deepMinutes,
        color: '#3b82f6',
        cardClass: 'bg-blue-500/10 border border-blue-500/30',
        textClass: 'text-blue-300',
      },
      {
        key: 'light',
        label: 'Light',
        minutes: stages.lightMinutes,
        color: '#fbbf24',
        cardClass: 'bg-amber-500/10 border border-amber-500/30',
        textClass: 'text-amber-300',
      },
      {
        key: 'awake',
        label: 'Awake',
        minutes: stages.awakeMinutes + stages.outOfBedMinutes,
        color: '#6b7280',
        cardClass: 'bg-gray-500/10 border border-gray-500/30',
        textClass: 'text-muted-foreground',
      },
    ];

    const totalMinutes = base.reduce((sum, stage) => sum + stage.minutes, 0);
    const safeTotal = totalMinutes > 0 ? totalMinutes : 1;

    return {
      totalMinutes,
      safeTotal,
      data: base.map((stage) => {
        const fraction = stage.minutes / safeTotal;
        return {
          ...stage,
          fraction: stage.minutes > 0 ? fraction : 0,
          percent: stage.minutes > 0 ? Math.round(fraction * 100) : 0,
        };
      }),
    };
  }, [healthData.sleepStages]);

  const sleepStageGradient = useMemo(() => {
    let current = 0;
    const segments = sleepStageTotals.data
      .filter((stage) => stage.fraction > 0)
      .map((stage) => {
        const start = current;
        const end = start + stage.fraction * 100;
        current = end;
        return `${stage.color} ${start}% ${end}%`;
      });

    if (segments.length === 0) {
      return '#1f1f2f';
    }

    return `conic-gradient(${segments.join(', ')})`;
  }, [sleepStageTotals]);

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
        const response = await AppHealth.isAvailable();
        console.log('Health Connect response:', response);
        setHealthSupported(response.available);
      } catch (e) {
        console.error('Health check error:', e);
        toast.error(`Health check error: ${e}`);
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

  // Check if health is already connected
  useEffect(() => {
    try {
      const flag = localStorage.getItem("health_connected");
      const connected = flag === "true";
      setHealthConnected(connected);
      if (connected) {
        fetchHealthData();
      }
    } catch {}
  }, []);

  // Fetch health data
  const fetchHealthData = async () => {
    try {
      setRefreshing(true);
      // Get today's data from midnight to now
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const start = startOfToday.toISOString();
      const end = now.toISOString();
      
      // For sleep: query from 6 PM yesterday to now (captures last night's sleep)
      const yesterdayEvening = new Date(now);
      yesterdayEvening.setDate(yesterdayEvening.getDate() - 1);
      yesterdayEvening.setHours(18, 0, 0, 0); // 6 PM yesterday
      const sleepStart = yesterdayEvening.toISOString();
      
      console.log('📊 [Profile] Fetching health data from:', start, 'to:', end);
      console.log('📊 [Profile] Sleep data from:', sleepStart, 'to:', end);
      
      const emptySleep = {
        hours: 0,
        minutes: 0,
        inBedHours: 0,
        inBedMinutes: 0,
        efficiency: 0,
        sleepScore: 0,
        stages: {
          awakeMinutes: 0,
          lightMinutes: 0,
          deepMinutes: 0,
          remMinutes: 0,
          outOfBedMinutes: 0,
        },
        platform: 'android' as const,
      };

      const [stepsResult, heartRateResult, distanceResult, caloriesResult, sleepResult] = await Promise.all([
        AppHealth.getSteps({ start, end }).catch(() => ({ total: 0, platform: 'android' as const })),
        AppHealth.getHeartRate({ start, end }).catch(() => null),
        AppHealth.getDistance({ start, end }).catch(() => ({ kilometers: 0, meters: 0, platform: 'android' as const })),
        AppHealth.getCalories({ start, end }).catch(() => ({ calories: 0, platform: 'android' as const })),
        AppHealth.getSleep({ start: sleepStart, end }).catch(() => emptySleep)
      ]);
      
      const asleepHours = sleepResult.hours || 0;
      const stages = sleepResult.stages || emptySleep.stages;
      const calculatedSleepScore = asleepHours > 0
        ? Math.round(Math.min(asleepHours / 7.5, 1) * 100)
        : 0;
      const sleepScore = sleepResult.sleepScore || calculatedSleepScore;
      const stepGoal = 8000;
      const stepPenaltyRatio = Math.min(Math.max(stepsResult.total - stepGoal, 0) / stepGoal, 1);
      const recoveryScore = Math.round((1 - stepPenaltyRatio) * 100);
      const readiness = Math.round(0.7 * sleepScore + 0.3 * recoveryScore);

      setHealthData({
        steps: stepsResult.total,
        heartRate: heartRateResult && heartRateResult.samples > 0 ? {
          average: heartRateResult.average,
          max: heartRateResult.max,
          min: heartRateResult.min,
          samples: heartRateResult.samples
        } : null,
        distance: distanceResult.kilometers,
        calories: caloriesResult.calories,
        sleep: asleepHours,
        sleepScore,
        readiness,
        sleepEfficiency: sleepResult.efficiency || 0,
        recoveryScore,
        sleepStages: {
          remMinutes: stages.remMinutes || 0,
          deepMinutes: stages.deepMinutes || 0,
          lightMinutes: stages.lightMinutes || 0,
          awakeMinutes: stages.awakeMinutes || 0,
          outOfBedMinutes: stages.outOfBedMinutes || 0,
        },
      });
    } catch (e) {
      console.error('Error fetching health data:', e);
      toast.error('Failed to refresh health data');
    } finally {
      setRefreshing(false);
    }
  };

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
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  const [savingDob, setSavingDob] = useState<boolean>(false);
  const maxBirthDate = useMemo(() => new Date().toISOString().split("T")[0], []);
  const age = useMemo(() => {
    if (!dateOfBirth) return null;
    const dobDate = new Date(dateOfBirth);
    if (Number.isNaN(dobDate.getTime())) return null;
    const today = new Date();
    let years = today.getFullYear() - dobDate.getFullYear();
    const hasHadBirthday =
      today.getMonth() > dobDate.getMonth() ||
      (today.getMonth() === dobDate.getMonth() && today.getDate() >= dobDate.getDate());
    if (!hasHadBirthday) years -= 1;
    return years >= 0 ? years : null;
  }, [dateOfBirth]);

  // Load client password
  useEffect(() => {
    const normalizeDateValue = (value: any): string => {
      if (!value) return "";
      if (typeof value === "string") {
        return value.includes("T") ? value.split("T")[0] : value;
      }
      if (value instanceof Date) {
        return value.toISOString().split("T")[0];
      }
      return "";
    };

    const loadClientProfile = async () => {
      if (!authUser?.clientId) return;
      try {
        const primary = await supabase
          .from("clients")
          .select("password, date_of_birth")
          .eq("id", authUser.clientId)
          .single();

        let passwordValue = "";
        let dobValue = "";

        if (primary.error) {
          const message = primary.error.message?.toLowerCase() || "";
          if (message.includes("date_of_birth")) {
            const fallback = await supabase
              .from("clients")
              .select("password, dob")
              .eq("id", authUser.clientId)
              .single();

            if (fallback.error) throw fallback.error;

            passwordValue = fallback.data?.password || "";
            dobValue = normalizeDateValue(fallback.data?.dob);
          } else {
            throw primary.error;
          }
        } else if (primary.data) {
          passwordValue = primary.data.password || "";
          dobValue = normalizeDateValue((primary.data as any).date_of_birth);
        }

        setClientPassword(passwordValue);
        setDateOfBirth(dobValue);
      } catch (e) {
        console.error("Failed to load client profile:", e);
      }
    };
    loadClientProfile();
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

  const handleSaveDob = async () => {
    if (!authUser?.clientId) return;
    if (!dateOfBirth) {
      toast.error("Please pick a date of birth");
      return;
    }

    try {
      setSavingDob(true);
      const { error } = await supabase
        .from("clients")
        .update({ date_of_birth: dateOfBirth })
        .eq("id", authUser.clientId);

      if (error) {
        const message = error.message?.toLowerCase() || "";
        if (message.includes("date_of_birth")) {
          const fallback = await supabase
            .from("clients")
            .update({ dob: dateOfBirth })
            .eq("id", authUser.clientId);
          if (fallback.error) throw fallback.error;
        } else {
          throw error;
        }
      }

      toast.success("Date of birth updated");
    } catch (e: any) {
      toast.error("Failed to update date of birth", { description: e.message });
    } finally {
      setSavingDob(false);
    }
  };

  const handleDisconnectHealth = () => {
    try {
      localStorage.removeItem("health_connected");
      setHealthConnected(false);
      setHealthData({
        steps: 0,
        heartRate: null,
        distance: 0,
        calories: 0,
        sleep: 0,
        sleepScore: 0,
        readiness: 0,
        sleepEfficiency: 0,
        recoveryScore: 0,
        sleepStages: {
          remMinutes: 0,
          deepMinutes: 0,
          lightMinutes: 0,
          awakeMinutes: 0,
          outOfBedMinutes: 0,
        },
      });
      toast.success("Health disconnected", {
        description: "Your health data connection has been removed",
        duration: 3000
      });
    } catch (e) {
      toast.error("Failed to disconnect");
    }
  };

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
      
      // Guard in case the native plugin isn't installed on the device build
      const canRequest = typeof (AppHealth as any)?.requestHealthPermissions === 'function';
      if (!canRequest) {
        toast.error("Health plugin unavailable", { description: "Install or enable Health Connect, then try again." });
        return;
      }
      const result = await AppHealth.requestHealthPermissions();
      
      if (!result.granted) {
        // Show a toast with action to open settings
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
      
      // Fetch health data
      await fetchHealthData();
      
      toast.success("Health connected!", { 
        description: `Found ${healthData.steps} steps in last 24h`,
        duration: 5000
      });
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
    <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 0 }}>
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div 
            className="flex items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/overview")}
          >
            <Flame className="w-8 h-8" style={{ color: "#FFCC00" }} />
            <h1 className="text-3xl font-black tracking-tight text-primary">
              Rox<span className="text-foreground">PT</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-2 pt-6 pb-6">
        {/* User Profile Card */}
        <Card className="p-6 mb-4 shadow-lg">
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
            {onboardingProfile?.answers && (
              <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
                {onboardingProfile.answers.gender && (
                  <span className="px-3 py-1 rounded-full border border-white/20 text-white/90 text-xs">
                    {onboardingProfile.answers.gender}
                  </span>
                )}
                {typeof onboardingProfile.answers.age === "number" && onboardingProfile.answers.age > 0 && (
                  <span className="px-3 py-1 rounded-full border border-white/20 text-white/90 text-xs">
                    {onboardingProfile.answers.age} yrs
                  </span>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Membership Plans */}
        <section className="mb-6 px-2">
          <Card className="relative p-5 bg-card/80 border flex flex-col justify-between w-full">
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-widest font-bold text-amber-500">
                🥈 Push harder
              </span>
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-extrabold">Performance</h3>
              </div>
              <div className="absolute top-3 right-3">
                <span className="px-2.5 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/15 text-yellow-300 text-xs font-bold">
                  £49.99/mo
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {[
                  "Personalised training plan",
                  "Monthly PT check-ins",
                  "Refined nutrition guidance",
                  "Strength & endurance balance",
                  "Progress review & feedback",
                ].map((f) => (
                  <li key={f} className="text-[15px] sm:text-base text-foreground/80">
                    • {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4">
              <Button
                className="w-full h-12 text-lg font-bold"
                style={{ backgroundColor: "#FFCC00", color: "#000" }}
                onClick={() => {
                  toast.info("Selected Performance. Payment flow coming soon.");
                }}
              >
                Select Performance
              </Button>
            </div>
          </Card>
        </section>
        
        {/* Connections */}
        <Card className="p-6 mb-4 shadow-lg">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Connections</h3>
          <div className="space-y-3">
            {/* Native: Health Connect / HealthKit */}
            {Capacitor.isNativePlatform() && (
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <HeartPulse className={`w-5 h-5 ${healthConnected ? "text-green-500" : "text-muted-foreground"}`} />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Health</p>
                      <p className="text-xs text-muted-foreground">
                        {healthSupported ? (healthConnected ? "Connected" : "Available") : "Not available on this device"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {healthConnected ? (
                      <>
                        <Button size="sm" variant="outline" onClick={handleConnectHealth} disabled={!healthSupported}>
                          Reconnect
                        </Button>
                        <Button size="sm" variant="destructive" onClick={handleDisconnectHealth}>
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={handleConnectHealth} disabled={false}>
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Health Data Display */}
                {healthConnected && (
                  <div className="mt-3 space-y-3">
                    {/* Refresh Button */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Today's Stats</span>
                      <Button 
                        size="sm"
                        variant="ghost"
                        onClick={fetchHealthData}
                        disabled={refreshing}
                        className="h-7 px-2"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>

                    {/* Stats Grid - Icons only with values */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {/* Steps */}
                      <div className="flex items-center justify-center gap-2 p-2.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <Footprints className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-base font-bold text-blue-500">
                          {healthData.steps > 0 ? healthData.steps.toLocaleString() : "--"}
                        </span>
                      </div>

                      {/* Avg Heart Rate */}
                      <div className="flex items-center justify-center gap-2 p-2.5 bg-red-500/10 rounded-lg border border-red-500/20">
                        <Heart className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-base font-bold text-red-500">
                          {healthData.heartRate && healthData.heartRate.average > 0 ? healthData.heartRate.average : "--"}
                        </span>
                      </div>

                      {/* Distance */}
                      <div className="flex items-center justify-center gap-2 p-2.5 bg-green-500/10 rounded-lg border border-green-500/20">
                        <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-base font-bold text-green-500">
                          {healthData.distance > 0 ? `${healthData.distance.toFixed(1)}km` : "--"}
                        </span>
                      </div>

                      {/* Calories */}
                      <div className="flex items-center justify-center gap-2 p-2.5 bg-orange-500/10 rounded-lg border border-orange-500/20">
                        <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        <span className="text-base font-bold text-orange-500">{formatMetric(healthData.calories)}</span>
                      </div>

                      {/* Sleep (quick glance) */}
                      <div className="flex items-center justify-center gap-2 p-2.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <Moon className="w-4 h-4 text-purple-500 flex-shrink-0" />
                        <span className="text-base font-bold text-purple-500">{formatMetric(healthData.sleep, (value) => `${value.toFixed(1)}h`)}</span>
                      </div>

                      {/* Max Heart Rate */}
                      <div className="flex items-center justify-center gap-2 p-2.5 bg-red-500/10 rounded-lg border border-red-500/20">
                        <Activity className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-base font-bold text-red-500">
                          {healthData.heartRate && healthData.heartRate.max > 0 ? healthData.heartRate.max : "--"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
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

        {healthConnected && (
          <Card className="p-5 mb-4 shadow-lg border border-purple-500/20 bg-purple-500/5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-purple-300">Sleep</p>
                  <p className="text-2xl font-bold text-foreground">{formatMetric(healthData.sleep, (value) => `${value.toFixed(1)}h`)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Ruler className="w-7 h-7 text-purple-300" />
                    <span className="text-xl font-bold text-yellow-300">{formatMetric(healthData.sleepScore)}</span>
                    <span className="text-xs uppercase text-purple-400 font-semibold tracking-wide">Sleep Score</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSleepSheetChange(true)}
                    className="inline-flex items-center justify-center text-purple-200 hover:text-purple-100 transition-colors"
                    aria-label="Sleep score details"
                  >
                    <Info className="w-9 h-9" />
                  </button>
                </div>
              </div>

              <div className="flex h-2 w-full overflow-hidden rounded-full bg-purple-500/10">
                {sleepStageTotals.data.map((stage) => (
                  <div
                    key={stage.key}
                    className="h-full transition-all"
                    style={{
                      width: `${stage.fraction * 100}%`,
                      backgroundColor: stage.color,
                    }}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {sleepStageTotals.data.map((stage) => (
                  <div key={stage.key} className={`p-2 rounded-lg ${stage.cardClass}`}>
                    <p className={`text-xs font-semibold uppercase ${stage.textClass}`}>{stage.label}</p>
                    <p className="text-sm font-medium text-foreground">{formatMetric(stage.minutes, (value) => `${(value / 60).toFixed(1)}h`)}</p>
                    <p className="text-xs text-muted-foreground">{stage.percent}% of night</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        <Sheet open={sleepInsightOpen} onOpenChange={handleSleepSheetChange}>
          <SheetContent
            side={Capacitor.isNativePlatform() ? "bottom" : "right"}
            className="sm:max-w-xl w-full p-0"
          >
            <div className="flex h-full flex-col">
              <SheetHeader className="px-6 pt-6 pb-4 text-left">
                <SheetTitle className="text-lg font-semibold">Sleep Score Insights</SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground">
                  Understand how last night’s sleep affects readiness.
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-6 text-sm text-muted-foreground">
                <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
                  <div className="rounded-2xl border border-purple-400/30 bg-purple-500/10 px-3 py-4">
                    <p className="text-[11px] uppercase tracking-wide text-purple-200">Sleep Score</p>
                    <p className="text-2xl font-bold text-purple-50">{formatMetric(healthData.sleepScore)}</p>
                  </div>
                  <div className="rounded-2xl border border-blue-400/30 bg-blue-500/10 px-3 py-4">
                    <p className="text-[11px] uppercase tracking-wide text-blue-200">Efficiency</p>
                    <p className="text-2xl font-bold text-blue-50">{formatMetric(healthData.sleepEfficiency, (value) => `${Math.round(value)}%`)}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-4">
                    <p className="text-[11px] uppercase tracking-wide text-emerald-200">Time Asleep</p>
                    <p className="text-2xl font-bold text-emerald-50">{healthData.sleep ? `${healthData.sleep.toFixed(1)}h` : "--"}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-3 py-4">
                    <p className="text-[11px] uppercase tracking-wide text-amber-200">Awake</p>
                    <p className="text-2xl font-bold text-amber-50">{sleepStageTotals.data.find((stage) => stage.key === 'awake') ? `${(sleepStageTotals.data.find((stage) => stage.key === 'awake')!.minutes / 60).toFixed(1)}h` : "0h"}</p>
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Sleep Score Trend</h4>
                  <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground/80 mb-3">
                      <span>Target</span>
                      <span>Today</span>
                    </div>
                    <div className="relative h-3 w-full rounded-full bg-purple-500/10">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-400 to-yellow-300"
                        style={{ width: `${Math.min(100, Math.max(0, healthData.sleepScore || 0))}%` }}
                      />
                      <div className="absolute inset-y-0 left-[80%] w-[2px] bg-yellow-200/60" />
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground/90">
                      Keep the bar at or above the yellow marker (80) to support higher intensity training days.
                    </p>
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Stage Breakdown</h4>
                  <div className="overflow-hidden rounded-xl border border-zinc-800/70 bg-zinc-950/60">
                    <table className="w-full text-left text-xs text-muted-foreground/80">
                      <thead className="bg-zinc-900/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Stage</th>
                          <th className="px-4 py-3 font-semibold">Hours</th>
                          <th className="px-4 py-3 font-semibold">% of Night</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sleepStageTotals.data.map((stage) => (
                          <tr key={stage.key} className="border-t border-zinc-900/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 text-foreground">
                                <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                                <span className="font-medium">{stage.label}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-foreground">{(stage.minutes / 60).toFixed(1)}h</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="relative h-2 flex-1 rounded-full bg-zinc-900/70">
                                  <div
                                    className="absolute inset-y-0 left-0 rounded-full"
                                    style={{ width: `${stage.percent}%`, backgroundColor: stage.color }}
                                  />
                                </div>
                                <span className="min-w-[2.5rem] text-right text-foreground">{stage.percent}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3">
                    REM fuels cognitive sharpness; Deep sleep handles tissue repair. Keep a 2-hour buffer after training and limit alcohol to protect these phases.
                  </p>
                </section>

                <section>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Nightly Checklist</h4>
                  <div className="grid gap-2 text-muted-foreground/90">
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                      • Set a wind-down reminder so you hit the pillow at the same time nightly.
                    </div>
                    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                      • Get 10 minutes of bright morning light within an hour of waking to anchor your rhythm.
                    </div>
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                      • Keep naps before 3pm and under 20 minutes so night sleep stays consolidated.
                    </div>
                    <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 px-4 py-3">
                      • Keep the room dark, cool (~18°C), and device-free for the last hour before bed.
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </SheetContent>
        </Sheet>

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

        {/* Athlete Details */}
        <Card className="p-6 mb-4 shadow-lg">
          <div className="mb-4">
            <p className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">
              Athlete Details
            </p>
            <p className="text-sm text-muted-foreground/80">
              Information from your onboarding questionnaire
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {onboardingSex && (
              <div className="flex flex-col">
                <span className="text-xs uppercase font-semibold tracking-wide text-muted-foreground mb-1">
                  Biological Sex
                </span>
                <span className="text-base font-medium text-foreground">
                  {onboardingSex}
                </span>
              </div>
            )}
            {onboardingAge && (
              <div className="flex flex-col">
                <span className="text-xs uppercase font-semibold tracking-wide text-muted-foreground mb-1">
                  Age
                </span>
                <span className="text-base font-medium text-foreground">
                  {onboardingAge} years
                </span>
              </div>
            )}
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

