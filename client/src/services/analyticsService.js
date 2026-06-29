const analyticsConfigEndpoint = '/api/public-config';
const apiBaseUrl = process.env.REACT_APP_API_URL || '';
const localAnalyticsEndpoint = `${apiBaseUrl}/api/analytics/event`;

let initPromise = null;
let measurementId = null;
let initialized = false;

const getClientEnvMeasurementId = () => (
  process.env.REACT_APP_GA4_MEASUREMENT_ID ||
  process.env.REACT_APP_GA_MEASUREMENT_ID ||
  ''
);

const loadAnalyticsConfig = async () => {
  const clientEnvMeasurementId = getClientEnvMeasurementId();
  if (clientEnvMeasurementId) {
    return clientEnvMeasurementId;
  }

  const response = await fetch(analyticsConfigEndpoint);
  if (!response.ok) {
    throw new Error(`Analytics config failed with HTTP ${response.status}`);
  }

  const config = await response.json();
  return config?.googleAnalytics?.measurementId || '';
};

const ensureGtagScript = (id) => {
  const scriptId = 'google-analytics-gtag';
  if (document.getElementById(scriptId)) return;

  const script = document.createElement('script');
  script.id = scriptId;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
};

const postLocalAnalyticsEvent = async (eventName, parameters = {}) => {
  try {
    await fetch(localAnalyticsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        eventName,
        params: {
          ...parameters,
          page_path: parameters.page_path || window.location.pathname,
          page_location: parameters.page_location || window.location.href
        }
      }),
      keepalive: true
    });
  } catch (error) {
    console.warn('Local analytics event capture failed:', error);
  }
};

export const initGoogleAnalytics = async () => {
  if (initialized) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      measurementId = await loadAnalyticsConfig();
      if (!measurementId) {
        console.info('Google Analytics is disabled: GA4 measurement ID is not configured.');
        return false;
      }

      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function gtag() {
        window.dataLayer.push(arguments);
      };

      ensureGtagScript(measurementId);
      window.gtag('js', new Date());
      window.gtag('config', measurementId, { send_page_view: false });

      initialized = true;
      return true;
    } catch (error) {
      console.warn('Google Analytics initialization failed:', error);
      return false;
    }
  })();

  return initPromise;
};

export const trackPageView = async ({ path, title } = {}) => {
  postLocalAnalyticsEvent('page_view', {
    page_path: path || window.location.pathname,
    page_title: title || document.title,
    page_location: window.location.href
  });

  const isReady = await initGoogleAnalytics();
  if (!isReady || !window.gtag) return;

  window.gtag('event', 'page_view', {
    page_path: path || window.location.pathname,
    page_title: title || document.title,
    page_location: window.location.href
  });
};

export const trackEvent = async (eventName, parameters = {}) => {
  if (!eventName) return;

  postLocalAnalyticsEvent(eventName, parameters);

  const isReady = await initGoogleAnalytics();
  if (!isReady || !window.gtag) return;

  window.gtag('event', eventName, parameters);
};
