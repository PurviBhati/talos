import OpenAI from 'openai';

let runtimeApiKey = '';
let runtimeModel = '';
let cachedClient = null;
let cachedKey = '';

function sanitize(value) {
  return String(value || '').trim();
}

export function getOpenAIKey() {
  return sanitize(runtimeApiKey) || sanitize(process.env.OPENAI_API_KEY);
}

export function getOpenAIModel() {
  return sanitize(runtimeModel) || sanitize(process.env.OPENAI_MODEL) || 'gpt-4o';
}

export function getOpenAIClient() {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  if (!cachedClient || cachedKey !== apiKey) {
    cachedClient = new OpenAI({ apiKey });
    cachedKey = apiKey;
  }
  return cachedClient;
}

export function setRuntimeAIConfig({ apiKey, model } = {}) {
  if (apiKey !== undefined) {
    runtimeApiKey = sanitize(apiKey);
    // Force rebuild on next getOpenAIClient()
    cachedClient = null;
    cachedKey = '';
  }
  if (model !== undefined) {
    runtimeModel = sanitize(model);
  }
}

export function clearRuntimeAIConfig() {
  runtimeApiKey = '';
  runtimeModel = '';
  cachedClient = null;
  cachedKey = '';
}

function maskKey(key) {
  if (!key) return '';
  if (key.length <= 8) return '********';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export function getRuntimeAIConfigSummary() {
  const envKey = sanitize(process.env.OPENAI_API_KEY);
  const effectiveKey = getOpenAIKey();
  return {
    model: getOpenAIModel(),
    keySource: sanitize(runtimeApiKey) ? 'runtime' : 'env',
    hasKey: !!effectiveKey,
    maskedKey: maskKey(effectiveKey),
    usingDefaultModel: !sanitize(runtimeModel) && !sanitize(process.env.OPENAI_MODEL),
    envKeyPresent: !!envKey,
  };
}
