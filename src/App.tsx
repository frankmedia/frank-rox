import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import { ScrollToTop } from "@/components/ScrollToTop";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Today from "./pages/Today";
import ExerciseDetail from "./pages/ExerciseDetail";
import History from "./pages/History";
import Profile from "./pages/Profile";
import BookPT from "./pages/BookPT";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Layout wrapper for authenticated pages with bottom nav
const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="pb-16">
    {children}
    <BottomNav />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DataProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/access-denied" element={<AccessDenied />} />
            
            {/* Protected routes with bottom navigation */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <Overview />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/today"
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <Today />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <History />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <Profile />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/book-pt"
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <BookPT />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/exercise/:id"
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <ExerciseDetail />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              }
            />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </DataProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
