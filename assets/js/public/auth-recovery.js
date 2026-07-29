(() => {
  'use strict';

  const expiredAuthPattern = /(?:jwt|token|session).*(?:expired|invalid|missing)|(?:expired|invalid).*(?:jwt|token|session)|refresh[_ ]token/i;

  function isExpiredAuthError(error) {
    if (!error) return false;
    const details = [
      error.code,
      error.status,
      error.name,
      error.message,
      error.details,
      error.hint
    ].filter(Boolean).join(' ');
    return Number(error.status) === 401 || expiredAuthPattern.test(details);
  }

  async function clearStaleSession(client) {
    if (!client?.auth) return;
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error && !isExpiredAuthError(error)) {
        console.warn('Не удалось локально очистить сессию Supabase:', error.message || error);
      }
    } catch (error) {
      if (!isExpiredAuthError(error)) {
        console.warn('Не удалось локально очистить сессию Supabase:', error?.message || error);
      }
    }
  }

  async function getUsableSession(client) {
    if (!client?.auth) return { data: { session: null }, error: null, recovered: false };

    let current;
    try {
      current = await client.auth.getSession();
    } catch (error) {
      if (!isExpiredAuthError(error)) return { data: { session: null }, error, recovered: false };
      await clearStaleSession(client);
      return { data: { session: null }, error: null, recovered: true };
    }

    if (current.error) {
      if (!isExpiredAuthError(current.error)) return { ...current, recovered: false };
      await clearStaleSession(client);
      return { data: { session: null }, error: null, recovered: true };
    }

    const session = current.data?.session || null;
    const expiresAt = Number(session?.expires_at || 0) * 1000;
    if (!session || !expiresAt || expiresAt > Date.now() + 30000) {
      return { data: { session }, error: null, recovered: false };
    }

    try {
      const refreshed = await client.auth.refreshSession();
      if (!refreshed.error && refreshed.data?.session) {
        return { data: { session: refreshed.data.session }, error: null, recovered: false };
      }
      if (!isExpiredAuthError(refreshed.error)) return { ...refreshed, recovered: false };
    } catch (error) {
      if (!isExpiredAuthError(error)) return { data: { session: null }, error, recovered: false };
    }

    await clearStaleSession(client);
    return { data: { session: null }, error: null, recovered: true };
  }

  async function runPublicRequest(client, operation) {
    let result = await operation();
    if (!isExpiredAuthError(result?.error)) return result;
    await clearStaleSession(client);
    result = await operation();
    return result;
  }

  window.CR7_AUTH = Object.freeze({
    clearStaleSession,
    getUsableSession,
    isExpiredAuthError,
    runPublicRequest
  });
})();
