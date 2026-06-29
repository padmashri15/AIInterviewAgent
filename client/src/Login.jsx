import React, { useState } from "react";
import { readJsonResponse } from "./utils/apiResponse";

const apiBaseUrl = process.env.REACT_APP_API_URL || "";

function getCurrentMonthYear(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${month}${year}`;
}

function getCandidatePassword(username, date = new Date()) {
  const usernamePrefix = username.trim().slice(0, 4).toLowerCase();
  return `${usernamePrefix}${getCurrentMonthYear(date)}`;
}

function getCandidatePasswordExample(date = new Date()) {
  return `user${getCurrentMonthYear(date)}`;
}

export default function Login({ onLogin, onAdminLogin, onOpenMockTeamsKm }) {
  const [loginType, setLoginType] = useState("candidate");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCandidateLogin = () => {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim().toLowerCase();

    if (!trimmedUsername) {
      setError("Please enter a candidate name");
      return;
    }

    if (trimmedUsername.length < 4) {
      setError("Candidate name must have at least 4 characters");
      return;
    }

    const expectedPassword = getCandidatePassword(trimmedUsername);
    if (trimmedPassword !== expectedPassword) {
      const invalidMessage = "Invalid credential";
      setError(invalidMessage);
      window.alert(invalidMessage);
      return;
    }

    const now = new Date();
    const interviewDate = now.toISOString().split("T")[0];
    const interviewTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    onLogin({
      candidateName: trimmedUsername,
      technology: "swift",
      role: "architect",
      domain: "Banking",
      interviewDate,
      interviewTime
    });
  };

  const handleAdminLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter admin username and password");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${apiBaseUrl}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });
      const body = await readJsonResponse(response, "Admin login response was not JSON");
      onAdminLogin(body);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (loginType === "admin") {
      handleAdminLogin();
    } else {
      handleCandidateLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f1f0fc] via-[#eaeefa] to-[#e1edf9] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 max-w-md w-full border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          AI Interview Agent
        </h2>

        <div className="grid grid-cols-2 gap-2 bg-gray-100 rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setLoginType("candidate");
              setError("");
            }}
            className={`py-2 rounded-lg font-semibold transition-all ${
              loginType === "candidate" ? "bg-white text-[#5f1fbe] shadow" : "text-gray-600"
            }`}
          >
            Candidate Login
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginType("admin");
              setError("");
            }}
            className={`py-2 rounded-lg font-semibold transition-all ${
              loginType === "admin" ? "bg-white text-[#5f1fbe] shadow" : "text-gray-600"
            }`}
          >
            Admin Login
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {loginType === "admin" ? "Admin Username" : "Candidate Name"}
            </label>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              placeholder={loginType === "admin" ? "Enter admin username" : "Enter candidate name, e.g. user"}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              placeholder={loginType === "admin" ? "Enter admin password" : getCandidatePasswordExample()}
            />
            {loginType === "candidate" && (
              <p className="mt-1 text-xs text-gray-500">
                Candidate password is first 4 characters of username + current month and year.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#5f1fbe] text-white py-3 rounded-xl hover:bg-[#4a1696] transition-all font-semibold disabled:opacity-60"
          >
            {isSubmitting ? "Signing in..." : loginType === "admin" ? "Login as Admin" : "Login as Candidate"}
          </button>
        </form>

        {/* <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onOpenMockTeamsKm}
            className="w-full border border-[#5f1fbe] text-[#5f1fbe] py-3 rounded-xl hover:bg-[#f3ecff] transition-all font-semibold"
          >
            Hackathon Demo: Mock Teams KM Sync
          </button>
          <p className="mt-2 text-xs text-gray-500 text-center">
            Admin default for local demo: admin / admin@123
          </p>
        </div> */}
      </div>
    </div>
  );
}
