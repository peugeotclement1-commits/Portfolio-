// Événements d'ouverture/fermeture du menu latéral
    const openMenu = document.getElementById('openMenu');
    const closeMenu = document.getElementById('closeMenu');
    const navDrawer = document.getElementById('navDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');

    function toggleMenu() {
      const isOpen = navDrawer.classList.toggle('active');
      drawerOverlay.classList.toggle('active', isOpen);
      document.documentElement.classList.toggle('menu-open', isOpen);
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

    // Envoie les questions au chatbot du portfolio.
    const chatForm = document.getElementById('chatForm');
    const sendBtn = document.getElementById('sendBtn');
    const userInput = document.getElementById('userInput');
    const chatContainer = document.getElementById('chatContainer');

    if (chatForm && sendBtn && userInput && chatContainer) {
      chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const text = userInput.value.trim();
        if (!text || sendBtn.disabled) return;

        const userBubble = document.createElement('div');
        userBubble.className = 'chat-bubble user';
        userBubble.textContent = text;
        chatContainer.appendChild(userBubble);
        userInput.value = '';

        const pendingBubble = document.createElement('div');
        pendingBubble.className = 'chat-bubble bot pending';
        pendingBubble.textContent = 'Je réfléchis…';
        chatContainer.appendChild(pendingBubble);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        sendBtn.disabled = true;

        try {
          const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: text })
          });
          const data = await response.json();
          pendingBubble.textContent = data.response || 'Je n’ai pas pu générer de réponse.';
        } catch {
          pendingBubble.textContent = 'Impossible de contacter l’assistant pour le moment.';
        } finally {
          pendingBubble.classList.remove('pending');
          sendBtn.disabled = false;
          chatContainer.scrollTop = chatContainer.scrollHeight;
          userInput.focus();
        }
      });
    }

    const projectCards = Array.from(document.querySelectorAll('.project-card'));
    const projectFilters = document.querySelectorAll('[data-project-filter]');
    const projectCount = document.getElementById('projectCount');
    const filterEmpty = document.getElementById('projectsFilterEmpty');
    const themePatterns = {
      automations: /\b(automation|automations|automatisation|automatisations|workflow|workflows|n8n|zapier|make\.com)\b/,
      web: /\b(web|website|websites|site|sites|html|css|javascript|react|vue|flask|django|wordpress|frontend|backend|api)\b/,
      data: /\b(data|donnee|donnees|database|databases|sql|mongodb|postgresql|mysql|analytics|etl|json|power bi)\b/,
      app: /\b(app|application|applications|mobile|flutter|android|ios|electron|desktop)\b/
    };

    function normalizeProjectText(text) {
      return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    function filterProjects(theme) {
      let visibleCount = 0;
      projectCards.forEach((card) => {
        const searchableText = normalizeProjectText(
          Array.from(card.querySelectorAll('.project-name, .project-desc, .project-tags'))
            .map((element) => element.textContent)
            .join(' ')
        );
        const isVisible = theme === 'all' || themePatterns[theme].test(searchableText);
        card.hidden = !isVisible;
        if (isVisible) visibleCount += 1;
      });

      projectFilters.forEach((button) => {
        const isActive = button.dataset.projectFilter === theme;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });

      if (projectCount) {
        projectCount.textContent = `${visibleCount} projet${visibleCount === 1 ? '' : 's'} affiché${visibleCount === 1 ? '' : 's'}`;
      }
      if (filterEmpty) filterEmpty.hidden = visibleCount > 0 || projectCards.length === 0;
    }

    projectFilters.forEach((button) => {
      button.addEventListener('click', () => filterProjects(button.dataset.projectFilter));
    });
