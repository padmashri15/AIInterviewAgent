import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  RefreshCw,
  Target,
  TrendingUp,
  Users
} from "lucide-react";

const apiBaseUrl = process.env.REACT_APP_API_URL || "";

const formatPercent = (value) => `${Number(value || 0).toFixed(1).replace(".0", "")}%`;

const formatDuration = (seconds) => {
  const totalSeconds = Math.round(Number(seconds || 0));
  if (!totalSeconds) return "0s";
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
};

const priorityStyles = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-blue-50 text-blue-700 border-blue-200"
};

function MetricTile({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-500">{label}</div>
        <Icon size={20} className="text-indigo-600" />
      </div>
      <div className="mt-3 text-3xl font-bold text-gray-900">{value}</div>
      {helper && <div className="mt-1 text-sm text-gray-500">{helper}</div>}
    </div>
  );
}

function BarRow({ label, value, maxValue, detail }) {
  const width = maxValue ? Math.max(4, Math.min(100, (Number(value || 0) / maxValue) * 100)) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-gray-700 truncate">{label}</span>
        <span className="text-gray-500 whitespace-nowrap">{detail || value}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full bg-indigo-600" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function InsightTable({ title, items, columns, emptyMessage }) {
  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-lg">
      <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
      {items.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                {columns.map(column => (
                  <th key={column.key} className="px-3 py-2 font-bold">{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id || item.questionId || item.customerProfileId || item.key || index} className="border-b border-gray-100">
                  {columns.map(column => (
                    <td key={column.key} className="px-3 py-3 text-gray-700 align-top">
                      {column.render ? column.render(item) : item[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 p-5 text-center text-gray-600">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

export default function AnalyticsDashboard({ adminToken, onReportLoaded }) {
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const requestHeaders = useMemo(() => (
    adminToken ? { Authorization: `Bearer ${adminToken}` } : {}
  ), [adminToken]);

  const loadReport = useCallback(async (refresh = false) => {
    if (!adminToken) {
      setIsLoading(false);
      setError("Admin session is not ready. Please log in again.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      const response = await fetch(`${apiBaseUrl}/api/admin/analytics/optimization${refresh ? "?refresh=true" : ""}`, {
        headers: requestHeaders
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
      setReport(body);
      onReportLoaded?.(body);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, [adminToken, onReportLoaded, requestHeaders]);

  const runOptimization = async () => {
    if (!adminToken) {
      setError("Admin session is not ready. Please log in again.");
      return;
    }

    try {
      setIsRunning(true);
      setError("");
      setMessage("");
      const response = await fetch(`${apiBaseUrl}/api/admin/analytics/optimization/run`, {
        method: "POST",
        headers: {
          ...requestHeaders,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
      setReport(body.report);
      onReportLoaded?.(body.report);
      setMessage(body.message || "Analytics Optimization Agent completed successfully.");
    } catch (runError) {
      setError(runError.message);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const summary = report?.analyticsSummary || {};
  const technologyInsights = useMemo(() => report?.technologyInsights || [], [report]);
  const roleInsights = useMemo(() => report?.roleInsights || [], [report]);
  const questionPerformance = useMemo(() => report?.questionPerformance || [], [report]);
  const customerInsights = useMemo(() => report?.customerProfileInsights || [], [report]);
  const recommendations = useMemo(() => report?.optimizationRecommendations || [], [report]);

  const maxTechnologyInterviews = Math.max(1, ...technologyInsights.map(item => item.interviews || 0));
  const maxRoleInterviews = Math.max(1, ...roleInsights.map(item => item.interviews || 0));

  const topQuestions = useMemo(
    () => [...questionPerformance].sort((a, b) => (b.successRate || 0) - (a.successRate || 0)).slice(0, 5),
    [questionPerformance]
  );
  const failedQuestions = useMemo(
    () => [...questionPerformance].sort((a, b) => (b.failureRate || 0) - (a.failureRate || 0)).slice(0, 5),
    [questionPerformance]
  );
  const frequentlyAskedQuestions = useMemo(
    () => [...questionPerformance].sort((a, b) => (b.timesAsked || 0) - (a.timesAsked || 0)).slice(0, 5),
    [questionPerformance]
  );

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-lg">
        <RefreshCw className="mx-auto animate-spin text-indigo-600" size={28} />
        <div className="mt-3 font-semibold text-gray-700">Loading analytics optimization report...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800 font-semibold">{message}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 font-semibold">{error}</div>}

      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-sm uppercase tracking-wide text-indigo-700 font-bold">Analytics Optimization Engine</div>
            <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
            <p className="text-gray-600 mt-1">
              Generated {report?.generatedAt ? new Date(report.generatedAt).toLocaleString() : "not yet"} using {report?.source?.localEventCount || 0} mirrored events and {report?.source?.exportEventCount || 0} exported events.
            </p>
            {report?.source?.ga4Status && (
              <p className="text-sm text-gray-500 mt-1">GA4 import status: {report.source.ga4Status}</p>
            )}
          </div>
          <button
            type="button"
            onClick={runOptimization}
            disabled={isRunning}
            className="inline-flex items-center justify-center bg-[#5f1fbe] text-white px-5 py-3 rounded-lg font-semibold hover:bg-[#4a1696] disabled:opacity-60"
          >
            <RefreshCw size={18} className={`mr-2 ${isRunning ? "animate-spin" : ""}`} />
            {isRunning ? "Running Agent" : "Run Optimization Agent"}
          </button>
        </div>
      </section>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricTile icon={Users} label="Total Interviews" value={summary.interviewStarts || 0} helper={`${summary.loginCount || 0} logins`} />
        <MetricTile icon={CheckCircle} label="Completed Interviews" value={summary.completedInterviews || 0} helper={`${formatPercent(100 - (summary.dropOffRate || 0))} completion`} />
        <MetricTile icon={Target} label="Average Marks" value={summary.averageMarks || 0} helper={`${formatPercent(summary.assessmentCompletionRate)} assessment save rate`} />
        <MetricTile icon={Clock} label="Average Duration" value={formatDuration(summary.averageInterviewDurationSeconds)} helper={`${summary.reportGenerationCount || 0} reports generated`} />
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-lg">
          <div className="flex items-center mb-5">
            <BarChart3 size={22} className="mr-2 text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-900">Technology Insights</h3>
          </div>
          <div className="space-y-4">
            {technologyInsights.map(item => (
              <BarRow
                key={item.key}
                label={item.label}
                value={item.interviews}
                maxValue={maxTechnologyInterviews}
                detail={`${item.interviews} interviews | ${formatPercent(item.successRate)} success`}
              />
            ))}
            {!technologyInsights.length && <div className="text-gray-600">No technology analytics yet.</div>}
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-lg">
          <div className="flex items-center mb-5">
            <TrendingUp size={22} className="mr-2 text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-900">Role Insights</h3>
          </div>
          <div className="space-y-4">
            {roleInsights.map(item => (
              <BarRow
                key={item.key}
                label={item.label}
                value={item.interviews}
                maxValue={maxRoleInterviews}
                detail={`${item.interviews} interviews | avg ${item.averageScore || 0}`}
              />
            ))}
            {!roleInsights.length && <div className="text-gray-600">No role analytics yet.</div>}
          </div>
        </section>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <InsightTable
          title="Top Performing Questions"
          items={topQuestions}
          emptyMessage="No question performance data yet."
          columns={[
            { key: "questionText", label: "Question", render: item => <span className="font-semibold text-gray-900">{item.questionText}</span> },
            { key: "successRate", label: "Success", render: item => formatPercent(item.successRate) },
            { key: "classification", label: "Class" }
          ]}
        />
        <InsightTable
          title="Most Failed Questions"
          items={failedQuestions}
          emptyMessage="No failed question trends yet."
          columns={[
            { key: "questionText", label: "Question", render: item => <span className="font-semibold text-gray-900">{item.questionText}</span> },
            { key: "failureRate", label: "Failure", render: item => formatPercent(item.failureRate) },
            { key: "timesAsked", label: "Asked" }
          ]}
        />
        <InsightTable
          title="Frequently Asked Questions"
          items={frequentlyAskedQuestions}
          emptyMessage="No frequently asked questions yet."
          columns={[
            { key: "questionText", label: "Question", render: item => <span className="font-semibold text-gray-900">{item.questionText}</span> },
            { key: "timesAsked", label: "Asked" },
            { key: "averageResponseDurationSeconds", label: "Avg Time", render: item => formatDuration(item.averageResponseDurationSeconds) }
          ]}
        />
      </div>

      <InsightTable
        title="Customer Profile Insights"
        items={customerInsights}
        emptyMessage="No customer profile analytics yet."
        columns={[
          { key: "customerName", label: "Customer", render: item => <span className="font-semibold text-gray-900">{item.customerName}</span> },
          { key: "projectName", label: "Project" },
          { key: "interviews", label: "Interviews" },
          { key: "completionRate", label: "Completion", render: item => formatPercent(item.completionRate) },
          { key: "averageScore", label: "Avg Score" },
          { key: "questionEffectiveness", label: "Question Effectiveness" },
          { key: "lastActivityAt", label: "Last Activity", render: item => item.lastActivityAt ? new Date(item.lastActivityAt).toLocaleDateString() : "No activity" }
        ]}
      />

      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-lg">
        <div className="flex items-center mb-5">
          <AlertTriangle size={22} className="mr-2 text-amber-600" />
          <h3 className="text-lg font-bold text-gray-900">AI Recommendations Panel</h3>
        </div>
        <div className="space-y-3">
          {recommendations.map(recommendation => (
            <div key={recommendation.id} className={`rounded-lg border px-4 py-3 ${priorityStyles[recommendation.priority] || priorityStyles.low}`}>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                <div>
                  <div className="text-xs uppercase font-bold">{recommendation.type} | {recommendation.priority}</div>
                  <div className="mt-1 font-semibold">{recommendation.message}</div>
                  <div className="mt-1 text-sm">{recommendation.action}</div>
                </div>
              </div>
            </div>
          ))}
          {!recommendations.length && (
            <div className="rounded-lg border border-dashed border-gray-300 p-5 text-center text-gray-600">
              No optimization recommendations yet. Complete interviews or import GA4/export data, then run the agent.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
