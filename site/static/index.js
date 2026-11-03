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

    // ==========================================
    // CAROUSEL DES TECHNOLOGIES (AUTO-SCROLL & INTERACTIF)
    // ==========================================
    function initTechCarousel() {
      const container = document.getElementById('carouselContainer');
      const track = document.getElementById('carouselTrack');
      const prevBtn = document.getElementById('carouselPrev');
      const nextBtn = document.getElementById('carouselNext');

      if (!container || !track) return;

      let currentTranslate = 0;
      let isDown = false;
      let startX = 0;
      let lastX = 0;
      let velocity = 0;
      let isHovered = false;
      let dragDistance = 0;
      const clickThreshold = 5;
      const friction = 0.92;
      const baseAutoSpeed = -0.65; // Défilement continu vers la gauche

      function getHalfWidth() {
        return track.scrollWidth / 2;
      }

      function updateLoop() {
        const halfWidth = getHalfWidth();

        if (!isDown) {
          const hasActiveItem = track.querySelector('.carousel-item.is-active-tech') !== null;

          if (Math.abs(velocity) > 0.1) {
            velocity *= friction;
            currentTranslate += velocity;
          } else {
            velocity = 0;
            // Défilement automatique si pas de survol et aucun élément cliqué
            if (!isHovered && !hasActiveItem) {
              currentTranslate += baseAutoSpeed;
            }
          }

          // Boucle infinie transparente dans les 2 sens
          if (halfWidth > 0) {
            while (currentTranslate > 0) {
              currentTranslate -= halfWidth;
            }
            while (currentTranslate < -halfWidth) {
              currentTranslate += halfWidth;
            }
          }

          track.style.transform = `translateX(${currentTranslate}px)`;
        }

        requestAnimationFrame(updateLoop);
      }

      function applyDragTransform() {
        const halfWidth = getHalfWidth();
        if (halfWidth > 0) {
          while (currentTranslate > 0) {
            currentTranslate -= halfWidth;
            startX -= halfWidth;
          }
          while (currentTranslate < -halfWidth) {
            currentTranslate += halfWidth;
            startX += halfWidth;
          }
        }
        track.style.transform = `translateX(${currentTranslate}px)`;
      }

      function onPointerDown(pageX) {
        isDown = true;
        container.classList.add('is-dragging');
        startX = pageX - currentTranslate;
        lastX = pageX;
        dragDistance = 0;
        velocity = 0;
      }

      function onPointerMove(pageX) {
        if (!isDown) return;
        const x = pageX - startX;
        velocity = pageX - lastX;
        lastX = pageX;
        dragDistance += Math.abs(velocity);
        currentTranslate = x;
        applyDragTransform();
      }

      function onPointerUp(e, pageX) {
        if (!isDown) return;
        isDown = false;
        container.classList.remove('is-dragging');

        // Clic sans déplacement = sélection / dépliage de la carte
        if (dragDistance < clickThreshold && e) {
          const clickedItem = e.target.closest('.carousel-item');
          if (clickedItem) {
            const wasActive = clickedItem.classList.contains('is-active-tech');
            track.querySelectorAll('.carousel-item').forEach(el => el.classList.remove('is-active-tech'));
            if (!wasActive) {
              clickedItem.classList.add('is-active-tech');
            }
          }
        }
      }

      // Événements Souris
      container.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onPointerDown(e.pageX);
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        onPointerMove(e.pageX);
      });

      window.addEventListener('mouseup', (e) => {
        if (!isDown) return;
        onPointerUp(e, e.pageX);
      });

      container.addEventListener('mouseenter', () => {
        isHovered = true;
      });

      container.addEventListener('mouseleave', () => {
        isHovered = false;
      });

      // Événements Tactiles
      container.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length === 1) {
          onPointerDown(e.touches[0].pageX);
        }
      }, { passive: true });

      container.addEventListener('touchmove', (e) => {
        if (isDown && e.touches && e.touches.length === 1) {
          onPointerMove(e.touches[0].pageX);
        }
      }, { passive: true });

      container.addEventListener('touchend', (e) => {
        const pageX = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].pageX : lastX;
        onPointerUp(e, pageX);
      });

      // Contrôles des poignées latérales (Boutons flèches)
      let holdTimer = null;

      function pushCarousel(direction) {
        track.querySelectorAll('.carousel-item').forEach(el => el.classList.remove('is-active-tech'));
        velocity += direction * 15;
        velocity = Math.max(-30, Math.min(30, velocity));
      }

      if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          pushCarousel(1); // Défile vers la droite (items précédents)
        });
        prevBtn.addEventListener('mousedown', () => {
          holdTimer = setInterval(() => pushCarousel(1), 80);
        });
        prevBtn.addEventListener('mouseup', () => clearInterval(holdTimer));
        prevBtn.addEventListener('mouseleave', () => clearInterval(holdTimer));
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          pushCarousel(-1); // Défile vers la gauche (items suivants)
        });
        nextBtn.addEventListener('mousedown', () => {
          holdTimer = setInterval(() => pushCarousel(-1), 80);
        });
        nextBtn.addEventListener('mouseup', () => clearInterval(holdTimer));
        nextBtn.addEventListener('mouseleave', () => clearInterval(holdTimer));
      }

      // Lancement immédiat de la boucle d'animation
      requestAnimationFrame(updateLoop);
    }

    initTechCarousel();

    // ==========================================
    // FORMULAIRE DE CONTACT & POPUP DE CONFIRMATION
    // ==========================================
    const contactForm = document.getElementById('contact-form');
    const customPopup = document.getElementById('custom-popup');
    const closePopupBtn = document.getElementById('close-popup');

    if (contactForm && customPopup) {
      contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const res = await fetch('/envoi', {
            method: 'POST',
            body: new FormData(contactForm)
          });
          if (res.ok) {
            customPopup.classList.add('active');
            contactForm.reset();
          } else {
            alert("Erreur lors de l'envoi du message.");
          }
        } catch {
          alert("Impossible d'envoyer le message pour le moment.");
        }
      });
    }

    if (closePopupBtn && customPopup) {
      closePopupBtn.addEventListener('click', () => {
        customPopup.classList.remove('active');
      });
      customPopup.addEventListener('click', (e) => {
        if (e.target === customPopup) {
          customPopup.classList.remove('active');
        }
      });
    }
