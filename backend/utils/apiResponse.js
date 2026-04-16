export function ok(res, data = null, options = {}) {
  const {
    status = 200,
    meta = undefined,
    message = undefined,
  } = options;

  return res.status(status).json({
    success: true,
    data,
    ...(message ? { message } : {}),
    ...(meta ? { meta } : {}),
  });
}

export function fail(res, status, error, options = {}) {
  const {
    code = undefined,
    details = undefined,
    meta = undefined,
  } = options;

  return res.status(status).json({
    success: false,
    error,
    ...(code ? { code } : {}),
    ...(details ? { details } : {}),
    ...(meta ? { meta } : {}),
  });
}

export async function parseJsonResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    const message = data?.error || data?.message || `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data?.data ?? data;
}
