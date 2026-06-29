import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  BarChart3,
  FileText,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload
} from "lucide-react";
import AnalyticsDashboard from "./AnalyticsDashboard";
import { getApiBaseUrl } from "./utils/apiBaseUrl";

const apiBaseUrl = getApiBaseUrl();
const analyticsPromptStorageKey = "aiInterviewAgent.analyticsFeedbackPromptKeys";
const roles = ["junior", "mid", "senior", "lead", "architect"];
const questionTypes = ["Technical", "Behavioral", "Scenario-Based", "Architecture", "Domain-Specific"];

const emptyProfile = {
  customerName: "",
  projectName: "",
  technologyStack: "",
  clientDomain: "",
  roleRequirements: "Senior",
  mustHaveSkills: [],
  preferredSkills: [],
  interviewFocusAreas: [],
  responsibilities: [],
  roleLevelMapping: {
    junior: true,
    mid: true,
    senior: true,
    lead: true,
    architect: true
  },
  status: "Inactive",
  requirementText: "",
  uploadedDocumentName: "",
  questions: []
};

const arrayToText = (items) => Array.isArray(items) ? items.join("\n") : "";
const textToArray = (text) => String(text || "")
  .split(/\n|,/)
  .map(item => item.trim())
  .filter(Boolean);

const valueToText = (value) => Array.isArray(value)
  ? value.map(item => String(item || "").trim()).filter(Boolean).join(", ")
  : String(value || "");

const normalizeProfileStatus = (status) => String(status || "").trim().toLowerCase() === "active" ? "Active" : "Inactive";
const normalizeApprovalStatus = (status) => String(status || "").trim().toLowerCase() === "approved" ? "Approved" : "Draft";
const isKnownRoleValue = (value) => roles.includes(value);

const getNonJsonResponseMessage = (response, rawText) => {
  const text = String(rawText || "").trim();

  if (text.startsWith("Proxy error") || text.includes("Cannot proxy")) {
    return "Backend server is not reachable or restarted while processing the request. Restart the backend server and try again.";
  }

  return text
    ? `Unexpected server response: ${text.slice(0, 180)}`
    : `HTTP ${response.status}`;
};

const readApiResponse = async (response) => {
  const rawText = await response.text();
  let body = {};

  if (rawText) {
    try {
      body = JSON.parse(rawText);
    } catch (error) {
      throw new Error(getNonJsonResponseMessage(response, rawText));
    }
  }

  if (!response.ok) {
    throw new Error(body.error || body.message || `HTTP ${response.status}`);
  }

  return body;
};

const normalizeRoleValue = (value) => {
  const normalizedValue = String(value || "").toLowerCase();
  if (normalizedValue.includes("architect")) return "architect";
  if (normalizedValue.includes("lead")) return "lead";
  if (normalizedValue.includes("senior")) return "senior";
  if (normalizedValue.includes("mid")) return "mid";
  if (normalizedValue.includes("junior")) return "junior";
  return normalizedValue || "senior";
};

const resolveQuestionRoleLevel = (question = {}, profile = {}) => {
  const explicitRole = question.roleLevel || question.role
    ? normalizeRoleValue(question.roleLevel || question.role)
    : "";
  if (isKnownRoleValue(explicitRole)) return explicitRole;

  const profileRole = profile.roleRequirements || profile.role
    ? normalizeRoleValue(profile.roleRequirements || profile.role)
    : "";
  if (isKnownRoleValue(profileRole)) return profileRole;

  const difficultyRole = question.difficulty ? normalizeRoleValue(question.difficulty) : "";
  if (isKnownRoleValue(difficultyRole)) return difficultyRole;

  return profileRole || difficultyRole || "senior";
};

const normalizeTechnologyValue = (value) => valueToText(value).trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const valuesMatchLoosely = (questionValue, selectedValue) => (
  !questionValue ||
  !selectedValue ||
  questionValue === selectedValue ||
  questionValue.includes(selectedValue) ||
  selectedValue.includes(questionValue)
);

const rolesMatch = (questionRole, selectedRole) => (
  !questionRole ||
  !selectedRole ||
  !isKnownRoleValue(questionRole) ||
  !isKnownRoleValue(selectedRole) ||
  questionRole === selectedRole
);

const normalizeQuestion = (question = {}, profile = {}) => {
  const status = normalizeApprovalStatus(question.status || question.approvalStatus || (question.approved ? "Approved" : "Draft"));
  const active = question.active !== undefined
    ? question.active === true || String(question.active).trim().toLowerCase() === "true"
    : normalizeProfileStatus(question.activeStatus || "Active") === "Active";
  const type = question.type || question.category || "Technical";
  const roleLevel = resolveQuestionRoleLevel(question, profile);
  const technology = valueToText(question.technology || profile.technologyStack || profile.technology || "");

  return {
    id: question.id || `question-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    customerProfileId: question.customerProfileId || profile.id || "",
    technology,
    roleLevel,
    text: question.text || "",
    type,
    category: question.category || type,
    difficulty: question.difficulty || roleLevel,
    keyPoints: Array.isArray(question.keyPoints) ? question.keyPoints : textToArray(question.keyPoints),
    status,
    approved: status === "Approved",
    active,
    activeStatus: active ? "Active" : "Inactive",
    createdBy: question.createdBy || "admin"
  };
};

const normalizeProfileForForm = (profile = emptyProfile) => ({
  ...emptyProfile,
  ...profile,
  status: normalizeProfileStatus(profile.status),
  roleLevelMapping: {
    ...emptyProfile.roleLevelMapping,
    ...(profile.roleLevelMapping || {})
  },
  mustHaveSkillsText: arrayToText(profile.mustHaveSkills),
  preferredSkillsText: arrayToText(profile.preferredSkills),
  interviewFocusAreasText: arrayToText(profile.interviewFocusAreas),
  responsibilitiesText: arrayToText(profile.responsibilities),
  questions: (profile.questions || []).map(question => normalizeQuestion(question, profile))
});

const serializeProfile = (profile) => {
  const {
    mustHaveSkillsText,
    preferredSkillsText,
    interviewFocusAreasText,
    responsibilitiesText,
    ...profileData
  } = profile;

  return {
    ...profileData,
    status: normalizeProfileStatus(profile.status),
    mustHaveSkills: textToArray(mustHaveSkillsText),
    preferredSkills: textToArray(preferredSkillsText),
    interviewFocusAreas: textToArray(interviewFocusAreasText),
    responsibilities: textToArray(responsibilitiesText),
    questions: (profile.questions || []).map(question => normalizeQuestion(question, profile))
  };
};

const loadStoredAnalyticsPromptKeys = () => {
  try {
    const stored = window.localStorage.getItem(analyticsPromptStorageKey);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (error) {
    return [];
  }
};

const storeAnalyticsPromptKeys = (keys) => {
  try {
    window.localStorage.setItem(analyticsPromptStorageKey, JSON.stringify(keys.slice(-200)));
  } catch (error) {
    // Ignore storage failures; the database decision still prevents repeat prompts after save.
  }
};

export default function AdminDashboard({ adminToken, adminUser, onLogout }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [profileForm, setProfileForm] = useState(normalizeProfileForForm(emptyProfile));
  const [pastedText, setPastedText] = useState("");
  const [requirementFile, setRequirementFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processingAction, setProcessingAction] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("profiles");
  const [analyticsOptimizationReport, setAnalyticsOptimizationReport] = useState(null);
  const [analyticsDecisionPrompt, setAnalyticsDecisionPrompt] = useState(null);
  const [savedAnalyticsDecisionKeys, setSavedAnalyticsDecisionKeys] = useState(loadStoredAnalyticsPromptKeys);
  const [activeAnalyticsPromptKey, setActiveAnalyticsPromptKey] = useState("");
  const [isSavingAnalyticsDecision, setIsSavingAnalyticsDecision] = useState(false);
  const isProcessing = Boolean(processingAction);
  const isActiveProfile = normalizeProfileStatus(profileForm.status) === "Active";

  const selectedProfile = useMemo(
    () => profiles.find(profile => profile.id === selectedProfileId),
    [profiles, selectedProfileId]
  );

  const questionStats = useMemo(() => {
    const questions = profileForm.questions || [];
    return {
      total: questions.length,
      approved: questions.filter(question => question.status === "Approved").length,
      pending: questions.filter(question => question.status !== "Approved").length,
      active: questions.filter(question => question.active).length,
      inactive: questions.filter(question => !question.active).length
    };
  }, [profileForm.questions]);

  const previewQuestions = useMemo(() => {
    const selectedTechnology = normalizeTechnologyValue(profileForm.technologyStack || profileForm.technology);
    const selectedRole = normalizeRoleValue(profileForm.roleRequirements);

    return (profileForm.questions || []).filter(question => {
      const questionTechnology = normalizeTechnologyValue(question.technology || profileForm.technologyStack);
      const questionRole = resolveQuestionRoleLevel(question, profileForm);
      const technologyMatches = valuesMatchLoosely(questionTechnology, selectedTechnology);
      const roleMatches = rolesMatch(questionRole, selectedRole);
      return question.status === "Approved" && question.active && technologyMatches && roleMatches && question.text;
    });
  }, [profileForm]);

  const getAnalyticsFeedbackForProfile = (profile, report) => {
    if (!profile?.id || !report?.generatedAt) return null;

    const recommendations = (report.optimizationRecommendations || []).filter(recommendation => (
      recommendation.context?.customerProfileId === profile.id
    ));
    const customerInsight = (report.customerProfileInsights || []).find(insight => (
      insight.customerProfileId === profile.id
    ));

    const hasProfileActivity = Boolean(customerInsight && (
      Number(customerInsight.interviews || 0) > 0 ||
      Number(customerInsight.completions || 0) > 0 ||
      Number(customerInsight.reportGenerationCount || 0) > 0 ||
      Number(customerInsight.questionEffectiveness || 0) > 0 ||
      customerInsight.lastActivityAt
    ));

    if (!hasProfileActivity) return null;

    const feedbackKey = [
      profile.id,
      customerInsight?.interviews || 0,
      customerInsight?.completions || 0,
      customerInsight?.completionRate || 0,
      customerInsight?.averageScore || 0,
      customerInsight?.reportGenerationCount || 0,
      customerInsight?.questionEffectiveness || 0,
      customerInsight?.lastActivityAt || "",
      recommendations.map(recommendation => recommendation.id || recommendation.message).sort().join(",")
    ].join("|");

    return {
      reportGeneratedAt: report.generatedAt,
      feedbackKey,
      recommendations,
      customerInsight: customerInsight || null
    };
  };

  const summarizeAnalyticsFeedback = (feedback) => {
    const lines = [];
    if (feedback?.customerInsight) {
      const insight = feedback.customerInsight;
      lines.push(`Profile activity: ${insight.interviews || 0} interviews, ${insight.completionRate || 0}% completion, average score ${insight.averageScore || 0}.`);
      lines.push(`Question effectiveness: ${insight.questionEffectiveness || 0}. Reports generated: ${insight.reportGenerationCount || 0}.`);
    }
    (feedback?.recommendations || []).slice(0, 5).forEach(recommendation => {
      lines.push(`${recommendation.message} ${recommendation.action}`);
    });
    return lines.join('\n');
  };

  const getAnalyticsDecisionKey = (profileId, feedback) => (
    profileId && feedback?.feedbackKey ? `${profileId}:${feedback.feedbackKey}` : ''
  );

  const rememberAnalyticsDecisionKey = useCallback((decisionKey) => {
    if (!decisionKey) return;

    setSavedAnalyticsDecisionKeys(prev => {
      const nextKeys = prev.includes(decisionKey) ? prev : [...prev, decisionKey];
      storeAnalyticsPromptKeys(nextKeys);
      return nextKeys;
    });
  }, []);

  const loadAnalyticsOptimizationReport = async () => {
    if (!adminToken) return;

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/analytics/optimization`, {
        headers: requestHeaders
      });
      const body = await readApiResponse(response);
      setAnalyticsOptimizationReport(body);
    } catch (loadError) {
      console.warn("Unable to load analytics optimization report for profile prompt", loadError);
    }
  };

  useEffect(() => {
    if (activeView !== "profiles" || !selectedProfile?.id || !selectedProfileId) {
      setAnalyticsDecisionPrompt(null);
      setActiveAnalyticsPromptKey("");
      return;
    }

    const feedback = getAnalyticsFeedbackForProfile(selectedProfile, analyticsOptimizationReport);
    const preference = selectedProfile?.analyticsFeedbackPreference;
    const decisionKey = getAnalyticsDecisionKey(selectedProfile?.id, feedback);
    const profileAlreadyDecided = (
      (preference === "include" || preference === "exclude") &&
      selectedProfile?.analyticsFeedbackKey === feedback?.feedbackKey
    );
    const alreadyShown = savedAnalyticsDecisionKeys.includes(decisionKey) && activeAnalyticsPromptKey !== decisionKey;

    if (feedback && !profileAlreadyDecided && !alreadyShown) {
      setActiveAnalyticsPromptKey(decisionKey);
      setAnalyticsDecisionPrompt({
        profile: selectedProfile,
        feedback
      });
    } else {
      setAnalyticsDecisionPrompt(null);
      setActiveAnalyticsPromptKey("");
    }
  }, [activeView, selectedProfile, selectedProfileId, analyticsOptimizationReport, savedAnalyticsDecisionKeys, activeAnalyticsPromptKey, rememberAnalyticsDecisionKey]);

  const requestHeaders = useMemo(() => (
    adminToken ? { Authorization: `Bearer ${adminToken}` } : {}
  ), [adminToken]);

  const loadProfiles = async (preferredProfileId = selectedProfileId, options = {}) => {
    if (!adminToken) {
      setError("Admin session is not ready. Please log in again.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      const response = await fetch(`${apiBaseUrl}/api/admin/customer-profiles`, {
        headers: requestHeaders
      });
      const body = await readApiResponse(response);
      const loadedProfiles = body.profiles || [];
      const targetProfileId = preferredProfileId || selectedProfileId;
      const nextSelectedProfile = (
        (targetProfileId && loadedProfiles.find(profile => profile.id === targetProfileId)) ||
        (options.selectFirstWhenMissing === false ? null : loadedProfiles[0])
      );

      setProfiles(loadedProfiles);

      if (nextSelectedProfile) {
        setSelectedProfileId(nextSelectedProfile.id);
        setProfileForm(normalizeProfileForForm(nextSelectedProfile));
      } else if (!loadedProfiles.length) {
        setSelectedProfileId("");
        setProfileForm(normalizeProfileForForm(emptyProfile));
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      loadProfiles();
      loadAnalyticsOptimizationReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken]);

  useEffect(() => {
    if (selectedProfile) {
      setProfileForm(normalizeProfileForForm(selectedProfile));
    }
  }, [selectedProfile]);

  const updateProfileField = (field, value) => {
    setProfileForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateRoleMapping = (role, checked) => {
    setProfileForm(prev => ({
      ...prev,
      roleLevelMapping: {
        ...prev.roleLevelMapping,
        [role]: checked
      }
    }));
  };

  const validateProfileForm = () => {
    const requiredFields = [
      ["customerName", "Customer name"],
      ["projectName", "Project name"],
      ["technologyStack", "Technology stack"],
      ["clientDomain", "Client domain"],
      ["roleRequirements", "Role requirements"]
    ];
    const missingFields = requiredFields
      .filter(([field]) => !String(profileForm[field] || "").trim())
      .map(([, label]) => label);

    if (missingFields.length) {
      return `Please complete: ${missingFields.join(", ")}`;
    }

    if (!Object.values(profileForm.roleLevelMapping || {}).some(Boolean)) {
      return "Select at least one role-level mapping.";
    }

    return "";
  };

  const saveProfile = async () => {
    const validationError = validateProfileForm();
    if (validationError) {
      setMessage("");
      setError(validationError);
      return;
    }

    try {
      setError("");
      setMessage("");
      setProcessingAction("save");
      const payload = serializeProfile(profileForm);
      const isUpdate = Boolean(payload.id);
      const response = await fetch(`${apiBaseUrl}/api/admin/customer-profiles${isUpdate ? `/${payload.id}` : ""}`, {
        method: isUpdate ? "PUT" : "POST",
        headers: {
          ...requestHeaders,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const body = await readApiResponse(response);
      setMessage(body.message);
      setSelectedProfileId(body.profile.id);
      setProfileForm(normalizeProfileForForm(body.profile));
      await loadProfiles(body.profile.id);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setProcessingAction("");
    }
  };

  const deleteProfile = async (profileId) => {
    if (!profileId) return;
    if (!window.confirm("Delete this customer profile?")) return;

    try {
      setError("");
      setMessage("");
      setProcessingAction("delete");
      const response = await fetch(`${apiBaseUrl}/api/admin/customer-profiles/${profileId}`, {
        method: "DELETE",
        headers: requestHeaders
      });
      const body = await readApiResponse(response);
      setMessage(body.message);
      setSelectedProfileId("");
      setProfileForm(normalizeProfileForForm(emptyProfile));
      await loadProfiles("");
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setProcessingAction("");
    }
  };

  const updateStatus = async (profileId, status) => {
    if (!profileId) return;

    try {
      setError("");
      setMessage("");
      setProcessingAction(status === "Active" ? "activate" : "deactivate");
      const response = await fetch(`${apiBaseUrl}/api/admin/customer-profiles/${profileId}/status`, {
        method: "PATCH",
        headers: {
          ...requestHeaders,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });
      const body = await readApiResponse(response);
      setMessage(body.message);
      setSelectedProfileId(body.profile.id);
      setProfileForm(normalizeProfileForForm(body.profile));
      await loadProfiles(body.profile.id);
    } catch (statusError) {
      setError(statusError.message);
    } finally {
      setProcessingAction("");
    }
  };

  const generateInterviewProfile = async () => {
    try {
      setIsAnalyzing(true);
      setError("");
      setMessage("");

      const formData = new FormData();
      formData.append("pastedText", pastedText);
      if (requirementFile) {
        formData.append("document", requirementFile);
      }

      const response = await fetch(`${apiBaseUrl}/api/admin/customer-profiles/analyze`, {
        method: "POST",
        headers: requestHeaders,
        body: formData
      });
      const body = await readApiResponse(response);
      setProfileForm(normalizeProfileForForm({
        ...body.profile,
        id: ""
      }));
      setSelectedProfileId("");
      setMessage(body.message);
    } catch (analysisError) {
      setError(analysisError.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateQuestion = (questionId, field, value) => {
    setProfileForm(prev => ({
      ...prev,
      questions: prev.questions.map(question => (
        question.id === questionId ? { ...question, [field]: value } : question
      ))
    }));
  };

  const addQuestion = () => {
    setProfileForm(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        normalizeQuestion({
          status: "Draft",
          active: true,
          createdBy: "admin-custom",
          difficulty: prev.roleRequirements || "Senior"
        }, prev)
      ]
    }));
  };

  const deleteQuestion = (questionId) => {
    setProfileForm(prev => ({
      ...prev,
      questions: prev.questions.filter(question => question.id !== questionId)
    }));
  };

  const approveQuestion = (questionId) => {
    setProfileForm(prev => ({
      ...prev,
      questions: prev.questions.map(question => (
        question.id === questionId
          ? normalizeQuestion({
              ...question,
              status: "Approved",
              approved: true,
              active: true,
              activeStatus: "Active",
              customerProfileId: question.customerProfileId || prev.id || "",
              technology: question.technology || prev.technologyStack || prev.technology || "",
              roleLevel: isKnownRoleValue(normalizeRoleValue(question.roleLevel))
                ? question.roleLevel
                : prev.roleRequirements
            }, prev)
          : question
      ))
    }));
  };

  const saveAnalyticsFeedbackDecision = async (preference) => {
    if (!analyticsDecisionPrompt?.profile?.id || !adminToken) return;

    const includeFeedback = preference === "include";
    const profile = analyticsDecisionPrompt.profile;
    const feedback = analyticsDecisionPrompt.feedback;

    try {
      setIsSavingAnalyticsDecision(true);
      setError("");
      setMessage("");

      const profileWithDecision = normalizeProfileForForm({
        ...profile,
        includeAnalyticsFeedbackInAssessment: includeFeedback,
        analyticsFeedbackPreference: preference,
        analyticsFeedbackReportGeneratedAt: feedback.reportGeneratedAt,
        analyticsFeedbackKey: feedback.feedbackKey,
        analyticsFeedbackSummary: summarizeAnalyticsFeedback(feedback),
        analyticsFeedbackRecommendations: feedback.recommendations || [],
        analyticsFeedbackUpdatedAt: new Date().toISOString()
      });
      const payload = serializeProfile(profileWithDecision);

      const response = includeFeedback
        ? await fetch(`${apiBaseUrl}/api/admin/customer-profiles/${profile.id}/apply-analytics-feedback`, {
          method: "POST",
          headers: {
            ...requestHeaders,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            reportGeneratedAt: feedback.reportGeneratedAt,
            feedbackKey: feedback.feedbackKey,
            preference
          })
        })
        : await fetch(`${apiBaseUrl}/api/admin/customer-profiles/${profile.id}`, {
          method: "PUT",
          headers: {
            ...requestHeaders,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
      const body = await readApiResponse(response);

      const decisionKey = getAnalyticsDecisionKey(profile.id, feedback);
      rememberAnalyticsDecisionKey(decisionKey);
      if (body.profile) {
        setProfiles(prev => prev.map(item => (
          item.id === body.profile.id ? body.profile : item
        )));
        setSelectedProfileId(body.profile.id);
        setProfileForm(normalizeProfileForForm(body.profile));
      }
      setAnalyticsDecisionPrompt(null);
      setActiveAnalyticsPromptKey("");
      setMessage(includeFeedback
        ? `Analytics feedback applied. ${body.optimizedQuestionCount || 0} analytics-optimized questions are now approved and active for this profile.`
        : "Analytics feedback will be excluded from future assessments for this profile."
      );
      await loadProfiles(body.profile.id);
    } catch (decisionError) {
      setError(decisionError.message);
    } finally {
      setIsSavingAnalyticsDecision(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f1f0fc] via-[#eaeefa] to-[#e1edf9]">
      <header className="bg-gradient-to-b from-[#4779f2] via-[#7747d5] to-[#5f32c6] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-wide text-white/75">Admin Panel</div>
              <h1 className="text-3xl font-bold">Customer Interview Profile Management</h1>
              <p className="text-white/90 mt-1">Logged in as {adminUser?.username || "admin"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveView("profiles")}
                className={`inline-flex items-center justify-center px-4 py-2 rounded-lg font-semibold border ${
                  activeView === "profiles" ? "bg-white text-[#5f1fbe] border-white" : "border-white/40 text-white hover:bg-white/10"
                }`}
              >
                <FileText size={18} className="mr-2" />
                Profiles
              </button>
              <button
                type="button"
                onClick={() => setActiveView("analytics")}
                className={`inline-flex items-center justify-center px-4 py-2 rounded-lg font-semibold border ${
                  activeView === "analytics" ? "bg-white text-[#5f1fbe] border-white" : "border-white/40 text-white hover:bg-white/10"
                }`}
              >
                <BarChart3 size={18} className="mr-2" />
                Analytics Dashboard
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center justify-center border border-white/40 text-white px-4 py-2 rounded-lg font-semibold hover:bg-white/10"
              >
                <LogOut size={18} className="mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {message && <div role="status" aria-live="polite" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800 font-semibold">{message}</div>}
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 font-semibold">{error}</div>}

        {analyticsDecisionPrompt && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-6">
            <div className="flex min-h-full items-start justify-center">
              <div className="flex w-full max-w-2xl max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-xl bg-white shadow-2xl border border-gray-100">
              <div className="flex-shrink-0 border-b border-gray-200 px-6 py-5">
                <div className="text-sm uppercase tracking-wide font-bold text-indigo-700">Analytics Feedback Decision</div>
                <h2 className="mt-1 text-2xl font-bold text-gray-900">
                  Include optimization feedback in this assessment profile?
                </h2>
                <p className="mt-2 text-gray-600">
                  {analyticsDecisionPrompt.profile.customerName} / {analyticsDecisionPrompt.profile.projectName}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Feedback report generated: {new Date(analyticsDecisionPrompt.feedback.reportGeneratedAt).toLocaleString()}
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {analyticsDecisionPrompt.feedback.customerInsight && (
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <div className="text-xs font-bold uppercase text-gray-500">Interviews</div>
                      <div className="text-2xl font-bold text-gray-900">{analyticsDecisionPrompt.feedback.customerInsight.interviews || 0}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <div className="text-xs font-bold uppercase text-gray-500">Completion</div>
                      <div className="text-2xl font-bold text-gray-900">{analyticsDecisionPrompt.feedback.customerInsight.completionRate || 0}%</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <div className="text-xs font-bold uppercase text-gray-500">Avg Score</div>
                      <div className="text-2xl font-bold text-gray-900">{analyticsDecisionPrompt.feedback.customerInsight.averageScore || 0}</div>
                    </div>
                  </div>
                )}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="font-bold text-gray-900 mb-2">Exact feedback that will be saved</div>
                  <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-700 font-sans">
                    {summarizeAnalyticsFeedback(analyticsDecisionPrompt.feedback) || "No detailed feedback text available. The profile will still be refreshed using the current analytics report."}
                  </pre>
                </div>
                <p className="text-sm text-gray-600">
                  Include updates this customer profile now by adding approved analytics-optimized questions and allows future assessment evaluation to use the feedback. Exclude keeps the current question set unchanged.
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-col sm:flex-row sm:justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
                <button
                  type="button"
                  disabled={isSavingAnalyticsDecision}
                  onClick={() => saveAnalyticsFeedbackDecision("exclude")}
                  className="inline-flex justify-center rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Exclude Feedback
                </button>
                <button
                  type="button"
                  disabled={isSavingAnalyticsDecision}
                  onClick={() => saveAnalyticsFeedbackDecision("include")}
                  className="inline-flex justify-center rounded-lg bg-[#5f1fbe] px-5 py-3 font-semibold text-white hover:bg-[#4a1696] disabled:opacity-60"
                >
                  {isSavingAnalyticsDecision ? "Saving..." : "Include Feedback"}
                </button>
              </div>
            </div>
            </div>
          </div>
        )}

        {activeView === "analytics" ? (
          <AnalyticsDashboard
            adminToken={adminToken}
            onReportLoaded={setAnalyticsOptimizationReport}
          />
        ) : (
        <div className="grid xl:grid-cols-[330px,1fr] gap-6">
          <aside className="bg-white rounded-xl border border-gray-100 shadow-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Customer Profiles</h2>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  setSelectedProfileId("");
                  setProfileForm(normalizeProfileForForm(emptyProfile));
                  setMessage("");
                  setError("");
                }}
                className="inline-flex items-center text-indigo-700 font-semibold disabled:opacity-50"
              >
                <Plus size={18} className="mr-1" />
                New
              </button>
            </div>

            {isLoading ? (
              <div className="text-gray-600">Loading profiles...</div>
            ) : (
              <div className="space-y-3">
                {profiles.map(profile => (
                  <button
                    key={profile.id}
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setSelectedProfileId(profile.id)}
                    className={`w-full text-left border rounded-lg p-3 transition-all ${
                      selectedProfileId === profile.id ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-200"
                    }`}
                  >
                    <div className="font-bold text-gray-900">{profile.customerName || "Untitled Customer"}</div>
                    <div className="text-sm text-gray-600">{profile.projectName || "Untitled Project"}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs uppercase font-bold text-indigo-700">{profile.technologyStack || "Technology TBD"}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                        profile.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                      }`}>
                        {profile.status}
                      </span>
                    </div>
                  </button>
                ))}
                {profiles.length === 0 && <div className="text-sm text-gray-600">No profiles yet. Generate or create one.</div>}
              </div>
            )}
          </aside>

          <section className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-lg p-6">
              <div className="flex items-center mb-4">
                <Upload size={22} className="text-indigo-600 mr-2" />
                <h2 className="text-xl font-bold text-gray-900">Customer Requirement Upload</h2>
              </div>
              <div className="grid lg:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Upload PDF, DOCX, or TXT</label>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(event) => setRequirementFile(event.target.files?.[0] || null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    TXT and pasted text are parsed locally. PDF/DOCX uploads are tracked; paste text for full local extraction.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Pasted Requirement Text</label>
                  <textarea
                    value={pastedText}
                    onChange={(event) => setPastedText(event.target.value)}
                    rows={5}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Paste project scope, technology stack, domain, responsibilities, and must-have skills..."
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={generateInterviewProfile}
                disabled={isAnalyzing || isProcessing}
                className="mt-5 inline-flex items-center bg-[#5f1fbe] text-white px-5 py-3 rounded-lg font-semibold hover:bg-[#4a1696] disabled:opacity-60"
              >
                <RefreshCw size={18} className={`mr-2 ${isAnalyzing ? "animate-spin" : ""}`} />
                {isAnalyzing ? "Generating Interview Profile" : "Generate Interview Profile"}
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-lg p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900">Customer Profile Management</h2>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                      isActiveProfile ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    }`}>
                      {normalizeProfileStatus(profileForm.status)}
                    </span>
                  </div>
                  <p className="text-gray-600">Create, edit, activate, or deactivate customer-specific interview profiles.</p>
                </div>
                <div className="flex gap-3">
                  {profileForm.id && (
                    <>
                      <button
                        type="button"
                        onClick={() => updateStatus(profileForm.id, "Active")}
                        disabled={isProcessing || isActiveProfile}
                        className="inline-flex items-center border border-green-200 text-green-700 px-4 py-2 rounded-lg font-semibold hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle size={18} className="mr-2" />
                        {processingAction === "activate" ? "Activating..." : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(profileForm.id, "Inactive")}
                        disabled={isProcessing || !isActiveProfile}
                        className="inline-flex items-center border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw size={18} className={`mr-2 ${processingAction === "deactivate" ? "animate-spin" : ""}`} />
                        {processingAction === "deactivate" ? "Deactivating..." : "Deactivate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProfile(profileForm.id)}
                        disabled={isProcessing}
                        className="inline-flex items-center border border-red-200 text-red-700 px-4 py-2 rounded-lg font-semibold hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={18} className="mr-2" />
                        {processingAction === "delete" ? "Deleting..." : "Delete"}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={isProcessing}
                    className="inline-flex items-center bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-60"
                  >
                    <Save size={18} className={`mr-2 ${processingAction === "save" ? "animate-pulse" : ""}`} />
                    {processingAction === "save" ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                {[
                  ["customerName", "Customer Name"],
                  ["projectName", "Project Name"],
                  ["technologyStack", "Technology Stack"],
                  ["clientDomain", "Client Domain"],
                  ["roleRequirements", "Role Requirements"]
                ].map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
                    <input
                      value={profileForm[field] || ""}
                      onChange={(event) => updateProfileField(field, event.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-5 mt-5">
                {[
                  ["mustHaveSkillsText", "Must-Have Skills"],
                  ["preferredSkillsText", "Preferred Skills"],
                  ["interviewFocusAreasText", "Interview Focus Areas"],
                  ["responsibilitiesText", "Responsibilities"]
                ].map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
                    <textarea
                      value={profileForm[field] || ""}
                      onChange={(event) => updateProfileField(field, event.target.value)}
                      rows={5}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Role-Level Mapping</label>
                <div className="flex flex-wrap gap-3">
                  {roles.map(role => (
                    <label key={role} className="inline-flex items-center border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                      <input
                        type="checkbox"
                        checked={Boolean(profileForm.roleLevelMapping?.[role])}
                        onChange={(event) => updateRoleMapping(role, event.target.checked)}
                        className="mr-2"
                      />
                      <span className="capitalize text-sm font-semibold text-gray-700">{role}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-lg p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center">
                  <FileText size={22} className="text-indigo-600 mr-2" />
                  <h2 className="text-xl font-bold text-gray-900">Question Management</h2>
                </div>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="inline-flex items-center border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-50"
                >
                  <Plus size={18} className="mr-2" />
                  Add Question
                </button>
              </div>

              <div className="grid sm:grid-cols-5 gap-3 mb-6">
                {[
                  ["Total Generated", questionStats.total],
                  ["Approved", questionStats.approved],
                  ["Pending", questionStats.pending],
                  ["Active", questionStats.active],
                  ["Inactive", questionStats.inactive]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="text-2xl font-bold text-gray-900">{value}</div>
                    <div className="text-xs font-semibold uppercase text-gray-500">{label}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                {profileForm.questions.map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
                      <div className="font-bold text-gray-900">Question {index + 1}</div>
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={question.type}
                          onChange={(event) => {
                            updateQuestion(question.id, "type", event.target.value);
                            updateQuestion(question.id, "category", event.target.value);
                          }}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                          {questionTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                        <select
                          value={question.roleLevel || normalizeRoleValue(question.difficulty)}
                          onChange={(event) => {
                            updateQuestion(question.id, "roleLevel", event.target.value);
                            updateQuestion(question.id, "difficulty", event.target.value);
                          }}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                          {roles.map(role => <option key={role} value={role}>{role}</option>)}
                        </select>
                        <select
                          value={question.status}
                          onChange={(event) => updateQuestion(question.id, "status", event.target.value)}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="Draft">Draft</option>
                          <option value="Approved">Approved</option>
                        </select>
                        <select
                          value={question.active ? "Active" : "Inactive"}
                          onChange={(event) => updateQuestion(question.id, "active", event.target.value === "Active")}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => approveQuestion(question.id)}
                          className="inline-flex items-center text-green-700 border border-green-200 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-green-50"
                        >
                          <CheckCircle size={16} className="mr-1" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteQuestion(question.id)}
                          className="inline-flex items-center text-red-700 border border-red-200 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-red-50"
                        >
                          <Trash2 size={16} className="mr-1" />
                          Delete
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={question.text}
                      onChange={(event) => updateQuestion(question.id, "text", event.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Enter interview question"
                    />
                    <div className="grid md:grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Technology</label>
                        <input
                          value={question.technology || profileForm.technologyStack || ""}
                          onChange={(event) => updateQuestion(question.id, "technology", event.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Created By</label>
                        <input
                          value={question.createdBy || "admin"}
                          onChange={(event) => updateQuestion(question.id, "createdBy", event.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                    <label className="block text-sm font-semibold text-gray-700 mt-3 mb-2">Key Points</label>
                    <textarea
                      value={arrayToText(question.keyPoints)}
                      onChange={(event) => updateQuestion(question.id, "keyPoints", textToArray(event.target.value))}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                ))}

                {profileForm.questions.length === 0 && (
                  <div className="text-gray-600 border border-dashed border-gray-300 rounded-lg p-6 text-center">
                    No questions yet. Generate a profile or add custom questions.
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-gray-200 pt-5">
                <h3 className="text-lg font-bold text-gray-900">Question Preview</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Candidate preview for {profileForm.technologyStack || "selected technology"} / {normalizeRoleValue(profileForm.roleRequirements)}.
                </p>
                <div className="mt-4 space-y-3">
                  {previewQuestions.map((question, index) => (
                    <div key={question.id} className="rounded-lg border border-green-200 bg-green-50 p-3">
                      <div className="text-xs font-bold uppercase text-green-700">
                        {index + 1}. {question.type} • {question.roleLevel} • Approved Active
                      </div>
                      <div className="mt-1 text-gray-900 font-semibold">{question.text}</div>
                    </div>
                  ))}
                  {previewQuestions.length === 0 && (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 font-semibold">
                      No approved active questions match this profile technology and role level. Candidate interviews will use default question generation.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
        )}
      </main>
    </div>
  );
}
