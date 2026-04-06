import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { Suspense, lazy } from "react";
import Layout from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { RevenueProvider } from "./contexts/RevenueContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { Loader2 } from "lucide-react";
import { Analytics } from "./components/Analytics";

// Lazy load pages
const Home = lazy(() => import("./pages/Home"));
const Groups = lazy(() => import("./pages/Groups"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Rewards = lazy(() => import("./pages/Rewards"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Moderation = lazy(() => import("./pages/Moderation"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Calls = lazy(() => import("./pages/Calls"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Support = lazy(() => import("./pages/Support"));
const AdsDashboard = lazy(() => import("./pages/AdsDashboard"));
const GeminiLab = lazy(() => import("./pages/GeminiLab"));
const Login = lazy(() => import("./pages/Login"));
const Education = lazy(() => import("./pages/Education"));
const Events = lazy(() => import("./pages/Events"));
const Dating = lazy(() => import("./pages/Dating"));
const WatchToEarn = lazy(() => import("./pages/WatchToEarn"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
  </div>
);

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { userData, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  if (!userData || userData.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RevenueProvider>
          <HashRouter>
            <Analytics />
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="groups" element={<Groups />} />
                <Route path="admin" element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } />
                <Route path="education" element={
                  <ProtectedRoute>
                    <Education />
                  </ProtectedRoute>
                } />
                <Route path="events" element={
                  <ProtectedRoute>
                    <Events />
                  </ProtectedRoute>
                } />
                <Route path="dating" element={
                  <ProtectedRoute>
                    <Dating />
                  </ProtectedRoute>
                } />
                <Route path="watch-to-earn" element={
                  <ProtectedRoute>
                    <WatchToEarn />
                  </ProtectedRoute>
                } />
                <Route path="rewards" element={
                  <ProtectedRoute>
                    <Rewards />
                  </ProtectedRoute>
                } />
                <Route path="profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="moderation" element={
                  <ProtectedRoute>
                    <Moderation />
                  </ProtectedRoute>
                } />
                <Route path="notifications" element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                } />
                <Route path="calls" element={
                  <ProtectedRoute>
                    <Calls />
                  </ProtectedRoute>
                } />
                <Route path="terms" element={<Terms />} />
                <Route path="privacy" element={<Privacy />} />
                <Route path="support" element={<Support />} />
                <Route path="ads" element={
                  <ProtectedRoute>
                    <AdsDashboard />
                  </ProtectedRoute>
                } />
                <Route path="lab" element={
                  <ProtectedRoute>
                    <GeminiLab />
                  </ProtectedRoute>
                } />
              </Route>
            </Routes>
          </Suspense>
        </HashRouter>
      </RevenueProvider>
    </AuthProvider>
  </ErrorBoundary>
);
}
