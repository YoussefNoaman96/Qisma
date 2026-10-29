const baseUrl = '/api';
let refreshPromise;

export class ApiError extends Error {
  constructor(status, code, fields = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function hasSessionCookie() {
  return document.cookie.split('; ').some((value) => value.startsWith('csrf_token='));
}

function csrfToken() {
  return (
    document.cookie
      .split('; ')
      .find((value) => value.startsWith('csrf_token='))
      ?.slice('csrf_token='.length) || ''
  );
}

async function send(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      credentials: 'include',
      signal,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(['GET', 'HEAD'].includes(method) ? {} : { 'X-CSRF-Token': csrfToken() }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR');
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const unavailable =
      [502, 503, 504].includes(response.status) ||
      (import.meta.env.DEV && response.status >= 500 && data === null);
    throw new ApiError(
      response.status,
      data?.error?.code || (unavailable ? 'API_UNAVAILABLE' : 'SERVER_ERROR'),
      data?.error?.fields,
    );
  }
  return data;
}

async function refresh() {
  if (!refreshPromise) {
    const run = async () => {
      try {
        return await send('/auth/refresh', { method: 'POST', body: {} });
      } catch (error) {
        if (error.code !== 'REFRESH_RETRY') throw error;
        // Another tab may have just rotated the shared cookie. Retry using its current value.
        await new Promise((resolve) => setTimeout(resolve, 100));
        return send('/auth/refresh', { method: 'POST', body: {} });
      }
    };
    refreshPromise = (
      navigator.locks ? navigator.locks.request('expense-session-refresh', run) : run()
    )
      .catch((error) => {
        if (error.status === 401) window.dispatchEvent(new Event('auth:expired'));
        throw error;
      })
      .finally(() => {
        refreshPromise = undefined;
      });
  }
  return refreshPromise;
}

export async function api(path, options = {}) {
  try {
    return await send(path, options);
  } catch (error) {
    if (error.status !== 401 || options.retryAuth === false || !hasSessionCookie()) throw error;
    await refresh();
    return send(path, options);
  }
}
