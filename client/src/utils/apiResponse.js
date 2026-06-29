export async function readJsonResponse(response, fallbackMessage = "Unexpected server response") {
  const rawText = await response.text();
  let body = {};

  if (rawText) {
    try {
      body = JSON.parse(rawText);
    } catch (error) {
      const preview = rawText.trim().slice(0, 180);
      throw new Error(preview ? `${fallbackMessage}: ${preview}` : fallbackMessage);
    }
  } else if (!response.ok) {
    throw new Error(`${fallbackMessage}: HTTP ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(body.error || body.message || `${fallbackMessage}: HTTP ${response.status}`);
  }

  return body;
}
