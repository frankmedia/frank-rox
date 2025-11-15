import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { fetchWelcomeVideoSetting, saveWelcomeVideoSetting } from "@/services/appSettings";

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
    <div className="text-zinc-400 text-sm">{label}</div>
    <div className="text-2xl font-semibold mt-1 text-yellow-500">{value}</div>
  </div>
);

interface PTWithClients {
  id: string;
  name: string;
  email: string;
  specializations?: string[];
  is_active: boolean;
  client_count: number;
}

const extractYouTubeId = (url?: string | null): string | null => {
  if (!url) return null;
  const regex =
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/;
  const match = url.match(regex);
  return match?.[1] ?? null;
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeClients, setActiveClients] = useState<string>("—");
  const [activePTs, setActivePTs] = useState<string>("—");
  const [totalRevenue, setTotalRevenue] = useState<string>("—");
  const [recentClients, setRecentClients] = useState<Array<{ id: string; name: string; created_at?: string }>>([]);
  const [ptList, setPtList] = useState<PTWithClients[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [profileData, setProfileData] = useState<{ name: string; email: string; role: string; specializations?: string[] } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [welcomeVideoUrl, setWelcomeVideoUrl] = useState("");
  const [welcomeVideoTitle, setWelcomeVideoTitle] = useState("");
  const [welcomeVideoUpdatedAt, setWelcomeVideoUpdatedAt] = useState<string | null>(null);
  const [welcomeVideoStatus, setWelcomeVideoStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        
        // Fetch PT or Admin profile data
        const storedUser = localStorage.getItem("frank_rock_user");
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setIsAdmin(userData.role === 'admin');
          
          if (userData.role === 'admin') {
            // Fetch admin data
            const { data: adminData } = await supabase
              .from("admins")
              .select("name, email")
              .eq("id", userData.adminId)
              .single();
            
            if (adminData) {
              setProfileData({
                name: adminData.name,
                email: adminData.email,
                role: 'Admin',
              });
            }
            
            // Admin-specific: Fetch PT list with client counts
            const { data: ptsData } = await supabase
              .from("personal_trainers")
              .select("id, name, email, specializations, is_active")
              .order("name");
            
            if (ptsData) {
              // Get client counts for each PT
              const { data: clientCounts } = await supabase
                .from("clients")
                .select("assigned_pt_id")
                .not("assigned_pt_id", "is", null);
              
              const countMap: Record<string, number> = {};
              clientCounts?.forEach((c: any) => {
                countMap[c.assigned_pt_id] = (countMap[c.assigned_pt_id] || 0) + 1;
              });
              
              const ptsWithCounts = ptsData.map((pt: any) => ({
                ...pt,
                client_count: countMap[pt.id] || 0,
              }));
              
              setPtList(ptsWithCounts);
              setActivePTs(String(ptsData.filter((pt: any) => pt.is_active).length));
            }
            
            // Admin-specific: Calculate revenue (placeholder - $200/client/month)
            const { count: clientCount } = await supabase
              .from("clients")
              .select("id", { count: "exact", head: true });
            
            if (clientCount) {
              const monthlyRevenue = clientCount * 200; // $200 per client
              setTotalRevenue(`$${monthlyRevenue.toLocaleString()}`);
            }
            
          } else if (userData.role === 'pt') {
            // Fetch PT data
            const { data: ptData } = await supabase
              .from("personal_trainers")
              .select("name, email, specializations")
              .eq("id", userData.ptId)
              .single();
            
            if (ptData) {
              setProfileData({
                name: ptData.name,
                email: ptData.email,
                role: 'Personal Trainer',
                specializations: ptData.specializations || [],
              });
            }
          }
        }
        
        // Count clients (if table exists)
        const countRes = await supabase
          .from("clients")
          .select("id", { count: "exact", head: true });
        if (!countRes.error && typeof countRes.count === "number") {
          setActiveClients(String(countRes.count));
        }

        // Recent clients (show as recent activity for now)
        const recentRes = await supabase
          .from("clients")
          .select("id,name,created_at")
          .order("created_at", { ascending: false })
          .limit(5);
        if (!recentRes.error && recentRes.data) {
          setRecentClients(recentRes.data.map((r: any) => ({ id: String(r.id), name: r.name, created_at: r.created_at })));
        }
      } catch (e) {
        // noop – dashboard stays with placeholders
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const loadWelcomeVideo = async () => {
      try {
        const setting = await fetchWelcomeVideoSetting();
        if (setting) {
          setWelcomeVideoUrl(setting.url || "");
          setWelcomeVideoTitle(setting.title || "");
          setWelcomeVideoUpdatedAt(setting.updatedAt || null);
        }
      } catch (error) {
        console.warn("No welcome video configured yet.");
      }
    };
    loadWelcomeVideo();
  }, [isAdmin]);

  const handleSaveWelcomeVideo = async () => {
    const cleanUrl = welcomeVideoUrl.trim();
    const videoId = extractYouTubeId(cleanUrl);
    if (!cleanUrl || !videoId) {
      setWelcomeVideoStatus("error");
      return;
    }
    try {
      setWelcomeVideoStatus("saving");
      await saveWelcomeVideoSetting({
        url: cleanUrl,
        title: welcomeVideoTitle.trim() || null,
        updatedBy: profileData?.name || user?.name || "Admin",
      });
      setWelcomeVideoUpdatedAt(new Date().toISOString());
      setWelcomeVideoStatus("saved");
      setTimeout(() => setWelcomeVideoStatus("idle"), 2000);
    } catch (error) {
      setWelcomeVideoStatus("error");
    }
  };

  const previewEmbed = extractYouTubeId(welcomeVideoUrl)
    ? `https://www.youtube.com/embed/${extractYouTubeId(welcomeVideoUrl)}?rel=0&playsinline=1`
    : null;

  return (
    <>
      {/* PT/Admin Profile Card */}
      {profileData && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center text-black text-2xl font-bold">
              {profileData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{profileData.name}</h2>
              <p className="text-zinc-400 text-sm">{profileData.email}</p>
              {profileData.role === 'Admin' ? (
                <p className="text-yellow-500 text-xs mt-1">Admin</p>
              ) : (
                <p className="text-yellow-500 text-xs mt-1">
                  {profileData.specializations && profileData.specializations.length > 0
                    ? profileData.specializations.join(' • ')
                    : 'Personal Trainer'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-semibold mb-4">{profileData?.role === 'Admin' ? 'Admin Dashboard' : 'Coach Dashboard'}</h1>
      
      {/* Stats Grid */}
      {isAdmin ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="Total Clients" value={activeClients} />
          <Stat label="Active PTs" value={activePTs} />
          <Stat label="Monthly Revenue" value={totalRevenue} />
          <Stat label="Avg Clients/PT" value={ptList.length > 0 ? String(Math.round(parseInt(activeClients) / ptList.length)) : "—"} />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="My Clients" value={activeClients} />
          <Stat label="New Logs (7d)" value="—" />
          <Stat label="PRs (7d)" value="—" />
          <Stat label="Strava Syncs" value="—" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column */}
        {isAdmin ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Personal Trainers</h2>
              <Link 
                to="/admin/personal-trainers"
                className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors"
              >
                View All →
              </Link>
            </div>
            {loading && <p className="text-zinc-400 text-sm">Loading…</p>}
            {!loading && ptList.length === 0 && (
              <p className="text-zinc-400 text-sm">No PTs yet. <Link to="/admin/personal-trainers" className="text-yellow-500 hover:underline">Add your first PT</Link></p>
            )}
            {!loading && ptList.length > 0 && (
              <ul className="space-y-3">
                {ptList.slice(0, 5).map((pt) => (
                  <li key={pt.id} className="flex items-center justify-between text-sm border-b border-zinc-800 pb-2 last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-200 font-medium">{pt.name}</span>
                        {!pt.is_active && (
                          <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-500 text-xs">{pt.email}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-yellow-500 font-semibold">{pt.client_count}</div>
                      <div className="text-zinc-500 text-xs">clients</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h2 className="font-medium mb-2">Recent Activity</h2>
            {loading && <p className="text-zinc-400 text-sm">Loading…</p>}
            {!loading && recentClients.length === 0 && (
              <p className="text-zinc-400 text-sm">No data yet.</p>
            )}
            {!loading && recentClients.length > 0 && (
              <ul className="space-y-2">
                {recentClients.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-200">New client</span>
                    <Link 
                      to={`/admin/clients`}
                      className="font-medium text-yellow-500 hover:text-yellow-400 transition-colors"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Right Column */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Recent Clients</h2>
            <Link 
              to="/admin/clients"
              className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors"
            >
              View All →
            </Link>
          </div>
          {loading && <p className="text-zinc-400 text-sm">Loading…</p>}
          {!loading && recentClients.length === 0 && (
            <p className="text-zinc-400 text-sm">No clients yet.</p>
          )}
          {!loading && recentClients.length > 0 && (
            <ul className="space-y-2">
              {recentClients.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm border-b border-zinc-800 pb-2 last:border-0">
                  <div>
                    <div className="text-zinc-200 font-medium">{c.name}</div>
                    <div className="text-zinc-500 text-xs">
                      Joined {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Recently'}
                    </div>
                  </div>
                  <Link 
                    to={`/admin/clients`}
                    className="text-yellow-500 hover:text-yellow-400 transition-colors text-xs"
                  >
                    View →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-medium">Welcome Video</h2>
              <p className="text-xs text-zinc-400">
                Played automatically the first time an athlete logs in.
              </p>
            </div>
            {welcomeVideoUpdatedAt && (
              <span className="text-xs text-zinc-500">
                Updated {new Date(welcomeVideoUpdatedAt).toLocaleString()}
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase text-zinc-400">Video title</Label>
              <Input
                value={welcomeVideoTitle}
                onChange={(e) => setWelcomeVideoTitle(e.target.value)}
                placeholder="Welcome to RoxPT"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs uppercase text-zinc-400">YouTube URL</Label>
              <Input
                value={welcomeVideoUrl}
                onChange={(e) => setWelcomeVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="mt-1"
              />
            </div>

            {previewEmbed && (
              <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-inner">
                <iframe
                  className="w-full h-full"
                  src={previewEmbed}
                  title="Welcome video preview"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-xs">
                {welcomeVideoStatus === "saved" && (
                  <span className="text-green-400">Saved!</span>
                )}
                {welcomeVideoStatus === "error" && (
                  <span className="text-red-400">Enter a valid YouTube link.</span>
                )}
              </div>
              <Button
                onClick={handleSaveWelcomeVideo}
                disabled={!welcomeVideoUrl || welcomeVideoStatus === "saving"}
              >
                {welcomeVideoStatus === "saving" ? "Saving…" : "Save Default Video"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDashboard;


