import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import NavbarPrivate from "./components/NavbarPrivate";

import Welcome from "./pages/Welcome";
import Signup from "./pages/Signup";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import RiskPredictor from "./pages/RiskPredictor";
import MedicineScheduler from "./pages/MedicineScheduler";
import SymptomDecoder from "./pages/SymptomDecoder";
import AiCompanion from "./pages/AiCompanion";
import ProfileSettings from "./pages/ProfileSettings";
import ReportResult from "./pages/ReportResult";
import ProtectedRoute from "./utils/ProtectedRoute";

export default function App() {
  return (
    <>
      {/* Public Navbar */}
      <Navbar />

      <Routes>
        {/* 🌐 Public Routes */}
        <Route path="/" element={<Welcome />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<LoginPage />} />

        {/* 🔐 Private Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <>
                <NavbarPrivate />
                <Dashboard />
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/risk-predictor"
          element={
            <ProtectedRoute>
              <>
                <NavbarPrivate />
                <RiskPredictor />
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/medicine-scheduler"
          element={
            <ProtectedRoute>
              <>
                <NavbarPrivate />
                <MedicineScheduler />
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/symptom-decoder"
          element={
            <ProtectedRoute>
              <>
                <NavbarPrivate />
                <SymptomDecoder />
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai-companion"
          element={
            <ProtectedRoute>
              <>
                <NavbarPrivate />
                <AiCompanion />
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <>
                <NavbarPrivate />
                <ProfileSettings />
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/risk-predictor"
          element={
            <ProtectedRoute>
              <>
                <NavbarPrivate />
                <RiskPredictor />
              </>
            </ProtectedRoute>
          }
        />

        <Route
          path="/report-result"
          element={
            <ProtectedRoute>
              <>
                <NavbarPrivate />
                <ReportResult />
              </>
            </ProtectedRoute>
          }
        />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
