import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShieldAlert, Mail } from "lucide-react";

const AccessDenied = () => {
  const handleContactSupport = () => {
    window.location.href = "mailto:support@frankrock.app?subject=Access Request";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-destructive" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-3">Access Denied</h1>
        
        <p className="text-muted-foreground mb-6">
          Your account is not authorized to access this application. Please contact your
          administrator to request access.
        </p>

        <div className="bg-secondary/30 rounded-lg p-4 mb-6">
          <p className="text-sm text-muted-foreground">
            Only users listed in the allowlist can access Frank Rox. If you believe this
            is an error, please reach out to support.
          </p>
        </div>

        <Button onClick={handleContactSupport} className="w-full" size="lg">
          <Mail className="w-5 h-5 mr-2" />
          Contact Support
        </Button>
      </Card>
    </div>
  );
};

export default AccessDenied;

