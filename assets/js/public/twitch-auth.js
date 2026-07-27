(() => {
  'use strict';

  const button = document.getElementById('twitchLoginButton');
  const label = document.getElementById('twitchLoginLabel');
  const avatar = document.getElementById('twitchLoginAvatar');
  if (!button || !label || !avatar || typeof getConfiguredClient !== 'function') return;
  const client = getConfiguredClient();
  if (!client) return;
  const twitchLogo = './assets/images/twitch-logo.webp';
  let twitchSession = null;

  function isTwitchUser(user) {
    const providers = user?.app_metadata?.providers || [];
    return user?.app_metadata?.provider === 'twitch' || providers.includes('twitch');
  }

  function getDisplayName(user) {
    const metadata = user?.user_metadata || {};
    return metadata.preferred_username || metadata.user_name || metadata.name || metadata.full_name || 'Twitch';
  }

  function setBusy(busy) {
    button.disabled = busy;
    button.classList.toggle('is-loading',busy);
    if (busy) label.textContent = 'Подключение…';
  }

  function renderSession(session) {
    const user = session?.user;
    twitchSession = user && isTwitchUser(user) ? session : null;
    button.classList.toggle('is-authenticated',Boolean(twitchSession));
    button.classList.remove('is-error');
    if (!twitchSession) {
      label.textContent = 'Войти через Twitch';
      avatar.src = twitchLogo;
      avatar.alt = '';
      button.setAttribute('aria-label','Войти через Twitch');
      button.title = 'Войти через Twitch';
      return;
    }

    const name = getDisplayName(user);
    const avatarUrl = String(user.user_metadata?.avatar_url || user.user_metadata?.picture || '');
    label.textContent = name;
    avatar.src = avatarUrl.startsWith('https://') ? avatarUrl : twitchLogo;
    avatar.alt = '';
    avatar.onerror = () => { avatar.onerror = null; avatar.src = twitchLogo; };
    button.setAttribute('aria-label',`${name}: выйти из Twitch`);
    button.title = 'Выйти из Twitch';
  }

  async function signIn() {
    const path = window.location.pathname.endsWith('/')
      ? window.location.pathname
      : window.location.pathname.slice(0,window.location.pathname.lastIndexOf('/') + 1);
    const redirectTo = new URL(path,window.location.origin).toString();
    const { error } = await client.auth.signInWithOAuth({
      provider: 'twitch',
      options: { redirectTo,scopes: 'user:read:email' }
    });
    if (error) throw error;
  }

  button.addEventListener('click',async () => {
    setBusy(true);
    try {
      if (twitchSession) await client.auth.signOut();
      else await signIn();
    } catch (error) {
      console.error(error);
      button.classList.add('is-error');
      label.textContent = 'Ошибка входа';
      button.title = error.message || 'Не удалось выполнить вход через Twitch';
      window.setTimeout(() => renderSession(twitchSession),3000);
    } finally {
      setBusy(false);
    }
  });

  client.auth.onAuthStateChange((_event,session) => renderSession(session));
  client.auth.getSession().then(({ data,error }) => {
    if (error) console.error(error);
    renderSession(data?.session || null);
  });
})();
