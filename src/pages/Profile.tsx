import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, LogOut, Mail, User as UserIcon } from "lucide-react";
import { getUserSheet } from "@/services/googleSheets";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const [userSheet, setUserSheet] = useState<{
    user: string;
    password: string;
    sheetUrl: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

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

