import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";

import LandingScreen from "./LandingScreen";
import Login from "./Login";
import CandidateImageCapture from "./CandidateImageCapture";
import InterviewDashboard from "./InterviewDashboard";
import InterviewAgent from "./InterviewAgent";

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();

  const [interviewData, setInterviewData] = useState(null);

  // 🔹 When interview starts → go to InterviewAgent
  const handleStart = (data) => {
    setInterviewData(data);
    navigate("/interview-agent");
  };

  // 🔹 If interview is active → show InterviewAgent
  if (interviewData && location.pathname === "/interview-agent") {
    return (
      <InterviewAgent
        data={interviewData}
        onNavigateToTrainer={() => navigate("/trainer")}
      />
    );
  }

  return (
    <Routes>

      {/* ✅ Landing Screen (Default) */}
      <Route
        path="/"
        element={
          <LandingScreen
            onSelect={(mode) => {
              if (mode === "withDB") {
                navigate("/login");
              } else {
                navigate("/dashboard");
              }
            }}
          />
        }
      />

      {/* ✅ Login Screen */}
      <Route
        path="/login"
        element={<Login />}
      />

      {/* ✅ NEW: Candidate Image Capture Screen */}
      <Route
        path="/capture"
        element={<CandidateImageCapture />}
      />

      {/* ✅ Dashboard */}
      <Route
        path="/dashboard"
        element={
          <InterviewDashboard
            onStart={handleStart}
            initialData={location.state || null}
          />
        }
      />

      {/* ✅ Interview Agent */}
      <Route
        path="/interview-agent"
        element={
          interviewData ? (
            <InterviewAgent
              data={interviewData}
              onNavigateToTrainer={() => navigate("/trainer")}
            />
          ) : (
            <LandingScreen />
          )
        }
      />

    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}