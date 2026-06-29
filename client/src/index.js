import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import InterviewDashboard from "./InterviewDashboard.tsx";
import InterviewAgent from "./InterviewAgent";
import Login from "./Login";
import LandingScreen from "./LandingScreen";
import CandidateImageCapture from "./CandidateImageCapture";
import MockTeamsKmConsole from "./MockTeamsKmConsole";
import AdminDashboard from "./AdminDashboard";
import { trackEvent, trackPageView } from "./services/analyticsService";

const screenTitles = {
  landing: "Landing",
  login: "Login",
  capture: "Candidate Image Capture",
  dashboard: "Interview Dashboard",
  interview: "Interview",
  mockTeamsKm: "Mock Teams KM Console",
  admin: "Admin Dashboard"
};

function App() {
  const [screen, setScreen] = useState("login");
  const [interviewData, setInterviewData] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [adminSession, setAdminSession] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [customerProjectProfile, setCustomerProjectProfile] = useState(null);
  const activeScreen = interviewData ? "interview" : screen;

  const navigateToTrainer = () => {
    trackEvent("trainer_navigation_clicked");
    window.location.href = "/trainer";
  };

  useEffect(() => {
    const screenTitle = screenTitles[activeScreen] || "AI Interview Bot";
    trackPageView({
      path: `${window.location.pathname}#${activeScreen}`,
      title: `AI Interview Bot - ${screenTitle}`
    });
  }, [activeScreen]);

  // 🔹 If interview started → Go to InterviewAgent
  if (interviewData) {
    return (
      <InterviewAgent
        data={interviewData}
        onNavigateToTrainer={navigateToTrainer}
      />
    );
  }

  if (screen === "admin" && adminSession?.token) {
    return (
      <AdminDashboard
        adminToken={adminSession.token}
        adminUser={adminSession.user}
        onLogout={() => {
          setAdminSession(null);
          setScreen("login");
        }}
      />
    );
  }

  if (screen === "mockTeamsKm") {
    return (
      <MockTeamsKmConsole
        onBack={() => setScreen("login")}
        onUseProfile={(profile) => {
          const now = new Date();
          const interviewDate = now.toISOString().split("T")[0];
          const interviewTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

          trackEvent("mock_teams_km_profile_selected", {
            profile_id: profile.id,
            customer_name: profile.customerName,
            technology: profile.technology
          });
          setCustomerProjectProfile(profile);
          setLoggedInUser({
            candidateName: "Hackathon Candidate",
            technology: profile.technology,
            role: profile.role,
            domain: profile.domain,
            interviewDate,
            interviewTime,
            customerProjectProfile: profile
          });
          setScreen("capture");
        }}
      />
    );
  }

  // 🔹 1️⃣ Landing Screen
  if (screen === "landing") {
    return (
      <LandingScreen
        onSelect={(mode) => {
          trackEvent("landing_mode_selected", { mode });
          if (mode === "withDB") {
            setScreen("login");
          } else {
            setScreen("capture"); // Go to image capture directly
          }
        }}
      />
    );
  }

  // 🔹 2️⃣ Login Screen (Only for DB flow)
  if (screen === "login" && !loggedInUser) {
    return (
      <Login
        onOpenMockTeamsKm={() => setScreen("mockTeamsKm")}
        onAdminLogin={(session) => {
          trackEvent("admin_login_completed");
          setAdminSession(session);
          setScreen("admin");
        }}
        onLogin={(user) => {
          trackEvent("login_completed");
          setCustomerProjectProfile(user.customerProjectProfile || null);
          setLoggedInUser(user);
          setScreen("capture"); // After login → Capture image
        }}
      />
    );
  }

  // 🔹 3️⃣ Candidate Image Capture (COMMON for both flows)
  if (screen === "capture") {
    return (
      <CandidateImageCapture
        onCapture={(image) => {
          trackEvent("candidate_image_captured");
          setCapturedImage(image);
          setScreen("dashboard");
        }}
      />
    );
  }

  // 🔹 4️⃣ Dashboard
  if (screen === "dashboard") {
    return (
      <InterviewDashboard
        onStart={(data) => {
          trackEvent("interview_started", {
            technology: data?.technology || data?.domain || "unknown",
            role_level: data?.roleLevel || "unknown"
          });
          setInterviewData({
            ...data,
            customerProjectProfile: data.customerProjectProfile || customerProjectProfile,
            candidateImage: capturedImage,
            user: loggedInUser,
          });
        }}
        initialData={loggedInUser ? {
          ...loggedInUser,
          customerProjectProfile
        } : null}
      />
    );
  }

  return null;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
