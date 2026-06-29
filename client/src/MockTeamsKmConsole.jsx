import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, Database, FileText, Play, RefreshCw } from "lucide-react";
import { readJsonResponse } from "./utils/apiResponse";

const apiBaseUrl = process.env.REACT_APP_API_URL || "";

const getProfilesUrl = () => `${apiBaseUrl}/api/mock-mcp/customer-profiles`;
const getSyncUrl = () => `${apiBaseUrl}/api/mock-mcp/sync-knowledge-base`;

export default function MockTeamsKmConsole({ onBack, onUseProfile }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [syncResult, setSyncResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetch(getProfilesUrl());
        const data = await readJsonResponse(response, "Mock Teams profiles response was not JSON");
        setProfiles(data.profiles || []);
        setSelectedProfileId(data.profiles?.[0]?.id || "");
      } catch (loadError) {
        setError(`Unable to load mock Teams KM profiles: ${loadError.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfiles();
  }, []);

  const selectedProfile = useMemo(
    () => profiles.find(profile => profile.id === selectedProfileId),
    [profiles, selectedProfileId]
  );

  const handleSync = async () => {
    if (!selectedProfile) return;

    try {
      setIsSyncing(true);
      setError("");
      const response = await fetch(getSyncUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ profileId: selectedProfile.id })
      });

      const body = await readJsonResponse(response, "Mock Teams sync response was not JSON");
      setSyncResult(body);
    } catch (syncError) {
      setError(`Unable to sync mock Teams KM profile: ${syncError.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUseProfile = () => {
    const profile = syncResult?.profile || selectedProfile;
    if (profile) onUseProfile(profile);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f1f0fc] via-[#eaeefa] to-[#e1edf9]">
      <header className="bg-gradient-to-b from-[#4779f2] via-[#7747d5] to-[#5f32c6] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center text-white/90 hover:text-white font-semibold mb-5"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to login
          </button>
          <div className="flex flex-col gap-2">
            <span className="text-sm uppercase tracking-wide text-white/75">
              Hackathon Demo Mode
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold">
              Mock Teams Knowledge Base Console
            </h1>
            <p className="text-white/90 max-w-3xl">
              Simulates Microsoft Teams / SharePoint MCP access using local mock project requirements.
              The same agent handoff can later call Microsoft Graph or MCP once credentials are available.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 font-medium">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-[360px,1fr] gap-6">
          <section className="bg-white border border-gray-100 rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-4">
              <Database className="text-indigo-600 mr-2" size={22} />
              <h2 className="text-xl font-bold text-gray-900">Local MCP Profiles</h2>
            </div>

            {isLoading ? (
              <div className="text-gray-600">Loading mock Teams profiles...</div>
            ) : (
              <div className="space-y-3">
                {profiles.map(profile => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => {
                      setSelectedProfileId(profile.id);
                      setSyncResult(null);
                    }}
                    className={`w-full text-left rounded-lg border px-4 py-3 transition-all ${
                      selectedProfileId === profile.id
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-indigo-200"
                    }`}
                  >
                    <div className="font-bold text-gray-900">{profile.customerName}</div>
                    <div className="text-sm text-gray-600">{profile.projectName}</div>
                    <div className="mt-2 text-xs font-semibold uppercase text-indigo-700">
                      {profile.technology} • {profile.role} • {profile.domain}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {selectedProfile && (
            <section className="space-y-6">
              <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center text-indigo-700 font-semibold mb-2">
                      <FileText size={20} className="mr-2" />
                      Mock Teams Document
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedProfile.projectName}
                    </h2>
                    <p className="text-gray-600 mt-1">{selectedProfile.requirementSummary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="inline-flex items-center justify-center bg-[#5f1fbe] text-white px-5 py-3 rounded-lg font-semibold hover:bg-[#4a1696] disabled:opacity-60"
                  >
                    <RefreshCw size={18} className={`mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                    {isSyncing ? "Syncing KM" : "Sync KM from Mock Teams"}
                  </button>
                </div>

                <div className="mt-5 grid md:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="text-sm font-bold text-gray-700 mb-1">Source Folder</div>
                    <div className="text-gray-700">{selectedProfile.teamsFolder}</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="text-sm font-bold text-gray-700 mb-1">Requirement Document</div>
                    <div className="text-gray-700">{selectedProfile.documentName}</div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Extracted Must-Have Skills</h3>
                  <ul className="space-y-2">
                    {selectedProfile.mustHaveSkills.map(skill => (
                      <li key={skill} className="flex items-start text-gray-700">
                        <CheckCircle size={18} className="text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Agent Handoff Trace</h3>
                  <div className="space-y-3">
                    {(syncResult?.profile?.agentTrace || selectedProfile.agentTrace || []).map((step, index) => (
                      <div key={`${step.agent}-${index}`} className="border-l-4 border-indigo-500 bg-indigo-50 px-4 py-3 rounded-r-lg">
                        <div className="text-sm font-bold text-indigo-900">{index + 1}. {step.agent}</div>
                        <div className="text-sm text-gray-700">{step.action}</div>
                        <div className="text-xs text-gray-600 mt-1">{step.output}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {syncResult && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                  <div className="font-bold text-green-800">{syncResult.message}</div>
                  <div className="text-green-700 mt-1">
                    Created/updated local topic: {syncResult.syncedTopic.name} with {syncResult.syncedTopic.questionCount} seed questions.
                  </div>
                </div>
              )}

              <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Ready for Customer-Specific Interview</h3>
                  <p className="text-gray-600">
                    Start the interview using this synced project profile. The question agent will include these customer requirements in its prompt.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUseProfile}
                  className="inline-flex items-center justify-center bg-green-600 text-white px-5 py-3 rounded-lg font-semibold hover:bg-green-700"
                >
                  <Play size={18} className="mr-2" />
                  Use Profile for Interview
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
