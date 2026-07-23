'use strict';

    const elements = {
      grid: document.getElementById('gameGrid'),
      search: document.getElementById('searchInput'),
      subtitle: document.getElementById('catalogSubtitle'),
      statusDot: document.getElementById('statusDot'),
      statusText: document.getElementById('statusText'),
      totalCount: document.getElementById('totalCount'),
      upcomingCount: document.getElementById('upcomingCount'),
      nearestDate: document.getElementById('nearestDate'),
      nextRelease: document.getElementById('nextRelease'),
      nextLabel: document.getElementById('nextLabel'),
      nextTitle: document.getElementById('nextTitle'),
      nextDateText: document.getElementById('nextDateText'),
      nextCountdown: document.getElementById('nextCountdown'),
      nextCoop: document.getElementById('nextCoop'),
      heroHighlights: document.getElementById('heroHighlights'),
      quickLatest: document.getElementById('quickLatest'),
      quickNearest: document.getElementById('quickNearest'),
      quickCoop: document.getElementById('quickCoop'),
      modal: document.getElementById('gameModal'),
      modalClose: document.getElementById('modalClose'),
      modalMedia: document.getElementById('modalMedia'),
      modalBadges: document.getElementById('modalBadges'),
      modalTitle: document.getElementById('modalTitle'),
      modalRelease: document.getElementById('modalRelease'),
      modalDescription: document.getElementById('modalDescription'),
      modalCommentSection: document.getElementById('modalCommentSection'),
      modalComment: document.getElementById('modalComment'),
      modalAdded: document.getElementById('modalAdded'),
      modalSteam: document.getElementById('modalSteam'),
      filters: [...document.querySelectorAll('[data-filter]')]
    };

    const state = { games: [], query: '', filter: 'all', channel: null, activeGameId: null };
    const TWITCH_LOGO_DATA = './assets/images/twitch-logo.webp';
    let lastFocusedElement = null;
