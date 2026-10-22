// Événements d'ouverture/fermeture du menu latéral
    const openMenu = document.getElementById('openMenu');
    const closeMenu = document.getElementById('closeMenu');
    const navDrawer = document.getElementById('navDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');

    function toggleMenu() {
      navDrawer.classList.toggle('active');
      drawerOverlay.classList.toggle('active');
    }

    openMenu.addEventListener('click', toggleMenu);
    closeMenu.addEventListener('click', toggleMenu);
    drawerOverlay.addEventListener('click', toggleMenu);

    // Synchronise les chiffres du hero avec les changements de l'application admin.
    const experienceStat = document.querySelector('.hero-stat:nth-child(1) strong');
    const projectsStat = document.querySelector('.hero-stat:nth-child(2) strong');
    async function refreshPortfolioStats() {
      try {
        const response = await fetch('/api/portfolio-stats');
        if (!response.ok) return;
        const stats = await response.json();
        if (experienceStat) experienceStat.textContent = `${stats.experience_years}+`;
        if (projectsStat) projectsStat.textContent = `${stats.projects_count}+`;
      } catch {
        // Les valeurs rendues par Flask restent visibles si l'API est indisponible.
      }
    }
    refreshPortfolioStats();
    window.setInterval(refreshPortfolioStats, 2000);

    // Interaction envoi du prompt Assistant IA
    const sendBtn = document.getElementById('sendBtn');
    const userInput = document.getElementById('userInput');
    const chatContainer = document.getElementById('chatContainer');

    function handleSend() {
      const text = userInput.value.trim();
      if (!text) return;

      const userBubble = document.createElement('div');
      userBubble.className = 'chat-bubble user';
      userBubble.textContent = text;
      chatContainer.appendChild(userBubble);
      userInput.value = '';
      chatContainer.scrollTop = chatContainer.scrollHeight;

      setTimeout(() => {
        const botBubble = document.createElement('div');
        botBubble.className = 'chat-bubble bot';
        botBubble.textContent = "Bien reçu ! Je suis à votre disposition.";
        chatContainer.appendChild(botBubble);
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 500);
    }

    sendBtn.addEventListener('click', handleSend);
    userInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSend();
    });
