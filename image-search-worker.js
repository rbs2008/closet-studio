const APP_ORIGIN = 'https://rbs2008.github.io';
const MAX_IMAGE_BASE64_LENGTH = 5500000;
const MAX_CANDIDATES = 8;
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
let cachedAuthorization = null;
let accessTokenExpiresAt = 0;

function responseHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff'
  };
}

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(origin) });
}

function secureUrl(value) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname ? url.href : '';
  } catch {
    return '';
  }
}

function cleanTitle(value) {
  return typeof value === 'string'
    ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
    : '';
}

function base64UrlEncode(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodePrivateKey(privateKey) {
  const encoded = privateKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const binary = atob(encoded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function getAccessToken(serviceAccountJson) {
  if (cachedAuthorization && accessTokenExpiresAt > Date.now() + 60000) return cachedAuthorization;

  const serviceAccount = JSON.parse(serviceAccountJson);
  if (!serviceAccount.project_id
    || !serviceAccount.client_email
    || !serviceAccount.private_key
    || serviceAccount.token_uri !== 'https://oauth2.googleapis.com/token') {
    throw new Error('Invalid Google service-account configuration.');
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const assertionHeader = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const assertionClaims = base64UrlEncode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: GOOGLE_SCOPE,
    aud: serviceAccount.token_uri,
    iat: issuedAt,
    exp: issuedAt + 3600
  }));
  const unsignedAssertion = `${assertionHeader}.${assertionClaims}`;
  const signingKey = await crypto.subtle.importKey(
    'pkcs8',
    decodePrivateKey(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    signingKey,
    new TextEncoder().encode(unsignedAssertion)
  );
  const assertion = `${unsignedAssertion}.${base64UrlEncode(signature)}`;
  const tokenResponse = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  if (!tokenResponse.ok) throw new Error('Google OAuth token request failed.');
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token || !Number.isFinite(tokenData.expires_in)) {
    throw new Error('Google OAuth returned an invalid token response.');
  }
  cachedAuthorization = {
    accessToken: tokenData.access_token,
    projectId: serviceAccount.project_id
  };
  accessTokenExpiresAt = Date.now() + tokenData.expires_in * 1000;
  return cachedAuthorization;
}

function buildCandidates(webDetection) {
  const candidates = [];
  const seen = new Set();
  const fallbackTitle = cleanTitle(webDetection.bestGuessLabels?.[0]?.label)
    || cleanTitle(webDetection.webEntities?.[0]?.description)
    || 'Possible clothing match';

  function add(imageUrl, title, sourceUrl) {
    const safeImageUrl = secureUrl(imageUrl);
    if (!safeImageUrl || seen.has(safeImageUrl) || candidates.length >= MAX_CANDIDATES) return;
    seen.add(safeImageUrl);
    candidates.push({
      imageUrl: safeImageUrl,
      title: cleanTitle(title) || fallbackTitle,
      sourceUrl: secureUrl(sourceUrl)
    });
  }

  for (const page of webDetection.pagesWithMatchingImages || []) {
    const title = cleanTitle(page.pageTitle) || fallbackTitle;
    const sourceUrl = page.url;
    for (const image of [...(page.fullMatchingImages || []), ...(page.partialMatchingImages || [])]) {
      add(image.url, title, sourceUrl);
    }
  }

  for (const image of [
    ...(webDetection.fullMatchingImages || []),
    ...(webDetection.partialMatchingImages || []),
    ...(webDetection.visuallySimilarImages || [])
  ]) {
    add(image.url, fallbackTitle, '');
  }

  return candidates;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (origin !== APP_ORIGIN) return new Response('Forbidden', { status: 403 });

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: responseHeaders(origin) });
    }

    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/search') {
      return jsonResponse({ error: 'Use POST /search.' }, 405, origin);
    }

    if (!env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return jsonResponse({ error: 'Image search is not configured yet.' }, 503, origin);
    }

    const contentLength = Number(request.headers.get('Content-Length') || 0);
    if (contentLength > MAX_IMAGE_BASE64_LENGTH + 1000) {
      return jsonResponse({ error: 'The image is too large to search.' }, 413, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Send a valid JSON image request.' }, 400, origin);
    }

    if (typeof body.image !== 'string'
      || body.image.length === 0
      || body.image.length > MAX_IMAGE_BASE64_LENGTH
      || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.image)) {
      return jsonResponse({ error: 'Send a valid, resized image.' }, 400, origin);
    }

    let authorization;
    try {
      authorization = await getAccessToken(env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch {
      return jsonResponse({ error: 'Google image search authentication failed. Check the Worker secret.' }, 502, origin);
    }

    let providerResponse;
    try {
      providerResponse = await fetch('https://vision.googleapis.com/v1/images:annotate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authorization.accessToken}`,
          'X-Goog-User-Project': authorization.projectId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [{
            image: { content: body.image },
            features: [{ type: 'WEB_DETECTION', maxResults: MAX_CANDIDATES }]
          }]
        })
      });
    } catch {
      return jsonResponse({ error: 'Google image search could not be reached. Try again.' }, 502, origin);
    }

    let providerData;
    try {
      providerData = await providerResponse.json();
    } catch {
      return jsonResponse({ error: 'Google image search returned an invalid response.' }, 502, origin);
    }

    const annotation = providerData.responses?.[0];
    if (!providerResponse.ok || annotation?.error) {
      return jsonResponse({
        error: 'Google image search failed. Check the Vision API setup and try again.'
      }, 502, origin);
    }

    return jsonResponse({
      candidates: buildCandidates(annotation?.webDetection || {})
    }, 200, origin);
  }
};
