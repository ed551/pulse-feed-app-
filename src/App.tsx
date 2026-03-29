import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Groups from "./pages/Groups";
import Posts from "./pages/Posts";
import Rewards from "./pages/Rewards";
import Profile from "./pages/Profile";
import Moderation from "./pages/Moderation";
import Notifications from "./pages/Notifications";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Support from "./pages/Support";
import AdsDashboard from "./pages/AdsDashboard";
import Login from "./pages/Login";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="groups" element={<Groups />} />
              <Route path="posts" element={<Posts />} />
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
              <Route path="terms" element={<Terms />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="support" element={<Support />} />
              <Route path="ads" element={
                <ProtectedRoute>
                  <AdsDashboard />
                </ProtectedRoute>
              } />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
