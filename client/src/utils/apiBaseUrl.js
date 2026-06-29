export function getApiBaseUrl() {
  return String(process.env.REACT_APP_API_URL || "").trim().replace(/\/+$/, "");
}

export function buildApiUrl(path, options = {}) {
  const normalizedPath = String(path || "").startsWith("/") ? path : `/${path}`;
  const baseUrl = options.sameOrigin ? "" : getApiBaseUrl();
  return `${baseUrl}${normalizedPath}`;
}
