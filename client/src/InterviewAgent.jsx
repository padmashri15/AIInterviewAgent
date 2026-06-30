import { useState, useEffect, useRef } from 'react';
// --- Additive: Navigation Away Detection Feature ---
// Tracks if candidate leaves the interview screen (tab switch, minimize, app switch, window blur)

import { Mic, MicOff, Play, Pause, RefreshCw, CheckCircle, XCircle, Download, Save } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { trackEvent } from './services/analyticsService';
import { readJsonResponse } from './utils/apiResponse';
import { getApiBaseUrl } from './utils/apiBaseUrl';

const apiBaseUrl = getApiBaseUrl();

// Skill Matrix Definitions for Different Technologies and Roles
const skillMatrices = {
  'swift': {
    'junior': {
      title: 'iOS Mobile JuniorDeveloper (1-2 years)',
      skills: [
        'Basic iOS Constructs: MVC/MVVM-C Architecture patterns',
        'Programming Skills: Swift, SwiftUI',
        'Networking: URLSession, Codable',
        'Database: SwiftData, Core Data, SQLite',
        'Background Task Handling: Background Modes, GCD, Operation Queues',
        'Unit Testing: XCTest',
        'Reactive Programming: SwiftUI with Combine',
        'Localization: Best practices, Country specific rollout, Configuration files'
      ]
    },
    'senior': {
      title: 'iOS Mobile Senior Developer (3-5 years)',
      skills: [
        'Basic iOS Constructs: MVC/MVVM-C Architecture patterns',
        'Programming Skills: Swift, SwiftUI',
        'Networking: URLSession, Codable',
        'Database: SwiftData, Core Data, SQLite',
        'Background Task Handling: Background Modes, GCD, Operation Queues',
        'Unit Testing: XCTest',
        'Reactive Programming: SwiftUI with Combine',
        'Localization: Best practices, Country specific rollout, Configuration files',
        'Document/File Handling',
        'Camera capture/Image Handling',
        'Reusable components identification and creation',
        'Firebase Crashlytics and Remote config',
        'Security: Keychain, Data Encryption, Certificate/SSL Pinning, Biometric and Multi-Factor Authentication'
      ]
    },
    'lead': {
      title: 'iOS Mobile Lead (5-8 years)',
      skills: [
        'All Senior Developer skills',
        'Critical bug solving and integration issues',
        'Code reviews and mentoring',
        'App Store/Play Store Distribution, Beta Releases',
        'Advanced architectural decisions',
        'Team leadership and technical guidance'
      ]
    },
    'architect': {
      title: 'iOS Mobile Architect (8+ years)',
      skills: [
        'All Lead level skills',
        'Execute Re-platform assessments for Mobile Applications',
        'Ability to create application architectures and provide solutions in multiple technologies',
        'Cross-functional team collaboration: define, design, and ship features',
        'Ensure performance, quality, and scalability',
        'Advanced Xcode usage with GitHub Copilot',
        'Strategic technology decisions and enterprise-level system design'
      ]
    }
  },
  'kotlin': {
    'junior': {
      title: 'Android Mobile JuniorDeveloper (1-2 years)',
      skills: [
        'Android Basic Constructs: MVC, MVP, MVVM Architecture patterns',
        'Programming Skills: Java, Kotlin',
        'Networking: Volley/OkHttp/Retrofit',
        'Storage: Kotlin Models, Android Rooms, Shared Preferences',
        'Job Schedulers, Alarm Managers, Work Managers',
        'Intent Services, Services, Kotlin Coroutines',
        'Unit Testing: jUnit, Mockito, RoboElectric',
        'Reactive Programming: RxAndroid, RxKotlin, RxJava, LiveData'
      ]
    },
    'senior': {
      title: 'Android Mobile Senior Developer (3-5 years)',
      skills: [
        'All JuniorDeveloper skills',
        'Localization: Best practices, Country specific rollout, Configuration files',
        'Document/File Handling',
        'Camera capture/Image Handling',
        'Reusable components identification and creation',
        'Firebase Crashlytics and Remote config',
        'Security: Data Encryption, Certificate/SSL Pinning, Biometric and Multi-Factor Authentication',
        'Performance optimization and advanced debugging'
      ]
    },
    'lead': {
      title: 'Android Mobile Lead (5-8 years)',
      skills: [
        'All Senior Developer skills',
        'Critical bug solving and integration issues',
        'Code reviews and mentoring',
        'App Store/Play Store Distribution, Beta Releases',
        'Advanced architectural decisions',
        'Team leadership and technical guidance'
      ]
    },
    'architect': {
      title: 'Android Mobile Architect (8+ years)',
      skills: [
        'All Lead level skills',
        'Execute Re-platform assessments for Mobile Applications',
        'Ability to create application architectures and provide solutions in multiple technologies',
        'Cross-functional team collaboration: define, design, and ship features',
        'Ensure performance, quality, and scalability',
        'Advanced Android Studio usage with GitHub Copilot',
        'Strategic technology decisions and enterprise-level system design'
      ]
    }
  },
  'flutter': {
    'junior': {
      title: 'Flutter Mobile JuniorDeveloper (1-2 years)',
      skills: [
        'Proficient in widgets: StatelessWidget, StatefulWidget, State, BuildContext, Keys',
        'Basic Dart syntax: primitive types, collections, control flow',
        'Flex layout: Row, Column, Stack',
        'Basic widgets: Text, Image, Button, basic platform APIs',
        'Provider / BLoC / Riverpod basic setup, managing local state (setState)',
        'Navigator 1.0: push, pop, basic route definitions',
        'Shared preferences and persistent storage',
        'HTTP package, dio (basic usage), REST APIs',
        'Dart DevTools (basic usage), VS Code/Android Studio debugger',
        'FlatList tuning: Slivers, CustomScrollView, lazy loading, memoization, image caching'
      ]
    },
    'senior': {
      title: 'Flutter Mobile Senior Developer (3-5 years)',
      skills: [
        'All JuniorDeveloper skills',
        'Fastlane, Codemagic/Bitrise/GitHub Actions CI/CD setup',
        'Releasing to TestFlight/Google Play Internal Test Track',
        'OTA (Over-The-Air) updates via CodePush equivalents (Shorebird)',
        'Platform-specific plugins, native build tools (Gradle, Xcode)',
        'Basic platform channel implementation',
        'App transport security (HTTPS enforcement), secure communication protocols',
        'Data encryption at rest and in transit',
        'Authentication: Firebase Auth, OAuth2, basic biometrics',
        'Clean architecture, design patterns (Provider, BLoC), dependency injection, SOLID principles'
      ]
    },
    'lead': {
      title: 'Flutter Mobile Lead (5-8 years)',
      skills: [
        'All Senior Developer skills',
        'Fastlane, advanced Git commands, advanced CI/CD platforms',
        'Performance profiling tools',
        'Leads technical discussions, defines team coding standards',
        'Facilitates knowledge sharing, promotes healthy engineering culture',
        'Owns end-to-end mobile architecture',
        'Makes key technology decisions, provides technical leadership',
        'Contributes to product strategy'
      ]
    },
    'architect': {
      title: 'Flutter Mobile Architect (8+ years)',
      skills: [
        'All Lead level skills',
        'Defines reusable architecture for iOS & Android (and potentially web/desktop)',
        'Strategizes for platform-specific features',
        'Evaluates pros/cons of native vs Flutter implementations',
        'Recommends build vs buy decisions',
        'Security/audit of dependencies',
        'Defines guidelines for third-party library selection',
        'Manages transitive dependencies',
        'Utilize GitHub Copilot and AI Toolkit in VS Code for streamlined development'
      ]
    }
  },
  'react-native': {
    'junior': {
      title: 'React Native Mobile JuniorDeveloper (1-2 years)',
      skills: [
        'Good Command of HTML, CSS & JavaScript, Basics of React',
        'Familiarity with React Native syntax and component structure',
        'Ability to create simple UI elements and layouts',
        'Expo CLI or React Native CLI to create a new project',
        'Basic data handling and state management concepts',
        'Shared preferences and persistent storage',
        'Routes and Navigation in React Native',
        'Unit Testing tools: Jasmine, Karma, WebDriver',
        'Code quality tools: SonarQube, Jasmine',
        'Visual Studio Code IDE expertise',
        'Accessibility and internationalization',
        'Performance optimization and optimization techniques'
      ]
    },
    'senior': {
      title: 'React Native Mobile Senior Developer (3-5 years)',
      skills: [
        'All JuniorDeveloper skills',
        'Custom native modules for low-level device features or performance improvement',
        'App Store Distribution, Beta Releases',
        'Advanced performance optimization: code splitting, lazy loading, caching',
        'State management patterns: Redux, Hookstate, MobX',
        'Advanced debugging and memory profiling',
        'Security best practices for mobile app development'
      ]
    },
    'lead': {
      title: 'React Native Mobile Lead (5-8 years)',
      skills: [
        'All Senior Developer skills',
        'Setup of CI/CD pipelines for React Native Applications',
        'Advanced debugging techniques: remote debugging, memory profiling',
        'Leads technical discussions, defines team coding standards',
        'Facilitates knowledge sharing, promotes healthy engineering culture',
        'Owns end-to-end mobile architecture',
        'Makes key technology decisions, provides technical leadership',
        'Contributes to product strategy'
      ]
    },
    'architect': {
      title: 'React Native Mobile Architect (8+ years)',
      skills: [
        'All Lead level skills',
        'Defines reusable architecture across platforms',
        'Strategizes for platform-specific features',
        'Evaluates pros/cons of native vs React Native implementations',
        'Recommends build vs buy decisions',
        'Security audit of dependencies',
        'Defines guidelines for third-party library selection',
        'Manages transitive dependencies',
        'Utilize GitHub Copilot and AI Toolkit in VS Code for streamlined development',
        'Enterprise-level system design and decision making'
      ]
    }
  },
  'aem': {
    'junior': {
      title: 'Adobe Experience Manager Junior Developer (1-2 years)',
      skills: [
        'Web Technologies & Responsive Design (HTML/CSS/JS)',
        'Java Programming & OSGi - Sling Models & Apache Sling development',
        'Templates, Content Management & DAM',
        'AEM Workflows & Automation',
        'CRXDE & Tools (JCR, Developer Tools, Git)',
        'Unit Test Frameworks – JUnit, Mockito, Sling Context',
        'AEM Frontend Technology Development – HTML, CSS, JS, Clientlib, Sightly'
      ]
    },
    'senior': {
      title: 'Adobe Experience Manager Senior Developer (3-5 years)',
      skills: [
        'Web Technologies & Responsive Design (HTML/CSS/JS)',
        'Java Programming & OSGi - Sling Models & Apache Sling development',
        'Templates, Content Management & DAM',
        'AEM Workflows & Automation',
        'CRXDE & Tools (JCR, Developer Tools, Git)',
        'Unit Test Frameworks – JUnit, Mockito, Sling Context',
        'AEM Frontend Technology Development – HTML, CSS, JS, Clientlib, Sightly',
        'Build, Deployment & CI/CD (Maven, Cloud Manager, DevOps)',
        'Dispatcher & Security (SAML/SSO, Access Control, CDN)',
        'SPA Frameworks (Clientlib, React/Angular)',
        'AEM as a Cloud Service development & Migration',
        'Headless & API Integration (REST/GraphQL)',
        'Multi-Site Management & Localization',
        'Personalization & Analytics (Adobe Target, Adobe Analytics)',
        'E-commerce & Enterprise Integrations (Commerce, PIM, Payment, IDP)',
        'AEM Integration with Search providers - Elastic, Algolia, Coveo'
      ]
    },
    'architect': {
      title: 'Adobe Experience Manager Architect (8+ years)',
      skills: [
        'Web Technologies & Responsive Design (HTML/CSS/JS)',
        'Java Programming & OSGi - Sling Models & Apache Sling development',
        'Templates, Content Management & DAM',
        'AEM Workflows & Automation',
        'CRXDE & Tools (JCR, Developer Tools, Git)',
        'Unit Test Frameworks – JUnit, Mockito, Sling Context',
        'AEM Frontend Technology Development – HTML, CSS, JS, Clientlib, Sightly',
        'Build, Deployment & CI/CD (Maven, Cloud Manager, DevOps)',
        'Dispatcher & Security (SAML/SSO, Access Control, CDN)',
        'SPA Frameworks (Clientlib, React/Angular)',
        'AEM as a Cloud Service development & Migration',
        'Headless & API Integration (REST/GraphQL)',
        'Multi-Site Management & Localization',
        'Personalization & Analytics (Adobe Target, Adobe Analytics)',
        'AEM Cloud Platforms & DevOps Tools',
        'E-commerce & Enterprise Integrations (Commerce, PIM, Payment, IDP)',
        'AEM Integration with Search providers - Elastic, Algolia, Coveo',
        'Adobe Experience Products & Integration (Analytics, Target, Campaign, AEP)',
        'Edge Delivery Services (EDS)',
        'AEM Website Performance, Scalability, & Optimization'
      ]
    }
  },
  'ionic': {
    'junior': {
      title: 'Ionic Mobile Developer (1-2 years)',
      skills: [
        'Builds screens using Ionic components and follows design specifications',
        'Writes clean TypeScript and understands basic types/interfaces',
        'Implements Angular/React components and basic routing',
        'Uses state management (NgRx/Redux) in feature modules',
        'Implements navigation, tabs, and stack-based routing',
        'Consumes REST/GraphQL APIs with proper error/loading handling',
        'Basic offline caching and local persistence strategies',
        'Uses Capacitor plugins and basic configuration',
        'Integrates common native plugins (Camera, Geolocation, etc.)',
        'Implements push notification token registration and basic handlers',
        'Uses secure storage properly for tokens and sensitive data',
        'Runs local builds and understands basic signing steps',
        'Writes basic unit tests for components/services',
        'Fixes obvious UI performance issues using profiling tools'
      ]
    },

    'senior': {
      title: 'Ionic Senior Developer (3-5 years)',
      skills: [
        'Owns complex UI flows and creates reusable UI patterns',
        'Advanced TypeScript with strict typing and maintainable refactoring',
        'Designs feature modules with advanced hooks/RxJS patterns',
        'Designs state slices, effects, normalization, and performance optimization',
        'Handles complex navigation, backstack, and deep link edge cases',
        'Designs API layer with caching, retries, and pagination',
        'Implements sync queues, conflict resolution, and resilient offline UX',
        'Handles lifecycle events, permissions, and Capacitor bridge nuances',
        'Integrates complex native SDKs and third-party libraries',
        'Implements advanced push routing and payload handling',
        'Ensures secure token handling and threat-aware data management',
        'Troubleshoots Xcode/Gradle builds and manages release configurations',
        'Improves CI/CD pipelines and automates releases',
        'Drives performance optimization and prevents regressions',
        'Owns crash triage using Sentry/Crashlytics and fixes root causes'
      ]
    },

    'architect': {
      title: 'Ionic Mobile Architect (8+ years)',
      skills: [
        'Defines UI architecture, design system strategy, and cross-app consistency',
        'Sets TypeScript standards, shared libraries strategy, and quality gates',
        'Defines modular front-end architecture and design boundaries',
        'Chooses scalable state management strategy and governance model',
        'Defines app-wide navigation model and deep link contracts',
        'Defines API architecture, contracts, versioning, and error standards',
        'Designs end-to-end offline-first architecture and data reconciliation models',
        'Defines native integration standards and plugin governance strategy',
        'Owns Capacitor plugin architecture, versioning, and reuse strategy',
        'Defines notification architecture, security model, and scalability',
        'Defines mobile security posture, compliance alignment, and review standards',
        'Designs CI/CD architecture, release trains, and rollback strategies',
        'Defines testing strategy (unit + E2E), coverage gates, and quality metrics',
        'Defines performance budgets, bundle strategy, and measurement framework',
        'Owns observability strategy, analytics framework, and privacy compliance',
        'Leads system design decisions, long-term roadmap, and technical governance'
      ]
    }
  }
};

export default function InterviewAgent({ data }) {
    // Navigation Away Detection State
    const [leaveCount, setLeaveCount] = useState(0);
    const [totalTimeOutside, setTotalTimeOutside] = useState(0); // in seconds
    const [isOutside, setIsOutside] = useState(false);
    const lastHiddenTimestampRef = useRef(null);
    // Navigation Away Detection Logic (Additive, does not interfere with interview logic)
    useEffect(() => {
      function handleVisibilityChange() {
        if (document.hidden) {
          // User left the page (tab switch, minimize, app switch)
          setIsOutside(true);
          setLeaveCount((prev) => prev + 1);
          lastHiddenTimestampRef.current = Date.now();
        } else {
          // User returned to the page
          if (isOutside && lastHiddenTimestampRef.current) {
            const diff = Math.floor((Date.now() - lastHiddenTimestampRef.current) / 1000);
            setTotalTimeOutside((prev) => prev + diff);
          }
          setIsOutside(false);
          lastHiddenTimestampRef.current = null;
        }
      }

      function handleBlur() {
        // Window lost focus (may overlap with visibilitychange)
        if (!isOutside) {
          setIsOutside(true);
          setLeaveCount((prev) => prev + 1);
          lastHiddenTimestampRef.current = Date.now();
        }
      }

      function handleFocus() {
        // Window regained focus
        if (isOutside && lastHiddenTimestampRef.current) {
          const diff = Math.floor((Date.now() - lastHiddenTimestampRef.current) / 1000);
          setTotalTimeOutside((prev) => prev + diff);
        }
        setIsOutside(false);
        lastHiddenTimestampRef.current = null;
      }

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleBlur);
      window.addEventListener('focus', handleFocus);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('focus', handleFocus);
      };
    }, [isOutside]);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [userResponse, setUserResponse] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [candidateImage, setCandidateImage] = useState(null);
  const [interviewStatus, setInterviewStatus] = useState("pending"); // pending, passed, failed
  const [interviewProgress, setInterviewProgress] = useState(0);
  const [history, setHistory] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [questionSourceMessage, setQuestionSourceMessage] = useState("");

  const audioVisualizerRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimeoutRef = useRef(null);
  const recordingActiveRef = useRef(false);
  const sessionTranscriptRef = useRef('');
  const historyRef = useRef([]);
  const recordingStartRef = useRef(null);
  const existingContentRef = useRef('');
  const assessmentReportRef = useRef(null);
  const interviewStartedAtRef = useRef(null);
  const interviewCompletedAtRef = useRef(null);
  const questionStartedAtRef = useRef(null);
  const [sttError, setSttError] = useState(null);
  const [microphonePermission, setMicrophonePermission] = useState('prompt');
  const [isRequestingMicrophone, setIsRequestingMicrophone] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [excelMessage, setExcelMessage] = useState(null);
  const [excelMessageType, setExcelMessageType] = useState('success'); // 'success' or 'error'
  const [isSavingToExcel, setIsSavingToExcel] = useState(false);

  // Log component initialization
  useEffect(() => {
    console.log('🔴 InterviewAgent Component Mounted');
    console.log('🔴 Data prop received:', data);
    // load candidate image saved by the Capture Candidate Image screen
    try {
      const img = localStorage.getItem('candidateImage');
      if (img) setCandidateImage(img);
    } catch (e) {
      // ignore
    }
  }, []);

  const getCustomerRequirementContext = (profile) => {
    if (!profile) return '';

    const technology = profile.technologyStack || profile.technology || data?.technology;
    const domain = profile.clientDomain || profile.domain || data?.domain;
    const preferredSkills = profile.preferredSkills || profile.niceToHaveSkills || [];
    const focusAreas = profile.interviewFocusAreas || profile.questionFocus || [];
    const requirementSummary = profile.requirementSummary || profile.requirementText || 'Customer profile created from admin requirement input.';

    return `

Customer-specific project requirement context:
- Customer: ${profile.customerName}
- Project: ${profile.projectName}
- Technology stack: ${technology}
- Client domain: ${domain}
- Source folder/document: ${profile.teamsFolder || 'Admin profile'} / ${profile.documentName || profile.uploadedDocumentName || 'Pasted requirement'}
- Requirement summary: ${requirementSummary}
- Must-have skills: ${(profile.mustHaveSkills || []).join(', ')}
- Preferred skills: ${preferredSkills.join(', ')}
- Project responsibilities: ${(profile.responsibilities || []).join(', ')}
- Evaluation rubric: ${(profile.evaluationRubric || focusAreas).join(', ')}
- Interview focus areas: ${focusAreas.join(', ')}

Prioritize questions that test readiness for this exact customer project.`;
  };

  const fetchAnalyticsOptimizationInsights = async () => {
    const profile = data?.customerProjectProfile;
    const includeAnalyticsFeedback = (
      profile?.includeAnalyticsFeedbackInAssessment === true ||
      profile?.analyticsFeedbackPreference === 'include'
    );

    if (!includeAnalyticsFeedback) return null;

    try {
      const params = new URLSearchParams();
      if (data?.technology) params.set('technology', data.technology);
      if (data?.role || data?.roleLevel) params.set('role', data.role || data.roleLevel);
      if (data?.customerProjectProfile?.id) params.set('customerProfileId', data.customerProjectProfile.id);

      const response = await fetch(`${apiBaseUrl}/api/analytics/question-generation-insights?${params.toString()}`);
      if (!response.ok) return null;
      return readJsonResponse(response, 'Analytics insight response was not JSON');
    } catch (error) {
      console.warn('Unable to load analytics optimization insights', error);
      return null;
    }
  };

  const normalizeQuestionRole = (value) => {
    const normalizedValue = String(value || '').toLowerCase();
    if (normalizedValue.includes('architect')) return 'architect';
    if (normalizedValue.includes('lead')) return 'lead';
    if (normalizedValue.includes('senior')) return 'senior';
    if (normalizedValue.includes('mid')) return 'mid';
    if (normalizedValue.includes('junior')) return 'junior';
    return normalizedValue;
  };

  const knownRoleValues = ['junior', 'mid', 'senior', 'lead', 'architect'];

  const normalizeMatchValue = (value) => (
    Array.isArray(value) ? value.join(', ') : String(value || '')
  ).trim().toLowerCase().replace(/[^a-z0-9]/g, '');

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
    !knownRoleValues.includes(questionRole) ||
    !knownRoleValues.includes(selectedRole) ||
    questionRole === selectedRole
  );

  const isApprovedQuestion = (question) => (
    question?.status === 'Approved' ||
    question?.approvalStatus === 'Approved' ||
    String(question?.status || question?.approvalStatus || '').toLowerCase() === 'approved' ||
    question?.approved === true
  );

  const isActiveQuestion = (question) => (
    question?.active === undefined
      ? String(question?.activeStatus || 'Active').toLowerCase() !== 'inactive'
      : question.active === true || String(question.active).toLowerCase() === 'true'
  );

  const mapAdminQuestionToInterviewQuestion = (question, index, profile) => ({
    id: question.id || index + 1,
    type: question.type || question.category || 'Technical',
    question: question.text || question.question,
    context: `Customer profile: ${profile.customerName} - ${profile.projectName}
Technology: ${question.technology || profile.technologyStack || profile.technology || data?.technology}
Role level: ${question.roleLevel || question.difficulty || data?.role}
Expected points: ${(question.keyPoints || []).join(', ')}`,
    source: 'admin-approved',
    adminQuestionId: question.id
  });

  const getAdminApprovedQuestions = () => {
    const profile = data?.customerProjectProfile;
    if (!profile || profile.status !== 'Active') return [];

    const selectedTechnology = normalizeMatchValue(data?.technology || profile.technologyStack || profile.technology);
    const selectedRole = normalizeQuestionRole(data?.role || profile.roleRequirements || profile.role);
    const selectedProfileId = profile.id;

    return (profile.questions || [])
      .filter(question => {
        if (!question?.text && !question?.question) return false;
        if (!isApprovedQuestion(question) || !isActiveQuestion(question)) return false;

        const questionProfileId = question.customerProfileId || selectedProfileId;
        const questionTechnology = normalizeMatchValue(question.technology || profile.technologyStack || profile.technology);
        const questionRole = normalizeQuestionRole(question.roleLevel || question.difficulty || profile.roleRequirements || profile.role);

        const profileMatches = !questionProfileId || questionProfileId === selectedProfileId;
        const technologyMatches = valuesMatchLoosely(questionTechnology, selectedTechnology);
        const roleMatches = rolesMatch(questionRole, selectedRole);

        return profileMatches && technologyMatches && roleMatches;
      })
      .map((question, index) => mapAdminQuestionToInterviewQuestion(question, index, profile));
  };

  const getCustomerProfileQuestions = () => {
    const profile = data?.customerProjectProfile;
    const adminApprovedQuestions = getAdminApprovedQuestions();
    if (adminApprovedQuestions.length) return adminApprovedQuestions;

    const sourceQuestions = (profile?.sampleQuestions || []).filter(question => question.text);
    if (!sourceQuestions.length) return null;

    return sourceQuestions.map((question, index) => ({
      id: index + 1,
      type: question.type || (index === 0 ? 'theory' : index === 1 ? 'logical' : 'scenario'),
      question: question.text,
      context: `Customer profile: ${profile.customerName} - ${profile.projectName}\nExpected points: ${(question.keyPoints || []).join(', ')}`,
      source: 'customer-profile-seed'
    }));
  };

  // Fetch AI-generated questions based on candidate details
  const fetchAIQuestions = async () => {
    setIsLoadingQuestions(true);
    try {
      console.log('=== STARTING AI QUESTION FETCH ===');
      console.log('Candidate Details:', {
        technology: data?.technology,
        roleLevel: data?.role,
        candidateName: data?.candidateName
      });

      // Get skill matrix for the selected technology and role
      const techMatrix = skillMatrices[data?.technology] || {};
      const roleMatrix = techMatrix[data?.role] || techMatrix['junior'] || {
        title: `${data?.role || 'technical'} ${data?.technology || 'technology'} role`,
        skills: data?.customerProjectProfile?.mustHaveSkills || ['Architecture', 'Security', 'API integration', 'Testing', 'Communication']
      };
      const skillsList = roleMatrix.skills.join('\n• ');
      const customerRequirementContext = getCustomerRequirementContext(data?.customerProjectProfile);
      const analyticsOptimization = await fetchAnalyticsOptimizationInsights();
      const analyticsOptimizationContext = analyticsOptimization?.promptContext
        ? `\n\n${analyticsOptimization.promptContext}\nUse these analytics insights after customer requirements and admin-approved questions, and before creating new AI-only questions.`
        : '';

      const prompt = `You are an expert technical interviewer. Generate exactly 11 interview questions for a ${roleMatrix.title} position: 10 questions of mixed types and 1 additional scenario-based coding question (give the sample input and output). Questions must be generated based on the actual exprience of the candidate. 

The candidate should have knowledge in these areas:
• ${skillsList}
${customerRequirementContext}
${analyticsOptimizationContext}


Include these question types with exact distribution:
- 5 Objective type questions (multiple choice). Each objective question must have FOUR options labeled A, B, C, D, and exactly one correct option. For each objective question include an "options" array with four strings and a "correctOption" value set to "A", "B", "C", or "D". Example objective question format:
  Question: "Which protocol must a SwiftUI view conform to?"
  Options: ["A. UIView", "B. View", "C. ViewController", "D. SwiftUI"]
  correctOption: "B"
- 0 Logical reasoning questions (problem-solving) - Test problem-solving ability
- 0 Theory questions (conceptual understanding) - Test deep understanding
- 0 Coding snippet question (find bugs or errors) - Test debugging and coding skills
- 0 Scenario-based logical coding question (real-world application) - Test practical application skills. This question should be language-specific when appropriate (e.g. Swift for iOS roles) and include a small sample input and expected output.


Example of the scenario-based coding question format to follow (use only as an example in your output structure):
{
  "id": 11,
  "type": "scenario",
  "question": "Write a Swift/SwiftUI function that takes an array of integers at runtime and returns the list of indexes where the most frequently occurring number appears.",
  "language": "swift",
  "sampleInput": [5, 5, 25, 2, 5, 25, 33, 44, 2, 25, 5, 2],
  "expectedOutput": [0, 1, 4, 10],
  "notes": "Return indexes in ascending order. If multiple numbers tie for highest frequency, choose the smallest number by value."
}

The questions should be:
1. Relevant to the skills and experience level mentioned above
2. Progressively challenging based on the role level
3. Practical and based on real-world scenarios
4. Testing both theoretical knowledge and practical application

Return ONLY a valid JSON object with this format (no extra text):
{
  "questions": [
    {
      "id": 1,
      "type": "objective",
      "question": "question text here",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correctOption": "B",
      "context": null
    },
    {
      "id": 11,
      "type": "scenario",
      "question": "scenario question text here",
      "language": "swift",
      "sampleInput": [],
      "expectedOutput": [],
      "context": null
    }
  ]
}`;

      console.log('Generated Prompt for OpenAI:', prompt.substring(0, 200) + '...');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY || ''}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert technical interviewer specializing in mobile development. Generate interview questions in valid JSON format only. Return ONLY the JSON, no other text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });

      console.log('API Response Status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API ERROR:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText
        });
        throw new Error(`API error: ${response.status}`);
      }

      const result = await readJsonResponse(response, 'OpenAI question generation response was not JSON');
      console.log('✅ API Response Received');
      
      if (result.choices && result.choices[0] && result.choices[0].message) {
        const content = result.choices[0].message.content;
        
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const questionsData = JSON.parse(jsonMatch[0]);
          if (questionsData.questions && questionsData.questions.length > 0) {
            console.log('✅ Successfully loaded', questionsData.questions.length, 'AI questions');
            setQuestions(questionsData.questions);
            return;
          }
        }
      }
      
      console.warn('❌ Falling back to default questions');
      setQuestions(getCustomerProfileQuestions() || getDefaultQuestions());
    } catch (error) {
      console.error('❌ FETCH ERROR:', error.message);
      console.log('Falling back to default questions');
      setQuestions(getCustomerProfileQuestions() || getDefaultQuestions());
    } finally {
      setIsLoadingQuestions(false);
      console.log('=== AI QUESTION FETCH COMPLETE ===');
    }
  };

  const getDefaultQuestions = () => {
    const questionsByTech = {
      'swift': [
        { id: 1, type: 'objective', question: 'What is the difference between a struct and a class in Swift?', context: null, options: ['Structs are reference types, classes are value types', 'Structs are value types, classes are reference types', 'There is no difference', 'Structs cannot have methods'], correctOption: 'B' },
        { id: 2, type: 'objective', question: 'Which of these is NOT a value type in Swift?', options: ['Array', 'Dictionary', 'Class', 'Set'], context: null, correctOption: 'C' },
        { id: 3, type: 'logical', question: 'How would you optimize memory usage when working with large image collections in a ScrollView?', context: null },
        { id: 4, type: 'theory', question: "Explain Swift's Automatic Reference Counting (ARC) and the problem of strong reference cycles.", context: null },
        { id: 5, type: 'coding', question: 'What is wrong with this code? There is a memory leak. Identify and fix it.', context: '// ERROR: Should use [weak self]\nclass DataManager {\n    var delegate: (() -> Void)?\n    func setupCallback() {\n        delegate = { [unowned self] in\n            self.loadData()\n        }\n    }\n}' }
      ],
      'kotlin': [
        { id: 1, type: 'objective', question: 'What keyword makes a Kotlin class open for inheritance?', options: ['open', 'extend', 'inherit', 'public'], context: null, correctOption: 'A' },
        { id: 2, type: 'objective', question: 'How does Kotlin handle null safety compared to Java?', options: ['Kotlin requires explicit null safety checks', 'Kotlin doesn\'t support null values', 'Java is safer than Kotlin', 'Kotlin and Java handle nulls the same way'], context: null, correctOption: 'A' },
        { id: 3, type: 'logical', question: 'Describe how you would use scope functions (let, apply, run) in real-world scenarios.', context: null },
        { id: 4, type: 'theory', question: 'Explain Kotlin coroutines and their advantages over traditional threading.', context: null },
        { id: 5, type: 'coding', question: 'Identify the null safety issue in this code.', context: '// ERROR: Cannot assign null to non-nullable type\nval name: String = null\nval length = name.length' }
      ],
      'react-native': [
        { id: 1, type: 'objective', question: 'What is the primary difference between props and state in React Native?', options: ['Props are mutable, state is immutable', 'Props are immutable, state is mutable', 'They are the same thing', 'Props are only for functions'], context: null, correctOption: 'B' },
        { id: 2, type: 'objective', question: 'Which component is used for rendering a scrollable list in React Native?', options: ['FlatList', 'ListView', 'ScrollView', 'List'], context: null, correctOption: 'A' },
        { id: 3, type: 'logical', question: 'How would you prevent unnecessary re-renders in a React Native component?', context: null },
        { id: 4, type: 'theory', question: 'Explain how React Native bridges JavaScript and native code.', context: null },
        { id: 5, type: 'coding', question: 'Find the memory leak in this component.', context: 'useEffect(() => {\n    const timer = setInterval(() => {\n        console.log("Tick");\n    }, 1000);\n    // ERROR: Missing cleanup function\n}, []);' }
      ],
      'flutter': [
        { id: 1, type: 'objective', question: 'What is the base class for all Flutter widgets?', options: ['Widget', 'Element', 'RenderObject', 'State'], context: null, correctOption: 'A' },
        { id: 2, type: 'objective', question: 'Difference between StatelessWidget and StatefulWidget?', options: ['StatelessWidget can\'t change, StatefulWidget can change', 'StatefulWidget can\'t change, StatelessWidget can change', 'There is no difference', 'StatefulWidget is faster'], context: null, correctOption: 'A' },
        { id: 3, type: 'logical', question: 'How would you optimize Flutter app performance for large lists?', context: null },
        { id: 4, type: 'theory', question: 'Explain the Flutter widget tree and rendering pipeline.', context: null },
        { id: 5, type: 'coding', question: 'Identify the bug causing memory leak.', context: 'class _MyWidgetState extends State<MyWidget> {\n    StreamSubscription? subscription;\n    @override\n    void initState() {\n        subscription = stream.listen((data) {});\n        // ERROR: Missing dispose() call\n    }\n}' }
      ]
    };

    return questionsByTech[data?.technology] || [
      { id: 1, type: 'objective', question: `Tell me about your experience with ${data?.technology || 'the technology stack'}?`, context: null }
    ];
  };

  useEffect(() => {
    console.log('🔴 useEffect triggered - checking data:', data);
    if (data) {
      const loadInterviewQuestions = async () => {
        const adminQuestions = getAdminApprovedQuestions();

        if (adminQuestions.length > 0) {
          const message = 'Using Admin-Approved Interview Questions.';
          console.log(message, {
            profileId: data?.customerProjectProfile?.id,
            technology: data?.technology,
            role: data?.role,
            questionCount: adminQuestions.length
          });
          setQuestionSourceMessage(message);
          setQuestions(adminQuestions);
          setIsLoadingQuestions(false);
          return;
        }

        const fallbackMessage = 'No Admin-Approved Questions Found. Using Default Question Generation.';
        console.log(fallbackMessage, {
          profileId: data?.customerProjectProfile?.id,
          technology: data?.technology,
          role: data?.role
        });
        setQuestionSourceMessage(fallbackMessage);
        await fetchAIQuestions();
      };

      loadInterviewQuestions();
    } else {
      console.log('🔴 Data is null/undefined, NOT calling fetchAIQuestions');
    }
  }, [data]);

  // Watch for progress changes and load next question or evaluate interview
  useEffect(() => {
    if (isInterviewActive && questions.length > 0) {
      if (interviewProgress < questions.length) {
        const question = questions[interviewProgress];
        setCurrentQuestion(question.question);
        speakText(question.question);
        setUserResponse("");
        questionStartedAtRef.current = Date.now();
      } else if (interviewProgress === questions.length && !feedback) {
        // All questions answered, evaluate overall interview
        evaluateOverallInterview();
      }
    }
  }, [interviewProgress, isInterviewActive, questions]);

  const startInterview = () => {
    interviewStartedAtRef.current = new Date().toISOString();
    interviewCompletedAtRef.current = null;
    questionStartedAtRef.current = Date.now();
    historyRef.current = [];
    setIsInterviewActive(true);
    setInterviewStatus("pending");
    setInterviewProgress(0);
    setHistory([]);
    setFeedback(null);
    trackEvent('interview_started', {
      technology: data?.technology || data?.domain || 'unknown',
      role: data?.role || data?.roleLevel || 'unknown',
      customer_profile_id: data?.customerProjectProfile?.id || '',
      customer_name: data?.customerProjectProfile?.customerName || '',
      project_name: data?.customerProjectProfile?.projectName || '',
      question_count: questions.length
    });
  };

  const endInterview = () => {
    setIsInterviewActive(false);
    setIsRecording(false);
    setCurrentQuestion("");
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(utterance);
    }
  };

  const getMicrophonePermissionMessage = (error) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return 'Microphone recording is not supported in this browser. Please type your response below.';
    }

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      return 'Microphone access requires HTTPS. Please open the deployed HTTPS URL.';
    }

    if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
      return 'Microphone permission is blocked. Allow Microphone in browser site settings and reload, or type your response below.';
    }

    if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
      return 'No microphone was found on this device. Please connect a microphone or type your response below.';
    }

    if (error?.name === 'NotReadableError') {
      return 'Microphone is already in use by another app. Close other recording apps and try again.';
    }

    return 'Microphone access denied or unavailable. Please type your response below, or allow microphone permissions and try again.';
  };

  const requestMicrophonePermission = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setSttError(getMicrophonePermissionMessage());
      setMicrophonePermission('unsupported');
      return null;
    }

    try {
      setIsRequestingMicrophone(true);
      setSttError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicrophonePermission('granted');
      return stream;
    } catch (error) {
      console.error('Microphone permission request failed', error);
      setMicrophonePermission('denied');
      setSttError(getMicrophonePermissionMessage(error));
      return null;
    } finally {
      setIsRequestingMicrophone(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    const stream = await requestMicrophonePermission();
    if (stream) {
      startRecording(stream);
    }
  };

  const appendTranscript = (transcript) => {
    const cleanTranscript = String(transcript || '').trim();
    if (!cleanTranscript) return;

    setUserResponse((prev) => {
      const current = String(prev || '').trim();
      return current ? `${current}\n${cleanTranscript}` : cleanTranscript;
    });
  };

  const stopMediaStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const transcribeAudioBlob = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'interview-response.webm');

    const response = await fetch(`${apiBaseUrl}/api/interview/audio`, {
      method: 'POST',
      body: formData
    });
    const body = await readJsonResponse(response, 'Transcription response was not JSON');
    return body.text || '';
  };

  const startServerTranscriptionRecording = async (permissionStream = null) => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setSttError('Audio recording is not supported in this browser. Please type your response.');
      return;
    }

    try {
      setSttError(null);
      existingContentRef.current = userResponse || '';
      audioChunksRef.current = [];
      const stream = permissionStream || await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
        setIsTranscribing(false);
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error', event);
        setSttError('Audio recording failed. Please try again or type your response.');
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsTranscribing(true);
        stopMediaStream();

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
          if (!audioBlob.size) {
            setSttError('No audio was captured. Please try again or type your response.');
            return;
          }
          const transcript = await transcribeAudioBlob(audioBlob);
          appendTranscript(transcript);
          setSttError(null);
        } catch (error) {
          console.error('Server transcription failed', error);
          setSttError(`Server transcription failed: ${error.message}`);
        } finally {
          setIsTranscribing(false);
          mediaRecorderRef.current = null;
          audioChunksRef.current = [];
          if (recordingTimeoutRef.current) {
            clearTimeout(recordingTimeoutRef.current);
            recordingTimeoutRef.current = null;
          }
        }
      };

      mediaRecorder.start();
      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 180000);
    } catch (error) {
      console.error('Could not start server transcription recording', error);
      setIsRecording(false);
      setIsTranscribing(false);
      stopMediaStream();
      setMicrophonePermission('denied');
      setSttError(getMicrophonePermissionMessage(error));
    }
  };

  const startBrowserSpeechRecognition = () => {
    setSttError(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSttError('Speech recognition is not supported in this browser.');
      return;
    }

    // Mark that recording was explicitly started by the user
    recordingActiveRef.current = true;
    sessionTranscriptRef.current = '';
    existingContentRef.current = userResponse || '';
    recordingStartRef.current = Date.now();

    // start global 3 minute timeout (only once)
    if (!recordingTimeoutRef.current) {
      recordingTimeoutRef.current = setTimeout(() => {
        // stop recording after max duration
        recordingActiveRef.current = false;
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) { console.warn(e); }
        }
      }, 180000);
    }

    const createRecognition = () => {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      // where supported, continuous helps reduce auto-stops
      try { recognition.continuous = true; } catch (e) {}

      recognition.onstart = () => {
        setIsRecording(true);
        setIsTranscribing(true);
      };

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            sessionTranscriptRef.current += transcript + ' ';
          } else {
            interim += transcript;
          }
        }

        const base = existingContentRef.current || '';
        const combinedNew = (sessionTranscriptRef.current + interim).trim();
        const preview = base ? (combinedNew ? base + '\n' + combinedNew : base) : combinedNew;
        setUserResponse(preview);
      };

      recognition.onerror = (event) => {
        console.error('SpeechRecognition error', event);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setSttError('Microphone access denied. Please allow microphone permissions and try again.');
          recordingActiveRef.current = false;
        } else if (event.error === 'network') {
          setSttError('Browser speech recognition network failed. Using server transcription instead.');
          recordingActiveRef.current = false;
          try { recognition.stop(); } catch (e) { console.warn(e); }
          startServerTranscriptionRecording();
        } else {
          // Other errors (network, no-speech) - show a brief message but attempt to continue if still active
          setSttError('Speech recognition error: ' + event.error);
        }
        setIsTranscribing(false);
        // stop everything on permission errors
        if (!recordingActiveRef.current && recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current);
          recordingTimeoutRef.current = null;
        }
      };

      recognition.onend = () => {
        // If the user hasn't explicitly stopped and the max duration not yet reached, restart recognition
        const reachedMax = recordingTimeoutRef.current === null && (Date.now() - (recordingStartRef.current || 0)) >= 180000;
        if (recordingActiveRef.current && !reachedMax) {
          // small delay before restart to avoid tight loops
          setTimeout(() => {
            if (recordingActiveRef.current) {
              try {
                const nextRec = createRecognition();
                recognitionRef.current = nextRec;
                nextRec.start();
              } catch (e) {
                console.warn('Failed to restart recognition', e);
                // finalize if restart fails
                finalizeRecording();
              }
            }
          }, 250);
          return;
        }

        // Finalize recording session
        finalizeRecording();
      };

      return recognition;
    };

    const finalizeRecording = () => {
      setIsRecording(false);
      setIsTranscribing(false);
      recognitionRef.current = null;

      // clear timeout
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }

      const appended = sessionTranscriptRef.current.trim();
      if (appended) {
        setUserResponse((prev) => {
          const base = existingContentRef.current || '';
          if (!base) return appended;
          return base + '\n' + appended;
        });
      } else {
        setUserResponse(existingContentRef.current);
      }

      // reset flags
      recordingActiveRef.current = false;
      sessionTranscriptRef.current = '';
      recordingStartRef.current = null;
    };

    // Create and start the first recognition instance
    try {
      const rec = createRecognition();
      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error('Could not start speech recognition', err);
      setSttError('Could not start speech recognition.');
      recordingActiveRef.current = false;
      setIsRecording(false);
      setIsTranscribing(false);
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
    }
  };

  const startRecording = (permissionStream = null) => {
    if (navigator.mediaDevices?.getUserMedia && window.MediaRecorder) {
      startServerTranscriptionRecording(permissionStream);
    } else {
      startBrowserSpeechRecognition();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      return;
    }

    // Explicit user stop: mark inactive and stop current recognition instance
    recordingActiveRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Error stopping recognition', e);
        recognitionRef.current = null;
        setIsRecording(false);
        setIsTranscribing(false);
      }
    } else {
      setIsRecording(false);
      setIsTranscribing(false);
    }
    // clear any active recording timeout
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  };

  const submitTextResponse = () => {
    if (userResponse.trim() !== "") {
      evaluateResponse(userResponse);
    }
  };

  const optionLetters = ['A', 'B', 'C', 'D'];

  const clampScore = (value, fallback = 0) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return fallback;
    return Math.max(0, Math.min(100, Math.round(numericValue)));
  };

  const averageScore = (scores, fallback = 0) => {
    const validScores = scores
      .filter(score => score !== null && score !== undefined && score !== '')
      .map(score => Number(score))
      .filter(score => Number.isFinite(score));

    if (!validScores.length) return fallback;

    return clampScore(
      validScores.reduce((total, score) => total + score, 0) / validScores.length,
      fallback
    );
  };

  const stripOptionPrefix = (value = '') => (
    String(value || '').trim().replace(/^[A-D][).\s:-]+/i, '').trim()
  );

  const normalizeComparableText = (value = '') => (
    stripOptionPrefix(value).toLowerCase().replace(/[^a-z0-9]+/g, '')
  );

  const getOptionLetterFromValue = (value = '') => {
    const match = String(value || '').trim().match(/^([A-D])(?:[).\s:-]|$)/i);
    return match ? match[1].toUpperCase() : '';
  };

  const getOptionByLetter = (options = [], letter = '') => {
    const normalizedLetter = String(letter || '').trim().charAt(0).toUpperCase();
    if (!normalizedLetter || !Array.isArray(options)) return '';

    const directMatch = options.find(option => getOptionLetterFromValue(option) === normalizedLetter);
    if (directMatch) return directMatch;

    const optionIndex = optionLetters.indexOf(normalizedLetter);
    return optionIndex >= 0 ? options[optionIndex] || '' : '';
  };

  const getSelectedOptionLetter = (response = '', options = []) => {
    const directLetter = getOptionLetterFromValue(response);
    if (directLetter) return directLetter;

    const normalizedResponse = normalizeComparableText(response);
    if (!normalizedResponse || !Array.isArray(options)) return '';

    const matchedIndex = options.findIndex(option => {
      const normalizedOption = normalizeComparableText(option);
      return normalizedOption && (
        normalizedResponse === normalizedOption ||
        normalizedResponse.startsWith(normalizedOption) ||
        normalizedResponse.includes(normalizedOption)
      );
    });

    return matchedIndex >= 0 ? optionLetters[matchedIndex] : '';
  };

  const getQuestionExpectedAnswer = (question = {}) => {
    const correctOption = String(
      question.correctOption ||
      question.correctAnswerOption ||
      ''
    ).trim().charAt(0).toUpperCase();

    if (correctOption) {
      const optionText = getOptionByLetter(question.options, correctOption);
      return optionText
        ? `${correctOption}. ${stripOptionPrefix(optionText)}`
        : correctOption;
    }

    if (question.expectedAnswer) return question.expectedAnswer;
    if (question.expectedOutput) return `Expected output: ${JSON.stringify(question.expectedOutput)}`;
    if (question.context) return question.context;
    if (question.notes) return question.notes;
    return '';
  };

  const normalizeAssessmentLabel = (assessment = '', score = null) => {
    const normalizedAssessment = String(assessment || '').toLowerCase();

    if (
      normalizedAssessment.includes('incorrect') ||
      normalizedAssessment.includes('not correct') ||
      normalizedAssessment.includes('wrong')
    ) {
      return 'Incorrect';
    }

    if (
      normalizedAssessment.includes('partial') ||
      normalizedAssessment.includes('partially')
    ) {
      return 'Partially Correct';
    }

    if (
      normalizedAssessment.includes('correct') ||
      normalizedAssessment.includes('right')
    ) {
      return 'Correct';
    }

    if (normalizedAssessment.includes('review')) return 'Needs Review';

    const numericScore = Number(score);
    if (Number.isFinite(numericScore)) {
      if (numericScore >= 85) return 'Correct';
      if (numericScore >= 45) return 'Partially Correct';
      return 'Incorrect';
    }

    return 'Needs Review';
  };

  const getAssessmentScoreEstimate = (assessment = '', explicitScore = null) => {
    const numericScore = Number(explicitScore);
    if (Number.isFinite(numericScore)) return clampScore(numericScore);

    const normalizedAssessment = String(assessment || '').toLowerCase();
    if (
      normalizedAssessment.includes('incorrect') ||
      normalizedAssessment.includes('not correct') ||
      normalizedAssessment.includes('wrong')
    ) {
      return 0;
    }
    if (normalizedAssessment.includes('partial')) return 50;
    if (normalizedAssessment.includes('correct') || normalizedAssessment.includes('right')) return 100;
    return 0;
  };

  const evaluateObjectiveAnswerLocally = (historyItem = {}) => {
    const correctOption = String(historyItem.correctOption || '').trim().charAt(0).toUpperCase();
    if (!correctOption) return null;

    const selectedOption = getSelectedOptionLetter(historyItem.response, historyItem.options);
    const correctOptionText = getOptionByLetter(historyItem.options, correctOption);
    const expectedAnswer = correctOptionText
      ? `${correctOption}. ${stripOptionPrefix(correctOptionText)}`
      : correctOption;
    const selectedMatchesCorrect = selectedOption === correctOption;

    return {
      assessment: selectedMatchesCorrect ? 'Correct' : 'Incorrect',
      score: selectedMatchesCorrect ? 100 : 0,
      expectedAnswer,
      feedback: selectedMatchesCorrect
        ? `The selected option matches the correct answer (${expectedAnswer}). The response is technically correct for this objective question.`
        : `The selected answer does not match the correct option. Correct answer: ${expectedAnswer}. Review the underlying concept before using this topic in a project or customer interview.`
    };
  };

  const getQuestionTypeLabel = (questionType = '') => (
    String(questionType || 'technical').replace(/[-_]+/g, ' ')
  );

  const buildHistoryItem = (question = {}, questionIndex = 0, response = '', responseDurationSeconds = 0) => ({
    questionId: question.id || `question-${questionIndex + 1}`,
    question: question.question || currentQuestion || `Question ${questionIndex + 1}`,
    response,
    questionType: question.type || 'technical',
    context: question.context || '',
    options: Array.isArray(question.options) ? question.options : [],
    correctOption: question.correctOption || question.correctAnswerOption || '',
    expectedAnswer: getQuestionExpectedAnswer(question),
    sampleInput: question.sampleInput,
    expectedOutput: question.expectedOutput,
    notes: question.notes || '',
    language: question.language || '',
    responseDurationSeconds
  });

  const getCompleteInterviewHistory = () => {
    const capturedHistory = historyRef.current.length ? historyRef.current : history;

    return questions.map((question, index) => {
      const existingHistoryItem = capturedHistory[index] || {};
      return {
        ...buildHistoryItem(question, index, existingHistoryItem.response || '', existingHistoryItem.responseDurationSeconds || 0),
        ...existingHistoryItem,
        question: existingHistoryItem.question || question.question || `Question ${index + 1}`,
        response: existingHistoryItem.response || 'No response submitted',
        options: existingHistoryItem.options?.length ? existingHistoryItem.options : (Array.isArray(question.options) ? question.options : []),
        correctOption: existingHistoryItem.correctOption || question.correctOption || question.correctAnswerOption || '',
        expectedAnswer: existingHistoryItem.expectedAnswer || getQuestionExpectedAnswer(question)
      };
    });
  };

  const evaluateResponse = (response) => {
    const question = questions[interviewProgress] || {};
    const responseDurationSeconds = questionStartedAtRef.current
      ? Math.max(0, Math.round((Date.now() - questionStartedAtRef.current) / 1000))
      : 0;
    const historyItem = buildHistoryItem(question, interviewProgress, response, responseDurationSeconds);

    // Store response without showing per-question feedback
    setHistory(prev => {
      const updatedHistory = [...prev, historyItem];
      historyRef.current = updatedHistory;
      return updatedHistory;
    });

    trackEvent('question_answered', {
      question_id: historyItem.questionId,
      question_text: historyItem.question,
      question_type: historyItem.questionType || 'unknown',
      technology: data?.technology || data?.domain || 'unknown',
      role: data?.role || data?.roleLevel || 'unknown',
      customer_profile_id: data?.customerProjectProfile?.id || '',
      customer_name: data?.customerProjectProfile?.customerName || '',
      project_name: data?.customerProjectProfile?.projectName || '',
      response_duration_seconds: responseDurationSeconds,
      skipped: !String(response || '').trim()
    });

    // Auto-advance to next question after brief delay
    setTimeout(() => {
      setInterviewProgress(prev => prev + 1);
      setUserResponse("");
      setFeedback(null);
    }, 800);
  };

  const getDurationSecondsFromFeedback = (overallFeedback) => {
    if (interviewStartedAtRef.current && overallFeedback?.completedAt) {
      const started = new Date(interviewStartedAtRef.current);
      const completed = new Date(overallFeedback.completedAt);
      if (!Number.isNaN(started.getTime()) && !Number.isNaN(completed.getTime())) {
        return Math.max(0, Math.round((completed.getTime() - started.getTime()) / 1000));
      }
    }
    return 0;
  };

  const trackInterviewCompletionAnalytics = (overallFeedback) => {
    const durationSeconds = getDurationSecondsFromFeedback(overallFeedback);
    const answerEvaluations = overallFeedback?.answers || [];

    trackEvent('interview_completed', {
      technology: data?.technology || data?.domain || 'unknown',
      role: data?.role || data?.roleLevel || 'unknown',
      customer_profile_id: data?.customerProjectProfile?.id || '',
      customer_name: data?.customerProjectProfile?.customerName || '',
      project_name: data?.customerProjectProfile?.projectName || '',
      score: overallFeedback?.score || 0,
      accuracy: overallFeedback?.accuracy || 0,
      confidence: overallFeedback?.confidence || 0,
      communication: overallFeedback?.communication || 0,
      hiring_recommendation: overallFeedback?.hiringRecommendation || '',
      duration_seconds: durationSeconds,
      answer_count: answerEvaluations.length || history.length,
      question_count: questions.length
    });

    answerEvaluations.forEach((answer, index) => {
      const historyItem = history[index] || {};
      const question = questions[index] || {};
      trackEvent('question_evaluated', {
        question_id: historyItem.questionId || question.id || `question-${index + 1}`,
        question_text: answer.question || historyItem.question || question.question || `Question ${index + 1}`,
        question_type: answer.questionType || historyItem.questionType || question.type || 'unknown',
        assessment: answer.assessment || '',
        score_estimate: getAssessmentScoreEstimate(answer.assessment, answer.score),
        technology: data?.technology || data?.domain || 'unknown',
        role: data?.role || data?.roleLevel || 'unknown',
        customer_profile_id: data?.customerProjectProfile?.id || '',
        customer_name: data?.customerProjectProfile?.customerName || '',
        project_name: data?.customerProjectProfile?.projectName || '',
        response_duration_seconds: historyItem.responseDurationSeconds || 0
      });
    });
  };

  const toTextArray = (value, fallback = []) => {
    if (Array.isArray(value)) {
      return value.map(item => String(item || '').trim()).filter(Boolean);
    }

    if (typeof value === 'string' && value.trim()) {
      return value
        .split(/\n|;|\u2022/g)
        .map(item => item.trim())
        .filter(Boolean);
    }

    return fallback;
  };

  const shortenText = (value = '', maxLength = 180) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 3)}...`;
  };

  const buildFallbackAnswerFeedback = (historyItem, assessment, expectedAnswer, localObjectiveEvaluation) => {
    if (localObjectiveEvaluation?.feedback) return localObjectiveEvaluation.feedback;

    const candidateAnswer = String(historyItem.response || '').trim();
    if (!candidateAnswer || candidateAnswer === 'No response submitted') {
      return 'No answer was submitted for this question, so the response is marked incorrect. The candidate should revisit the topic and prepare a structured answer with technical facts, tradeoffs, and a practical example.';
    }

    const expectedText = expectedAnswer
      ? `Expected answer or rubric: ${shortenText(expectedAnswer, 260)}.`
      : 'No stored answer key was available for this question.';

    if (assessment === 'Needs Review') {
      return `The answer has been captured, but automatic AI validation was unavailable or incomplete for this descriptive question. ${expectedText} A reviewer should compare the response against the rubric and check for correctness, depth, examples, and missing edge cases.`;
    }

    return `${expectedText} The candidate's answer should be checked for technical correctness, completeness, and practical relevance.`;
  };

  const buildCompleteAnswerEvaluations = (rawAnswers = [], sourceHistory = getCompleteInterviewHistory()) => {
    const answersByNumber = new Map(
      (Array.isArray(rawAnswers) ? rawAnswers : []).map((answer, index) => [
        Number(answer?.questionNumber) || index + 1,
        answer || {}
      ])
    );

    return sourceHistory.map((historyItem, index) => {
      const questionNumber = index + 1;
      const aiAnswer = answersByNumber.get(questionNumber) || {};
      const localObjectiveEvaluation = String(historyItem.questionType || '').toLowerCase() === 'objective'
        ? evaluateObjectiveAnswerLocally(historyItem)
        : null;
      const explicitScore = aiAnswer.score ?? aiAnswer.marks ?? aiAnswer.percentage;
      const hasAiAssessment = Boolean(aiAnswer.assessment || explicitScore !== undefined);
      const score = localObjectiveEvaluation
        ? localObjectiveEvaluation.score
        : hasAiAssessment
          ? getAssessmentScoreEstimate(aiAnswer.assessment, explicitScore)
          : null;
      const assessment = localObjectiveEvaluation
        ? localObjectiveEvaluation.assessment
        : hasAiAssessment
          ? normalizeAssessmentLabel(aiAnswer.assessment, score)
          : 'Needs Review';
      const expectedAnswer = localObjectiveEvaluation?.expectedAnswer ||
        aiAnswer.expectedAnswer ||
        aiAnswer.correctAnswer ||
        historyItem.expectedAnswer ||
        '';
      const missingConcepts = toTextArray(
        aiAnswer.missingConcepts || aiAnswer.missedConcepts || aiAnswer.gaps,
        assessment === 'Correct' ? [] : ['Add more precise technical detail', 'Include a practical example or edge case']
      );
      const improvementSuggestion = String(
        aiAnswer.improvementSuggestion ||
        aiAnswer.suggestion ||
        aiAnswer.recommendation ||
        ''
      ).trim();
      const feedbackText = String(aiAnswer.feedback || aiAnswer.analysis || '').trim() ||
        buildFallbackAnswerFeedback(historyItem, assessment, expectedAnswer, localObjectiveEvaluation);

      return {
        questionNumber,
        question: historyItem.question || aiAnswer.question || `Question ${questionNumber}`,
        questionType: historyItem.questionType || aiAnswer.questionType || 'technical',
        candidateAnswer: historyItem.response || aiAnswer.candidateAnswer || 'No response submitted',
        assessment,
        score,
        expectedAnswer,
        feedback: feedbackText,
        missingConcepts,
        improvementSuggestion: improvementSuggestion ||
          (assessment === 'Correct'
            ? 'Keep using the same level of clarity and evidence in future answers.'
            : 'Rewrite the answer with the main concept first, then add implementation details, tradeoffs, and a concise example.'),
        responseDurationSeconds: historyItem.responseDurationSeconds || 0
      };
    });
  };

  const calculateAccuracyFromAnswers = (answerEvaluations, fallbackAccuracy = 0) => {
    const scorableAnswers = answerEvaluations.filter(answer => answer.assessment !== 'Needs Review');
    if (!scorableAnswers.length && answerEvaluations.length) return 0;

    return averageScore(
      scorableAnswers.map(answer => answer.score),
      clampScore(fallbackAccuracy, 0)
    );
  };

  const estimateCommunicationFromHistory = (sourceHistory = []) => {
    const responses = sourceHistory
      .map(item => String(item.response || '').trim())
      .filter(response => response && response !== 'No response submitted');
    if (!responses.length) return 0;

    const averageWords = responses.reduce((total, response) => (
      total + response.split(/\s+/).filter(Boolean).length
    ), 0) / responses.length;

    return clampScore(Math.min(85, 35 + averageWords * 1.4), 0);
  };

  const estimateConfidenceFromHistory = (sourceHistory = []) => {
    const answeredCount = sourceHistory.filter(item => {
      const response = String(item.response || '').trim();
      return response && response !== 'No response submitted';
    }).length;

    if (!sourceHistory.length || !answeredCount) return 0;
    return clampScore(45 + (answeredCount / sourceHistory.length) * 40, 0);
  };

  const buildFinalFeedback = (evaluation = {}, sourceHistory = getCompleteInterviewHistory(), options = {}) => {
    const answerEvaluations = buildCompleteAnswerEvaluations(evaluation.answers, sourceHistory);
    const accuracyScore = calculateAccuracyFromAnswers(answerEvaluations, evaluation.accuracy);
    const confidenceScore = clampScore(evaluation.confidence, estimateConfidenceFromHistory(sourceHistory));
    const communicationScore = clampScore(evaluation.communication, estimateCommunicationFromHistory(sourceHistory));
    const overallScore = accuracyScore;
    const passed = overallScore >= 70;
    const level = getDreyfusLevel(overallScore);
    const completedAt = options.completedAt || new Date();
    const reviewRequired = answerEvaluations.some(answer => answer.assessment === 'Needs Review');
    const fallbackNotice = options.fallbackReason
      ? `AI evaluation was unavailable or incomplete (${options.fallbackReason}). Objective questions were scored using their answer keys, and descriptive answers are included for manual review. `
      : '';

    return {
      score: overallScore,
      accuracy: accuracyScore,
      confidence: confidenceScore,
      communication: communicationScore,
      feedback: evaluation.overallAssessment ||
        `${fallbackNotice}The candidate completed ${answerEvaluations.length} questions. Final marks are based on validated technical correctness, while confidence and communication are shown as supporting signals.`,
      strengths: toTextArray(evaluation.strengths, [
        'Completed the interview flow',
        'Provided responses for the captured questions',
        'Demonstrated areas that can now be reviewed question by question'
      ]),
      areasToImprove: toTextArray(evaluation.areasToImprove, [
        'Increase answer depth with implementation details',
        'Use examples, tradeoffs, and edge cases',
        'Keep responses structured around the exact question asked'
      ]),
      technicalFeedback: evaluation.technicalFeedback ||
        `${fallbackNotice}Technical correctness is calculated from the detailed question evaluations below. Review each answer for exact concepts, missed points, and expected rubric alignment.`,
      communicationFeedback: evaluation.communicationFeedback ||
        `Communication was estimated from answer completeness and clarity. Strong answers should define the concept, explain why it matters, and finish with a practical example.`,
      behavioralFeedback: evaluation.behavioralFeedback ||
        `Professional readiness should be assessed from consistency, focus, and interview discipline. Tab switches: ${leaveCount}. Time outside: ${totalTimeOutside} seconds.`,
      overallRating: evaluation.overallRating || level,
      recommendations: evaluation.recommendations ||
        'Review every incorrect or partially correct answer, rewrite it with the expected concept and a practical example, then repeat a timed mock interview.',
      hiringRecommendation: evaluation.hiringRecommendation || getHiringRecommendation(overallScore),
      answers: answerEvaluations,
      level,
      assessmentStatus: reviewRequired
        ? 'Completed - Review Required'
        : passed ? 'Completed - Passed' : 'Completed - Needs Improvement',
      completedAt: completedAt.toISOString(),
      interviewDuration: getInterviewDuration(completedAt)
    };
  };

  const evaluateOverallInterview = async () => {
    console.log('🔴 Starting OpenAI validation of answers...');
    const interviewHistory = getCompleteInterviewHistory();
    
    try {
      // Build evaluation prompt with all Q&A pairs
      const qaString = interviewHistory.map((item, idx) => {
        const optionLines = item.options?.length
          ? `Options:\n${item.options.map((option, optionIndex) => `${optionLetters[optionIndex] || ''}. ${stripOptionPrefix(option)}`).join('\n')}`
          : '';
        const correctOptionLine = item.correctOption
          ? `Correct option for objective scoring: ${item.correctOption}`
          : '';
        const expectedAnswerLine = item.expectedAnswer
          ? `Expected answer or rubric: ${item.expectedAnswer}`
          : '';
        const contextLine = item.context
          ? `Question context/code/rubric:\n${item.context}`
          : '';
        const sampleInputLine = item.sampleInput
          ? `Sample input: ${JSON.stringify(item.sampleInput)}`
          : '';
        const expectedOutputLine = item.expectedOutput
          ? `Expected output: ${JSON.stringify(item.expectedOutput)}`
          : '';

        return [
          `Q${idx + 1} [${getQuestionTypeLabel(item.questionType)}]: ${item.question}`,
          optionLines,
          correctOptionLine,
          expectedAnswerLine,
          contextLine,
          sampleInputLine,
          expectedOutputLine,
          `Candidate's Answer: ${item.response || 'No response submitted'}`
        ].filter(Boolean).join('\n');
      }).join('\n\n---\n\n');
      const analyticsOptimization = await fetchAnalyticsOptimizationInsights();
      const analyticsAssessmentContext = analyticsOptimization?.promptContext
        ? `\n\nAdmin-approved analytics feedback to include in this assessment:\n${analyticsOptimization.promptContext}`
        : '';

      const evaluationPrompt = `You are an expert technical interviewer evaluating a candidate's interview performance for a ${data?.role} position in ${data?.technology}.
${getCustomerRequirementContext(data?.customerProjectProfile)}
${analyticsAssessmentContext}

Evaluate these interview responses:

${qaString}

Provide a detailed JSON evaluation with:
1. Exactly ${interviewHistory.length} answer evaluations, one for every numbered question above.
2. Per-answer score from 0-100. Use 100 for correct, 50 for partially correct, and 0 for incorrect unless the answer deserves a more precise technical score.
3. For objective questions with a correct option, mark the answer correct only when the selected option matches the correct option.
4. Overall accuracy score (0-100) equal to the average of all per-answer scores. If every answer is wrong, accuracy must be 0. If every answer is correct, accuracy must be 100.
5. Confidence score (0-100) based on technical depth, conviction, and specificity.
6. Communication score (0-100) based on clarity, structure, and concision.
7. Detailed technical, communication, and behavioral feedback with concrete evidence from the candidate's answers.
8. Detailed strengths (3-5 key strengths observed) and detailed areas for improvement (3-5 key areas).
9. Overall assessment and recommendations that are specific to this candidate's responses.
10. Hiring recommendation using only: Hire, Consider, Reject.

For each answer, include the question text, candidate answer, expected answer/rubric, missed concepts, and an improvement suggestion. Feedback must be specific enough that a reviewer can understand why the answer received the score.


Return ONLY valid JSON in this format:
{
  "accuracy": 85,
  "confidence": 78,
  "communication": 82,
  "answers": [
    {
      "questionNumber": 1,
      "question": "question text",
      "candidateAnswer": "candidate answer",
      "assessment": "Correct/Partially Correct/Incorrect",
      "score": 100,
      "expectedAnswer": "expected answer or rubric",
      "feedback": "Specific 3-5 sentence feedback on this answer...",
      "missingConcepts": ["missed concept 1", "missed concept 2"],
      "improvementSuggestion": "Specific way to improve this answer"
    }
  ],
  "strengths": ["Strength 1", "Strength 2", "Strength 3", "Strength 4", "Strength 5"],
  "areasToImprove": ["Area 1", "Area 2", "Area 3", "Area 4", "Area 5"],
  "technicalFeedback": "Detailed technical feedback paragraph with evidence",
  "communicationFeedback": "Detailed communication feedback paragraph with evidence",
  "behavioralFeedback": "Detailed behavioral/professional feedback paragraph with evidence",
  "overallRating": "Expert/Proficient/Competent/Advanced Beginner/Novice",
  "overallAssessment": "Detailed paragraph about overall performance with evidence",
  "recommendations": "Detailed career and learning recommendations",
  "hiringRecommendation": "Hire/Consider/Reject"
}`;

      console.log('🟢 Sending assessment evaluation request to backend...');

      const response = await fetch(`${apiBaseUrl}/api/interview/assessment-evaluation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          evaluationPrompt
        })
      });

      const evaluation = await readJsonResponse(response, 'Assessment evaluation response was not JSON');
      console.log('✅ Evaluation received:', evaluation);
      const completedAt = new Date();
      interviewCompletedAtRef.current = completedAt.toISOString();
      const overallFeedback = buildFinalFeedback(evaluation, interviewHistory, { completedAt });
      const passed = overallFeedback.score >= 70 && overallFeedback.assessmentStatus !== 'Completed - Review Required';
      setInterviewStatus(passed ? "passed" : "failed");

      console.log('✅ Feedback set:', overallFeedback);
      setFeedback(overallFeedback);
      trackInterviewCompletionAnalytics(overallFeedback);
      return;
    } catch (error) {
      console.error('❌ Evaluation error:', error);
      const completedAt = new Date();
      interviewCompletedAtRef.current = completedAt.toISOString();
      const overallFeedback = buildFinalFeedback({}, interviewHistory, {
        completedAt,
        fallbackReason: error.message
      });
      const passed = overallFeedback.score >= 70 && overallFeedback.assessmentStatus !== 'Completed - Review Required';
      setInterviewStatus(passed ? "passed" : "failed");

      setFeedback(overallFeedback);
      trackInterviewCompletionAnalytics(overallFeedback);
    }
  };

  const resetInterview = () => {
    setIsInterviewActive(false);
    setInterviewStatus("pending");
    setInterviewProgress(0);
    setCurrentQuestion("");
    setUserResponse("");
    setFeedback(null);
    historyRef.current = [];
    setHistory([]);
    setExcelMessage(null);
  };

  // Map overall numeric score to Dreyfus skill acquisition levels
  const getDreyfusLevel = (score) => {
    if (score > 89) return 'Expert';
    if (score > 79) return 'Proficient';
    if (score > 69) return 'Competent';
    if (score > 59) return 'Advanced Beginner';
    if (score < 60) return 'Novice';
    return 'Beginner';
  };

  const getHiringRecommendation = (score) => {
    if (score >= 80) return 'Hire';
    if (score >= 60) return 'Consider';
    return 'Reject';
  };

  const formatDuration = (durationMs) => {
    if (!Number.isFinite(durationMs) || durationMs <= 0) return 'Not available';

    const totalSeconds = Math.round(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const getInterviewDuration = (completionDate = new Date()) => {
    if (!interviewStartedAtRef.current) return 'Not available';

    const startedAt = new Date(interviewStartedAtRef.current);
    return formatDuration(completionDate.getTime() - startedAt.getTime());
  };

  const formatListForExcel = (items, fallback = 'Not provided') => {
    if (Array.isArray(items)) {
      const filteredItems = items.map(item => String(item || '').trim()).filter(Boolean);
      return filteredItems.length ? filteredItems.join('\n') : fallback;
    }

    return items || fallback;
  };

  const formatQuestionEvaluationForExcel = (answers = []) => {
    if (!Array.isArray(answers) || answers.length === 0) return 'Not provided';

    return answers.map((answer, index) => {
      const questionNumber = answer.questionNumber || index + 1;
      const assessment = answer.assessment || 'Not assessed';
      const scoreText = answer.score === null || answer.score === undefined ? 'Needs review' : `${answer.score}%`;
      const answerFeedback = answer.feedback || 'No feedback provided';
      const missingConcepts = formatListForExcel(answer.missingConcepts, 'None listed');

      return [
        `Question ${questionNumber}: ${answer.question || 'Question text not available'}`,
        `Candidate Answer: ${answer.candidateAnswer || 'No response submitted'}`,
        `Assessment: ${assessment} (${scoreText})`,
        answer.expectedAnswer ? `Expected Answer / Rubric: ${answer.expectedAnswer}` : '',
        `Feedback: ${answerFeedback}`,
        `Missing Concepts: ${missingConcepts}`,
        answer.improvementSuggestion ? `Improvement Suggestion: ${answer.improvementSuggestion}` : ''
      ].filter(Boolean).join('\n');
    }).join('\n\n');
  };

  const getAssessmentStyles = (assessment = '') => {
    const label = normalizeAssessmentLabel(assessment);
    if (label === 'Correct') {
      return {
        panel: 'border-green-500 bg-green-50',
        badge: 'bg-green-200 text-green-800'
      };
    }
    if (label === 'Partially Correct') {
      return {
        panel: 'border-yellow-500 bg-yellow-50',
        badge: 'bg-yellow-200 text-yellow-800'
      };
    }
    if (label === 'Needs Review') {
      return {
        panel: 'border-blue-500 bg-blue-50',
        badge: 'bg-blue-200 text-blue-800'
      };
    }
    return {
      panel: 'border-red-500 bg-red-50',
      badge: 'bg-red-200 text-red-800'
    };
  };

  const getAssessmentStatus = () => {
    if (leaveCount > 0) return 'Completed - Review Required';
    if (feedback?.assessmentStatus) return feedback.assessmentStatus;
    return (feedback?.score || 0) >= 70 ? 'Completed - Passed' : 'Completed - Needs Improvement';
  };

  const getReportFileName = () => {
    const candidateName = String(data?.candidateName || data?.name || 'Candidate')
      .trim()
      .replace(/[^a-z0-9_-]+/gi, '_')
      .replace(/^_+|_+$/g, '') || 'Candidate';

    return `Interview_Assessment_${candidateName}_${Date.now()}.pdf`;
  };

  const getReportPdfOptions = (fileName) => ({
    margin: [10, 10, 10, 10],
    filename: fileName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
  });

  const generateAssessmentReportPdfBlob = async (fileName) => {
    if (!feedback || !assessmentReportRef.current) {
      throw new Error('Assessment report is not ready for PDF generation.');
    }

    return html2pdf()
      .set(getReportPdfOptions(fileName))
      .from(assessmentReportRef.current)
      .outputPdf('blob');
  };

  const getSaveAssessmentUrls = () => {
    if (apiBaseUrl) {
      return [`${apiBaseUrl}/api/save-assessment`];
    }

    const urls = ['/api/save-assessment'];

    if (typeof window !== 'undefined') {
      const { protocol, hostname } = window.location;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        urls.push(`${protocol}//${hostname}:5010/api/save-assessment`);
        urls.push(`${protocol}//${hostname}:5000/api/save-assessment`);
      }
    }

    return [...new Set(urls)];
  };

  const readSaveResponse = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (isJson) {
      return { body: await readJsonResponse(response, 'Save assessment response was not JSON'), isJson };
    }

    const text = await response.text();
    return {
      body: {
        error: text || response.statusText || `HTTP ${response.status}`
      },
      isJson
    };
  };

  const appendAssessmentFormFields = (formData, assessmentData) => {
    Object.entries(assessmentData).forEach(([key, value]) => {
      formData.append(key, value === null || value === undefined ? '' : value);
    });
  };

  const saveAssessmentViaApi = async (assessmentData, reportPdfBlob, reportFileName) => {
    const urls = getSaveAssessmentUrls();
    const failures = [];

    for (const url of urls) {
      try {
        const requestOptions = {
          method: 'POST'
        };

        if (reportPdfBlob) {
          const formData = new FormData();
          appendAssessmentFormFields(formData, assessmentData);
          formData.append('reportPdf', reportPdfBlob, reportFileName || 'Report.pdf');
          requestOptions.body = formData;
        } else {
          requestOptions.headers = {
            'Content-Type': 'application/json'
          };
          requestOptions.body = JSON.stringify(assessmentData);
        }

        const response = await fetch(url, requestOptions);
        const { body, isJson } = await readSaveResponse(response);

        if (!response.ok) {
          const message = body.details || body.error || `HTTP ${response.status}`;
          const error = new Error(message);
          error.stopFallback = isJson;
          throw error;
        }

        return body;
      } catch (error) {
        failures.push(`${url}: ${error.message}`);
        if (error.stopFallback) {
          throw error;
        }
      }
    }

    throw new Error(`Failed to save to Excel. ${failures.join(' | ')}`);
  };

  const formatAssessmentDate = (dateValue, fallbackDate) => {
    if (!dateValue) {
      const day = String(fallbackDate.getDate()).padStart(2, '0');
      const month = String(fallbackDate.getMonth() + 1).padStart(2, '0');
      const year = String(fallbackDate.getFullYear());
      return `${day}/${month}/${year}`;
    }

    const dateParts = String(dateValue).split('-');
    if (dateParts.length === 3) {
      const [year, month, day] = dateParts;
      return `${day}/${month}/${year}`;
    }

    return dateValue;
  };

  const formatAssessmentTime = (timeValue, fallbackDate) => {
    if (timeValue) return timeValue;

    const hours = String(fallbackDate.getHours()).padStart(2, '0');
    const minutes = String(fallbackDate.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const saveToExcel = async () => {
    if (!feedback) return;

    setIsSavingToExcel(true);
    setExcelMessage(null);

    try {
      const now = new Date();
      const completionTimestamp = feedback?.completedAt || interviewCompletedAtRef.current || now.toISOString();
      const reportFileName = getReportFileName();
      const reportPdfBlob = await generateAssessmentReportPdfBlob(reportFileName);

      const assessmentData = {
        personName: data?.candidateName || 'Unknown',
        assessmentName: data?.assessmentName || data?.customerProjectProfile?.projectName || data?.domain || data?.technology || 'Interview Assessment',
        customerName: data?.customerProjectProfile?.customerName || 'Not provided',
        projectName: data?.customerProjectProfile?.projectName || 'Not provided',
        date: formatAssessmentDate(data?.interviewDate, now),
        time: formatAssessmentTime(data?.interviewTime, now),
        technology: data?.technology || data?.domain || 'Not provided',
        roleLevel: data?.role || data?.roleLevel || 'Not provided',
        interviewDuration: feedback?.interviewDuration || getInterviewDuration(new Date(completionTimestamp)),
        finalMarks: feedback?.score || 0,
        overallRating: feedback?.overallRating || feedback?.level || getDreyfusLevel(feedback?.score || 0),
        assessmentSummary: feedback?.feedback || feedback?.recommendations || 'Assessment completed',
        strengths: formatListForExcel(feedback?.strengths),
        areasForImprovement: formatListForExcel(feedback?.areasToImprove),
        technicalFeedback: feedback?.technicalFeedback || `Accuracy: ${feedback?.accuracy ?? 'N/A'}%. ${feedback?.feedback || ''}`,
        communicationFeedback: feedback?.communicationFeedback || `Communication score: ${feedback?.communication ?? 'N/A'}.`,
        behavioralFeedback: feedback?.behavioralFeedback || `Confidence score: ${feedback?.confidence ?? 'N/A'}. Tab switches: ${leaveCount}. Time outside: ${totalTimeOutside} seconds.`,
        detailedQuestionEvaluation: formatQuestionEvaluationForExcel(feedback?.answers),
        aiRecommendations: feedback?.recommendations || 'Not provided',
        hiringRecommendation: feedback?.hiringRecommendation || getHiringRecommendation(feedback?.score || 0),
        assessmentStatus: getAssessmentStatus(),
        interviewCompletionTimestamp: completionTimestamp
      };

      console.log('📊 Saving assessment data to Excel:', assessmentData);

      const result = await saveAssessmentViaApi(assessmentData, reportPdfBlob, reportFileName);
      console.log('✅ Assessment saved to Excel successfully:', result);
      trackEvent('assessment_saved_to_excel', {
        assessment_name: assessmentData.assessmentName,
        final_marks: assessmentData.finalMarks,
        score: assessmentData.finalMarks,
        technology: assessmentData.technology,
        role: assessmentData.roleLevel,
        customer_profile_id: data?.customerProjectProfile?.id || '',
        customer_name: assessmentData.customerName,
        project_name: assessmentData.projectName,
        duration_seconds: getDurationSecondsFromFeedback(feedback)
      });
      setExcelMessageType('success');
      setExcelMessage(result.message || 'Assessment saved to Excel successfully.');
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setExcelMessage(null);
      }, 5000);
    } catch (error) {
      console.error('❌ Error saving assessment to Excel:', error);
      setExcelMessageType('error');
      setExcelMessage(`Excel update failed: ${error.message}`);
    } finally {
      setIsSavingToExcel(false);
    }
  };

  const downloadReport = async () => {
    if (!feedback || !assessmentReportRef.current) return;

    const reportFileName = getReportFileName();
    trackEvent('report_generated', {
      report_file_name: reportFileName,
      technology: data?.technology || data?.domain || 'unknown',
      role: data?.role || data?.roleLevel || 'unknown',
      customer_profile_id: data?.customerProjectProfile?.id || '',
      customer_name: data?.customerProjectProfile?.customerName || '',
      project_name: data?.customerProjectProfile?.projectName || '',
      score: feedback?.score || 0,
      duration_seconds: getDurationSecondsFromFeedback(feedback)
    });

    // Generate and download PDF from the rendered DOM
    html2pdf()
      .set(getReportPdfOptions(reportFileName))
      .from(assessmentReportRef.current)
      .save();
  };

  useEffect(() => {
    if (isRecording && audioVisualizerRef.current) {
      const canvas = audioVisualizerRef.current;
      const ctx = canvas.getContext('2d');
      let animationFrame;

      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barCount = 20;
        const barWidth = canvas.width / barCount - 2;

        for (let i = 0; i < barCount; i++) {
          const height = Math.random() * 50 + 5;
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(i * (barWidth + 2), canvas.height - height, barWidth, height);
        }

        animationFrame = requestAnimationFrame(animate);
      };

      animate();

      return () => {
        cancelAnimationFrame(animationFrame);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      };
    }
  }, [isRecording]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f1f0fc] via-[#eaeefa] to-[#e1edf9]">
      {/* Header */}
      <header className="bg-gradient-to-b from-[#4779f2] via-[#7747d5] to-[#5f32c6] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                AI Interview Agent
              </h1>
              <p className="text-white/90 mt-1">Practice your interview skills with AI-powered feedback</p>
            </div>
            {isInterviewActive && (
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-white/80">Progress</p>
                  <p className="text-lg font-semibold text-white">
                    {interviewProgress} / {questions.length}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isInterviewActive ? (
          // Start Screen
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 max-w-2xl w-full border border-gray-100">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-[#f1f0fc] via-[#eaeefa] to-[#e1edf9] mb-6">
                  <Play size={40} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">
                  Ready to Begin Your Interview?
                </h2>
                <p className="text-gray-600 text-lg">
                Our AI interviewer will ask you {questions.length || 10} questions about {data?.technology ? data.technology.replace('-', ' ').toUpperCase() : 'your expertise'}
                   and provide instant feedback on your responses.
                </p>
                {questionSourceMessage && (
                  <div className={`mt-5 rounded-xl border px-4 py-3 text-sm font-semibold ${
                    questionSourceMessage.startsWith('Using Admin-Approved')
                      ? 'border-green-200 bg-green-50 text-green-800'
                      : 'border-yellow-200 bg-yellow-50 text-yellow-800'
                  }`}>
                    {questionSourceMessage}
                  </div>
                )}
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
                  <p className="text-gray-700">Real-time voice or text responses</p>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
                  <p className="text-gray-700">Instant AI-powered feedback and scoring</p>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
                  <p className="text-gray-700">Detailed performance evaluation</p>
                </div>
              </div>

              <button 
                onClick={startInterview}
                disabled={isLoadingQuestions || questions.length === 0}
                className="w-full bg-[#5f1fbe] text-white py-4 rounded-xl hover:bg-[#4a1696] transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center text-lg font-semibold disabled:opacity-60 disabled:hover:scale-100"
              >
                <Play size={24} className="mr-2" />
                {isLoadingQuestions ? 'Preparing Questions...' : 'Start Interview'}
              </button>
            </div>
          </div>
        ) : isLoadingQuestions ? (
          // Loading Screen
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 max-w-2xl w-full border border-gray-100 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-6"></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Generating Interview Questions
              </h2>
              <p className="text-gray-600">
                Our AI is preparing personalized questions based on your profile...
              </p>
              {questionSourceMessage && (
                <p className="mt-4 text-sm font-semibold text-yellow-800">
                  {questionSourceMessage}
                </p>
              )}
            </div>
          </div>
        ) : interviewProgress < questions.length ? (
          // Active Interview
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Interview Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Question Card */}
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700">
                      Question {interviewProgress + 1}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                      questions[interviewProgress]?.type === 'objective' ? 'bg-blue-100 text-blue-700' :
                      questions[interviewProgress]?.type === 'logical' ? 'bg-purple-100 text-purple-700' :
                      questions[interviewProgress]?.type === 'theory' ? 'bg-green-100 text-green-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {questions[interviewProgress]?.type}
                    </span>
                  </div>
                  <button
                    onClick={() => speakText(currentQuestion)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Hear question"
                  >
                    <Play size={20} className="text-gray-600" />
                  </button>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 leading-relaxed mb-4">
                  {currentQuestion}
                </h3>
                
                {/* Display objective question options */}
                {questions[interviewProgress]?.type === 'objective' && questions[interviewProgress]?.options && (
                  <>
                    <div className="mb-6 space-y-3">
                      {questions[interviewProgress].options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => setUserResponse(option)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            userResponse === option
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center">
                            <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                              userResponse === option
                                ? 'border-indigo-500 bg-indigo-500'
                                : 'border-gray-400'
                            }`}>
                              {userResponse === option && (
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              )}
                            </div>
                            <span className="text-gray-900 font-medium">{option}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <p className="text-sm text-gray-600 mt-2">
                      Along with selecting the correct answer, please also type your explanation or use the voice response.
                    </p>
                  </>
                )}
                
                {/* Display coding snippet if present */}
                {questions[interviewProgress]?.context && questions[interviewProgress]?.type === 'coding' && (
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-gray-100 font-mono text-sm whitespace-pre-wrap break-words">
                      <code>{questions[interviewProgress].context}</code>
                    </pre>
                  </div>
                )}
              </div>

              {/* Response Section */}
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Your Response</h4>
                
                {/* Voice Recording */}
                <div className="mb-6">
                  <button
                    onClick={toggleRecording}
                    disabled={isRequestingMicrophone || microphonePermission === 'unsupported'}
                    className={`w-full py-6 rounded-xl font-semibold text-lg transition-all transform hover:scale-[1.02] ${
                      isRecording
                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
                        : microphonePermission === 'unsupported'
                          ? 'bg-gray-400 text-white shadow'
                        : 'bg-[#5f1fbe] hover:bg-[#4a1696] text-white shadow-lg'
                    }`}
                  >
                    {isRequestingMicrophone ? (
                      <div className="flex items-center justify-center">
                        <Mic size={24} className="mr-2 animate-pulse" />
                        Requesting Microphone Permission...
                      </div>
                    ) : isRecording ? (
                      <div className="flex items-center justify-center">
                        <MicOff size={24} className="mr-2 animate-pulse" />
                        Stop Recording
                      </div>
                    ) : microphonePermission === 'unsupported' ? (
                      <div className="flex items-center justify-center">
                        <MicOff size={24} className="mr-2" />
                        Voice Unavailable
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <Mic size={24} className="mr-2" />
                        Start Voice Response
                      </div>
                    )}
                  </button>
                  {!isRecording && microphonePermission !== 'granted' && (
                    <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-gray-700">
                      {microphonePermission === 'denied' || microphonePermission === 'unsupported'
                        ? 'Voice recording is optional. You can type your response below and submit it.'
                        : (
                          <>
                            Click <strong>Start Voice Response</strong> and choose <strong>Allow</strong> in the browser popup to enable your microphone.
                          </>
                        )}
                    </div>
                  )}
                  
                  {isRecording && (
                    <div className="mt-4">
                      <canvas
                        ref={audioVisualizerRef}
                        width="600"
                        height="60"
                        className="w-full rounded-lg bg-gray-50"
                      />
                    </div>
                  )}
                  {isTranscribing && (
                    <p className="mt-2 text-sm text-gray-600">Transcribing audio...</p>
                  )}
                  {sttError && (
                    <p className="mt-2 text-sm text-red-600">{sttError}</p>
                  )}
                </div>

                {/* Text Response */}
                <div className="mb-6">
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex-1 h-px bg-gray-300"></div>
                    <span className="px-4 text-gray-500 text-sm font-medium">OR</span>
                    <div className="flex-1 h-px bg-gray-300"></div>
                  </div>
                  
                  <textarea
                    value={userResponse}
                    onChange={(e) => setUserResponse(e.target.value)}
                    placeholder="Type your response here..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                    rows="6"
                  />
                </div>

                <button
                  onClick={submitTextResponse}
                  disabled={!userResponse.trim()}
                  className="w-full bg-[#5f1fbe] text-white py-4 rounded-xl hover:bg-[#4a1696] transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-semibold text-lg shadow-lg"
                >
                  Submit Response
                </button>
              </div>
            </div>

            {/* Progress Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 sticky top-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Progress Overview</h4>
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Completed</span>
                    <span>{Math.round((interviewProgress / questions.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#f1f0fc] via-[#eaeefa] to-[#e1edf9] transition-all duration-500"
                      style={{ width: `${(interviewProgress / questions.length) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="space-y-3 mt-6">
                  {questions.map((_, idx) => (
                    <div key={idx} className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                        idx < interviewProgress
                          ? 'bg-green-500 text-white'
                          : idx === interviewProgress
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {idx + 1}
                      </div>
                      <span className={`text-sm ${
                        idx <= interviewProgress ? 'text-gray-900 font-medium' : 'text-gray-500'
                      }`}>
                        Question {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : feedback ? (
          // Final Results with Comprehensive Feedback
          <div className="space-y-6" ref={assessmentReportRef}>
            {/* --- Navigation Away Warning Section (Additive) --- */}
            {leaveCount > 0 && (
              <div className="bg-red-100 border-l-8 border-red-500 rounded-xl shadow-lg p-6 mb-6">
                <h3 className="text-2xl font-bold text-red-700 mb-2 flex items-center">
                  <svg className="mr-2" width="28" height="28" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fee2e2"/><path d="M12 8v4m0 4h.01" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Candidate navigated away from the interview screen
                </h3>
                <p className="text-red-700 font-semibold mb-2">Candidate may have been involved in malpractice.</p>
                <div className="text-red-800 font-medium text-lg">
                  <span className="mr-6">Number of tab switches: <span className="font-bold">{leaveCount}</span></span>
                  <span>Total time spent outside: <span className="font-bold">{totalTimeOutside} seconds</span></span>
                </div>
              </div>
            )}
            {/* Header Section */}
            <div className="bg-gradient-to-r from-[#f1f0fc] via-[#eaeefa] to-[#e1edf9] text-gray-900 rounded-2xl shadow-xl p-12">
              <div className="text-center">
                <h2 className="text-4xl font-bold mb-2">Interview Assessment Report</h2>
                <p className="text-indigo-100 text-lg">Live Interview Bot (Round 2) - Skill Profile</p>
                {feedback.level && (
                  <div className="mt-6">
                    <span className="inline-flex items-center px-5 py-2 rounded-full bg-white text-[#5f1fbe] text-2xl font-extrabold shadow-lg tracking-wide">
                      {feedback.level} — Dreyfus Model
                    </span>
                  </div>
                )}
                {data?.customerProjectProfile && (
                  <div className="mt-5 text-gray-700 font-semibold">
                    Customer Context: {data.customerProjectProfile.customerName} • {data.customerProjectProfile.projectName}
                  </div>
                )}
              </div>
            </div>

              {/* Candidate Photo Card (image supplied from Capture Candidate Image screen) */}
              <div className="flex justify-end mb-6">
                <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100 flex items-center space-x-4">
                  {candidateImage ? (
                    <img src={candidateImage} alt="Candidate" className="w-24 h-24 rounded-full object-cover shadow" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-medium">No Photo</div>
                  )}

                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-gray-800">{data?.candidateName || data?.name || 'Candidate'}</div>
                    {/* <div className="text-sm text-gray-600">Use the Capture Candidate Image screen to take a photo. Remove Photo</div> */}
                  </div>
                </div>
              </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto">
              {/* Overall Score Card */}
              <div className="bg-white rounded-2xl shadow-xl p-12 border border-gray-100 mb-6">
                <div className="grid md:grid-cols-3 gap-8 mb-8">
                  {/* Overall Score */}
                  <div className="text-center">
                    <div className="text-6xl font-bold text-indigo-600 mb-4">{feedback.score}</div>
                    <div className="text-gray-600 font-semibold mb-4">Overall Score</div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          feedback.score >= 70
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500'
                        }`}
                        style={{ width: `${feedback.score}%` }}
                      />
                    </div>
                    <div className="mt-2 text-sm font-medium">
                      <span className={feedback.score >= 70 ? 'text-green-600' : 'text-amber-600'}>
                        {feedback.score >= 70 ? '✓ PASSED' : '⚠ NEEDS IMPROVEMENT'}
                      </span>
                    </div>
                  </div>

                  {/* Accuracy */}
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <div className="text-4xl font-bold text-blue-600 mb-2">{feedback.accuracy}%</div>
                    <div className="text-gray-700 font-semibold mb-3">Accuracy</div>
                    <div className="text-xs text-gray-600">Primary final marks</div>
                    <div className="w-full bg-gray-300 rounded-full h-2 mt-3 overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${feedback.accuracy}%` }}
                      />
                    </div>
                  </div>

                  {/* Confidence */}
                  <div className="text-center p-4 bg-purple-50 rounded-xl">
                    <div className="text-4xl font-bold text-purple-600 mb-2">{feedback.confidence}%</div>
                    <div className="text-gray-700 font-semibold mb-3">Confidence</div>
                    <div className="text-xs text-gray-600">Supporting signal</div>
                    <div className="w-full bg-gray-300 rounded-full h-2 mt-3 overflow-hidden">
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${feedback.confidence}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Communication */}
                <div className="text-center p-4 bg-emerald-50 rounded-xl">
                  <div className="text-4xl font-bold text-emerald-600 mb-2">{feedback.communication}%</div>
                  <div className="text-gray-700 font-semibold mb-3">Communication</div>
                  <div className="text-xs text-gray-600">Supporting signal</div>
                  <div className="w-full bg-gray-300 rounded-full h-2 mt-3 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${feedback.communication}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Overall Assessment */}
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Overall Assessment</h3>
                <p className="text-gray-700 leading-relaxed text-lg">
                  {feedback.feedback || 'Your interview performance has been assessed across multiple dimensions. Your responses demonstrate your current skill level and areas for professional development.'}
                </p>
              </div>

              {/* Detailed Feedback */}
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
                  <h3 className="text-lg font-bold text-blue-800 mb-3">Technical Feedback</h3>
                  <p className="text-gray-700 leading-relaxed text-sm">{feedback.technicalFeedback}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
                  <h3 className="text-lg font-bold text-emerald-800 mb-3">Communication Feedback</h3>
                  <p className="text-gray-700 leading-relaxed text-sm">{feedback.communicationFeedback}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
                  <h3 className="text-lg font-bold text-purple-800 mb-3">Behavioral Feedback</h3>
                  <p className="text-gray-700 leading-relaxed text-sm">{feedback.behavioralFeedback}</p>
                </div>
              </div>

              {/* Strengths and Growth Areas */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Strengths */}
                <div className="bg-white rounded-2xl shadow-lg p-8 border border-green-100">
                  <h3 className="text-xl font-bold text-green-700 mb-6 flex items-center">
                    <CheckCircle className="mr-2" size={24} />
                    Key Strengths
                  </h3>
                  <ul className="space-y-3">
                    {feedback.strengths && feedback.strengths.map((strength, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-green-600 font-bold mr-3 mt-1">✓</span>
                        <span className="text-gray-700 font-medium">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Growth Areas */}
                <div className="bg-white rounded-2xl shadow-lg p-8 border border-amber-100">
                  <h3 className="text-xl font-bold text-amber-700 mb-6 flex items-center">
                    <XCircle className="mr-2" size={24} />
                    Areas for Growth
                  </h3>
                  <ul className="space-y-3">
                    {feedback.areasToImprove && feedback.areasToImprove.map((area, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-amber-600 font-bold mr-3 mt-1">→</span>
                        <span className="text-gray-700 font-medium">{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Question-by-Question Analysis */}
              {feedback.answers && feedback.answers.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Detailed Question Analysis</h3>
                  <div className="space-y-4">
                    {feedback.answers.map((answer, idx) => {
                      const styles = getAssessmentStyles(answer.assessment);
                      const scoreText = answer.score === null || answer.score === undefined ? 'Needs review' : `${answer.score}%`;

                      return (
                        <div
                          key={idx}
                          className={`p-5 rounded-lg border-l-4 ${styles.panel}`}
                        >
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div>
                              <span className="font-bold text-gray-900">Question {answer.questionNumber}</span>
                              <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                {getQuestionTypeLabel(answer.questionType)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-gray-700 border border-gray-200">
                                Score: {scoreText}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles.badge}`}>
                                {answer.assessment}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3 text-sm">
                            <div>
                              <p className="font-semibold text-gray-900 mb-1">Question</p>
                              <p className="text-gray-700 whitespace-pre-wrap">{answer.question}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 mb-1">Candidate Answer</p>
                              <p className="text-gray-700 whitespace-pre-wrap">{answer.candidateAnswer || 'No response submitted'}</p>
                            </div>
                            {answer.expectedAnswer && (
                              <div>
                                <p className="font-semibold text-gray-900 mb-1">Expected Answer / Rubric</p>
                                <p className="text-gray-700 whitespace-pre-wrap">{answer.expectedAnswer}</p>
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-900 mb-1">Feedback</p>
                              <p className="text-gray-700 whitespace-pre-wrap">{answer.feedback}</p>
                            </div>
                            {answer.missingConcepts && answer.missingConcepts.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-900 mb-1">Missing Concepts</p>
                                <ul className="list-disc pl-5 text-gray-700 space-y-1">
                                  {answer.missingConcepts.map((concept, conceptIndex) => (
                                    <li key={conceptIndex}>{concept}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {answer.improvementSuggestion && (
                              <div>
                                <p className="font-semibold text-gray-900 mb-1">Improvement Suggestion</p>
                                <p className="text-gray-700 whitespace-pre-wrap">{answer.improvementSuggestion}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {feedback.recommendations && (
                <div className="bg-gradient-to-r from-[#e6f6ff] to-[#f1e9ff] rounded-2xl shadow-lg p-8 border border-indigo-200 mb-6">
                  <h3 className="text-2xl font-bold text-indigo-900 mb-4">Recommendations & Next Steps</h3>
                  <p className="text-gray-800 leading-relaxed text-lg">{feedback.recommendations}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center flex-wrap">
                <button
                  onClick={downloadReport}
                  className="bg-[#5f1fbe] text-white py-4 px-8 rounded-xl hover:bg-[#4a1696] transition-all transform hover:scale-[1.02] font-semibold text-lg shadow-lg flex items-center"
                >
                  <Download size={24} className="mr-2" />
                  Download Report
                </button>
                <button
                  onClick={saveToExcel}
                  disabled={isSavingToExcel}
                  className="bg-[#5f1fbe] text-white py-4 px-8 rounded-xl hover:bg-[#4a1696] transition-all transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none font-semibold text-lg shadow-lg flex items-center"
                >
                  <Save size={24} className="mr-2" />
                  Save to Excel
                </button>
                <button
                  onClick={resetInterview}
                  className="bg-[#5f1fbe] text-white py-4 px-8 rounded-xl hover:bg-[#4a1696] transition-all transform hover:scale-[1.02] font-semibold text-lg shadow-lg flex items-center"
                >
                  <RefreshCw size={24} className="mr-2" />
                  Start New Interview
                </button>
              </div>
              {excelMessage && (
                <div
                  className={`mt-4 rounded-xl border px-5 py-4 text-center font-semibold ${
                    excelMessageType === 'success'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {excelMessage}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Loading Evaluation
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 max-w-2xl w-full border border-gray-100 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-6"></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Evaluating Your Performance
              </h2>
              <p className="text-gray-600">
                Our AI is analyzing your responses with OpenAI validation...
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-12 pb-8 text-center text-gray-500 text-sm">
        © 2026 AI Interview Agent - Powered by HCLTech
      </footer>
      
    </div>
  );
}
