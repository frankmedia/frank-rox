import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Flame, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const success = await login(username, password);
      
      if (success) {
        toast.success("Welcome back!");
        navigate("/");
      } else {
        toast.error("Invalid credentials", {
          description: "Please check your username and password",
        });
      }
    } catch (error) {
      toast.error("Login failed", {
        description: "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="flex flex-col items-center mb-10">
          {/* Dumbbell SVG */}
          <div className="w-32 h-32 mb-6 flex items-center justify-center">
            <Flame className="w-full h-full" style={{ color: '#FFCC00' }} />
          </div>
          <h1 className="text-5xl font-bold text-white mb-2">RoxPT</h1>
          <p className="text-2xl font-bold mb-2" style={{ color: '#FFCC00' }}>
            Train with Frank the Tank
          </p>
          <p className="text-sm text-gray-400">
            Track your workouts with precision
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="username" className="text-white text-lg font-semibold">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="frank"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-2 h-14 text-xl bg-white text-black border-2 border-yellow-500 focus:border-yellow-400"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-white text-lg font-semibold">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 h-14 text-xl bg-white text-black border-2 border-yellow-500 focus:border-yellow-400"
              disabled={loading}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-16 text-xl font-bold bg-yellow-500 hover:bg-yellow-400 text-black" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;

