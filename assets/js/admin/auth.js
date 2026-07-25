async function showLoggedOut() {
      elements.loginSection.hidden = false;
      elements.adminSection.hidden = true;
      elements.logoutButton.hidden = true;
      elements.sessionEmail.textContent = 'Не выполнен вход';
      if (state.channel) {
        await state.client.removeChannel(state.channel);
        state.channel = null;
      }
    }

    async function showLoggedIn(user) {
      const isAdmin = await verifyAdmin();
      if (!isAdmin) {
        await state.client.auth.signOut();
        await showLoggedOut();
        showNotice('Этот аккаунт не добавлен в таблицу site_admins.', 'error', true);
        return;
      }
      elements.loginSection.hidden = true;
      elements.adminSection.hidden = false;
      elements.logoutButton.hidden = false;
      elements.sessionEmail.textContent = user.email || 'Администратор';
      await loadGames();
      if (!state.channel) {
        state.channel = state.client
          .channel('cr7-games-admin-v2')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, async () => {
            try { await loadGames(); } catch (error) { console.error(error); }
          })
          .subscribe();
      }
    }

    async function boot() {
      state.client = getConfiguredClient();
      if (!state.client) {
        elements.configError.hidden = false;
        return;
      }
      const { data, error } = await state.client.auth.getSession();
      if (error) {
        showNotice(error.message, 'error', true);
        await showLoggedOut();
        return;
      }
      if (data.session?.user) {
        try { await showLoggedIn(data.session.user); }
        catch (err) { console.error(err); showNotice(err.message || 'Ошибка проверки доступа.', 'error', true); }
      } else {
        await showLoggedOut();
      }
    }
