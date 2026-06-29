const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_AGENT = {
  name: 'Analytics Optimization Agent',
  responsibilities: [
    'Read analytics reports',
    'Detect interview and candidate behavior trends',
    'Identify weak interview areas',
    'Recommend improvements',
    'Send optimization suggestions to the Question Generation Agent'
  ]
};

const DEFAULT_REPORT = {
  agent: DEFAULT_AGENT,
  generatedAt: null,
  source: {
    mode: 'local-events-and-optional-ga4-export',
    localEventCount: 0,
    exportEventCount: 0,
    ga4ImportedAt: null,
    ga4Status: 'not_configured'
  },
  analyticsSummary: {
    loginCount: 0,
    interviewStarts: 0,
    completedInterviews: 0,
    dropOffRate: 0,
    averageInterviewDurationSeconds: 0,
    assessmentCompletionRate: 0,
    reportGenerationCount: 0,
    averageMarks: 0
  },
  technologyInsights: [],
  roleInsights: [],
  questionPerformance: [],
  customerProfileInsights: [],
  optimizationRecommendations: [],
  questionGenerationGuidance: []
};

const ROLE_ALIASES = {
  fresher: 'fresher',
  trainee: 'fresher',
  intern: 'fresher',
  junior: 'junior',
  mid: 'mid-level',
  midlevel: 'mid-level',
  'mid-level': 'mid-level',
  senior: 'senior',
  lead: 'lead',
  architect: 'architect'
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.warn(`Unable to read analytics file ${filePath}:`, error.message);
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function percentage(part, total) {
  if (!total) return 0;
  return round((part / total) * 100);
}

function normalizeKey(value, fallback = 'unknown') {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || fallback;
}

function normalizeTechnology(value) {
  return normalizeKey(value).replace(/_/g, '-');
}

function normalizeRole(value) {
  const normalized = normalizeKey(value);
  const compact = normalized.replace(/[^a-z0-9]/g, '');
  return ROLE_ALIASES[normalized] || ROLE_ALIASES[compact] || normalized;
}

function getParam(event, names, fallback = '') {
  const params = event.params || event.parameters || {};
  for (const name of names) {
    if (params[name] !== undefined && params[name] !== null && params[name] !== '') {
      return params[name];
    }
    if (event[name] !== undefined && event[name] !== null && event[name] !== '') {
      return event[name];
    }
  }
  return fallback;
}

function getDate(event) {
  const timestamp = event.timestamp || event.createdAt || event.eventTimestamp || event.date;
  const parsed = timestamp ? new Date(timestamp) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function isWithinDays(event, minDaysAgo, maxDaysAgo) {
  const now = Date.now();
  const ageDays = (now - getDate(event).getTime()) / (1000 * 60 * 60 * 24);
  return ageDays >= minDaysAgo && ageDays < maxDaysAgo;
}

function createMetricBucket(label) {
  return {
    key: label,
    label,
    interviews: 0,
    completions: 0,
    scores: [],
    durations: [],
    successes: 0,
    reports: 0,
    assessments: 0,
    lastActivityAt: null,
    last30Starts: 0,
    previous30Starts: 0
  };
}

function updateLastActivity(bucket, event) {
  const timestamp = getDate(event).toISOString();
  if (!bucket.lastActivityAt || timestamp > bucket.lastActivityAt) {
    bucket.lastActivityAt = timestamp;
  }
}

function summarizeMetricBucket(bucket) {
  const scoreTotal = bucket.scores.reduce((sum, score) => sum + score, 0);
  const durationTotal = bucket.durations.reduce((sum, duration) => sum + duration, 0);

  return {
    key: bucket.key,
    label: bucket.label,
    interviews: bucket.interviews,
    completions: bucket.completions,
    completionRate: percentage(bucket.completions, bucket.interviews),
    averageScore: bucket.scores.length ? round(scoreTotal / bucket.scores.length) : 0,
    averageDurationSeconds: bucket.durations.length ? round(durationTotal / bucket.durations.length) : 0,
    successRate: percentage(bucket.successes, bucket.completions),
    reportGenerationCount: bucket.reports,
    assessmentCompletionCount: bucket.assessments,
    lastActivityAt: bucket.lastActivityAt,
    growthRate30d: bucket.previous30Starts
      ? round(((bucket.last30Starts - bucket.previous30Starts) / bucket.previous30Starts) * 100)
      : bucket.last30Starts > 0 ? 100 : 0
  };
}

function classifyQuestion(question) {
  if (question.failureRate > 80) return 'Frequently Failed';
  if (question.successRate > 98 && question.timesAsked >= 3) return 'Frequently Passed';
  if (question.averageScore >= 80) return 'Easy';
  if (question.averageScore >= 50) return 'Medium';
  return question.timesAsked ? 'Hard' : 'Unclassified';
}

function getScoreFromAssessment(value) {
  const normalized = normalizeKey(value);
  if (normalized.includes('correct') && normalized.includes('partial')) return 60;
  if (normalized.includes('correct')) return 100;
  if (normalized.includes('incorrect')) return 25;
  return 0;
}

function mapReportRowsToEvents(reportRows = []) {
  return reportRows.map((row) => {
    const dimensionValues = row.dimensionValues || [];
    const metricValues = row.metricValues || [];
    return {
      id: `ga4-${crypto.randomBytes(6).toString('hex')}`,
      eventName: 'ga4_event_summary',
      timestamp: new Date().toISOString(),
      source: 'ga4-data-api',
      params: {
        event_name: dimensionValues[0]?.value || '',
        event_count: toNumber(metricValues[0]?.value),
        total_users: toNumber(metricValues[1]?.value)
      }
    };
  });
}

class AnalyticsOptimizationEngine {
  constructor(options = {}) {
    const vercelDataDir = path.join('/tmp', 'ai-interview-agent', 'data');
    this.dataDir = options.dataDir || process.env.RUNTIME_DATA_DIR || (process.env.VERCEL ? vercelDataDir : path.join(__dirname, '..', 'data'));
    this.eventsFilePath = options.eventsFilePath || path.join(this.dataDir, 'analyticsEvents.json');
    this.reportFilePath = options.reportFilePath || path.join(this.dataDir, 'analyticsOptimization.json');
    this.exportFilePath = options.exportFilePath || process.env.ANALYTICS_EXPORT_FILE || path.join(this.dataDir, 'analyticsExport.json');
  }

  getDefaultReport() {
    return JSON.parse(JSON.stringify(DEFAULT_REPORT));
  }

  loadLocalEvents() {
    const stored = readJson(this.eventsFilePath, { events: [] });
    return Array.isArray(stored) ? stored : (stored.events || []);
  }

  loadExportEvents() {
    const exported = readJson(this.exportFilePath, { events: [] });
    if (Array.isArray(exported)) return exported;
    return exported.events || exported.analyticsEvents || [];
  }

  loadReport() {
    return readJson(this.reportFilePath, this.getDefaultReport());
  }

  recordEvent(eventName, params = {}, requestMeta = {}) {
    const events = this.loadLocalEvents();
    const event = {
      id: `evt-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      eventName,
      timestamp: new Date().toISOString(),
      source: 'application-mirror',
      params: params || {},
      requestMeta: {
        userAgent: requestMeta.userAgent || '',
        ipHash: requestMeta.ip
          ? crypto.createHash('sha256').update(String(requestMeta.ip)).digest('hex').slice(0, 16)
          : ''
      }
    };

    events.push(event);
    const maxEvents = toNumber(process.env.ANALYTICS_LOCAL_EVENT_LIMIT, 10000);
    writeJson(this.eventsFilePath, { events: events.slice(-maxEvents) });
    return event;
  }

  async fetchGa4EventSummary() {
    const propertyId = process.env.GA4_PROPERTY_ID || process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
    const accessToken = process.env.GA4_ACCESS_TOKEN || process.env.GOOGLE_ANALYTICS_ACCESS_TOKEN;

    if (!propertyId || !accessToken) {
      return {
        status: 'not_configured',
        events: [],
        message: 'Set GA4_PROPERTY_ID and GA4_ACCESS_TOKEN to import event summaries from Google Analytics Data API.'
      };
    }

    if (typeof fetch !== 'function') {
      return {
        status: 'unavailable',
        events: [],
        message: 'Global fetch is unavailable in this Node runtime.'
      };
    }

    const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
    const body = {
      dateRanges: [
        {
          startDate: process.env.GA4_START_DATE || '30daysAgo',
          endDate: process.env.GA4_END_DATE || 'today'
        }
      ],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
      limit: '1000'
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message || `HTTP ${response.status}`);
      }

      return {
        status: 'imported',
        importedAt: new Date().toISOString(),
        events: mapReportRowsToEvents(payload.rows || []),
        rowCount: payload.rowCount || 0
      };
    } catch (error) {
      return {
        status: 'failed',
        events: [],
        message: error.message
      };
    }
  }

  getCombinedEvents(extraEvents = []) {
    return [
      ...this.loadLocalEvents(),
      ...this.loadExportEvents(),
      ...extraEvents
    ].filter(Boolean);
  }

  aggregateEvents(events, customerProfiles = [], ga4Result = null) {
    const report = this.getDefaultReport();
    const localEvents = this.loadLocalEvents();
    const exportEvents = this.loadExportEvents();

    report.generatedAt = new Date().toISOString();
    report.source.localEventCount = localEvents.length;
    report.source.exportEventCount = exportEvents.length;

    if (ga4Result) {
      report.source.ga4ImportedAt = ga4Result.importedAt || null;
      report.source.ga4Status = ga4Result.status;
      report.source.ga4Message = ga4Result.message || '';
      report.source.ga4RowCount = ga4Result.rowCount || 0;
    }

    const technologyBuckets = new Map();
    const roleBuckets = new Map();
    const customerBuckets = new Map();
    const questionBuckets = new Map();

    const completedEvents = [];
    const startedEvents = [];
    const assessmentEvents = [];
    const reportEvents = [];

    const getTechnologyBucket = (technology) => {
      const key = normalizeTechnology(technology);
      if (!technologyBuckets.has(key)) technologyBuckets.set(key, createMetricBucket(key));
      return technologyBuckets.get(key);
    };

    const getRoleBucket = (role) => {
      const key = normalizeRole(role);
      if (!roleBuckets.has(key)) roleBuckets.set(key, createMetricBucket(key));
      return roleBuckets.get(key);
    };

    const getCustomerBucket = (event) => {
      const id = String(getParam(event, ['customer_profile_id', 'customerProfileId', 'profileId'], '') || '').trim();
      const name = String(getParam(event, ['customer_name', 'customerName'], '') || '').trim();
      const project = String(getParam(event, ['project_name', 'projectName'], '') || '').trim();
      const key = id || `${normalizeKey(name)}|${normalizeKey(project)}`;
      if (!customerBuckets.has(key)) {
        customerBuckets.set(key, {
          ...createMetricBucket(key),
          customerProfileId: id,
          customerName: name || 'Unknown Customer',
          projectName: project || 'Unknown Project',
          questionEffectivenessScores: []
        });
      }
      return customerBuckets.get(key);
    };

    const getQuestionBucket = (event) => {
      const questionId = String(getParam(event, ['question_id', 'questionId'], '') || '').trim();
      const questionText = String(getParam(event, ['question_text', 'questionText', 'question'], '') || '').trim();
      const key = questionId || questionText.slice(0, 120) || 'unknown-question';
      if (!questionBuckets.has(key)) {
        questionBuckets.set(key, {
          key,
          questionId,
          questionText: questionText || 'Unknown question',
          questionType: getParam(event, ['question_type', 'questionType', 'type'], 'unknown'),
          technology: normalizeTechnology(getParam(event, ['technology'], 'unknown')),
          role: normalizeRole(getParam(event, ['role', 'role_level', 'roleLevel'], 'unknown')),
          timesAsked: 0,
          skipCount: 0,
          scores: [],
          successCount: 0,
          failureCount: 0,
          responseDurations: [],
          lastAskedAt: null
        });
      }
      return questionBuckets.get(key);
    };

    for (const event of events) {
      const eventName = event.eventName || event.name || getParam(event, ['event_name', 'eventName']);
      const technology = getParam(event, ['technology', 'tech', 'selected_technology']);
      const role = getParam(event, ['role', 'role_level', 'roleLevel']);
      const score = toNumber(getParam(event, ['score', 'overall_score', 'final_marks', 'finalMarks']), null);
      const duration = toNumber(getParam(event, ['duration_seconds', 'interview_duration_seconds', 'average_duration_seconds']), null);

      if (eventName === 'login_completed') {
        report.analyticsSummary.loginCount += 1;
      }

      if (eventName === 'interview_started') {
        startedEvents.push(event);
        const techBucket = getTechnologyBucket(technology);
        techBucket.interviews += 1;
        if (isWithinDays(event, 0, 30)) techBucket.last30Starts += 1;
        if (isWithinDays(event, 30, 60)) techBucket.previous30Starts += 1;
        updateLastActivity(techBucket, event);

        const roleBucket = getRoleBucket(role);
        roleBucket.interviews += 1;
        if (isWithinDays(event, 0, 30)) roleBucket.last30Starts += 1;
        if (isWithinDays(event, 30, 60)) roleBucket.previous30Starts += 1;
        updateLastActivity(roleBucket, event);

        const customerBucket = getCustomerBucket(event);
        customerBucket.interviews += 1;
        updateLastActivity(customerBucket, event);
      }

      if (eventName === 'question_answered') {
        const questionBucket = getQuestionBucket(event);
        const skippedValue = getParam(event, ['skipped'], false);
        questionBucket.timesAsked += 1;
        questionBucket.skipCount += skippedValue === true || skippedValue === 'true' ? 1 : 0;
        if (duration !== null) questionBucket.responseDurations.push(duration);
        questionBucket.lastAskedAt = getDate(event).toISOString();
      }

      if (eventName === 'question_evaluated') {
        const questionBucket = getQuestionBucket(event);
        const assessment = getParam(event, ['assessment'], '');
        const questionScore = toNumber(getParam(event, ['score', 'score_estimate', 'scoreEstimate']), getScoreFromAssessment(assessment));
        if (questionScore) questionBucket.scores.push(questionScore);
        if (questionScore >= 70 || normalizeKey(assessment).includes('correct')) questionBucket.successCount += 1;
        if (questionScore < 50 || normalizeKey(assessment).includes('incorrect')) questionBucket.failureCount += 1;
        if (duration !== null) questionBucket.responseDurations.push(duration);

        const customerBucket = getCustomerBucket(event);
        if (questionScore) customerBucket.questionEffectivenessScores.push(questionScore);
      }

      if (eventName === 'interview_completed') {
        completedEvents.push(event);

        const techBucket = getTechnologyBucket(technology);
        techBucket.completions += 1;
        if (score !== null) techBucket.scores.push(score);
        if (duration !== null) techBucket.durations.push(duration);
        if (score >= 70) techBucket.successes += 1;
        updateLastActivity(techBucket, event);

        const roleBucket = getRoleBucket(role);
        roleBucket.completions += 1;
        if (score !== null) roleBucket.scores.push(score);
        if (duration !== null) roleBucket.durations.push(duration);
        if (score >= 70) roleBucket.successes += 1;
        updateLastActivity(roleBucket, event);

        const customerBucket = getCustomerBucket(event);
        customerBucket.completions += 1;
        if (score !== null) customerBucket.scores.push(score);
        if (duration !== null) customerBucket.durations.push(duration);
        if (score >= 70) customerBucket.successes += 1;
        updateLastActivity(customerBucket, event);
      }

      if (eventName === 'assessment_saved_to_excel') {
        assessmentEvents.push(event);
        const techBucket = getTechnologyBucket(technology);
        techBucket.assessments += 1;
        const roleBucket = getRoleBucket(role);
        roleBucket.assessments += 1;
        const customerBucket = getCustomerBucket(event);
        customerBucket.assessments += 1;
        updateLastActivity(customerBucket, event);
      }

      if (eventName === 'report_generated') {
        reportEvents.push(event);
        const techBucket = getTechnologyBucket(technology);
        techBucket.reports += 1;
        const roleBucket = getRoleBucket(role);
        roleBucket.reports += 1;
        const customerBucket = getCustomerBucket(event);
        customerBucket.reports += 1;
        updateLastActivity(customerBucket, event);
      }
    }

    const completionScores = completedEvents
      .map(event => toNumber(getParam(event, ['score', 'overall_score', 'final_marks', 'finalMarks']), null))
      .filter(score => score !== null);
    const completionDurations = completedEvents
      .map(event => toNumber(getParam(event, ['duration_seconds', 'interview_duration_seconds']), null))
      .filter(duration => duration !== null);

    report.analyticsSummary.interviewStarts = startedEvents.length;
    report.analyticsSummary.completedInterviews = completedEvents.length;
    report.analyticsSummary.dropOffRate = percentage(Math.max(startedEvents.length - completedEvents.length, 0), startedEvents.length);
    report.analyticsSummary.averageMarks = completionScores.length
      ? round(completionScores.reduce((sum, score) => sum + score, 0) / completionScores.length)
      : 0;
    report.analyticsSummary.averageInterviewDurationSeconds = completionDurations.length
      ? round(completionDurations.reduce((sum, duration) => sum + duration, 0) / completionDurations.length)
      : 0;
    report.analyticsSummary.assessmentCompletionRate = percentage(assessmentEvents.length, completedEvents.length);
    report.analyticsSummary.reportGenerationCount = reportEvents.length;

    report.technologyInsights = Array.from(technologyBuckets.values())
      .map(summarizeMetricBucket)
      .sort((a, b) => b.interviews - a.interviews);

    report.roleInsights = Array.from(roleBuckets.values())
      .map(summarizeMetricBucket)
      .sort((a, b) => b.interviews - a.interviews);

    report.questionPerformance = Array.from(questionBuckets.values())
      .map((question) => {
        const averageScore = question.scores.length
          ? round(question.scores.reduce((sum, score) => sum + score, 0) / question.scores.length)
          : 0;
        const averageResponseDurationSeconds = question.responseDurations.length
          ? round(question.responseDurations.reduce((sum, duration) => sum + duration, 0) / question.responseDurations.length)
          : 0;
        const evaluationCount = question.scores.length || question.successCount + question.failureCount;
        const questionSummary = {
          questionId: question.questionId,
          questionText: question.questionText,
          questionType: question.questionType,
          technology: question.technology,
          role: question.role,
          timesAsked: question.timesAsked,
          averageScore,
          skipRate: percentage(question.skipCount, question.timesAsked),
          failureRate: percentage(question.failureCount, evaluationCount),
          successRate: percentage(question.successCount, evaluationCount),
          averageResponseDurationSeconds,
          lastAskedAt: question.lastAskedAt
        };
        return {
          ...questionSummary,
          classification: classifyQuestion(questionSummary)
        };
      })
      .sort((a, b) => b.timesAsked - a.timesAsked);

    for (const profile of customerProfiles || []) {
      const key = profile.id || `${normalizeKey(profile.customerName)}|${normalizeKey(profile.projectName)}`;
      if (!customerBuckets.has(key)) {
        customerBuckets.set(key, {
          ...createMetricBucket(key),
          customerProfileId: profile.id || '',
          customerName: profile.customerName || 'Unknown Customer',
          projectName: profile.projectName || 'Unknown Project',
          status: profile.status || 'Inactive',
          questionCount: (profile.questions || []).length,
          approvedQuestionCount: (profile.questions || []).filter(question => question.status === 'Approved').length,
          updatedAt: profile.updatedAt || profile.createdAt || null,
          questionEffectivenessScores: []
        });
      } else {
        const bucket = customerBuckets.get(key);
        bucket.customerProfileId = profile.id || bucket.customerProfileId;
        bucket.customerName = profile.customerName || bucket.customerName;
        bucket.projectName = profile.projectName || bucket.projectName;
        bucket.status = profile.status || bucket.status;
        bucket.questionCount = (profile.questions || []).length;
        bucket.approvedQuestionCount = (profile.questions || []).filter(question => question.status === 'Approved').length;
        bucket.updatedAt = profile.updatedAt || profile.createdAt || bucket.updatedAt;
      }
    }

    report.customerProfileInsights = Array.from(customerBuckets.values())
      .map((bucket) => {
        const summary = summarizeMetricBucket(bucket);
        const effectivenessScores = bucket.questionEffectivenessScores || [];
        return {
          customerProfileId: bucket.customerProfileId || '',
          customerName: bucket.customerName || summary.label,
          projectName: bucket.projectName || '',
          status: bucket.status || 'Unknown',
          interviews: summary.interviews,
          completions: summary.completions,
          completionRate: summary.completionRate,
          averageScore: summary.averageScore,
          reportGenerationCount: summary.reportGenerationCount,
          questionEffectiveness: effectivenessScores.length
            ? round(effectivenessScores.reduce((sum, score) => sum + score, 0) / effectivenessScores.length)
            : 0,
          questionCount: bucket.questionCount || 0,
          approvedQuestionCount: bucket.approvedQuestionCount || 0,
          lastActivityAt: summary.lastActivityAt,
          updatedAt: bucket.updatedAt || null
        };
      })
      .sort((a, b) => b.interviews - a.interviews);

    report.optimizationRecommendations = this.generateRecommendations(report);
    report.questionGenerationGuidance = this.buildQuestionGenerationGuidance(report);
    return report;
  }

  generateRecommendations(report) {
    const recommendations = [];
    const addRecommendation = (type, priority, message, action, context = {}) => {
      recommendations.push({
        id: `rec-${type}-${crypto.createHash('md5').update(message).digest('hex').slice(0, 8)}`,
        type,
        priority,
        message,
        action,
        context,
        createdAt: report.generatedAt
      });
    };

    if (report.analyticsSummary.dropOffRate > 25 && report.analyticsSummary.interviewStarts >= 3) {
      addRecommendation(
        'candidate-journey',
        'high',
        `Interview drop-off is ${report.analyticsSummary.dropOffRate}%. Review interview length and early question difficulty.`,
        'Shorten the opening flow and use progressive difficulty for the first three questions.'
      );
    }

    for (const insight of report.technologyInsights) {
      if (insight.growthRate30d > 30 && insight.lastActivityAt && insight.interviews >= 3) {
        addRecommendation(
          'technology',
          'medium',
          `${insight.label} interviews are trending up by ${insight.growthRate30d}% in the latest 30-day window.`,
          `Generate more scenario-based and advanced ${insight.label} questions.`,
          { technology: insight.key }
        );
      }

      if (insight.completionRate < 60 && insight.interviews >= 3) {
        addRecommendation(
          'technology',
          'high',
          `${insight.label} has a low completion rate of ${insight.completionRate}%.`,
          `Review ${insight.label} interview flow and reduce early question complexity.`,
          { technology: insight.key }
        );
      }

      if (insight.successRate > 90 && insight.completions >= 3) {
        addRecommendation(
          'technology',
          'medium',
          `${insight.label} candidates are passing at ${insight.successRate}%.`,
          `Increase difficulty and add architecture or debugging questions for ${insight.label}.`,
          { technology: insight.key }
        );
      }
    }

    for (const insight of report.roleInsights) {
      if (['senior', 'lead', 'architect'].includes(insight.key) && insight.averageScore > 90 && insight.completions >= 3) {
        addRecommendation(
          'role',
          'medium',
          `${insight.label} candidates average ${insight.averageScore} marks.`,
          `Increase difficulty and include more architecture tradeoff questions for ${insight.label} interviews.`,
          { role: insight.key }
        );
      }

      if (['fresher', 'junior'].includes(insight.key) && insight.successRate < 45 && insight.completions >= 3) {
        addRecommendation(
          'role',
          'high',
          `${insight.label} candidates have a low success rate of ${insight.successRate}%.`,
          'Start with easier foundational questions and increase difficulty progressively.',
          { role: insight.key }
        );
      }
    }

    for (const question of report.questionPerformance) {
      if (question.failureRate > 80 && question.timesAsked >= 3) {
        addRecommendation(
          'question',
          'high',
          `Question "${question.questionText}" has a ${question.failureRate}% failure rate.`,
          'Review wording, reduce complexity, or add prerequisite context before asking.',
          { questionId: question.questionId, technology: question.technology, role: question.role }
        );
      }

      if (question.successRate > 98 && question.timesAsked >= 3) {
        addRecommendation(
          'question',
          'medium',
          `Question "${question.questionText}" has a ${question.successRate}% success rate.`,
          'Replace it with a more challenging question or use it only as a warm-up.',
          { questionId: question.questionId, technology: question.technology, role: question.role }
        );
      }
    }

    for (const profile of report.customerProfileInsights) {
      const lastActivityAgeDays = profile.lastActivityAt
        ? (Date.now() - new Date(profile.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;
      const updatedAgeDays = profile.updatedAt
        ? (Date.now() - new Date(profile.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;

      if (!profile.interviews || lastActivityAgeDays > 60) {
        addRecommendation(
          'customer-profile',
          'medium',
          `${profile.customerName} / ${profile.projectName} has low or stale interview activity.`,
          'Review whether the customer profile is still active and refresh its question set.',
          { customerProfileId: profile.customerProfileId }
        );
      }

      if (updatedAgeDays > 90 || profile.approvedQuestionCount < 5) {
        addRecommendation(
          'customer-profile',
          'medium',
          `${profile.customerName} / ${profile.projectName} may have outdated or insufficient approved questions.`,
          'Regenerate and approve customer-specific questions from the latest requirements.',
          { customerProfileId: profile.customerProfileId }
        );
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });
  }

  buildQuestionGenerationGuidance(report) {
    const guidance = [];

    for (const recommendation of report.optimizationRecommendations.slice(0, 10)) {
      guidance.push({
        type: recommendation.type,
        priority: recommendation.priority,
        instruction: recommendation.action,
        context: recommendation.context || {}
      });
    }

    for (const question of report.questionPerformance.filter(item => item.classification === 'Frequently Failed').slice(0, 5)) {
      guidance.push({
        type: 'frequently-failed-topic',
        priority: 'high',
        instruction: `Candidates struggle with: ${question.questionText}. Add scaffolding or ask a clearer prerequisite question first.`,
        context: {
          technology: question.technology,
          role: question.role,
          failureRate: question.failureRate
        }
      });
    }

    return guidance;
  }

  async runOptimization(options = {}) {
    const ga4Result = options.skipGa4 ? null : await this.fetchGa4EventSummary();
    const events = this.getCombinedEvents(ga4Result?.events || []);
    const report = this.aggregateEvents(events, options.customerProfiles || [], ga4Result);
    writeJson(this.reportFilePath, report);
    return report;
  }

  getReport(options = {}) {
    const report = this.loadReport();
    if (!report.generatedAt || options.force) {
      return this.aggregateEvents(this.getCombinedEvents(), options.customerProfiles || []);
    }
    return report;
  }

  getQuestionGenerationInsights(filters = {}) {
    const report = this.loadReport();
    const technology = filters.technology ? normalizeTechnology(filters.technology) : '';
    const role = (filters.role || filters.roleLevel) ? normalizeRole(filters.role || filters.roleLevel) : '';
    const customerProfileId = String(filters.customerProfileId || '').trim();

    const recommendations = (report.optimizationRecommendations || []).filter((recommendation) => {
      const context = recommendation.context || {};
      const contextTechnology = context.technology ? normalizeTechnology(context.technology) : '';
      const contextRole = context.role ? normalizeRole(context.role) : '';
      const contextCustomerProfileId = String(context.customerProfileId || '').trim();

      const technologyMatches = !contextTechnology || !technology || contextTechnology === technology;
      const roleMatches = !contextRole || !role || contextRole === role;
      const customerMatches = !contextCustomerProfileId || !customerProfileId || contextCustomerProfileId === customerProfileId;

      return technologyMatches && roleMatches && customerMatches;
    }).slice(0, 8);

    const failedQuestions = (report.questionPerformance || [])
      .filter(question => (
        (!technology || question.technology === technology || question.technology === 'unknown') &&
        (!role || question.role === role || question.role === 'unknown') &&
        question.classification === 'Frequently Failed'
      ))
      .slice(0, 5);

    const passedQuestions = (report.questionPerformance || [])
      .filter(question => (
        (!technology || question.technology === technology || question.technology === 'unknown') &&
        (!role || question.role === role || question.role === 'unknown') &&
        question.classification === 'Frequently Passed'
      ))
      .slice(0, 5);

    const promptContextLines = [];
    recommendations.forEach(recommendation => {
      promptContextLines.push(`- ${recommendation.action}`);
    });
    failedQuestions.forEach(question => {
      promptContextLines.push(`- Candidates frequently fail this area: ${question.questionText}. Ask clearer progressive questions before advanced variants.`);
    });
    passedQuestions.forEach(question => {
      promptContextLines.push(`- This question is too easy or overused: ${question.questionText}. Replace with a more challenging variant.`);
    });

    return {
      generatedAt: report.generatedAt,
      analyticsSummary: report.analyticsSummary || DEFAULT_REPORT.analyticsSummary,
      recommendations,
      failedQuestions,
      passedQuestions,
      promptContext: promptContextLines.length
        ? `Google Analytics optimization insights:\n${promptContextLines.join('\n')}`
        : 'Google Analytics optimization insights: no strong trend detected yet. Use customer requirements and approved questions as primary inputs.'
    };
  }
}

module.exports = new AnalyticsOptimizationEngine();
