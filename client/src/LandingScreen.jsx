import React from "react";

export default function LandingScreen({ onSelect }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f1f0fc] via-[#eaeefa] to-[#e1edf9] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full border border-gray-100 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          AI Interview Agent
        </h2>

        <div className="space-y-4">
          <button
            onClick={() => onSelect("withDB")}
            className="w-full bg-[#5f1fbe] text-white py-3 rounded-xl hover:bg-[#4a1696] transition-all font-semibold"
          >
            Interview Agent from DB
          </button>

          <button
            onClick={() => onSelect("withoutDB")}
            className="w-full border border-[#5f1fbe] text-[#5f1fbe] py-3 rounded-xl hover:bg-[#f3ecff] transition-all font-semibold"
          >
            Interview Agent without DB
          </button>
        </div>
      </div>
    </div>
  );
}
