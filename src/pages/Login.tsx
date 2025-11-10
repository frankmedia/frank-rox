import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Flame, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LoadingScreen } from "@/components/LoadingScreen";

// Typewriter component
const TypewriterText = ({ 
  text, 
  duration = 2, 
  className = "", 
  prefersReducedMotion = false 
}: { 
  text: string; 
  duration?: number; 
  className?: string;
  prefersReducedMotion?: boolean;
}) => {
  const [displayText, setDisplayText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  
  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayText(text);
      setShowCursor(false);
      return;
    }
    
    let currentIndex = 0;
    const totalChars = text.length;
    const intervalMs = (duration * 1000) / totalChars;
    
    const timer = setInterval(() => {
      if (currentIndex <= totalChars) {
        setDisplayText(text.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(timer);
        setShowCursor(false);
      }
    }, intervalMs);
    
    return () => clearInterval(timer);
  }, [text, duration, prefersReducedMotion]);
  
  return (
    <h1 className={className}>
      {displayText}
      {showCursor && <span className="animate-pulse">|</span>}
    </h1>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const fadeTransition = prefersReducedMotion ? { duration: 0 } : { duration: 0.25 };

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
      <AnimatePresence mode="wait">
        {!loading ? (
          <motion.div
            key="login"
            className="max-w-md w-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={fadeTransition}
          >
            {/* Logo/Header */}
            <div className="flex flex-col items-center mb-10">
              <motion.div
                className="w-32 h-32 mb-6 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: 1,
                  scale: loading ? [1, 1.06, 1] : [1, 1.05, 1]
                }}
                transition={{ 
                  opacity: { duration: prefersReducedMotion ? 0 : 0.3 },
                  scale: { 
                    duration: prefersReducedMotion ? 0 : 2,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "loop"
                  }
                }}
              >
                <motion.div
                  animate={{
                    filter: [
                      "hue-rotate(20deg) saturate(1.8) brightness(1.1)",
                      "hue-rotate(0deg) saturate(1) brightness(1)"
                    ]
                  }}
                  transition={{ duration: prefersReducedMotion ? 0 : 1.5, ease: "easeOut" }}
                >
                  <Flame width={128} height={128} style={{ color: '#FFCC00' }} />
                </motion.div>
              </motion.div>
              
              <div className="mb-2" style={{ minHeight: '120px' }}>
                <TypewriterText 
                  text="The Smart Way to Crush Your Next Race" 
                  duration={2}
                  className="text-4xl font-bold text-white text-center"
                  prefersReducedMotion={prefersReducedMotion}
                />
              </div>
              
              <p className="text-2xl font-bold mb-2 text-center" style={{ color: '#FFCC00' }}>
                Built for Hyrox Tuned for You
              </p>
              <p className="text-base text-gray-300 text-center">
                Your Road to the Next Podium Starts Here
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6" aria-busy={loading}>
              <div>
                <Label htmlFor="username" className="text-white text-lg font-semibold">Enter Your Athlete ID</Label>
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

              <motion.button
                type="submit"
                className="w-full h-16 text-xl font-bold bg-yellow-500 hover:bg-yellow-400 text-black rounded-md transition-transform active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
                disabled={loading}
                animate={loading ? { scale: 0.98, borderRadius: 12 } : { scale: 1, borderRadius: 8 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                {loading ? (
                  <span className="inline-flex items-center" role="status" aria-live="polite">
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    Signing you in…
                  </span>
                ) : (
                  "Sign In"
                )}
              </motion.button>
            </form>

            {/* Sign Up link */}
            <div className="mt-6 text-center">
              <p className="text-gray-300">
                New here?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="underline font-semibold"
                  style={{ color: '#FFCC00' }}
                >
                  Create an account
                </button>
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={fadeTransition}
            className="w-full"
          >
            <LoadingScreen />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;

