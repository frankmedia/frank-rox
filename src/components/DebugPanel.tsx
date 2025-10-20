import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useData } from "@/contexts/DataContext";

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { exercises, loading, error, userSheet, refresh } = useData();
  
  const status = {
    apiKey: import.meta.env.VITE_GOOGLE_SHEETS_API_KEY,
    masterSheetId: import.meta.env.VITE_MASTER_SHEET_ID,
    userName: import.meta.env.VITE_USER_NAME,
    userSheet,
    exercises,
    error,
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-20 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          variant="secondary"
          size="sm"
          className="shadow-lg"
        >
          <ChevronUp className="w-4 h-4 mr-2" />
          Debug
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-20 right-4 left-4 max-w-2xl mx-auto z-50 max-h-96 overflow-auto p-4 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">🔧 Debug Panel</h3>
        <Button
          onClick={() => setIsOpen(false)}
          variant="ghost"
          size="sm"
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3 text-sm font-mono">
        <div>
          <strong>API Key:</strong>{" "}
          {status.apiKey ? (
            <span className="text-green-600">✅ {status.apiKey.substring(0, 20)}...</span>
          ) : (
            <span className="text-red-600">❌ MISSING</span>
          )}
        </div>

        <div>
          <strong>Master Sheet ID:</strong>{" "}
          {status.masterSheetId ? (
            <span className="text-green-600">✅ {status.masterSheetId}</span>
          ) : (
            <span className="text-red-600">❌ MISSING</span>
          )}
        </div>

        <div>
          <strong>User Name:</strong> {status.userName || "❌ MISSING"}
        </div>

        <div>
          <strong>User Sheet:</strong>{" "}
          {status.userSheet ? (
            <div className="text-green-600 ml-4">
              ✅ Found
              <div>User: {status.userSheet.user}</div>
              <div>Sheet ID: {status.userSheet.sheetId}</div>
              <div className="text-xs truncate">URL: {status.userSheet.sheetUrl}</div>
            </div>
          ) : (
            <span className="text-red-600">❌ Not found</span>
          )}
        </div>

        <div>
          <strong>Today's Exercises:</strong>{" "}
          {status.exercises.length > 0 ? (
            <div className="text-green-600 ml-4">
              ✅ {status.exercises.length} exercises found
              {status.exercises.map((ex, i) => (
                <div key={i} className="text-xs">
                  - {ex.name} ({ex.type})
                </div>
              ))}
            </div>
          ) : (
            <span className="text-red-600">❌ No exercises</span>
          )}
        </div>

        {status.error && (
          <div className="text-red-600">
            <strong>Error:</strong>
            <pre className="text-xs overflow-auto">{JSON.stringify(status.error, null, 2)}</pre>
          </div>
        )}

        <Button 
          onClick={refresh} 
          size="sm" 
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground mt-4">
          💡 Check browser console (F12) for detailed logs
        </div>
      </div>
    </Card>
  );
}

