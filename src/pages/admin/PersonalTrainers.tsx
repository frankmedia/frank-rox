import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, UserPlus, Users } from "lucide-react";

interface PT {
  id: string;
  name: string;
  email: string;
  bio?: string;
  phone?: string;
  certifications?: string[];
  specializations?: string[];
  is_active: boolean;
  created_at: string;
  client_count?: number;
}

const PersonalTrainers = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [pts, setPts] = useState<PT[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  // Form state for new PT
  const [newPT, setNewPT] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    bio: "",
    specializations: "",
  });

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    // Only allow admins
    if (user?.role !== 'admin') {
      toast({ description: "Access denied: Admin only", variant: "destructive" as any });
      navigate('/admin');
      return;
    }
    
    loadPTs();
  }, [authLoading, isAuthenticated, user, navigate]);

  const loadPTs = async () => {
    try {
      setLoading(true);
      
      // Fetch PTs
      const { data: ptsData, error: ptsError } = await supabase
        .from("personal_trainers")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (ptsError) throw ptsError;
      
      // Fetch client counts for each PT
      const { data: clientCounts, error: clientError } = await supabase
        .from("clients")
        .select("assigned_pt_id")
        .not("assigned_pt_id", "is", null);
      
      if (clientError) throw clientError;
      
      // Count clients per PT
      const countMap: Record<string, number> = {};
      clientCounts?.forEach((c: any) => {
        countMap[c.assigned_pt_id] = (countMap[c.assigned_pt_id] || 0) + 1;
      });
      
      // Merge data
      const ptsWithCounts = (ptsData || []).map((pt: any) => ({
        ...pt,
        client_count: countMap[pt.id] || 0,
      }));
      
      setPts(ptsWithCounts);
    } catch (e: any) {
      toast({ description: e?.message || "Failed to load PTs", variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPT = async () => {
    try {
      if (!newPT.name || !newPT.email || !newPT.password) {
        toast({ description: "Name, email, and password are required", variant: "destructive" as any });
        return;
      }
      
      const specializations = newPT.specializations
        ? newPT.specializations.split(",").map(s => s.trim()).filter(Boolean)
        : [];
      
      const { data, error } = await supabase
        .from("personal_trainers")
        .insert({
          name: newPT.name,
          email: newPT.email,
          password: newPT.password,
          phone: newPT.phone || null,
          bio: newPT.bio || null,
          specializations,
          created_by_admin_id: user?.adminId || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast({ description: "PT added successfully" });
      setShowAddDialog(false);
      setNewPT({ name: "", email: "", password: "", phone: "", bio: "", specializations: "" });
      loadPTs();
    } catch (e: any) {
      toast({ description: e?.message || "Failed to add PT", variant: "destructive" as any });
    }
  };

  const handleDeletePT = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete PT "${name}"? Their clients will be unassigned.`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from("personal_trainers")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      toast({ description: "PT deleted successfully" });
      loadPTs();
    } catch (e: any) {
      toast({ description: e?.message || "Failed to delete PT", variant: "destructive" as any });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("personal_trainers")
        .update({ is_active: !currentStatus })
        .eq("id", id);
      
      if (error) throw error;
      
      toast({ description: `PT ${!currentStatus ? 'activated' : 'deactivated'}` });
      loadPTs();
    } catch (e: any) {
      toast({ description: e?.message || "Failed to update PT", variant: "destructive" as any });
    }
  };

  if (loading) {
    return <div className="p-8 text-white">Loading...</div>;
  }

  return (
    <div className="p-8 bg-black min-h-screen text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Personal Trainers</h1>
            <p className="text-gray-400">Manage your PT team</p>
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-yellow-500 hover:bg-yellow-400 text-black">
                <UserPlus className="w-4 h-4 mr-2" />
                Add PT
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 text-white border-gray-800">
              <DialogHeader>
                <DialogTitle>Add New Personal Trainer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newPT.name}
                    onChange={(e) => setNewPT({ ...newPT, name: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newPT.email}
                    onChange={(e) => setNewPT({ ...newPT, email: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newPT.password}
                    onChange={(e) => setNewPT({ ...newPT, password: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newPT.phone}
                    onChange={(e) => setNewPT({ ...newPT, phone: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="specializations">Specializations (comma-separated)</Label>
                  <Input
                    id="specializations"
                    placeholder="e.g., Hyrox, Strength, Running"
                    value={newPT.specializations}
                    onChange={(e) => setNewPT({ ...newPT, specializations: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    value={newPT.bio}
                    onChange={(e) => setNewPT({ ...newPT, bio: e.target.value })}
                    className="w-full h-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                  />
                </div>
                <Button
                  onClick={handleAddPT}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black"
                >
                  Create PT Account
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {pts.length === 0 ? (
            <Card className="p-8 bg-gray-900 border-gray-800 text-center">
              <p className="text-gray-400">No personal trainers yet. Add your first PT to get started.</p>
            </Card>
          ) : (
            pts.map((pt) => (
              <Card key={pt.id} className="p-6 bg-gray-900 border-gray-800">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{pt.name}</h3>
                      {!pt.is_active && (
                        <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 mb-2">{pt.email}</p>
                    {pt.phone && <p className="text-gray-500 text-sm mb-2">📞 {pt.phone}</p>}
                    {pt.bio && <p className="text-gray-300 text-sm mb-3">{pt.bio}</p>}
                    {pt.specializations && pt.specializations.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {pt.specializations.map((spec, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Users className="w-4 h-4" />
                      <span>{pt.client_count || 0} clients</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(pt.id, pt.is_active)}
                      className="border-gray-700 text-white hover:bg-gray-800"
                    >
                      {pt.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePT(pt.id, pt.name)}
                      className="border-red-500 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalTrainers;


