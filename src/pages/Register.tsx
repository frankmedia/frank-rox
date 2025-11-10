import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Flame, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/utils/supabaseClient";

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      // Create client row
      const { data, error } = await supabase
        .from("clients")
        .insert({ name, email, password })
        .select("id")
        .single();
      if (error) throw error;
      
      console.log("✅ User registered. ClientId:", data?.id);
      
      toast.success("Account created");
      // Minimal session bootstrap; redirect to onboarding
      const userData = { 
        username: name, 
        email, 
        name, 
        clientId: String(data?.id || "") 
      };
      
      localStorage.setItem("frank_rock_user", JSON.stringify(userData));
      
      console.log("✅ User saved to localStorage:", userData);
      
      // Force page reload to trigger AuthContext to pick up the new user
      window.location.href = "/onboarding";
    } catch (err: any) {
      toast.error("Registration failed", { description: err?.message || "Try again" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 bg-zinc-900 border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-7 h-7" style={{ color: "#FFCC00" }} />
          <h1 className="text-xl font-bold text-white">Create your account</h1>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-white">Athlete ID</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="email" className="text-white">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password" className="text-white">Password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1" />
          </div>
          <Button type="submit" disabled={loading} className="w-full font-bold" style={{ backgroundColor: "#FFCC00", color: "#000" }}>
            {loading ? <span className="inline-flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</span> : "Sign Up"}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/login")}>
            Back to Sign In
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Register;


