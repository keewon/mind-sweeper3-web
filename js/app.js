(function () {
  const btnBack = document.getElementById('btn-back');
  const btnRestart = document.getElementById('btn-restart');
  const btnHelp = document.getElementById('btn-help');
  const btnHelpBack = document.getElementById('btn-help-back');
  const btnMenuHelp = document.getElementById('btn-menu-help');
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const themeLabel = document.getElementById('theme-label');
  const langSelect = document.getElementById('lang-select');

  let game = new Game();
  let ui = new GameUI(game);
  let currentMode = 'normal';

  // Language
  const supportedLangs = ['en', 'ja', 'fr', 'zh', 'es', 'vi', 'ko'];
  function detectLang() {
    for (const pref of navigator.languages || [navigator.language]) {
      const code = pref.split('-')[0].toLowerCase();
      if (supportedLangs.includes(code)) return code;
    }
    return 'en';
  }
  const savedLang = localStorage.getItem('ms3-lang') || detectLang();
  langSelect.value = savedLang;
  setLang(savedLang);

  langSelect.addEventListener('change', () => {
    setLang(langSelect.value);
    updateThemeLabel();
  });

  // Theme
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ms3-theme', theme);
    updateThemeLabel();
  }

  function updateThemeLabel() {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    if (theme === 'light') {
      themeIcon.textContent = '☀️';
      themeLabel.textContent = t('themeLight');
    } else {
      themeIcon.textContent = '🌙';
      themeLabel.textContent = t('themeDark');
    }
  }

  const savedTheme = localStorage.getItem('ms3-theme') || 'dark';
  applyTheme(savedTheme);

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  // Screen navigation
  let previousScreen = 'game-screen';

  const screenFocusTarget = {
    'menu-screen': 'menu-title',
    'game-screen': 'btn-back',
    'help-screen': 'btn-help-back',
  };

  function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    const targetId = screenFocusTarget[screenId];
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) el.focus();
    }
  }

  function startGame(mode) {
    currentMode = mode;
    showScreen('game-screen');
    requestAnimationFrame(() => {
      ui.startGame(mode);
    });
  }

  // Mode selection
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      startGame(btn.dataset.mode);
    });
  });

  // Back to menu
  btnBack.addEventListener('click', () => {
    ui.destroy();
    showScreen('menu-screen');
  });

  // Restart
  btnRestart.addEventListener('click', () => {
    startGame(currentMode);
  });

  // Help
  btnHelp.addEventListener('click', () => {
    previousScreen = 'game-screen';
    showScreen('help-screen');
  });

  btnMenuHelp.addEventListener('click', () => {
    previousScreen = 'menu-screen';
    showScreen('help-screen');
  });

  btnHelpBack.addEventListener('click', () => {
    showScreen(previousScreen);
  });

})();
