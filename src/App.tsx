import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import Marketplace from "@/pages/Marketplace";
import ProfessionalDetail from "@/pages/ProfessionalDetail";
import MyProfile from "@/pages/MyProfile";
import "./App.css";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Index />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/marketplace/professionals/:id" element={<ProfessionalDetail />} />
            <Route path="/marketplace/agents/:id" element={<div>Agent Details (Coming Soon)</div>} />
            <Route path="/marketplace/my-profile" element={<MyProfile />} />
            <Route path="/marketplace/my-agents" element={<div>My RAG Agents (Coming Soon)</div>} />
          </Route>
          
          {/* 404 and redirects */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
