// backend/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const crypto = require('crypto');
const multer = require('multer');
const ExcelJS = require('exceljs');
const dotenv = require('dotenv');
const analyticsOptimizationEngine = require('./services/analyticsOptimizationEngine');

let pdfParse = null;
let mammoth = null;

try {
  pdfParse = require('pdf-parse');
} catch (error) {
  console.warn('pdf-parse is not installed. PDF requirement extraction will use fallback text handling.');
}

try {
  mammoth = require('mammoth');
} catch (error) {
  console.warn('mammoth is not installed. DOCX requirement extraction will use fallback text handling.');
}

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5010;
const projectRoot = path.resolve(__dirname, '..');
const isVercel = Boolean(process.env.VERCEL);
const runtimeRoot = isVercel ? path.join('/tmp', 'ai-interview-agent') : projectRoot;
const runtimeDataDir = process.env.RUNTIME_DATA_DIR
  ? path.resolve(process.env.RUNTIME_DATA_DIR)
  : (isVercel ? path.join(runtimeRoot, 'data') : path.join(__dirname, 'data'));
const runtimeUploadDir = isVercel ? path.join(runtimeRoot, 'uploads') : path.join(__dirname, 'uploads');
const runtimeReportsDir = isVercel ? path.join(runtimeRoot, 'reports') : path.join(projectRoot, 'reports');

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../client/build')));

// Configure audio file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = runtimeUploadDir;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });
const requirementUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});
const adminSessions = new Map();
const defaultAdminSessionTtlMs = 8 * 60 * 60 * 1000;
const adminSessionTtlMs = Number(process.env.ADMIN_SESSION_TTL_MS) || defaultAdminSessionTtlMs;
const adminSessionSecret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || 'interview-agent-local-admin-session';

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function signAdminSession(payload) {
  return crypto
    .createHmac('sha256', adminSessionSecret)
    .update(payload)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function signaturesMatch(signature, expectedSignature) {
  const signatureBuffer = Buffer.from(String(signature || ''));
  const expectedBuffer = Buffer.from(String(expectedSignature || ''));

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

function createAdminSessionToken(session) {
  const payload = toBase64Url(JSON.stringify(session));
  return `${payload}.${signAdminSession(payload)}`;
}

function getAdminSessionFromToken(token) {
  if (!token) return null;

  const legacySession = adminSessions.get(token);
  if (legacySession) return legacySession;

  const parts = String(token).split('.');
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  const expectedSignature = signAdminSession(payload);
  if (!signaturesMatch(signature, expectedSignature)) return null;

  try {
    const session = JSON.parse(fromBase64Url(payload));
    if (!session?.username || session.role !== 'admin') return null;

    if (session.expiresAt && Date.now() > Date.parse(session.expiresAt)) {
      return null;
    }

    return session;
  } catch (error) {
    return null;
  }
}

function sanitizeFilenamePart(value) {
  return String(value || 'Report')
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'Report';
}

const reportStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = runtimeReportsDir;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const originalName = path.parse(file.originalname || '').name;
    const candidateName = sanitizeFilenamePart(req.body?.personName || originalName || 'Candidate');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    cb(null, `Report_${candidateName}_${timestamp}.pdf`);
  }
});

const reportUpload = multer({
  storage: reportStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const isPdf = file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname || '');
    if (!isPdf) {
      return cb(new Error('Assessment report must be a PDF file'));
    }
    cb(null, true);
  }
});

// Initialize OpenAI client with API key from environment
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

// Knowledge base - in a production app, this would be in a database
let knowledgeBase = {
  topics: [
    {
      name: "Machine Learning",
      questions: [
        {
          id: "ml-001",
          text: "Tell me about your experience with machine learning frameworks.",
          keyPoints: ["TensorFlow", "PyTorch", "scikit-learn", "practical projects", "model development"]
        },
        {
          id: "ml-002",
          text: "Explain the difference between supervised and unsupervised learning.",
          keyPoints: ["labeled data", "unlabeled data", "classification", "regression", "clustering"]
        },
        {
          id: "ml-003",
          text: "How would you handle overfitting in a neural network?",
          keyPoints: ["regularization", "dropout", "early stopping", "data augmentation", "cross-validation"]
        }
      ]
    },
    {
      name: "Data Science",
      questions: [
        {
          id: "ds-001",
          text: "Describe your experience with data cleaning and preprocessing.",
          keyPoints: ["missing values", "outliers", "normalization", "feature engineering", "data quality"]
        },
        {
          id: "ds-002",
          text: "What visualization tools do you prefer and why?",
          keyPoints: ["Matplotlib", "Seaborn", "Plotly", "Tableau", "data insights"]
        }
      ]
    }
  ],
  feedbackHistory: []
};

// Save knowledge base to file
function saveKnowledgeBase() {
  const filePath = path.join(runtimeDataDir, 'knowledgeBase.json');
  const dirPath = path.dirname(filePath);
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  fs.writeFileSync(filePath, JSON.stringify(knowledgeBase, null, 2));
}

// Load knowledge base from file
function loadKnowledgeBase() {
  const filePath = path.join(runtimeDataDir, 'knowledgeBase.json');
  const bundledFilePath = path.join(__dirname, 'data', 'knowledgeBase.json');
  
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf8');
    knowledgeBase = JSON.parse(data);
  } else if (fs.existsSync(bundledFilePath)) {
    const data = fs.readFileSync(bundledFilePath, 'utf8');
    knowledgeBase = JSON.parse(data);
  } else {
    saveKnowledgeBase(); // Create initial file
  }
}

// Initialize by loading existing knowledge base
loadKnowledgeBase();

function loadMockTeamsKnowledgeBase() {
  const filePath = path.join(__dirname, 'data', 'mockTeamsKnowledgeBase.json');
  if (!fs.existsSync(filePath)) {
    return {
      mode: 'mock-unavailable',
      source: 'local-fallback',
      profiles: []
    };
  }

  const rawData = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(rawData);
}

function buildAgentTraceForProfile(profile) {
  return [
    {
      agent: 'Mock Teams MCP Connector',
      action: 'Read customer KM source',
      output: `${profile.documentName} from ${profile.teamsFolder}`
    },
    {
      agent: 'Requirement Understanding Agent',
      action: 'Extract project context',
      output: `${profile.customerName} - ${profile.projectName}; ${profile.domain}; ${profile.technology}; ${profile.role}`
    },
    {
      agent: 'Knowledge Base Agent',
      action: 'Create project-specific KM',
      output: `${profile.mustHaveSkills.length} must-have skills, ${profile.evaluationRubric.length} rubric dimensions, ${profile.sampleQuestions.length} seed questions`
    },
    {
      agent: 'Question Generation Agent',
      action: 'Adapt interview plan',
      output: profile.questionFocus.join(', ')
    },
    {
      agent: 'Evaluation Agent',
      action: 'Prepare scoring rubric',
      output: profile.evaluationRubric.join(', ')
    }
  ];
}

function getMockProfile(profileId) {
  const mockKnowledgeBase = loadMockTeamsKnowledgeBase();
  return mockKnowledgeBase.profiles.find(profile => profile.id === profileId);
}

function syncMockProfileToKnowledgeBase(profile) {
  const topicName = `${profile.customerName} - ${profile.projectName}`;
  const generatedQuestions = profile.sampleQuestions.map((question, index) => ({
    id: `${profile.id}-${String(index + 1).padStart(3, '0')}`,
    text: question.text,
    keyPoints: question.keyPoints
  }));

  const topicPayload = {
    name: topicName,
    source: 'mock-teams-km',
    profileId: profile.id,
    technology: profile.technology,
    role: profile.role,
    domain: profile.domain,
    requirementSummary: profile.requirementSummary,
    mustHaveSkills: profile.mustHaveSkills,
    evaluationRubric: profile.evaluationRubric,
    questions: generatedQuestions
  };

  const existingIndex = knowledgeBase.topics.findIndex(topic => topic.profileId === profile.id || topic.name === topicName);
  if (existingIndex >= 0) {
    knowledgeBase.topics[existingIndex] = topicPayload;
  } else {
    knowledgeBase.topics.push(topicPayload);
  }

  knowledgeBase.feedbackHistory.push({
    timestamp: new Date().toISOString(),
    type: 'mockTeamsKmSync',
    profileId: profile.id,
    customerName: profile.customerName,
    projectName: profile.projectName
  });

  saveKnowledgeBase();

  const customerProfiles = loadCustomerProfiles();
  const existingProfileIndex = customerProfiles.findIndex(customerProfile => customerProfile.sourceProfileId === profile.id);
  const customerProfilePayload = normalizeProfile({
    id: existingProfileIndex >= 0 ? customerProfiles[existingProfileIndex].id : undefined,
    sourceProfileId: profile.id,
    customerName: profile.customerName,
    projectName: profile.projectName,
    technologyStack: profile.technology,
    clientDomain: profile.domain,
    roleRequirements: profile.role,
    mustHaveSkills: profile.mustHaveSkills,
    preferredSkills: profile.niceToHaveSkills,
    interviewFocusAreas: profile.questionFocus,
    responsibilities: profile.responsibilities,
    status: 'Active',
    requirementText: profile.requirementSummary,
    uploadedDocumentName: profile.documentName,
    questions: profile.sampleQuestions.map((question, index) => ({
      id: `${profile.id}-approved-${index + 1}`,
      customerProfileId: existingProfileIndex >= 0 ? customerProfiles[existingProfileIndex].id : undefined,
      technology: profile.technology,
      roleLevel: profile.role,
      text: question.text,
      type: index === 0 ? 'Technical' : index === 1 ? 'Scenario-Based' : 'Domain-Specific',
      difficulty: profile.role,
      keyPoints: question.keyPoints,
      status: 'Approved',
      active: true,
      createdBy: 'mock-teams-km'
    }))
  }, existingProfileIndex >= 0 ? customerProfiles[existingProfileIndex] : null);
  customerProfilePayload.sourceProfileId = profile.id;

  if (existingProfileIndex >= 0) {
    customerProfiles[existingProfileIndex] = customerProfilePayload;
  } else {
    customerProfiles.push(customerProfilePayload);
  }
  saveCustomerProfiles(customerProfiles);

  return topicPayload;
}

const customerProfilesFilePath = process.env.CUSTOMER_PROFILES_FILE_PATH
  ? path.resolve(process.env.CUSTOMER_PROFILES_FILE_PATH)
  : path.join(runtimeDataDir, 'customerProfiles.json');

function ensureDataDirectory() {
  const dataDir = path.dirname(customerProfilesFilePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function createId(prefix = 'profile') {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function loadCustomerProfiles() {
  ensureDataDirectory();
  if (!fs.existsSync(customerProfilesFilePath)) {
    fs.writeFileSync(customerProfilesFilePath, JSON.stringify({ profiles: [] }, null, 2));
  }

  const rawData = fs.readFileSync(customerProfilesFilePath, 'utf8');
  return JSON.parse(rawData).profiles || [];
}

function saveCustomerProfiles(profiles) {
  ensureDataDirectory();
  fs.writeFileSync(customerProfilesFilePath, JSON.stringify({ profiles }, null, 2));
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const session = getAdminSessionFromToken(token);

  if (!session) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  req.admin = session;
  next();
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean);
  }

  if (!value) return [];

  return String(value)
    .split(/\n|,/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeTextValue(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean).join(', ');
  }

  return String(value || '');
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase() === 'active' ? 'Active' : 'Inactive';
}

function normalizeApprovalStatus(value) {
  return String(value || '').trim().toLowerCase() === 'approved' ? 'Approved' : 'Draft';
}

const knownRoleLevels = ['junior', 'mid', 'senior', 'lead', 'architect'];

function normalizeRoleLevel(value) {
  const normalizedValue = String(value || '').trim().toLowerCase();
  if (normalizedValue.includes('architect')) return 'architect';
  if (normalizedValue.includes('lead')) return 'lead';
  if (normalizedValue.includes('senior')) return 'senior';
  if (normalizedValue.includes('mid')) return 'mid';
  if (normalizedValue.includes('junior')) return 'junior';
  return normalizedValue;
}

function isKnownRoleLevel(value) {
  return knownRoleLevels.includes(value);
}

function resolveQuestionRoleLevel(question = {}, profileContext = {}) {
  const explicitRole = normalizeRoleLevel(question.roleLevel || question.role);
  if (isKnownRoleLevel(explicitRole)) return explicitRole;

  const profileRole = normalizeRoleLevel(profileContext.roleRequirements || profileContext.role);
  if (isKnownRoleLevel(profileRole)) return profileRole;

  const difficultyRole = normalizeRoleLevel(question.difficulty);
  if (isKnownRoleLevel(difficultyRole)) return difficultyRole;

  return profileRole || difficultyRole || 'senior';
}

function normalizeTechnology(value) {
  return normalizeTextValue(value).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeUniqueKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getProfileDuplicateKey(profile) {
  return [
    normalizeUniqueKey(profile.customerName),
    normalizeUniqueKey(profile.projectName),
    normalizeTechnology(profile.technologyStack || profile.technology),
    normalizeRoleLevel(profile.roleRequirements || profile.role)
  ].join('|');
}

function validateCustomerProfile(profile) {
  const missingFields = [];
  if (!String(profile.customerName || '').trim()) missingFields.push('customer name');
  if (!String(profile.projectName || '').trim()) missingFields.push('project name');
  if (!String(profile.technologyStack || profile.technology || '').trim()) missingFields.push('technology stack');
  if (!String(profile.clientDomain || profile.domain || '').trim()) missingFields.push('client domain');
  if (!String(profile.roleRequirements || profile.role || '').trim()) missingFields.push('role requirements');

  if (missingFields.length) {
    return `Please provide ${missingFields.join(', ')}`;
  }

  const mappedRoles = Object.values(profile.roleLevelMapping || {}).filter(Boolean);
  if (!mappedRoles.length) {
    return 'Select at least one role level mapping';
  }

  return '';
}

function findDuplicateProfile(profiles, candidateProfile, excludeProfileId = '') {
  const candidateKey = getProfileDuplicateKey(candidateProfile);
  return profiles.find(profile => (
    profile.id !== excludeProfileId &&
    getProfileDuplicateKey(profile) === candidateKey
  ));
}

function normalizeQuestion(question, index = 0, profileContext = {}) {
  const now = new Date().toISOString();
  const status = normalizeApprovalStatus(question.status || question.approvalStatus || (question.approved ? 'Approved' : 'Draft'));
  const active = question.active !== undefined
    ? question.active === true || String(question.active).trim().toLowerCase() === 'true'
    : normalizeStatus(question.activeStatus || 'Active') === 'Active';
  const type = question.type || question.category || 'Technical';
  const roleLevel = resolveQuestionRoleLevel(question, profileContext);
  const technology = normalizeTextValue(question.technology || profileContext.technologyStack || profileContext.technology || '');

  return {
    id: question.id || createId('question'),
    customerProfileId: question.customerProfileId || profileContext.id || '',
    technology,
    normalizedTechnology: normalizeTechnology(technology),
    roleLevel,
    text: question.text || question.question || '',
    type,
    category: question.category || type,
    difficulty: question.difficulty || roleLevel || 'Senior',
    keyPoints: normalizeList(question.keyPoints),
    status,
    approved: status === 'Approved',
    active,
    activeStatus: active ? 'Active' : 'Inactive',
    createdBy: question.createdBy || 'admin',
    createdAt: question.createdAt || now,
    updatedAt: now
  };
}

function normalizeProfile(profile, existingProfile = null) {
  const now = new Date().toISOString();
  const profileId = profile.id || existingProfile?.id || createId('customer-profile');
  const normalizedTechnology = profile.technologyStack || profile.technology || existingProfile?.technologyStack || '';
  const normalizedDomain = profile.clientDomain || profile.domain || existingProfile?.clientDomain || '';
  const roleRequirements = profile.roleRequirements || existingProfile?.roleRequirements || '';

  return {
    id: profileId,
    customerName: profile.customerName || existingProfile?.customerName || '',
    projectName: profile.projectName || existingProfile?.projectName || '',
    technologyStack: normalizedTechnology,
    technology: normalizedTechnology,
    clientDomain: normalizedDomain,
    domain: normalizedDomain,
    roleRequirements,
    mustHaveSkills: normalizeList(profile.mustHaveSkills ?? existingProfile?.mustHaveSkills),
    preferredSkills: normalizeList(profile.preferredSkills ?? existingProfile?.preferredSkills),
    interviewFocusAreas: normalizeList(profile.interviewFocusAreas ?? existingProfile?.interviewFocusAreas),
    responsibilities: normalizeList(profile.responsibilities ?? existingProfile?.responsibilities),
    roleLevelMapping: profile.roleLevelMapping || existingProfile?.roleLevelMapping || {
      junior: true,
      mid: true,
      senior: true,
      lead: true,
      architect: true
    },
    status: normalizeStatus(profile.status || existingProfile?.status),
    includeAnalyticsFeedbackInAssessment: profile.includeAnalyticsFeedbackInAssessment !== undefined
      ? Boolean(profile.includeAnalyticsFeedbackInAssessment)
      : Boolean(existingProfile?.includeAnalyticsFeedbackInAssessment),
    analyticsFeedbackPreference: profile.analyticsFeedbackPreference || existingProfile?.analyticsFeedbackPreference || '',
    analyticsFeedbackReportGeneratedAt: profile.analyticsFeedbackReportGeneratedAt || existingProfile?.analyticsFeedbackReportGeneratedAt || '',
    analyticsFeedbackKey: profile.analyticsFeedbackKey || existingProfile?.analyticsFeedbackKey || '',
    analyticsFeedbackSummary: profile.analyticsFeedbackSummary || existingProfile?.analyticsFeedbackSummary || '',
    analyticsFeedbackRecommendations: Array.isArray(profile.analyticsFeedbackRecommendations)
      ? profile.analyticsFeedbackRecommendations
      : (existingProfile?.analyticsFeedbackRecommendations || []),
    analyticsFeedbackUpdatedAt: profile.analyticsFeedbackUpdatedAt || existingProfile?.analyticsFeedbackUpdatedAt || '',
    requirementText: profile.requirementText || existingProfile?.requirementText || '',
    uploadedDocumentName: profile.uploadedDocumentName || existingProfile?.uploadedDocumentName || '',
    questions: (profile.questions || existingProfile?.questions || []).map((question, index) => normalizeQuestion(question, index, {
      id: profileId,
      technologyStack: normalizedTechnology,
      roleRequirements
    })),
    createdAt: existingProfile?.createdAt || profile.createdAt || now,
    updatedAt: now
  };
}

async function extractRequirementText(file, pastedText = '') {
  const pasted = String(pastedText || '').trim();
  if (pasted) return pasted;
  if (!file) return '';

  const extension = path.extname(file.originalname || '').toLowerCase();
  if (extension === '.txt' || file.mimetype === 'text/plain') {
    return file.buffer.toString('utf8');
  }

  if (extension === '.pdf' || file.mimetype === 'application/pdf') {
    if (pdfParse) {
      const parsed = await pdfParse(file.buffer);
      const extractedText = String(parsed.text || '').replace(/\s+/g, ' ').trim();
      if (extractedText) {
        return extractedText.slice(0, 12000);
      }
    }

    return `Uploaded document: ${file.originalname}. PDF content was received, but text extraction did not return readable content. For local demo extraction, paste the requirement text or upload a TXT file.`;
  }

  if (
    extension === '.docx' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    if (mammoth) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      const extractedText = String(result.value || '').replace(/\s+/g, ' ').trim();
      if (extractedText) {
        return extractedText.slice(0, 12000);
      }
    }

    return `Uploaded document: ${file.originalname}. DOCX content was received, but text extraction did not return readable content. For local demo extraction, paste the requirement text or upload a TXT file.`;
  }

  const bestEffortText = file.buffer.toString('utf8').replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, ' ');
  const compactText = bestEffortText.replace(/\s+/g, ' ').trim();

  if (compactText.length > 200) {
    return compactText.slice(0, 12000);
  }

  return `Uploaded document: ${file.originalname}. Binary PDF/DOCX content was received. For local demo extraction, paste the requirement text or upload a TXT file.`;
}

function inferTechnology(requirementText) {
  const text = requirementText.toLowerCase();
  if (text.includes('react native')) return 'react-native';
  if (text.includes('swift') || text.includes('ios')) return 'swift';
  if (text.includes('kotlin') || text.includes('android')) return 'kotlin';
  if (text.includes('flutter') || text.includes('dart')) return 'flutter';
  if (text.includes('aem') || text.includes('adobe experience manager')) return 'aem';
  if (text.includes('ionic')) return 'ionic';
  return 'react-native';
}

function inferDomain(requirementText) {
  const text = requirementText.toLowerCase();
  if (text.includes('bank')) return 'Banking';
  if (text.includes('health') || text.includes('patient') || text.includes('hipaa')) return 'Healthcare';
  if (text.includes('retail') || text.includes('commerce')) return 'Retail';
  if (text.includes('insurance')) return 'Insurance';
  if (text.includes('telecom')) return 'Telecom';
  return 'Enterprise';
}

function getKeywordSkills(requirementText, technology) {
  const text = requirementText.toLowerCase();
  const skills = new Set();

  const skillMap = [
    ['security', 'Security best practices'],
    ['oauth', 'OAuth2/OIDC authentication'],
    ['api', 'REST API integration'],
    ['performance', 'Performance optimization'],
    ['accessibility', 'Accessibility'],
    ['testing', 'Automated testing'],
    ['offline', 'Offline resilience'],
    ['ci/cd', 'CI/CD'],
    ['release', 'Release readiness'],
    ['architecture', 'Architecture design'],
    ['monitoring', 'Monitoring and analytics'],
    ['firebase', 'Firebase integration'],
    ['redux', 'State management'],
    ['swiftui', 'SwiftUI'],
    ['xctest', 'XCTest'],
    ['kotlin', 'Kotlin coroutines'],
    ['flutter', 'Flutter widgets and state management']
  ];

  skillMap.forEach(([keyword, skill]) => {
    if (text.includes(keyword)) skills.add(skill);
  });

  if (technology === 'react-native') {
    skills.add('React Native architecture');
    skills.add('Reusable component design');
  } else if (technology === 'swift') {
    skills.add('Swift / SwiftUI development');
    skills.add('iOS app architecture');
  } else if (technology === 'kotlin') {
    skills.add('Android Kotlin development');
    skills.add('Android architecture components');
  } else if (technology === 'flutter') {
    skills.add('Flutter app architecture');
    skills.add('Dart programming');
  }

  return Array.from(skills).slice(0, 10);
}

function buildFallbackQuestions(profile) {
  const skills = profile.mustHaveSkills.length ? profile.mustHaveSkills : ['Architecture design', 'Security', 'API integration'];
  const focusAreas = profile.interviewFocusAreas.length ? profile.interviewFocusAreas : skills;
  const role = profile.roleRequirements || 'Senior';

  return [
    {
      text: `Explain how you would approach ${profile.projectName || 'this project'} using ${profile.technologyStack}.`,
      type: 'Technical',
      difficulty: role,
      keyPoints: ['architecture', 'project context', 'tradeoffs'],
      status: 'Draft'
    },
    {
      text: `What are the top security considerations for a ${profile.clientDomain} application?`,
      type: 'Domain-Specific',
      difficulty: role,
      keyPoints: ['security', 'compliance', 'data protection'],
      status: 'Draft'
    },
    {
      text: `Describe a scenario where ${skills[0]} becomes critical in delivery.`,
      type: 'Scenario-Based',
      difficulty: role,
      keyPoints: [skills[0], 'real-world example', 'risk handling'],
      status: 'Draft'
    },
    {
      text: `How would you validate production readiness for ${focusAreas[0]}?`,
      type: 'Architecture',
      difficulty: role,
      keyPoints: ['testing', 'monitoring', 'release readiness'],
      status: 'Draft'
    },
    {
      text: `Tell us about a time you handled ambiguity or changing requirements in a customer project.`,
      type: 'Behavioral',
      difficulty: role,
      keyPoints: ['communication', 'ownership', 'adaptability'],
      status: 'Draft'
    }
  ].map(normalizeQuestion);
}

async function generateProfileFromRequirement({ requirementText, uploadedDocumentName }) {
  const fallbackTechnology = inferTechnology(requirementText);
  const fallbackDomain = inferDomain(requirementText);
  const fallbackSkills = getKeywordSkills(requirementText, fallbackTechnology);
  const fallbackProfile = normalizeProfile({
    customerName: 'New Customer',
    projectName: `${fallbackDomain} ${fallbackTechnology} Project`,
    technologyStack: fallbackTechnology,
    clientDomain: fallbackDomain,
    roleRequirements: 'Senior',
    mustHaveSkills: fallbackSkills,
    preferredSkills: ['Customer domain experience', 'Agile delivery', 'Production support'],
    interviewFocusAreas: fallbackSkills.slice(0, 6),
    responsibilities: ['Deliver project features', 'Collaborate with customer teams', 'Own quality and release readiness'],
    status: 'Inactive',
    requirementText,
    uploadedDocumentName
  });

  fallbackProfile.questions = buildFallbackQuestions(fallbackProfile);

  if (!process.env.OPENAI_API_KEY || requirementText.startsWith('Uploaded document:')) {
    return fallbackProfile;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Extract customer interview profile data from project requirements. Return only valid JSON.'
        },
        {
          role: 'user',
          content: `Create an interview profile from this requirement text. Return JSON with customerName, projectName, technologyStack, clientDomain, roleRequirements, mustHaveSkills, preferredSkills, interviewFocusAreas, responsibilities, and questions. Each question must have text, type, difficulty, keyPoints, status. Valid question types: Technical, Behavioral, Scenario-Based, Architecture, Domain-Specific. Mark generated questions as Draft.\n\n${requirementText}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 3000
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    return normalizeProfile({
      ...fallbackProfile,
      ...parsed,
      status: 'Inactive',
      requirementText,
      uploadedDocumentName,
      questions: (parsed.questions || fallbackProfile.questions).map(question => ({
        ...question,
        status: question.status || 'Draft'
      }))
    });
  } catch (error) {
    console.warn('AI requirement analysis failed, using fallback extraction:', error.message);
    return fallbackProfile;
  }
}

function getAnalyticsFeedbackForProfile(profile, report) {
  if (!profile?.id || !report?.generatedAt) return null;

  const recommendations = (report.optimizationRecommendations || []).filter(recommendation => (
    recommendation.context?.customerProfileId === profile.id
  ));
  const customerInsight = (report.customerProfileInsights || []).find(insight => (
    insight.customerProfileId === profile.id
  ));

  if (!recommendations.length && !customerInsight) return null;

  const feedbackKey = [
    profile.id,
    customerInsight?.interviews || 0,
    customerInsight?.completions || 0,
    customerInsight?.completionRate || 0,
    customerInsight?.averageScore || 0,
    customerInsight?.reportGenerationCount || 0,
    customerInsight?.questionEffectiveness || 0,
    customerInsight?.lastActivityAt || '',
    recommendations.map(recommendation => recommendation.id || recommendation.message).sort().join(',')
  ].join('|');

  return {
    reportGeneratedAt: report.generatedAt,
    feedbackKey,
    recommendations,
    customerInsight
  };
}

function summarizeAnalyticsFeedbackForProfile(feedback) {
  const lines = [];
  if (feedback?.customerInsight) {
    const insight = feedback.customerInsight;
    lines.push(`Profile activity: ${insight.interviews || 0} interviews, ${insight.completionRate || 0}% completion, average score ${insight.averageScore || 0}.`);
    lines.push(`Question effectiveness: ${insight.questionEffectiveness || 0}. Reports generated: ${insight.reportGenerationCount || 0}.`);
  }
  (feedback?.recommendations || []).slice(0, 6).forEach(recommendation => {
    lines.push(`${recommendation.message} ${recommendation.action}`);
  });
  return lines.join('\n');
}

function buildAnalyticsFallbackQuestions(profile, feedback) {
  const role = profile.roleRequirements || 'Senior';
  const technology = profile.technologyStack || profile.technology || 'technology';
  const domain = profile.clientDomain || profile.domain || 'customer domain';
  const skills = profile.mustHaveSkills?.length ? profile.mustHaveSkills : ['architecture', 'security', 'API integration'];
  const recommendationActions = (feedback?.recommendations || []).map(recommendation => recommendation.action).filter(Boolean);
  const optimizationFocus = recommendationActions[0] || 'refresh this profile based on analytics feedback';

  return [
    {
      text: `Based on recent analytics feedback, explain how you would improve ${profile.projectName || 'this project'} using ${technology}.`,
      type: 'Scenario-Based',
      difficulty: role,
      keyPoints: ['analytics feedback', 'project context', 'practical improvement']
    },
    {
      text: `What tradeoffs would you consider while applying ${optimizationFocus} for a ${domain} application?`,
      type: 'Architecture',
      difficulty: role,
      keyPoints: ['tradeoffs', 'customer impact', 'risk mitigation']
    },
    {
      text: `Describe a production issue involving ${skills[0]} and how you would diagnose and resolve it.`,
      type: 'Technical',
      difficulty: role,
      keyPoints: [skills[0], 'debugging', 'root cause analysis']
    },
    {
      text: `How would you validate that the interview focus areas for ${profile.customerName || 'this customer'} are still aligned with current project needs?`,
      type: 'Domain-Specific',
      difficulty: role,
      keyPoints: ['customer requirements', 'feedback loop', 'quality checks']
    },
    {
      text: `Tell us about a time you used feedback or metrics to improve a technical delivery outcome.`,
      type: 'Behavioral',
      difficulty: role,
      keyPoints: ['metrics', 'ownership', 'continuous improvement']
    }
  ];
}

function shuffleQuestions(questions) {
  const shuffled = [...questions];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

async function generateAnalyticsOptimizedQuestions(profile, feedback) {
  const fallbackQuestions = buildAnalyticsFallbackQuestions(profile, feedback);
  const analyticsSummary = summarizeAnalyticsFeedbackForProfile(feedback);

  if (!process.env.OPENAI_API_KEY) {
    return fallbackQuestions;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are the Analytics Optimization Agent for an AI interview platform. Return only valid JSON.'
        },
        {
          role: 'user',
          content: `Generate 5 analytics-optimized interview questions for this customer profile.

Customer: ${profile.customerName}
Project: ${profile.projectName}
Technology: ${profile.technologyStack || profile.technology}
Domain: ${profile.clientDomain || profile.domain}
Role requirements: ${profile.roleRequirements}
Must-have skills: ${(profile.mustHaveSkills || []).join(', ')}
Focus areas: ${(profile.interviewFocusAreas || []).join(', ')}

Analytics feedback:
${analyticsSummary || 'No detailed feedback available. Refresh the question set based on customer profile context.'}

Existing questions:
${(profile.questions || []).slice(0, 10).map((question, index) => `${index + 1}. ${question.text}`).join('\n')}

Rules:
- Make the questions visibly different from the existing set.
- Use analytics feedback to adjust difficulty and coverage.
- Include a mix of Technical, Scenario-Based, Architecture, Domain-Specific, and Behavioral.
- Return JSON only:
{
  "questions": [
    {
      "text": "Question text",
      "type": "Technical",
      "difficulty": "${profile.roleRequirements || 'Senior'}",
      "keyPoints": ["point 1", "point 2", "point 3"]
    }
  ]
}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.45,
      max_tokens: 2000
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    return questions.length ? questions.slice(0, 8) : fallbackQuestions;
  } catch (error) {
    console.warn('Analytics question optimization failed, using fallback questions:', error.message);
    return fallbackQuestions;
  }
}

async function applyAnalyticsFeedbackToProfile(profile, feedback) {
  const optimizedQuestions = await generateAnalyticsOptimizedQuestions(profile, feedback);
  const nonAnalyticsQuestions = (profile.questions || []).filter(question => (
    question.createdBy !== 'analytics-optimization-agent'
  ));
  const analyticsQuestions = optimizedQuestions.map(question => normalizeQuestion({
    ...question,
    status: 'Approved',
    approved: true,
    active: true,
    activeStatus: 'Active',
    createdBy: 'analytics-optimization-agent',
    technology: profile.technologyStack || profile.technology,
    roleLevel: normalizeRoleLevel(question.roleLevel || question.difficulty || profile.roleRequirements),
    difficulty: question.difficulty || profile.roleRequirements || 'Senior'
  }, 0, profile));

  return normalizeProfile({
    ...profile,
    includeAnalyticsFeedbackInAssessment: true,
    analyticsFeedbackPreference: 'include',
    analyticsFeedbackReportGeneratedAt: feedback?.reportGeneratedAt || '',
    analyticsFeedbackKey: feedback?.feedbackKey || '',
    analyticsFeedbackSummary: summarizeAnalyticsFeedbackForProfile(feedback),
    analyticsFeedbackRecommendations: feedback?.recommendations || [],
    analyticsFeedbackUpdatedAt: new Date().toISOString(),
    questions: shuffleQuestions([
      ...nonAnalyticsQuestions,
      ...analyticsQuestions
    ])
  }, profile);
}

// API Routes

// Health check and diagnostics endpoint
app.get('/api/health', (req, res) => {
  const apiKeyConfigured = !!process.env.OPENAI_API_KEY;
  const apiKeyPreview = apiKeyConfigured ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'NOT SET';
  
  res.json({
    status: 'OK',
    server: 'Interview Bot Backend',
    port: PORT,
    timestamp: new Date().toISOString(),
    openAI: {
      configured: apiKeyConfigured,
      apiKeyPreview: apiKeyPreview
    },
    endpoints: {
      generateQuestions: 'POST /api/generate-questions',
      health: 'GET /api/health'
    }
  });
});

app.get('/api/public-config', (req, res) => {
  const ga4MeasurementId = process.env.GA4_MEASUREMENT_ID || process.env.REACT_APP_GA4_MEASUREMENT_ID || '';

  res.json({
    googleAnalytics: {
      enabled: Boolean(ga4MeasurementId),
      measurementId: ga4MeasurementId
    }
  });
});

app.post('/api/analytics/event', (req, res) => {
  try {
    const eventName = req.body?.eventName || req.body?.name;
    const params = req.body?.params || req.body?.parameters || {};

    if (!eventName) {
      return res.status(400).json({ error: 'eventName is required' });
    }

    const event = analyticsOptimizationEngine.recordEvent(eventName, params, {
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    res.status(202).json({ success: true, eventId: event.id });
  } catch (error) {
    console.error('Analytics event capture error:', error);
    res.status(500).json({ error: 'Failed to capture analytics event' });
  }
});

app.get('/api/analytics/question-generation-insights', (req, res) => {
  try {
    const insights = analyticsOptimizationEngine.getQuestionGenerationInsights({
      technology: req.query.technology,
      role: req.query.role || req.query.roleLevel,
      customerProfileId: req.query.customerProfileId
    });

    res.json(insights);
  } catch (error) {
    console.error('Analytics question insight error:', error);
    res.status(500).json({ error: 'Failed to load analytics question insights' });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
  const expectedPassword = process.env.ADMIN_PASSWORD || 'admin@123';

  if (username !== expectedUsername || password !== expectedPassword) {
    return res.status(401).json({ error: 'Invalid admin username or password' });
  }

  const createdAt = new Date();
  const session = {
    username,
    role: 'admin',
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + adminSessionTtlMs).toISOString()
  };
  const token = createAdminSessionToken(session);
  adminSessions.set(token, session);

  res.json({
    token,
    expiresAt: session.expiresAt,
    user: {
      username,
      role: 'admin'
    }
  });
});

app.get('/api/admin/customer-profiles', requireAdmin, (req, res) => {
  const profiles = loadCustomerProfiles().map(profile => normalizeProfile(profile, profile));
  res.json({ profiles });
});

app.get('/api/admin/analytics/optimization', requireAdmin, async (req, res) => {
  try {
    const profiles = loadCustomerProfiles().map(profile => normalizeProfile(profile, profile));
    let report = analyticsOptimizationEngine.loadReport();

    if (!report.generatedAt || req.query.refresh === 'true') {
      report = await analyticsOptimizationEngine.runOptimization({
        customerProfiles: profiles,
        skipGa4: req.query.skipGa4 === 'true'
      });
    }

    res.json(report);
  } catch (error) {
    console.error('Analytics optimization report error:', error);
    res.status(500).json({ error: 'Failed to load analytics optimization report' });
  }
});

app.post('/api/admin/analytics/optimization/run', requireAdmin, async (req, res) => {
  try {
    const profiles = loadCustomerProfiles().map(profile => normalizeProfile(profile, profile));
    const report = await analyticsOptimizationEngine.runOptimization({
      customerProfiles: profiles,
      skipGa4: req.body?.skipGa4 === true
    });

    res.json({
      message: 'Analytics Optimization Agent completed successfully',
      report
    });
  } catch (error) {
    console.error('Analytics optimization run error:', error);
    res.status(500).json({ error: 'Failed to run analytics optimization', details: error.message });
  }
});

app.post('/api/admin/customer-profiles/:profileId/apply-analytics-feedback', requireAdmin, async (req, res) => {
  try {
    const profiles = loadCustomerProfiles();
    const profileIndex = profiles.findIndex(profile => profile.id === req.params.profileId);

    if (profileIndex < 0) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    const normalizedProfile = normalizeProfile(profiles[profileIndex], profiles[profileIndex]);
    let report = analyticsOptimizationEngine.loadReport();

    if (!report.generatedAt) {
      report = await analyticsOptimizationEngine.runOptimization({
        customerProfiles: profiles.map(profile => normalizeProfile(profile, profile)),
        skipGa4: true
      });
    }

    const feedback = getAnalyticsFeedbackForProfile(normalizedProfile, report) || {
      reportGeneratedAt: report.generatedAt || new Date().toISOString(),
      feedbackKey: req.body?.feedbackKey || '',
      recommendations: [],
      customerInsight: null
    };
    const updatedProfile = await applyAnalyticsFeedbackToProfile(normalizedProfile, feedback);

    profiles[profileIndex] = updatedProfile;
    saveCustomerProfiles(profiles);

    res.json({
      profile: updatedProfile,
      optimizedQuestionCount: updatedProfile.questions.filter(question => question.createdBy === 'analytics-optimization-agent').length,
      message: 'Analytics feedback applied and customer profile questions updated'
    });
  } catch (error) {
    console.error('Apply analytics feedback error:', error);
    res.status(500).json({ error: 'Failed to apply analytics feedback', details: error.message });
  }
});

app.post('/api/admin/customer-profiles/analyze', requireAdmin, requirementUpload.single('document'), async (req, res) => {
  try {
    const requirementText = await extractRequirementText(req.file, req.body?.pastedText);
    if (!requirementText.trim()) {
      return res.status(400).json({ error: 'Upload a requirement document or paste requirement text' });
    }

    const profile = await generateProfileFromRequirement({
      requirementText,
      uploadedDocumentName: req.file?.originalname || ''
    });

    res.json({
      profile,
      message: 'Interview profile generated from requirement content',
      extractionMode: req.file && !req.body?.pastedText ? 'file-upload' : 'pasted-text'
    });
  } catch (error) {
    console.error('Requirement analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze customer requirement', details: error.message });
  }
});

app.post('/api/admin/customer-profiles', requireAdmin, (req, res) => {
  try {
    const profiles = loadCustomerProfiles();
    const profile = normalizeProfile(req.body);
    const validationError = validateCustomerProfile(profile);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const duplicateProfile = findDuplicateProfile(profiles, profile);
    if (duplicateProfile) {
      return res.status(409).json({
        error: 'A customer profile already exists for this customer, project, technology, and role level',
        duplicateProfileId: duplicateProfile.id
      });
    }

    profiles.push(profile);
    saveCustomerProfiles(profiles);
    res.status(201).json({ profile, message: 'Customer profile saved successfully' });
  } catch (error) {
    console.error('Customer profile create error:', error);
    res.status(500).json({ error: 'Failed to create customer profile' });
  }
});

app.put('/api/admin/customer-profiles/:profileId', requireAdmin, (req, res) => {
  try {
    const profiles = loadCustomerProfiles();
    const profileIndex = profiles.findIndex(profile => profile.id === req.params.profileId);

    if (profileIndex < 0) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    const profile = normalizeProfile({ ...req.body, id: req.params.profileId }, profiles[profileIndex]);
    const validationError = validateCustomerProfile(profile);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const duplicateProfile = findDuplicateProfile(profiles, profile, req.params.profileId);
    if (duplicateProfile) {
      return res.status(409).json({
        error: 'A customer profile already exists for this customer, project, technology, and role level',
        duplicateProfileId: duplicateProfile.id
      });
    }

    profiles[profileIndex] = profile;
    saveCustomerProfiles(profiles);
    res.json({ profile, message: 'Customer profile saved successfully' });
  } catch (error) {
    console.error('Customer profile update error:', error);
    res.status(500).json({ error: 'Failed to update customer profile' });
  }
});

app.delete('/api/admin/customer-profiles/:profileId', requireAdmin, (req, res) => {
  try {
    const profiles = loadCustomerProfiles();
    const nextProfiles = profiles.filter(profile => profile.id !== req.params.profileId);

    if (nextProfiles.length === profiles.length) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    saveCustomerProfiles(nextProfiles);
    res.json({ success: true, message: 'Customer profile deleted' });
  } catch (error) {
    console.error('Customer profile delete error:', error);
    res.status(500).json({ error: 'Failed to delete customer profile' });
  }
});

app.patch('/api/admin/customer-profiles/:profileId/status', requireAdmin, (req, res) => {
  try {
    const profiles = loadCustomerProfiles();
    const profileIndex = profiles.findIndex(profile => profile.id === req.params.profileId);

    if (profileIndex < 0) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    if (!['Active', 'Inactive'].includes(req.body?.status)) {
      return res.status(400).json({ error: 'Status must be Active or Inactive' });
    }

    const status = normalizeStatus(req.body.status);
    profiles[profileIndex] = normalizeProfile({
      ...profiles[profileIndex],
      status,
      updatedAt: new Date().toISOString()
    }, profiles[profileIndex]);
    saveCustomerProfiles(profiles);
    res.json({ profile: profiles[profileIndex], message: `Customer profile ${status.toLowerCase()} successfully` });
  } catch (error) {
    console.error('Customer profile status error:', error);
    res.status(500).json({ error: 'Failed to update customer profile status' });
  }
});

app.put('/api/admin/customer-profiles/:profileId/questions', requireAdmin, (req, res) => {
  try {
    const profiles = loadCustomerProfiles();
    const profileIndex = profiles.findIndex(profile => profile.id === req.params.profileId);

    if (profileIndex < 0) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    profiles[profileIndex] = {
      ...profiles[profileIndex],
      questions: (req.body?.questions || []).map((question, index) => normalizeQuestion(question, index, profiles[profileIndex])),
      updatedAt: new Date().toISOString()
    };

    saveCustomerProfiles(profiles);
    res.json({ profile: profiles[profileIndex], message: 'Questions updated' });
  } catch (error) {
    console.error('Question update error:', error);
    res.status(500).json({ error: 'Failed to update questions' });
  }
});

app.get('/api/customer-profiles/active', (req, res) => {
  const profiles = loadCustomerProfiles()
    .map(profile => normalizeProfile(profile, profile))
    .filter(profile => profile.status === 'Active');
  res.json({ profiles });
});

// Get available topics
app.get('/api/topics', (req, res) => {
  const topics = knowledgeBase.topics.map(topic => ({
    name: topic.name,
    questionCount: topic.questions.length
  }));
  
  res.json({ topics });
});

app.get('/api/mock-mcp/customer-profiles', (req, res) => {
  try {
    const mockKnowledgeBase = loadMockTeamsKnowledgeBase();
    const profiles = mockKnowledgeBase.profiles.map(profile => ({
      ...profile,
      agentTrace: buildAgentTraceForProfile(profile)
    }));

    res.json({
      mode: mockKnowledgeBase.mode,
      source: mockKnowledgeBase.source,
      message: 'Using local mock Teams KM data until Microsoft MCP/Graph access is available.',
      profiles
    });
  } catch (error) {
    console.error('Mock MCP profile load error:', error);
    res.status(500).json({ error: 'Failed to load mock customer profiles' });
  }
});

app.post('/api/mock-mcp/sync-knowledge-base', (req, res) => {
  try {
    const { profileId } = req.body;
    const profile = getMockProfile(profileId);

    if (!profile) {
      return res.status(404).json({ error: 'Mock customer profile not found' });
    }

    const syncedTopic = syncMockProfileToKnowledgeBase(profile);

    res.json({
      success: true,
      message: 'Mock Teams KM synced into local knowledge base',
      mcpMode: 'local-mock',
      futureMode: 'microsoft-graph-or-mcp',
      profile: {
        ...profile,
        agentTrace: buildAgentTraceForProfile(profile)
      },
      syncedTopic: {
        name: syncedTopic.name,
        questionCount: syncedTopic.questions.length,
        technology: syncedTopic.technology,
        role: syncedTopic.role,
        domain: syncedTopic.domain
      }
    });
  } catch (error) {
    console.error('Mock MCP sync error:', error);
    res.status(500).json({ error: 'Failed to sync mock Teams KM profile' });
  }
});

// Generate AI-powered interview questions based on candidate profile
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { technology, yearsOfExperience, roleLevel, candidateName, customPrompt, customerProfileId } = req.body;
    const experience = parseInt(yearsOfExperience) || 0;
    const analyticsInsights = analyticsOptimizationEngine.getQuestionGenerationInsights({
      technology,
      role: roleLevel,
      customerProfileId
    });

    console.log('\n=== GENERATING QUESTIONS ===');
    console.log('Request received:', { technology, experience, roleLevel, candidateName });
    console.log('OpenAI API Key configured:', !!process.env.OPENAI_API_KEY);

    // Build the prompt with different question types
    const basePrompt = customPrompt || `Generate 12-15 diverse technical interview questions for a ${roleLevel} level candidate with ${experience} years of experience in ${technology}.

Candidate Name: ${candidateName}

Generate questions in the following mix:
1. Objective Type Questions (2-3): Multiple choice or short answer questions testing factual knowledge
2. Logical/Conceptual Questions (3-4): Questions requiring logical thinking and problem-solving
3. Theory Questions (3-4): In-depth theoretical questions about concepts and best practices
4. Coding Snippet Questions (3-4): Provide code snippets with intentional bugs/errors and ask to identify and fix them

Requirements:
- Adjust difficulty based on "${roleLevel}" level (novice, adv-beginner, proficient, expert)
- All questions must be specific to ${technology}
- Each question should be clear and answerable
- For coding snippets, include comments showing the error location
- Consider ${experience} years of experience in context

Analytics Optimization Input:
${analyticsInsights.promptContext}`;

    const formattedPrompt = `${basePrompt}

Format the response as a JSON object with this structure:
{
  "questions": [
    {
      "id": 1,
      "type": "objective",
      "question": "Question text here?",
      "context": null
    },
    {
      "id": 2,
      "type": "logical",
      "question": "Question text here?",
      "context": null
    },
    {
      "id": 3,
      "type": "theory",
      "question": "Question text here?",
      "context": null
    },
    {
      "id": 4,
      "type": "coding",
      "question": "What is wrong with this code? Fix it.",
      "context": "// CODE_START\\nfunction example() {\\n  // Error: missing return statement\\n  console.log('test');\\n}\\n// CODE_END"
    }
  ]
}

For coding questions, use "context" field to include the code snippet between // CODE_START and // CODE_END markers.
Return ONLY valid JSON, no additional text.`;

    console.log('Calling OpenAI API with model: gpt-4-turbo');

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'user',
          content: formattedPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    console.log('OpenAI Response received successfully');

    // Parse the response
    const content = response.choices[0].message.content;
    console.log('Response content length:', content.length);
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.error('Failed to parse AI response as JSON, using defaults');
      const defaultQuestions = generateDiverseQuestions(technology, experience, roleLevel);
      console.log('Returning', defaultQuestions.length, 'default questions');
      return res.json({ questions: defaultQuestions });
    }

    try {
      const parsedResponse = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize the response
      const validatedQuestions = parsedResponse.questions.map((q, idx) => ({
        id: q.id || idx + 1,
        type: q.type || 'theory',
        question: q.question || '',
        context: q.context || null
      }));
      
      console.log('Successfully parsed', validatedQuestions.length, 'questions from OpenAI');
      console.log('=== QUESTIONS GENERATED SUCCESSFULLY ===\n');
      res.json({ questions: validatedQuestions });
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      const defaultQuestions = generateDiverseQuestions(technology, experience, roleLevel);
      console.log('Returning', defaultQuestions.length, 'default questions due to parse error');
      res.json({ questions: defaultQuestions });
    }
  } catch (error) {
    console.error('=== ERROR GENERATING QUESTIONS ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error details:', error);
    console.error('=================================\n');
    
    // Fallback to default questions
    const { technology, yearsOfExperience, roleLevel } = req.body;
    const experience = parseInt(yearsOfExperience) || 0;
    const defaultQuestions = generateDiverseQuestions(technology, experience, roleLevel);
    console.log('Returning', defaultQuestions.length, 'default questions due to error');
    res.json({ questions: defaultQuestions });
  }
});

// Helper function to generate diverse question types
function generateDiverseQuestions(technology, yearsOfExperience, roleLevel) {
  const questionsByTech = {
    'swift': [
      {
        id: 1,
        type: 'objective',
        question: 'What is the difference between a struct and a class in Swift?',
        context: null
      },
      {
        id: 2,
        type: 'objective',
        question: 'Which of these is NOT a value type in Swift: Array, Dictionary, Set, or Class?',
        context: null
      },
      {
        id: 3,
        type: 'logical',
        question: 'How would you optimize memory usage when working with large image collections in a ScrollView?',
        context: null
      },
      {
        id: 4,
        type: 'logical',
        question: 'Explain how you would implement a singleton pattern in Swift and when you would use it.',
        context: null
      },
      {
        id: 5,
        type: 'theory',
        question: 'Explain Swift\'s Automatic Reference Counting (ARC) and the problem of strong reference cycles.',
        context: null
      },
      {
        id: 6,
        type: 'theory',
        question: 'What are protocols in Swift and how do they support composition over inheritance?',
        context: null
      },
      {
        id: 7,
        type: 'coding',
        question: 'What is wrong with this code? There is a memory leak. Identify and fix it.',
        context: '// CODE_START\nclass DataManager {\n    var delegate: (() -> Void)?\n    \n    func setupCallback() {\n        delegate = { [unowned self] in  // ERROR: Should use [weak self]\n            self.loadData()\n        }\n    }\n    \n    func loadData() {}\n}\n// CODE_END'
      },
      {
        id: 8,
        type: 'coding',
        question: 'Find the bug in this code. It won\'t compile.',
        context: '// CODE_START\nfunc processArray(_ items: [Int]) -> Int {\n    var sum = 0\n    for item in items {\n        sum += item  // ERROR: Missing type annotation\n    }\n    return sum  // ERROR: Should be optional\n}\n// CODE_END'
      }
    ],
    'kotlin': [
      {
        id: 1,
        type: 'objective',
        question: 'What keyword makes a Kotlin class open for inheritance?',
        context: null
      },
      {
        id: 2,
        type: 'objective',
        question: 'How does Kotlin handle null safety compared to Java?',
        context: null
      },
      {
        id: 3,
        type: 'logical',
        question: 'Describe how you would use scope functions (let, apply, run) in real-world scenarios.',
        context: null
      },
      {
        id: 4,
        type: 'logical',
        question: 'How would you implement a Repository pattern in Kotlin with coroutines?',
        context: null
      },
      {
        id: 5,
        type: 'theory',
        question: 'Explain Kotlin coroutines and their advantages over traditional threading.',
        context: null
      },
      {
        id: 6,
        type: 'theory',
        question: 'What are data classes in Kotlin and what benefits do they provide?',
        context: null
      },
      {
        id: 7,
        type: 'coding',
        question: 'Identify the null safety issue in this code.',
        context: '// CODE_START\nval name: String = null  // ERROR: Cannot assign null to non-nullable type\nval length = name.length  // ERROR: Possible null pointer\n\nfun getValue(): String? = "test"\nval result = getValue().length  // ERROR: length called on nullable type\n// CODE_END'
      },
      {
        id: 8,
        type: 'coding',
        question: 'What\'s wrong with this coroutine code?',
        context: '// CODE_START\nlaunch {  // ERROR: launch scope not defined\n    val data = fetchData()  // ERROR: fetchData must be suspend function\n    updateUI(data)\n}\n\nfun fetchData(): String {\n    return "data"\n}\n// CODE_END'
      }
    ],
    'react-native': [
      {
        id: 1,
        type: 'objective',
        question: 'What is the primary difference between props and state in React Native?',
        context: null
      },
      {
        id: 2,
        type: 'objective',
        question: 'Which component is used for rendering a scrollable list in React Native?',
        context: null
      },
      {
        id: 3,
        type: 'logical',
        question: 'How would you prevent unnecessary re-renders in a React Native component?',
        context: null
      },
      {
        id: 4,
        type: 'logical',
        question: 'Design a solution for managing global state in a React Native app.',
        context: null
      },
      {
        id: 5,
        type: 'theory',
        question: 'Explain how React Native bridges JavaScript and native code.',
        context: null
      },
      {
        id: 6,
        type: 'theory',
        question: 'Describe the React Native lifecycle and how it differs from web React.',
        context: null
      },
      {
        id: 7,
        type: 'coding',
        question: 'Find the memory leak in this component.',
        context: '// CODE_START\nuseEffect(() => {\n    const timer = setInterval(() => {\n        console.log("Tick");\n    }, 1000);\n    // ERROR: Missing cleanup function\n    // Should: return () => clearInterval(timer);\n}, []);\n// CODE_END'
      },
      {
        id: 8,
        type: 'coding',
        question: 'What\'s wrong with this state management code?',
        context: '// CODE_START\nconst [items, setItems] = useState([]);\n\nconst addItem = (item) => {\n    items.push(item);  // ERROR: Mutating state directly\n    setItems(items);   // ERROR: Not creating new reference\n};\n\n// Should be: setItems([...items, item]);\n// CODE_END'
      }
    ],
    'flutter': [
      {
        id: 1,
        type: 'objective',
        question: 'What is the base class for all Flutter widgets?',
        context: null
      },
      {
        id: 2,
        type: 'objective',
        question: 'Difference between StatelessWidget and StatefulWidget?',
        context: null
      },
      {
        id: 3,
        type: 'logical',
        question: 'How would you optimize Flutter app performance for large lists?',
        context: null
      },
      {
        id: 4,
        type: 'logical',
        question: 'Design a state management solution using Provider for a complex app.',
        context: null
      },
      {
        id: 5,
        type: 'theory',
        question: 'Explain the Flutter widget tree and rendering pipeline.',
        context: null
      },
      {
        id: 6,
        type: 'theory',
        question: 'What is the significance of the initState() and dispose() methods?',
        context: null
      },
      {
        id: 7,
        type: 'coding',
        question: 'Identify the bug causing memory leak.',
        context: '// CODE_START\nclass MyWidget extends StatefulWidget {\n    @override\n    _MyWidgetState createState() => _MyWidgetState();\n}\n\nclass _MyWidgetState extends State<MyWidget> {\n    StreamSubscription? subscription;\n    \n    @override\n    void initState() {\n        super.initState();\n        subscription = stream.listen((data) {\n            setState(() {});\n        });\n        // ERROR: Missing dispose() call\n    }\n}\n// CODE_END'
      },
      {
        id: 8,
        type: 'coding',
        question: 'What\'s the issue with this widget build?',
        context: '// CODE_START\n@override\nWidget build(BuildContext context) {\n    return Container(\n        child: FutureBuilder<String>(\n            future: fetchData(),  // ERROR: Called on every build!\n            builder: (context, snapshot) {\n                return Text(snapshot.data ?? "Loading");\n            },\n        ),\n    );\n}\n// CODE_END'
      }
    ]
  };

  return questionsByTech[technology] || [
    {
      id: 1,
      type: 'objective',
      question: `Tell me about your experience with ${technology}?`,
      context: null
    },
    {
      id: 2,
      type: 'logical',
      question: `Describe your most challenging ${technology} project.`,
      context: null
    },
    {
      id: 3,
      type: 'theory',
      question: `What are the best practices for ${technology} development?`,
      context: null
    }
  ];
}

// Start a new interview session
app.post('/api/interview/start', (req, res) => {
  const { topicName } = req.body;
  
  // Find the topic
  const topic = knowledgeBase.topics.find(t => t.name === topicName);
  
  if (!topic) {
    return res.status(404).json({ error: 'Topic not found' });
  }
  
  // Create a session with randomized questions
  const questions = [...topic.questions]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3); // Take 3 random questions
  
  const sessionId = Date.now().toString();
  
  res.json({
    sessionId,
    topic: topicName,
    totalQuestions: questions.length,
    firstQuestion: questions[0]
  });
});

// Get next question
app.get('/api/interview/:sessionId/question/:index', (req, res) => {
  // In a real app, we'd store session state in a database
  // For this example, we'll just return a question based on the index
  const { index } = req.params;
  const questionIndex = parseInt(index);
  
  // Randomize which topic to use (for demo purposes)
  const topicIndex = questionIndex % knowledgeBase.topics.length;
  const topic = knowledgeBase.topics[topicIndex];
  
  // Get a question
  const questionWithinTopic = questionIndex % topic.questions.length;
  const question = topic.questions[questionWithinTopic];
  
  res.json({ question });
});

// Submit answer for evaluation
app.post('/api/interview/evaluate', async (req, res) => {
  const { questionId, answer } = req.body;
  
  // Find the question
  let question = null;
  let topic = null;
  
  for (const t of knowledgeBase.topics) {
    const q = t.questions.find(q => q.id === questionId);
    if (q) {
      question = q;
      topic = t;
      break;
    }
  }
  
  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }
  
  try {
    // Use AI to evaluate the answer
    const prompt = `
      You are an expert interviewer evaluating a candidate's response.
      
      Question: "${question.text}"
      
      Key points to look for: ${question.keyPoints.join(', ')}
      
      Candidate's answer: "${answer}"
      
      Evaluate the answer on a scale of 0-100 based on:
      1. Accuracy and correctness (40%)
      2. Completeness (covering the key points) (30%)
      3. Clarity and communication (20%)
      4. Practical examples provided (10%)
      
      Provide:
      1. Numerical score (0-100)
      2. Brief feedback (2-3 sentences)
      3. List of 2-3 strengths
      4. List of 1-2 areas to improve
      
      Format your response as JSON:
      {
        "score": [number],
        "feedback": [string],
        "strengths": [array of strings],
        "areasToImprove": [array of strings]
      }
    `;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "You are an expert interview evaluator. Provide honest, constructive feedback." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the AI's response
    const evaluationResult = JSON.parse(completion.choices[0].message.content);
    
    // Save this evaluation to the feedback history
    knowledgeBase.feedbackHistory.push({
      timestamp: new Date().toISOString(),
      questionId,
      question: question.text,
      answer,
      evaluation: evaluationResult
    });
    
    // Update the knowledge base
    saveKnowledgeBase();
    
    res.json(evaluationResult);
  } catch (error) {
    console.error('Evaluation error:', error);
    res.status(500).json({ error: 'Error evaluating response' });
  }
});

// Upload audio response
app.post('/api/interview/audio', upload.single('audio'), async (req, res) => {
  try {
    const audioFile = req.file;
    
    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }
    
    // Transcribe audio using OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFile.path),
      model: "whisper-1"
    });
    
    // Clean up the file after processing
    fs.unlinkSync(audioFile.path);
    
    res.json({ text: transcription.text });
  } catch (error) {
    console.error('Audio processing error:', error);
    res.status(500).json({ error: 'Error processing audio' });
  }
});

// Evaluate entire interview
app.post('/api/interview/complete', async (req, res) => {
  const { sessionId, answers } = req.body;
  
  try {
    // Use AI to evaluate the entire interview
    const prompt = `
      You are an expert interviewer evaluating a candidate's performance across an entire interview.
      
      Here are the candidate's responses:
      ${answers.map(a => `Question: "${a.question}"\nAnswer: "${a.answer}"\nIndividual Score: ${a.score}`).join('\n\n')}
      
      Evaluate the overall performance and make a hiring decision (pass/fail).
      
      Provide:
      1. Overall numerical score (0-100)
      2. Decision (pass/fail)
      3. Brief justification (2-3 sentences)
      4. List of 2-3 overall strengths
      5. List of 1-2 overall areas to improve
      
      Format your response as JSON:
      {
        "overallScore": [number],
        "decision": [string: "pass" or "fail"],
        "feedback": [string],
        "strengths": [array of strings],
        "areasToImprove": [array of strings]
      }
    `;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "You are an expert interview evaluator making final hiring decisions." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the AI's response
    const evaluationResult = JSON.parse(completion.choices[0].message.content);
    
    // Save this evaluation to the knowledge base
    knowledgeBase.feedbackHistory.push({
      timestamp: new Date().toISOString(),
      sessionId,
      type: 'finalEvaluation',
      evaluation: evaluationResult
    });
    
    // Update the knowledge base
    saveKnowledgeBase();
    
    res.json(evaluationResult);
  } catch (error) {
    console.error('Final evaluation error:', error);
    res.status(500).json({ error: 'Error in final evaluation' });
  }
});

// Generate detailed assessment report feedback with server-side OpenAI credentials
app.post('/api/interview/assessment-evaluation', async (req, res) => {
  const { evaluationPrompt } = req.body;

  if (!evaluationPrompt || typeof evaluationPrompt !== 'string') {
    return res.status(400).json({ error: 'evaluationPrompt is required' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key is not configured on the server' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_EVALUATION_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a strict, evidence-based technical interview evaluator. Evaluate every numbered answer and return ONLY valid JSON, no other text.'
        },
        {
          role: 'user',
          content: evaluationPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 7000,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices?.[0]?.message?.content || '{}';
    const evaluationResult = JSON.parse(content);

    res.json(evaluationResult);
  } catch (error) {
    console.error('Assessment evaluation error:', error);
    res.status(500).json({
      error: 'Error evaluating assessment report',
      details: error.message
    });
  }
});

// Update knowledge base with new insights
app.post('/api/knowledge/update', async (req, res) => {
  try {
    // Get recent feedback history
    const recentFeedback = knowledgeBase.feedbackHistory.slice(-10);
    
    if (recentFeedback.length === 0) {
      return res.json({ message: 'No recent feedback to analyze' });
    }
    
    // Use AI to analyze feedback and suggest knowledge base improvements
    const prompt = `
      Analyze these recent interview responses and evaluations:
      ${JSON.stringify(recentFeedback)}
      
      Based on the patterns in candidate responses:
      1. Suggest 1-2 new questions to add to the knowledge base
      2. Suggest any key points that should be added to existing questions
      
      Format your response as JSON:
      {
        "newQuestions": [
          {
            "topic": [string - existing topic name],
            "text": [string - question text],
            "keyPoints": [array of strings]
          }
        ],
        "updatedKeyPoints": [
          {
            "questionId": [string - existing question ID],
            "additionalKeyPoints": [array of strings]
          }
        ]
      }
    `;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "You analyze interview performance data to improve the interview system." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the AI's response
    const analysisResult = JSON.parse(completion.choices[0].message.content);
    
    // Apply the suggestions to the knowledge base
    for (const newQuestion of analysisResult.newQuestions || []) {
      // Find the topic
      const topic = knowledgeBase.topics.find(t => t.name === newQuestion.topic);
      
      if (topic) {
        // Generate a new ID
        const newId = `${topic.name.toLowerCase().substring(0, 2)}-${String(topic.questions.length + 1).padStart(3, '0')}`;
        
        // Add the question
        topic.questions.push({
          id: newId,
          text: newQuestion.text,
          keyPoints: newQuestion.keyPoints
        });
      }
    }
    
    // Update key points for existing questions
    for (const update of analysisResult.updatedKeyPoints || []) {
      // Find the question
      for (const topic of knowledgeBase.topics) {
        const question = topic.questions.find(q => q.id === update.questionId);
        
        if (question) {
          // Add the key points, avoiding duplicates
          for (const newPoint of update.additionalKeyPoints) {
            if (!question.keyPoints.includes(newPoint)) {
              question.keyPoints.push(newPoint);
            }
          }
          break;
        }
      }
    }
    
    // Save the updated knowledge base
    saveKnowledgeBase();
    
    res.json({
      message: 'Knowledge base updated',
      updates: analysisResult
    });
  } catch (error) {
    console.error('Knowledge base update error:', error);
    res.status(500).json({ error: 'Error updating knowledge base' });
  }
});

const assessmentExcelFilePath = isVercel
  ? path.join(runtimeRoot, 'AssessmentDetails.xlsx')
  : path.join(projectRoot, 'AssessmentDetails.xlsx');

const assessmentColumns = [
  { key: 'date', header: 'Date', width: 15 },
  { key: 'time', header: 'Time', width: 12 },
  { key: 'personName', header: 'Person Name', width: 22 },
  { key: 'assessmentName', header: 'Assessment Name', width: 28 },
  { key: 'customerName', header: 'Customer Name', width: 24 },
  { key: 'projectName', header: 'Project Name', width: 28 },
  { key: 'technology', header: 'Technology', width: 18 },
  { key: 'roleLevel', header: 'Role Level', width: 18 },
  { key: 'interviewDuration', header: 'Interview Duration', width: 20 },
  { key: 'finalMarks', header: 'Final Marks', width: 14 },
  { key: 'overallRating', header: 'Overall Rating', width: 18 },
  { key: 'assessmentSummary', header: 'Assessment Summary', width: 55 },
  { key: 'strengths', header: 'Strengths', width: 45 },
  { key: 'areasForImprovement', header: 'Areas for Improvement', width: 45 },
  { key: 'technicalFeedback', header: 'Technical Feedback', width: 45 },
  { key: 'communicationFeedback', header: 'Communication Feedback', width: 45 },
  { key: 'behavioralFeedback', header: 'Behavioral Feedback', width: 45 },
  { key: 'detailedQuestionEvaluation', header: 'Detailed Question-by-Question Evaluation', width: 70 },
  { key: 'aiRecommendations', header: 'AI Recommendations', width: 50 },
  { key: 'hiringRecommendation', header: 'Hiring Recommendation', width: 20 },
  { key: 'assessmentStatus', header: 'Assessment Status', width: 22 },
  { key: 'reportPdfPathOrUrl', header: 'Report PDF Path / URL', width: 55 },
  { key: 'interviewCompletionTimestamp', header: 'Interview Completion Timestamp', width: 28 }
];

const legacyAssessmentHeaders = [
  'Person Name',
  'Assessment Name',
  'Date',
  'Time',
  'Final Marks',
  'Assessment Summary'
];

function applyAssessmentHeader(worksheet) {
  assessmentColumns.forEach((column, index) => {
    worksheet.getColumn(index + 1).width = column.width;
    worksheet.getRow(1).getCell(index + 1).value = column.header;
  });

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF5F1FBE' }
  };
  worksheet.getRow(1).commit();
}

function normalizeHeaderValue(value) {
  return String(value || '').trim();
}

function worksheetHasAssessmentHeader(worksheet) {
  return assessmentColumns.every((column, index) => (
    normalizeHeaderValue(worksheet.getRow(1).getCell(index + 1).value) === column.header
  ));
}

function getWorksheetHeaderMap(worksheet) {
  const headerMap = new Map();
  const headerRow = worksheet.getRow(1);

  for (let index = 1; index <= headerRow.cellCount; index += 1) {
    const header = normalizeHeaderValue(headerRow.getCell(index).value);
    if (header) {
      headerMap.set(header, index);
    }
  }

  return headerMap;
}

function worksheetLooksLikeAssessmentSheet(worksheet) {
  const headerMap = getWorksheetHeaderMap(worksheet);
  const knownHeaders = [
    ...assessmentColumns.map(column => column.header),
    ...legacyAssessmentHeaders
  ];

  return knownHeaders.some(header => headerMap.has(header));
}

function normalizeAssessmentCellValue(value) {
  if (value && typeof value === 'object' && 'text' in value) {
    return value.text;
  }
  return value;
}

function migrateAssessmentWorksheetSchema(worksheet) {
  if (worksheetHasAssessmentHeader(worksheet) || worksheet.actualRowCount <= 1) {
    applyAssessmentHeader(worksheet);
    return;
  }

  const headerMap = getWorksheetHeaderMap(worksheet);
  if (!worksheetLooksLikeAssessmentSheet(worksheet)) {
    applyAssessmentHeader(worksheet);
    return;
  }

  for (let rowIndex = 2; rowIndex <= worksheet.actualRowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    const migratedValues = assessmentColumns.map((column) => {
      const currentIndex = headerMap.get(column.header);
      if (!currentIndex) return '';
      return normalizeAssessmentCellValue(row.getCell(currentIndex).value);
    });

    assessmentColumns.forEach((column, columnIndex) => {
      row.getCell(columnIndex + 1).value = migratedValues[columnIndex] || '';
    });

    for (let columnIndex = assessmentColumns.length + 1; columnIndex <= row.cellCount; columnIndex += 1) {
      row.getCell(columnIndex).value = null;
    }

    row.commit();
  }

  applyAssessmentHeader(worksheet);
}

function getAvailableWorksheetName(workbook, baseName) {
  let worksheetName = baseName;
  let suffix = 2;

  while (workbook.getWorksheet(worksheetName)) {
    worksheetName = `${baseName} ${suffix}`;
    suffix += 1;
  }

  return worksheetName;
}

function getAssessmentWorksheet(workbook) {
  const preferredWorksheet =
    workbook.getWorksheet('Assessments') ||
    workbook.getWorksheet('Sheet1') ||
    workbook.worksheets.find(worksheet => worksheetHasAssessmentHeader(worksheet));

  if (preferredWorksheet) {
    if (
      worksheetHasAssessmentHeader(preferredWorksheet) ||
      worksheetLooksLikeAssessmentSheet(preferredWorksheet) ||
      preferredWorksheet.actualRowCount <= 1
    ) {
      migrateAssessmentWorksheetSchema(preferredWorksheet);
      return preferredWorksheet;
    }

    const assessmentWorksheet = workbook.addWorksheet(getAvailableWorksheetName(workbook, 'Assessments'));
    applyAssessmentHeader(assessmentWorksheet);
    return assessmentWorksheet;
  }

  const firstWorksheet = workbook.worksheets[0];
  const worksheet = firstWorksheet?.actualRowCount === 0
    ? firstWorksheet
    : workbook.addWorksheet(getAvailableWorksheetName(workbook, 'Assessments'));

  migrateAssessmentWorksheetSchema(worksheet);
  return worksheet;
}

function stringifyAssessmentValue(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.filter(Boolean).join('\n');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return value;
}

// Function to save assessment data to Excel
async function saveAssessmentToExcel(assessmentData) {
  const workbook = new ExcelJS.Workbook();

  try {
    const excelDir = path.dirname(assessmentExcelFilePath);
    if (!fs.existsSync(excelDir)) {
      fs.mkdirSync(excelDir, { recursive: true });
    }

    if (fs.existsSync(assessmentExcelFilePath)) {
      await workbook.xlsx.readFile(assessmentExcelFilePath);
    }

    const worksheet = getAssessmentWorksheet(workbook);

    const rowValues = assessmentColumns.map(column => stringifyAssessmentValue(assessmentData[column.key]));
    const newRow = worksheet.addRow(rowValues);

    const reportColumnIndex = assessmentColumns.findIndex(column => column.key === 'reportPdfPathOrUrl') + 1;
    if (reportColumnIndex > 0 && assessmentData.reportPdfPathOrUrl) {
      newRow.getCell(reportColumnIndex).value = {
        text: assessmentData.reportPdfPathOrUrl,
        hyperlink: assessmentData.reportPdfUrl || pathToFileURL(assessmentData.reportPdfPathOrUrl).href
      };
    }

    newRow.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true };
    });

    await workbook.xlsx.writeFile(assessmentExcelFilePath);
    console.log(`Assessment data saved to Excel successfully: ${assessmentExcelFilePath}`);
    return {
      success: true,
      message: 'Assessment saved to Excel successfully',
      filePath: assessmentExcelFilePath,
      reportPdfPath: assessmentData.reportPdfPathOrUrl || null
    };
  } catch (error) {
    console.error('Error saving assessment to Excel:', error);
    throw error;
  }
}

// API endpoint to save assessment results
app.post('/api/save-assessment', reportUpload.single('reportPdf'), async (req, res) => {
  try {
    console.log('📊 Received save-assessment request');
    console.log('Request body:', req.body);

    const reportPdfPath = req.file ? path.resolve(req.file.path) : (req.body.reportPdfPathOrUrl || req.body.reportPdfPath || '');
    const reportPdfUrl = reportPdfPath ? pathToFileURL(reportPdfPath).href : (req.body.reportPdfUrl || '');

    const {
      personName,
      assessmentName,
      customerName,
      projectName,
      date,
      time,
      technology,
      roleLevel,
      interviewDuration,
      finalMarks,
      overallRating,
      assessmentSummary,
      strengths,
      areasForImprovement,
      technicalFeedback,
      communicationFeedback,
      behavioralFeedback,
      detailedQuestionEvaluation,
      aiRecommendations,
      hiringRecommendation,
      assessmentStatus,
      interviewCompletionTimestamp
    } = req.body;

    // Validate required fields
    if (!personName || !assessmentName || !date || !time) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const assessmentData = {
      personName,
      assessmentName,
      customerName: customerName || 'Not provided',
      projectName: projectName || 'Not provided',
      date,
      time,
      technology: technology || 'Not provided',
      roleLevel: roleLevel || 'Not provided',
      interviewDuration: interviewDuration || 'Not provided',
      finalMarks: finalMarks ?? 0,
      overallRating: overallRating || 'Not provided',
      assessmentSummary: assessmentSummary || 'No summary provided',
      strengths: strengths || 'Not provided',
      areasForImprovement: areasForImprovement || 'Not provided',
      technicalFeedback: technicalFeedback || 'Not provided',
      communicationFeedback: communicationFeedback || 'Not provided',
      behavioralFeedback: behavioralFeedback || 'Not provided',
      detailedQuestionEvaluation: detailedQuestionEvaluation || 'Not provided',
      aiRecommendations: aiRecommendations || 'Not provided',
      hiringRecommendation: hiringRecommendation || 'Not provided',
      assessmentStatus: assessmentStatus || 'Completed',
      reportPdfPathOrUrl: reportPdfPath,
      reportPdfUrl,
      interviewCompletionTimestamp: interviewCompletionTimestamp || new Date().toISOString()
    };

    console.log('💾 Saving assessment data to Excel...');
    const result = await saveAssessmentToExcel(assessmentData);
    console.log('✅ Assessment successfully saved to Excel');
    res.json(result);
  } catch (error) {
    console.error('❌ Error in save-assessment endpoint:', error);
    res.status(500).json({ error: 'Failed to save assessment', details: error.message });
  }
});

async function runScheduledAnalyticsOptimization(reason = 'scheduled') {
  try {
    const profiles = loadCustomerProfiles().map(profile => normalizeProfile(profile, profile));
    const report = await analyticsOptimizationEngine.runOptimization({ customerProfiles: profiles });
    console.log(`Analytics Optimization Agent ${reason} run completed at ${report.generatedAt}`);
  } catch (error) {
    console.warn(`Analytics Optimization Agent ${reason} run failed:`, error.message);
  }
}

function scheduleAnalyticsOptimization() {
  const schedule = String(process.env.ANALYTICS_OPTIMIZATION_SCHEDULE || 'daily').trim().toLowerCase();
  if (schedule === 'off' || schedule === 'disabled' || schedule === 'none') {
    console.log('Analytics Optimization Agent scheduler is disabled');
    return;
  }

  const intervalMs = schedule === 'weekly'
    ? 7 * 24 * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000;
  const initialDelayMs = parseInt(process.env.ANALYTICS_OPTIMIZATION_INITIAL_DELAY_MS, 10) || 5000;

  setTimeout(() => {
    runScheduledAnalyticsOptimization('startup');
  }, initialDelayMs);

  setInterval(() => {
    runScheduledAnalyticsOptimization(schedule);
  }, intervalMs);
}

// Catch-all handler for SPA (only needed in production)
// Comment out during development when using separate client server
// app.get('/*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
// });

if (!process.env.VERCEL) {
  scheduleAnalyticsOptimization();
}

// Start server
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
