import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { WorkoutSessionProvider } from "@/contexts/WorkoutSessionContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { TopProgressBar } from "@/components/TopProgressBar";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Today from "./pages/Today";
import ExerciseDetail from "./pages/ExerciseDetail";
import History from "./pages/History";
import Profile from "./pages/Profile";
import Assessment from "./pages/Assessment";
import AssessmentResults from "./pages/AssessmentResults";
import PTCheckIn from "./pages/PTCheckIn";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";
import AuthStravaCallback from "./pages/AuthStravaCallback";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Clients from "./pages/admin/Clients";
import Workouts from "./pages/admin/Workouts";
import Notes from "./pages/admin/Notes";
import Settings from "./pages/admin/Settings";
import PlanDetail from "./pages/admin/PlanDetail";
import Exercises from "./pages/admin/Exercises";
import ClientFeedback from "./pages/admin/ClientFeedback";
import Templates from "./pages/admin/Templates";
import TemplateEditorV2 from "./pages/admin/TemplateEditorV2";
import TemplateCloner from "./pages/admin/TemplateCloner";

const queryClient = new QueryClient();

// Layout wrapper for authenticated pages with bottom nav
const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen pb-[calc(4rem+env(safe-area-inset-bottom))]">
    {children}
    <BottomNav />
    <PWAInstallPrompt />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <WorkoutSessionProvider>
            <ScrollToTop />
            <TopProgressBar />
            <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/access-denied" element={<AccessDenied />} />
            <Route path="/auth/strava/callback" element={<AuthStravaCallback />} />
            
            {/* Protected routes with bottom navigation - wrapped in DataProvider */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DataProvider>
                    <AuthenticatedLayout>
                      <Overview />
                    </AuthenticatedLayout>
                  </DataProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/overview"
              element={
                <ProtectedRoute>
                  <DataProvider>
                    <AuthenticatedLayout>
                      <Overview />
                    </AuthenticatedLayout>
                  </DataProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/today"
              element={
                <ProtectedRoute>
                  <DataProvider>
                    <AuthenticatedLayout>
                      <Today />
                    </AuthenticatedLayout>
                  </DataProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <DataProvider>
                    <AuthenticatedLayout>
                      <History />
                    </AuthenticatedLayout>
                  </DataProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <DataProvider>
                    <AuthenticatedLayout>
                      <Profile />
                    </AuthenticatedLayout>
                  </DataProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessment"
              element={
                <ProtectedRoute>
                  <DataProvider>
                    <AuthenticatedLayout>
                      <Assessment />
                    </AuthenticatedLayout>
                  </DataProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessment-results"
              element={
                <ProtectedRoute>
                  <DataProvider>
                    <AuthenticatedLayout>
                      <AssessmentResults />
                    </AuthenticatedLayout>
                  </DataProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pt-checkin"
              element={
                <ProtectedRoute>
                  <DataProvider>
                    <AuthenticatedLayout>
                      <PTCheckIn />
                    </AuthenticatedLayout>
                  </DataProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/exercise/:id"
              element={
                <ProtectedRoute>
                  <DataProvider>
                    <AuthenticatedLayout>
                      <ExerciseDetail />
                    </AuthenticatedLayout>
                  </DataProvider>
                </ProtectedRoute>
              }
            />

            {/* Admin routes (coach/PT) - NO DataProvider to skip Google Sheets */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="clients/:clientId/feedback" element={<ClientFeedback />} />
              <Route path="workouts" element={<Workouts />} />
              <Route path="exercises" element={<Exercises />} />
              <Route path="templates" element={<Templates />} />
              <Route path="templates/new" element={<TemplateEditorV2 />} />
              <Route path="templates/:id" element={<TemplateEditorV2 />} />
              <Route path="templates/:id/clone" element={<TemplateCloner />} />
              <Route path="notes" element={<Notes />} />
              <Route path="settings" element={<Settings />} />
              <Route path="plans/:id" element={<PlanDetail />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </WorkoutSessionProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
