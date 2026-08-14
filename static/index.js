document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // SECTION 1 : HERO & TERMINAL CANVAS (IA)
    // ==========================================

    // --- SÉLECTEURS DOM ---
    const container = document.getElementById('canvas-container');
    const heroContent = document.querySelector('.hero-content');
    const stackTags = document.querySelector('.stack-tags');
    const scrollCue = document.querySelector('.scroll-cue');
    if (!container) return;

    // --- INSTANCIATION CANVAS ---
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    container.appendChild(canvas);

    // --- VARIABLES D'ANIMATION DE ZOOM & MODES ---
    let scale = 1.6;                  
    let initialTargetScale = 3.2;     
    let interactiveTargetScale = 5.0; 
    let currentTargetScale = initialTargetScale;
    let isZooming = true;             
    let isInteractiveMode = false;

    // --- VARIABLES DU TERMINAL & INTERACTION DE SCROLL ---
    let userPrompt = "";
    let aiResponseLines = ["System: Terminal initialise. Pret pour le prompt..."];
    let isWaitingForAI = false;
    
    // Systèmes de scroll indépendants
    let aiScrollOffset = 0;
    let aiMaxScroll = 0;
    let promptScrollOffset = 0;
    let promptMaxScroll = 0;

    // Gestion du Drag-and-Drop des scrollbars
    let isDraggingAIBar = false;
    let isDraggingPromptBar = false;
    let dragStartY = 0;
    let dragStartOffset = 0;

    const maxCharsPerLine = 40; 

    // --- VARIABLES POUR MACHINE À ÉCRIRE CADENCÉE (SUBSTRING) ---
    let currentRawAIResponse = ""; 
    let typingCharIndex = 0;       
    let isTypingActive = false;    
    let lastCharTime = 0;          // Stocke le timestamp du dernier caractère écrit
    const typingSpeed = 30;        // Temps en millisecondes entre chaque lettre (ex: 30ms)

    // Écran d'accueil passif
    const codeLines = [
        '// --- SYSTEM STATUS ---',
        '# ROOTKIT TERMINAL ACTIVE',
        '# CLIQUEZ POUR DISCUTER...'
    ];
    let currentLine = 0;
    let currentChar = 0;
    let displayedLines = [];
    const baseLineHeight = 7; 

    // Bouton EXIT Redesigné Néon
    let exitBtnArea = { x: 0, y: 0, w: 22, h: 8 }; 
    let isHoveringExit = false;

    // Déclaration des zones géométriques globales pour l'interaction souris
    let aiScrollbarArea = { x: 0, y: 0, w: 3, h: 0 };
    let promptScrollbarArea = { x: 0, y: 0, w: 3, h: 0 };

    // --- FONCTIONS SYSTÈME ---
    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = container.clientWidth * dpr;
        canvas.height = container.clientHeight * dpr;
        canvas.style.width = container.clientWidth + 'px';
        canvas.style.height = container.clientHeight + 'px';
        ctx.scale(dpr, dpr);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    setTimeout(() => {
        if (heroContent) heroContent.classList.add('active');
        if (stackTags) stackTags.classList.add('active');
        if (scrollCue) scrollCue.classList.add('active');
    }, 800);

    function wrapTextToArray(text, limit) {
        if (!text) return [];
        const words = text.split(' ');
        let currentLineText = "";
        let linesArray = [];

        words.forEach(word => {
            if ((currentLineText + word).length > limit) {
                if (currentLineText.trim() !== "") linesArray.push(currentLineText.trim());
                currentLineText = word + " ";
            } else {
                currentLineText += word + " ";
            }
        });
        if (currentLineText.trim() !== "") linesArray.push(currentLineText.trim());
        return linesArray;
    }

    // --- ÉCOUTEURS D'ÉVÉNEMENTS (SOURIS & INTERACTION) ---

    canvas.addEventListener('mousedown', (e) => {
        if (!isInteractiveMode) return;

        const width = container.clientWidth;
        const height = container.clientHeight;
        const transformedX = (e.offsetX - width / 2) / scale + width / 2;
        const transformedY = (e.offsetY - height / 2) / scale + height / 2;

        if (aiMaxScroll > 0 && transformedX >= aiScrollbarArea.x && transformedX <= aiScrollbarArea.x + aiScrollbarArea.w &&
            transformedY >= aiScrollbarArea.y && transformedY <= aiScrollbarArea.y + aiScrollbarArea.h) {
            isDraggingAIBar = true;
            dragStartY = e.clientY;
            dragStartOffset = aiScrollOffset;
            e.preventDefault();
            return;
        }

        if (promptMaxScroll > 0 && transformedX >= promptScrollbarArea.x && transformedX <= promptScrollbarArea.x + promptScrollbarArea.w &&
            transformedY >= promptScrollbarArea.y && transformedY <= promptScrollbarArea.y + promptScrollbarArea.h) {
            isDraggingPromptBar = true;
            dragStartY = e.clientY;
            dragStartOffset = promptScrollOffset;
            e.preventDefault();
            return;
        }
    });
    // ==========================================================================
    // LOGIQUE DU CAROUSEL AUTOMATIQUE AVEC CONTRÔLE MANUEL & ACCORDÉON
    // ==========================================================================
    const track = document.getElementById('carouselTrack');
    const slider = document.querySelector('.carousel-container');

    if (track && slider) {
        let isDown = false;
        let startX;
        let velocity = 0;
        let lastX = 0;
        let animationId = null;
        let currentTranslate = 0;
        
        let dragThreshold = 5; 
        let startMouseX = 0;
        let startMouseY = 0;

        const friction = 0.92; 
        
        // --- NOUVEAU : Configuration de l'auto-défilement lent ---
        // -0.4 fait défiler lentement vers la gauche. Passe à 0.4 si tu veux aller vers la droite.
        const autoScrollSpeed = -0.4; 

        const getLoopWidth = () => {
            return track.scrollWidth / 2;
        };

        const handleStart = (e) => {
            isDown = true;
            slider.classList.add('active');
            const pageX = e.pageX || e.touches[0].pageX;
            const pageY = e.pageY || e.touches[0].pageY;
            
            startX = pageX - currentTranslate;
            lastX = pageX;
            
            startMouseX = pageX;
            startMouseY = pageY;
            
            velocity = 0;
            cancelAnimationFrame(animationId);
        };

        const handleLeaveAndUp = (e) => {
            if (!isDown) return;
            isDown = false;
            slider.classList.remove('active');
            
            const pageX = e.pageX || (e.changedTouches ? e.changedTouches[0].pageX : 0);
            const pageY = e.pageY || (e.changedTouches ? e.changedTouches[0].pageY : 0);
            
            const moveDistX = Math.abs(pageX - startMouseX);
            const moveDistY = Math.abs(pageY - startMouseY);

            if (moveDistX < dragThreshold && moveDistY < dragThreshold) {
                const clickedItem = e.target.closest('.clickable-item');
                if (clickedItem) {
                    toggleTechDescription(clickedItem);
                }
            }
            
            // Relance systématique de la boucle (gère l'inertie OU l'auto-scroll direct)
            requestAnimationFrame(updateLoop);
        };

        const handleMove = (e) => {
            if (!isDown) return;
            e.preventDefault();
            
            const pageX = e.pageX || e.touches[0].pageX;
            const x = pageX - startX;
            
            velocity = pageX - lastX;
            lastX = pageX;

            currentTranslate = x;
            applyTransform();
        };

        const applyTransform = () => {
            const halfWidth = getLoopWidth();
            if (currentTranslate > 0) {
                currentTranslate = -halfWidth;
                startX = lastX - currentTranslate;
            } else if (currentTranslate < -halfWidth) {
                currentTranslate = 0;
                startX = lastX - currentTranslate;
            }
            track.style.transform = `translateX(${currentTranslate}px)`;
        };
    // Boucle unifiée gérant l'inertie, l'auto-scroll et la pause sur élément actif
        const updateLoop = () => {
            if (isDown) return; // Stoppe tout mouvement pendant le drag manuel

            // OPTIONNEL : Si un élément est actif (ouvert), on met l'auto-défilement en pause
            const hasActiveItem = document.querySelector('.carousel-item.is-active-tech') !== null;

            if (Math.abs(velocity) > 0.1) {
                velocity *= friction;
                currentTranslate += velocity;
            } else if (!hasActiveItem) {
                // L'auto-défilement ne s'applique que si AUCUN élément n'est cliqué/ouvert
                currentTranslate += autoScrollSpeed;
            }

            applyTransform();
            animationId = requestAnimationFrame(updateLoop);
        };

        const toggleTechDescription = (item) => {
            const isAlreadyActive = item.classList.contains('is-active-tech');

            document.querySelectorAll('.clickable-item').forEach(el => {
                el.classList.remove('is-active-tech');
            });

            if (!isAlreadyActive) {
                item.classList.add('is-active-tech');
            }
        };

        // Événements Souris
        slider.addEventListener('mousedown', handleStart);
        slider.addEventListener('mouseleave', handleLeaveAndUp);
        slider.addEventListener('mouseup', handleLeaveAndUp);
        slider.addEventListener('mousemove', handleMove);

        // Événements Tactiles
        slider.addEventListener('touchstart', handleStart);
        slider.addEventListener('touchend', handleLeaveAndUp);
        slider.addEventListener('touchmove', handleMove);

        // --- NOUVEAU : Lance l'auto-défilement immédiatement au chargement de la page ---
        requestAnimationFrame(updateLoop);
    }

    window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const width = container.clientWidth;
        const height = container.clientHeight;
        const centerX = width / 2;
        const centerY = height / 2;

        if (isDraggingAIBar) {
            const deltaY = (e.clientY - dragStartY) / scale; 
            const ratio = deltaY / aiScrollbarArea.h;
            aiScrollOffset = Math.max(0, Math.min(aiMaxScroll, dragStartOffset + ratio * aiMaxScroll * 2));
            return;
        }

        if (isDraggingPromptBar) {
            const deltaY = (e.clientY - dragStartY) / scale;
            const ratio = deltaY / promptScrollbarArea.h;
            promptScrollOffset = Math.max(0, Math.min(promptMaxScroll, dragStartOffset + ratio * promptMaxScroll * 2));
            return;
        }

        const transformedX = (mouseX - centerX) / scale + centerX;
        const transformedY = (mouseY - centerY) / scale + centerY;

        if (isInteractiveMode) {
            if (aiMaxScroll > 0 && transformedX >= aiScrollbarArea.x && transformedX <= aiScrollbarArea.x + aiScrollbarArea.w &&
                transformedY >= aiScrollbarArea.y && transformedY <= aiScrollbarArea.y + aiScrollbarArea.h) {
                canvas.style.cursor = 'pointer';
            } 
            else if (promptMaxScroll > 0 && transformedX >= promptScrollbarArea.x && transformedX <= promptScrollbarArea.x + promptScrollbarArea.w &&
                     transformedY >= promptScrollbarArea.y && transformedY <= promptScrollbarArea.y + promptScrollbarArea.h) {
                canvas.style.cursor = 'pointer';
            }
            else if (transformedX >= exitBtnArea.x && transformedX <= exitBtnArea.x + exitBtnArea.w &&
                transformedY >= exitBtnArea.y && transformedY <= exitBtnArea.y + exitBtnArea.h) {
                isHoveringExit = true;
                canvas.style.cursor = 'pointer';
            } else {
                isHoveringExit = false;
                canvas.style.cursor = 'text';
            }
        } else {
            const pcLeft = centerX - 120 * scale;
            const pcRight = centerX + 120 * scale;
            const pcTop = centerY - 77.5 * scale;
            const pcBottom = centerY + 77.5 * scale;

            if (mouseX >= pcLeft && mouseX <= pcRight && mouseY >= pcTop && mouseY <= pcBottom) {
                canvas.style.cursor = 'pointer';
            } else {
                canvas.style.cursor = 'default';
            }
        }
    });

    window.addEventListener('mouseup', () => {
        isDraggingAIBar = false;
        isDraggingPromptBar = false;
    });

    canvas.addEventListener('click', (e) => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        const centerX = width / 2;
        const centerY = height / 2;

        if (isInteractiveMode) {
            const transformedX = (e.offsetX - centerX) / scale + centerX;
            const transformedY = (e.offsetY - centerY) / scale + centerY;

            if (transformedX >= exitBtnArea.x && transformedX <= exitBtnArea.x + exitBtnArea.w &&
                transformedY >= exitBtnArea.y && transformedY <= exitBtnArea.y + exitBtnArea.h) {
                
                isInteractiveMode = false;
                container.classList.remove('fullscreen');
                
                if (heroContent) { heroContent.classList.remove('fade-out'); heroContent.classList.add('active'); }
                if (stackTags) { stackTags.classList.remove('fade-out'); stackTags.classList.add('active'); }
                if (scrollCue) { scrollCue.classList.remove('fade-out'); scrollCue.classList.add('active'); }

                currentTargetScale = initialTargetScale;
                isZooming = true;
                userPrompt = "";
                aiScrollOffset = 0;
                promptScrollOffset = 0;
                
                isTypingActive = false;
                currentRawAIResponse = "";
                aiResponseLines = ["System: Terminal initialise. Pret pour le prompt..."];
                return;
            }
        } else {
            const pcLeft = centerX - 120 * scale;
            const pcRight = centerX + 120 * scale;
            const pcTop = centerY - 77.5 * scale;
            const pcBottom = centerY + 77.5 * scale;

            if (e.offsetX >= pcLeft && e.offsetX <= pcRight && e.offsetY >= pcTop && e.offsetY <= pcBottom) {
                isInteractiveMode = true;
                container.classList.add('fullscreen');

                if (heroContent) { heroContent.classList.remove('active'); heroContent.classList.add('fade-out'); }
                if (stackTags) { stackTags.classList.remove('active'); stackTags.classList.add('fade-out'); }
                if (scrollCue) { scrollCue.classList.remove('active'); scrollCue.classList.add('fade-out'); }

                currentTargetScale = interactiveTargetScale;
                isZooming = true;
            }
        }
    });

    canvas.addEventListener('wheel', (e) => {
        if (!isInteractiveMode) return;
        e.preventDefault(); 

        const width = container.clientWidth;
        const height = container.clientHeight;
        const transformedY = (e.offsetY - height / 2) / scale + height / 2;
        
        const displayY = (height / 2 - 75) + 8;
        const displayHeight = 150 - 16;
        const midPointY = displayY + (displayHeight / 2);

        if (transformedY < midPointY) {
            if (aiMaxScroll > 0) {
                aiScrollOffset = Math.max(0, Math.min(aiMaxScroll, aiScrollOffset + (e.deltaY > 0 ? 5 : -5)));
            }
        } else {
            if (promptMaxScroll > 0) {
                promptScrollOffset = Math.max(0, Math.min(promptMaxScroll, promptScrollOffset + (e.deltaY > 0 ? 4 : -4)));
            }
        }
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
        if (!isInteractiveMode || isWaitingForAI || isTypingActive) return;

        if (e.key === ' ') {
            e.preventDefault(); 
            userPrompt += ' ';
            return;document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================================
    // 1. CONFIGURATION & VARIABLES GLOBALES
    // ==========================================================================

    // --- Sélecteurs Dom ---
    const container = document.getElementById('canvas-container');
    const heroContent = document.querySelector('.hero-content');
    const stackTags = document.querySelector('.stack-tags');
    const scrollCue = document.querySelector('.scroll-cue');
    
    // Sécurité : Si le conteneur principal n'existe pas, on stoppe le script
    if (!container) return;

    // --- Instanciation Canvas ---
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    container.appendChild(canvas);

    // --- Variables de Zoom Lerp & Modes ---
    let scale = 1.6;                  
    let initialTargetScale = 3.2;     
    let interactiveTargetScale = 5.0; 
    let currentTargetScale = initialTargetScale;
    let isZooming = true;             
    let isInteractiveMode = false;

    // --- Variables d'Interaction du Terminal ---
    let userPrompt = "";
    let aiResponseLines = ["System: Terminal initialise. Pret pour le prompt..."];
    let isWaitingForAI = false;
    const maxCharsPerLine = 40; 
    
    // --- Systèmes de Scroll Indépendants ---
    let aiScrollOffset = 0;
    let aiMaxScroll = 0;
    let promptScrollOffset = 0;
    let promptMaxScroll = 0;

    // --- Gestion du Drag-and-Drop des Scrollbars ---
    let isDraggingAIBar = false;
    let isDraggingPromptBar = false;
    let dragStartY = 0;
    let dragStartOffset = 0;

    // --- Machine à Écrire Cadencée (Substring) ---
    let currentRawAIResponse = ""; 
    let typingCharIndex = 0;       
    let isTypingActive = false;    
    let lastCharTime = 0;          // Timestamp du dernier caractère écrit
    const typingSpeed = 30;        // Vitesse d'écriture (ms par lettre)

    // --- Écran d'Accueil Passif (Châssis PC) ---
    const codeLines = [
        '// --- SYSTEM STATUS ---',
        '# ROOTKIT TERMINAL ACTIVE',
        '# CLIQUEZ POUR DISCUTER...'
    ];
    let currentLine = 0;
    let currentChar = 0;
    let displayedLines = [];
    const baseLineHeight = 7; 

    // --- Zones Géométriques Globales (Interaction Souris) ---
    let exitBtnArea = { x: 0, y: 0, w: 22, h: 8 }; 
    let isHoveringExit = false;
    let aiScrollbarArea = { x: 0, y: 0, w: 3, h: 0 };
    let promptScrollbarArea = { x: 0, y: 0, w: 3, h: 0 };


    // ==========================================================================
    // 2. FONCTIONS OUTILS (UTILITIES)
    // ==========================================================================

    /**
     * Gère la mise à l'échelle du Canvas pour éviter le flou sur les écrans Retina/HD
     */
    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = container.clientWidth * dpr;
        canvas.height = container.clientHeight * dpr;
        canvas.style.width = container.clientWidth + 'px';
        canvas.style.height = container.clientHeight + 'px';
        ctx.scale(dpr, dpr);
    }
    
    // Initialisation et liaison à l'événement de redimensionnement
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    /**
     * Découpe un texte long en plusieurs lignes selon une limite de caractères
     */
    function wrapTextToArray(text, limit) {
        if (!text) return [];
        const words = text.split(' ');
        let currentLineText = "";
        let linesArray = [];

        words.forEach(word => {
            if ((currentLineText + word).length > limit) {
                if (currentLineText.trim() !== "") linesArray.push(currentLineText.trim());
                currentLineText = word + " ";
            } else {
                currentLineText += word + " ";
            }
        });
        if (currentLineText.trim() !== "") linesArray.push(currentLineText.trim());
        return linesArray;
    }

    // Déclenchement de l'apparition des éléments du Hero au chargement initial
    setTimeout(() => {
        if (heroContent) heroContent.classList.add('active');
        if (stackTags) stackTags.classList.add('active');
        if (scrollCue) scrollCue.classList.add('active');
    }, 800);


    // ==========================================================================
    // 3. ÉCOUTEURS D'ÉVÉNEMENTS (SOURIS, SCROLL & CLAVIER)
    // ==========================================================================

    // --- Clic Souris enfoncé (Mousedown) ---
    canvas.addEventListener('mousedown', (e) => {
        if (!isInteractiveMode) return;

        const width = container.clientWidth;
        const height = container.clientHeight;
        const transformedX = (e.offsetX - width / 2) / scale + width / 2;
        const transformedY = (e.offsetY - height / 2) / scale + height / 2;

        // Détection clic sur barre de défilement IA
        if (aiMaxScroll > 0 && transformedX >= aiScrollbarArea.x && transformedX <= aiScrollbarArea.x + aiScrollbarArea.w &&
            transformedY >= aiScrollbarArea.y && transformedY <= aiScrollbarArea.y + aiScrollbarArea.h) {
            isDraggingAIBar = true;
            dragStartY = e.clientY;
            dragStartOffset = aiScrollOffset;
            e.preventDefault();
            return;
        }

        // Détection clic sur barre de défilement Prompt
        if (promptMaxScroll > 0 && transformedX >= promptScrollbarArea.x && transformedX <= promptScrollbarArea.x + promptScrollbarArea.w &&
            transformedY >= promptScrollbarArea.y && transformedY <= promptScrollbarArea.y + promptScrollbarArea.h) {
            isDraggingPromptBar = true;
            dragStartY = e.clientY;
            dragStartOffset = promptScrollOffset;
            e.preventDefault();
            return;
        }
    });

    // --- Mouvement Souris (Mousemove) ---
    window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const width = container.clientWidth;
        const height = container.clientHeight;
        const centerX = width / 2;
        const centerY = height / 2;

        // Gestion du drag scroll de la barre IA
        if (isDraggingAIBar) {
            const deltaY = (e.clientY - dragStartY) / scale; 
            const ratio = deltaY / aiScrollbarArea.h;
            aiScrollOffset = Math.max(0, Math.min(aiMaxScroll, dragStartOffset + ratio * aiMaxScroll * 2));
            return;
        }

        // Gestion du drag scroll de la barre Prompt
        if (isDraggingPromptBar) {
            const deltaY = (e.clientY - dragStartY) / scale;
            const ratio = deltaY / promptScrollbarArea.h;
            promptScrollOffset = Math.max(0, Math.min(promptMaxScroll, dragStartOffset + ratio * promptMaxScroll * 2));
            return;
        }

        const transformedX = (mouseX - centerX) / scale + centerX;
        const transformedY = (mouseY - centerY) / scale + centerY;

        // Changement de curseurs selon le survol des zones interactives
        if (isInteractiveMode) {
            if (aiMaxScroll > 0 && transformedX >= aiScrollbarArea.x && transformedX <= aiScrollbarArea.x + aiScrollbarArea.w &&
                transformedY >= aiScrollbarArea.y && transformedY <= aiScrollbarArea.y + aiScrollbarArea.h) {
                canvas.style.cursor = 'pointer';
            } 
            else if (promptMaxScroll > 0 && transformedX >= promptScrollbarArea.x && transformedX <= promptScrollbarArea.x + promptScrollbarArea.w &&
                     transformedY >= promptScrollbarArea.y && transformedY <= promptScrollbarArea.y + promptScrollbarArea.h) {
                canvas.style.cursor = 'pointer';
            }
            else if (transformedX >= exitBtnArea.x && transformedX <= exitBtnArea.x + exitBtnArea.w &&
                transformedY >= exitBtnArea.y && transformedY <= exitBtnArea.y + exitBtnArea.h) {
                isHoveringExit = true;
                canvas.style.cursor = 'pointer';
            } else {
                isHoveringExit = false;
                canvas.style.cursor = 'text';
            }
        } else {
            // Zone de détection du PC sur l'écran d'accueil
            const pcLeft = centerX - 120 * scale;
            const pcRight = centerX + 120 * scale;
            const pcTop = centerY - 77.5 * scale;
            const pcBottom = centerY + 77.5 * scale;

            if (mouseX >= pcLeft && mouseX <= pcRight && mouseY >= pcTop && mouseY <= pcBottom) {
                canvas.style.cursor = 'pointer';
            } else {
                canvas.style.cursor = 'default';
            }
        }
    });

    // --- Relâchement Souris (Mouseup) ---
    window.addEventListener('mouseup', () => {
        isDraggingAIBar = false;
        isDraggingPromptBar = false;
    });

    // --- Clic Souris complet (Click) ---
    canvas.addEventListener('click', (e) => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        const centerX = width / 2;
        const centerY = height / 2;

        if (isInteractiveMode) {
            const transformedX = (e.offsetX - centerX) / scale + centerX;
            const transformedY = (e.offsetY - centerY) / scale + centerY;

            // Détection clic sur bouton EXIT : Réinitialisation et mode normal
            if (transformedX >= exitBtnArea.x && transformedX <= exitBtnArea.x + exitBtnArea.w &&
                transformedY >= exitBtnArea.y && transformedY <= exitBtnArea.y + exitBtnArea.h) {
                
                isInteractiveMode = false;
                container.classList.remove('fullscreen');
                
                if (heroContent) { heroContent.classList.remove('fade-out'); heroContent.classList.add('active'); }
                if (stackTags) { stackTags.classList.remove('fade-out'); stackTags.classList.add('active'); }
                if (scrollCue) { scrollCue.classList.remove('fade-out'); scrollCue.classList.add('active'); }

                currentTargetScale = initialTargetScale;
                isZooming = true;
                userPrompt = "";
                aiScrollOffset = 0;
                promptScrollOffset = 0;
                
                isTypingActive = false;
                currentRawAIResponse = "";
                aiResponseLines = ["System: Terminal initialise. Pret pour le prompt..."];
                return;
            }
        } else {
            // Détection clic sur le PC pour entrer dans le mode interactif plein écran
            const pcLeft = centerX - 120 * scale;
            const pcRight = centerX + 120 * scale;
            const pcTop = centerY - 77.5 * scale;
            const pcBottom = centerY + 77.5 * scale;

            if (e.offsetX >= pcLeft && e.offsetX <= pcRight && e.offsetY >= pcTop && e.offsetY <= pcBottom) {
                isInteractiveMode = true;
                container.classList.add('fullscreen');

                if (heroContent) { heroContent.classList.remove('active'); heroContent.classList.add('fade-out'); }
                if (stackTags) { stackTags.classList.remove('active'); stackTags.classList.add('fade-out'); }
                if (scrollCue) { scrollCue.classList.remove('active'); scrollCue.classList.add('fade-out'); }

                currentTargetScale = interactiveTargetScale;
                isZooming = true;
            }
        }
    });

    // --- Molette de la souris (Wheel) ---
    canvas.addEventListener('wheel', (e) => {
        if (!isInteractiveMode) return;
        e.preventDefault(); 

        const width = container.clientWidth;
        const height = container.clientHeight;
        const transformedY = (e.offsetY - height / 2) / scale + height / 2;
        
        const displayY = (height / 2 - 75) + 8;
        const displayHeight = 150 - 16;
        const midPointY = displayY + (displayHeight / 2);

        // Aligne le scroll sur la zone haut (IA) ou la zone bas (Prompt) selon la position souris
        if (transformedY < midPointY) {
            if (aiMaxScroll > 0) {
                aiScrollOffset = Math.max(0, Math.min(aiMaxScroll, aiScrollOffset + (e.deltaY > 0 ? 5 : -5)));
            }
        } else {
            if (promptMaxScroll > 0) {
                promptScrollOffset = Math.max(0, Math.min(promptMaxScroll, promptScrollOffset + (e.deltaY > 0 ? 4 : -4)));
            }
        }
    }, { passive: false });

    // --- Saisie au Clavier (Keydown) ---
    window.addEventListener('keydown', (e) => {
        if (!isInteractiveMode || isWaitingForAI || isTypingActive) return;

        if (e.key === ' ') {
            e.preventDefault(); 
            userPrompt += ' ';
            return;
        }

        if (e.key === 'Enter') {
            if (userPrompt.trim() !== "") {
                sendPromptToLocalAI(userPrompt);
                userPrompt = "";
            }
        } else if (e.key === 'Backspace') {
            userPrompt = userPrompt.slice(0, -1);
        } else if (e.key.length === 1) {
            userPrompt += e.key;
        }
    });


    // ==========================================================================
    // 4. CONNEXION API & ENVOI DU PROMPT IA
    // ==========================================================================
    async function sendPromptToLocalAI(promptText) {
        isWaitingForAI = true;
        isTypingActive = false; // Correction de frappe syntaxique d'origine ici
        promptScrollOffset = 0; 
        
        const wrappedPrompt = wrapTextToArray(`> ${promptText}`, maxCharsPerLine);
        aiResponseLines = aiResponseLines.concat(wrappedPrompt);
        aiResponseLines.push("Calcul en cours par l'IA...");
        aiScrollOffset = 9999; 
        
        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptText })
            });
            const data = await response.json();
            
            aiResponseLines.pop(); // Retire le texte de chargement
            
            currentRawAIResponse = data.response || "Aucune reponse.";
            typingCharIndex = 0;
            lastCharTime = performance.now(); 
            isTypingActive = true;

        } catch (error) {
            aiResponseLines.pop();
            aiResponseLines.push("Erreur: Impossible de joindre l'IA.");
        } finally {
            isWaitingForAI = false;
        }
    }


    // ==========================================================================
    // 5. BOUCLE DE RENDU CANVAS PRINCIPALE (PC 3D/2D)
    // ==========================================================================
    function draw(timestamp) {
        resizeCanvas();

        const width = container.clientWidth;
        const height = container.clientHeight;
        ctx.clearRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;
        const screenWidth = 240;
        const screenHeight = 150;
        const screenX = centerX - screenWidth / 2;
        const screenY = centerY - screenHeight / 2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY);

        // --- A. Dessin du Châssis PC ---
        ctx.fillStyle = '#1e1e1e';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(screenX, screenY, screenWidth, screenHeight, 6);
        else ctx.rect(screenX, screenY, screenWidth, screenHeight);
        ctx.fill();

        // --- B. Dalle d'affichage Écran ---
        const displayX = Math.floor(screenX + 8);
        const displayY = Math.floor(screenY + 8);
        const displayWidth = screenWidth - 16;
        const displayHeight = screenHeight - 16;
        ctx.fillStyle = '#0a0e14';
        ctx.fillRect(displayX, displayY, displayWidth, displayHeight);

        ctx.save();
        ctx.beginPath();
        ctx.rect(displayX, displayY, displayWidth, displayHeight);
        ctx.clip();

        ctx.font = '4px "JetBrains Mono", monospace';
        ctx.textBaseline = 'top';

        if (!isInteractiveMode) {
            // Affichage de l'état du système passif au chargement
            for (let i = 0; i < displayedLines.length; i++) {
                if (displayedLines[i] !== undefined) {
                    ctx.fillStyle = displayedLines[i].startsWith('#') ? '#6272a4' : '#50fa7b';
                    ctx.fillText(displayedLines[i], displayX + 8, Math.floor(displayY + 8 + (i * baseLineHeight)));
                }
            }
        } else {
            // --- C. Mode Terminal Interactif Actif ---
            ctx.fillStyle = '#5eead4';
            ctx.fillText("=== TERMINAL BOT IA ===", displayX + 6, displayY + 6);

            // Bouton EXIT Néon Cyberpunk
            exitBtnArea.x = displayX + displayWidth - 28;
            exitBtnArea.y = displayY + 4;
            
            ctx.save();
            ctx.shadowColor = '#ff3344';
            ctx.shadowBlur = isHoveringExit ? 6 : 3;
            ctx.fillStyle = isHoveringExit ? 'rgba(255, 51, 68, 0.25)' : 'rgba(10, 14, 20, 0.85)';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(exitBtnArea.x, exitBtnArea.y, exitBtnArea.w, exitBtnArea.h, 2);
            else ctx.rect(exitBtnArea.x, exitBtnArea.y, exitBtnArea.w, exitBtnArea.h);
            ctx.fill();
            
            ctx.strokeStyle = isHoveringExit ? '#ff6677' : 'rgba(255, 51, 68, 0.9)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.restore(); 

            ctx.fillStyle = '#ffffff';
            ctx.font = '700 3.5px "JetBrains Mono", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("EXIT", Math.floor(exitBtnArea.x + (exitBtnArea.w / 2)), Math.floor(exitBtnArea.y + (exitBtnArea.h / 2)));
            
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            // Machine à écrire cadencée sur le temps
            if (isInteractiveMode && isTypingActive) {
                const elapsed = timestamp - lastCharTime;
                if (elapsed >= typingSpeed) {
                    typingCharIndex += 1;
                    lastCharTime = timestamp; 
                    aiScrollOffset = 9999;     
                }

                if (typingCharIndex >= currentRawAIResponse.length) {
                    let finalWrappedAI = wrapTextToArray(currentRawAIResponse, maxCharsPerLine);
                    aiResponseLines = aiResponseLines.concat(finalWrappedAI);
                    isTypingActive = false;
                    currentRawAIResponse = "";
                }
            }

            // Préparation des lignes de rendu texte
            let currentLinesArray = [...aiResponseLines];
            if (isTypingActive) {
                let substringAI = currentRawAIResponse.substring(0, typingCharIndex);
                let wrappedAI = wrapTextToArray(substringAI, maxCharsPerLine);
                currentLinesArray = currentLinesArray.concat(wrappedAI);
            }

            // Calcul géométrique des zones de textes pour éviter le flou de pixels
            const wrappedInput = wrapTextToArray(`Prompt: ${userPrompt}`, maxCharsPerLine);
            const promptLineHeight = 5;
            const initialPromptHeight = wrappedInput.length * promptLineHeight;
            const maxPromptAreaHeight = Math.floor(displayHeight * 0.35);
            const promptAreaHeight = Math.floor(Math.min(initialPromptHeight, maxPromptAreaHeight));
            const inputAreaTop = Math.floor(displayY + displayHeight - 6 - promptAreaHeight);
            const aiAreaHeight = Math.floor(inputAreaTop - (displayY + 16) - 4);

            // --- C1. Affichage Historique IA ---
            ctx.save();
            ctx.beginPath();
            ctx.rect(displayX, displayY + 16, displayWidth - 6, aiAreaHeight);
            ctx.clip();

            let aiY = Math.floor(displayY + 16 - aiScrollOffset);
            currentLinesArray.forEach((line) => {
                ctx.fillStyle = line.startsWith('>') ? '#f0a868' : '#e8eaed';
                ctx.font = '4px "JetBrains Mono", monospace';
                ctx.fillText(line, displayX + 6, aiY);
                aiY += baseLineHeight;
            });

            const totalAIHeight = currentLinesArray.length * baseLineHeight;
            aiMaxScroll = Math.max(0, totalAIHeight - aiAreaHeight);
            if (aiScrollOffset === 9999 || aiScrollOffset > aiMaxScroll) aiScrollOffset = aiMaxScroll;
            ctx.restore();

            // Barre de défilement IA
            if (aiMaxScroll > 0) {
                aiScrollbarArea.x = displayX + displayWidth - 4;
                aiScrollbarArea.y = displayY + 16;
                aiScrollbarArea.h = aiAreaHeight;

                ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                ctx.fillRect(aiScrollbarArea.x, aiScrollbarArea.y, aiScrollbarArea.w, aiScrollbarArea.h);

                const barH = Math.max(6, Math.floor((aiAreaHeight / totalAIHeight) * aiAreaHeight));
                const barY = Math.floor(aiScrollbarArea.y + (aiScrollOffset / aiMaxScroll) * (aiAreaHeight - barH));
                ctx.fillStyle = '#5eead4';
                ctx.fillRect(aiScrollbarArea.x, barY, aiScrollbarArea.w, barH);
            }

            // Séparateur Cyberpunk entre les deux flux
            ctx.fillStyle = '#0a0e14';
            ctx.fillRect(displayX, inputAreaTop - 3, displayWidth, 3);
            ctx.strokeStyle = 'rgba(94, 234, 212, 0.2)';
            ctx.lineWidth = 0.5;
            ctx.beginPath(); 
            ctx.moveTo(displayX + 4, Math.floor(inputAreaTop - 1)); 
            ctx.lineTo(displayX + displayWidth - 4, Math.floor(inputAreaTop - 1)); 
            ctx.stroke();

            // --- C2. Affichage Zone Input/Prompt ---
            ctx.save();
            ctx.beginPath();
            ctx.rect(displayX, inputAreaTop, displayWidth - 6, promptAreaHeight);
            ctx.clip();

            let pY = Math.floor(inputAreaTop - promptScrollOffset);
            ctx.fillStyle = '#f0a868';
            ctx.font = '4px "JetBrains Mono", monospace';
            
            wrappedInput.forEach((line, index) => {
                ctx.fillText(line, displayX + 6, pY);
                
                // Clignotement du curseur à 500ms
                if (index === wrappedInput.length - 1 && Math.floor(Date.now() / 500) % 2 === 0) {
                    const lastLineWidth = ctx.measureText(line).width;
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(Math.floor(displayX + 6 + lastLineWidth + 1), pY, 1.5, 4);
                }
                pY += promptLineHeight;
            });

            const totalPromptHeight = wrappedInput.length * promptLineHeight;
            promptMaxScroll = Math.max(0, totalPromptHeight - promptAreaHeight);
            if (!isDraggingPromptBar) promptScrollOffset = promptMaxScroll; 
            ctx.restore();

            // Barre de défilement Prompt
            if (promptMaxScroll > 0) {
                promptScrollbarArea.x = displayX + displayWidth - 4;
                promptScrollbarArea.y = inputAreaTop;
                promptScrollbarArea.h = promptAreaHeight;

                ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                ctx.fillRect(promptScrollbarArea.x, promptScrollbarArea.y, promptScrollbarArea.w, promptScrollbarArea.h);

                const barH = Math.max(4, Math.floor((promptAreaHeight / totalPromptHeight) * promptAreaHeight));
                const barY = Math.floor(promptScrollbarArea.y + (promptScrollOffset / promptMaxScroll) * (promptAreaHeight - barH));
                ctx.fillStyle = '#f0a868';
                ctx.fillRect(promptScrollbarArea.x, barY, promptScrollbarArea.w, barH);
            }
        }

        ctx.restore();

        // --- D. Dessin du Clavier ---
        const bodyWidth = screenWidth * 1.12;
        ctx.fillStyle = '#3a3d42';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(Math.floor(centerX - bodyWidth / 2), Math.floor(screenY + screenHeight), Math.floor(bodyWidth), 5, [0, 0, 4, 4]);
        ctx.fill();

        ctx.restore();

        // --- E. Gestion Transitions Dynamiques & Interpolation (Lerp) ---
        if (isZooming) {
            let easeFactor = 0.05;
            scale += (currentTargetScale - scale) * easeFactor;
            if (Math.abs(currentTargetScale - scale) < 0.001) {
                scale = currentTargetScale;
                isZooming = false;
            }
        } else if (!isInteractiveMode) {
            // Animation d'écriture progressive du PC au lancement passif
            if (currentLine < codeLines.length) {
                let fullLine = codeLines[currentLine];
                if (currentChar <= fullLine.length) {
                    displayedLines[currentLine] = fullLine.substring(0, currentChar);
                    currentChar++;
                } else {
                    currentLine++;
                    currentChar = 0;
                }
            }
        }

        requestAnimationFrame(draw);
    }

    // Lancement de la boucle de rendu d'animation principale
    requestAnimationFrame(draw);


    // ==========================================================================
    // 6. LE MOTEUR GRAPHIQUE D'ARRIÈRE-PLAN CYBERPUNK (GRID DE SYNTWAVE)
    // ==========================================================================
    const bgCanvas = document.getElementById('cyber-bg-canvas');
    if (bgCanvas) {
        const bgCtx = bgCanvas.getContext('2d');
        let mouseX = 0; let mouseY = 0;
        
        window.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX / window.innerWidth) - 0.5;
            mouseY = (e.clientY / window.innerHeight) - 0.5;
        });

        function resizeBg() {
            bgCanvas.width = window.innerWidth;
            bgCanvas.height = window.innerHeight;
        }
        resizeBg();
        window.addEventListener('resize', resizeBg);

        // Instanciation des colonnes d'immeubles Matrix en arrière-plan
        const columns = [];
        const numColumns = 45;
        for(let i = 0; i < numColumns; i++) {
            columns.push({
                x: (i / numColumns) * window.innerWidth * 1.5 - (window.innerWidth * 0.25),
                height: Math.random() * 150 + 50,
                speed: Math.random() * 0.5 + 0.2,
                yOffset: Math.random() * 500
            });
        }

        let time = 0;
        function drawCyberBg() {
            time += 0.005;
            const w = bgCanvas.width;
            const h = bgCanvas.height;
            const horizon = h * 0.45;

            bgCtx.clearRect(0, 0, w, h);

            // Effet d'éclairage Néon central progressif (Glow)
            let glow = bgCtx.createRadialGradient(w/2 + (mouseX * -50), horizon, 10, w/2, horizon, w * 0.6);
            glow.addColorStop(0, 'rgba(94, 234, 212, 0.25)'); 
            glow.addColorStop(0.2, 'rgba(16, 21, 31, 0.6)');
            glow.addColorStop(1, '#050811');
            bgCtx.fillStyle = glow;
            bgCtx.fillRect(0, 0, w, h);

            // Rendu des barres/colonnes lumineuses
            bgCtx.save();
            columns.forEach(col => {
                col.yOffset += col.speed;
                if(col.yOffset > 100) col.yOffset = 0;
                let finalX = col.x + (mouseX * -30);
                bgCtx.fillStyle = 'rgba(29, 36, 48, 0.4)';
                bgCtx.fillRect(finalX, horizon - col.height, 18, col.height);
                
                bgCtx.fillStyle = Math.random() > 0.98 ? 'rgba(94, 234, 212, 0.7)' : 'rgba(94, 234, 212, 0.15)';
                for(let y = horizon - col.height + 5; y < horizon - 5; y += 12) {
                    if(Math.sin(y + col.yOffset) > 0.3) {
                        bgCtx.fillRect(finalX + 4, y, 3, 4);
                        bgCtx.fillRect(finalX + 11, y, 3, 4);
                    }
                }
            });
            bgCtx.restore();

            // Rendu des lignes de fuite perspectives de la grille (Perspective Grid)
            bgCtx.strokeStyle = 'rgba(94, 234, 212, 0.18)'; 
            bgCtx.lineWidth = 1;

            const numLines = 36;
            const centerX = w / 2 + (mouseX * -80);
            for (let i = 0; i <= numLines; i++) {
                bgCtx.beginPath();
                bgCtx.moveTo(centerX, horizon);
                let targetX = ((i - numLines / 2) * (w / numLines)) * 4 + w / 2;
                bgCtx.lineTo(targetX, h);
                bgCtx.stroke();
            }

            // Lignes d'horizon horizontales mouvantes (effet de vitesse)
            let speedOffset = (time * 40) % 64; 
            for (let y = horizon; y < h; y += 25) {
                let ratio = (y - horizon) / (h - horizon);
                let currentY = horizon + (ratio * ratio) * (h - horizon) + speedOffset * ratio;
                if (currentY <= h) {
                    bgCtx.beginPath();
                    bgCtx.moveTo(0, currentY);
                    bgCtx.lineTo(w, currentY);
                    bgCtx.stroke();
                }
            }
            requestAnimationFrame(drawCyberBg);
        }
        drawCyberBg();
    }


    // ==========================================================================
    // 7. MODULES DES SECTIONS SUIVANTES (PROJETS, COMPÉTENCES, CONTACT)
    // ==========================================================================

    // --- Interaction Cartes Projets (Lecture Vidéo) ---
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => {
        const video = card.querySelector('video');
        if (video) {
            card.addEventListener('mouseenter', () => {
                video.currentTime = 0; 
                video.play().catch(err => console.log("Lecture bloquée ou suspendue"));
            });
            card.addEventListener('mouseleave', () => video.pause());
        }
    });

    // --- Onglet de Compétences (Afficher/Masquer les Langages) ---
    const toggleSkillsBtn = document.getElementById('toggleSkills');
    const skillsWrapper = document.getElementById('skillsWrapper');
    if (toggleSkillsBtn && skillsWrapper) {
        toggleSkillsBtn.addEventListener('click', () => {
            skillsWrapper.classList.toggle('reveal');
            const progressBars = skillsWrapper.querySelectorAll('.skill-progress');
            if (skillsWrapper.classList.contains('reveal')) {
                toggleSkillsBtn.textContent = "Masquer les langages";
                progressBars.forEach(bar => {
                    bar.style.setProperty('--progress-width', bar.style.width);
                });
            } else {
                toggleSkillsBtn.textContent = "Afficher les langages maîtrisés";
            }
        });
    }

    // --- Gestionnaire de Formulaire de Contact & Pop-up Ajax ---
    const popup = document.getElementById('custom-popup');
    const closeBtn = document.getElementById('close-popup');
    const form = document.getElementById('contact-form');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            fetch('/envoi', { method: 'POST', body: new FormData(this) })
            .then(res => {
                if (res.ok) { 
                    popup.classList.remove('hide'); 
                    popup.classList.add('active'); 
                    form.reset(); 
                } else {
                    alert("Erreur lors de l'envoi.");
                }
            }).catch(err => console.error(err));
        });
    }

    // Fermeture du Pop-up de succès d'envoi
    if (closeBtn && popup) {
        closeBtn.addEventListener('click', () => {
            popup.classList.add('hide'); 
            setTimeout(() => { 
                popup.classList.remove('active'); 
                popup.classList.remove('hide'); 
            }, 300);
        });
    }
});
        }

        if (e.key === 'Enter') {
            if (userPrompt.trim() !== "") {
                sendPromptToLocalAI(userPrompt);
                userPrompt = "";
            }
        } else if (e.key === 'Backspace') {
            userPrompt = userPrompt.slice(0, -1);
        } else if (e.key.length === 1) {
            userPrompt += e.key;
        }
    });

    async function sendPromptToLocalAI(promptText) {
        isWaitingForAI = true;
        isTyasyncpingActive = false;
        promptScrollOffset = 0; 
        
        const wrappedPrompt = wrapTextToArray(`> ${promptText}`, maxCharsPerLine);
        aiResponseLines = aiResponseLines.concat(wrappedPrompt);
        aiResponseLines.push("Calcul en cours par l'IA...");
        
        aiScrollOffset = 9999; 
        
        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptText })
            });
            const data = await response.json();
            
            aiResponseLines.pop(); 
            
            currentRawAIResponse = data.response || "Aucune reponse.";
            typingCharIndex = 0;
            lastCharTime = performance.now(); // Initialisation de la référence temporelle
            isTypingActive = true;

        } catch (error) {
            aiResponseLines.pop();
            aiResponseLines.push("Erreur: Impossible de joindre l'IA.");
        } finally {
            isWaitingForAI = false;
        }
    }

// --- BOUCLE DE RENDU PRINCIPALE ---
    function draw(timestamp) {
        resizeCanvas();

        const width = container.clientWidth;
        const height = container.clientHeight;
        ctx.clearRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;

        const screenWidth = 240;
        const screenHeight = 150;
        const screenX = centerX - screenWidth / 2;
        const screenY = centerY - screenHeight / 2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY);

        // 1. Châssis PC
        ctx.fillStyle = '#1e1e1e';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(screenX, screenY, screenWidth, screenHeight, 6);
        else ctx.rect(screenX, screenY, screenWidth, screenHeight);
        ctx.fill();

        // 2. Dalle d'affichage Écran
        const displayX = Math.floor(screenX + 8);
        const displayY = Math.floor(screenY + 8);
        const displayWidth = screenWidth - 16;
        const displayHeight = screenHeight - 16;
        ctx.fillStyle = '#0a0e14';
        ctx.fillRect(displayX, displayY, displayWidth, displayHeight);

        ctx.save();
        ctx.beginPath();
        ctx.rect(displayX, displayY, displayWidth, displayHeight);
        ctx.clip();

        ctx.font = '4px "JetBrains Mono", monospace';
        ctx.textBaseline = 'top';

        if (!isInteractiveMode) {
            for (let i = 0; i < displayedLines.length; i++) {
                if (displayedLines[i] !== undefined) {
                    ctx.fillStyle = displayedLines[i].startsWith('#') ? '#6272a4' : '#50fa7b';
                    // Force les coordonnées entières
                    ctx.fillText(displayedLines[i], displayX + 8, Math.floor(displayY + 8 + (i * baseLineHeight)));
                }
            }
        } else {
            // --- HEADER DU TERMINAL ---
            ctx.fillStyle = '#5eead4';
            ctx.fillText("=== TERMINAL BOT IA ===", displayX + 6, displayY + 6);

            // --- BOUTON EXIT REDESIGN NÉON ---
            exitBtnArea.x = displayX + displayWidth - 28;
            exitBtnArea.y = displayY + 4;
            
            ctx.save();
            ctx.shadowColor = '#ff3344';
            ctx.shadowBlur = isHoveringExit ? 6 : 3;
            
            ctx.fillStyle = isHoveringExit ? 'rgba(255, 51, 68, 0.25)' : 'rgba(10, 14, 20, 0.85)';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(exitBtnArea.x, exitBtnArea.y, exitBtnArea.w, exitBtnArea.h, 2);
            else ctx.rect(exitBtnArea.x, exitBtnArea.y, exitBtnArea.w, exitBtnArea.h);
            ctx.fill();
            
            ctx.strokeStyle = isHoveringExit ? '#ff6677' : 'rgba(255, 51, 68, 0.9)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.restore(); 

            ctx.fillStyle = '#ffffff';
            ctx.font = '700 3.5px "JetBrains Mono", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Force les coordonnées entières pour le bouton
            ctx.fillText("EXIT", Math.floor(exitBtnArea.x + (exitBtnArea.w / 2)), Math.floor(exitBtnArea.y + (exitBtnArea.h / 2)));
            
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            // --- GESTION DU SUBSTRING CADENCÉ PAR LE TEMPS (MACHINE À ÉCRIRE) ---
            if (isInteractiveMode && isTypingActive) {
                const elapsed = timestamp - lastCharTime;
                if (elapsed >= typingSpeed) {
                    typingCharIndex += 1;
                    lastCharTime = timestamp; 
                    aiScrollOffset = 9999;     
                }

                if (typingCharIndex >= currentRawAIResponse.length) {
                    let finalWrappedAI = wrapTextToArray(currentRawAIResponse, maxCharsPerLine);
                    aiResponseLines = aiResponseLines.concat(finalWrappedAI);
                    isTypingActive = false;
                    currentRawAIResponse = "";
                }
            }

            // --- PRÉPARATION DU TABLEAU DE RENDU TEXTE ---
            let currentLinesArray = [...aiResponseLines];
            if (isTypingActive) {
                let substringAI = currentRawAIResponse.substring(0, typingCharIndex);
                let wrappedAI = wrapTextToArray(substringAI, maxCharsPerLine);
                currentLinesArray = currentLinesArray.concat(wrappedAI);
            }

            // --- ARCHITECTURE DES ESPACES DYNAMIQUES (FIX SUB-PIXEL AVEC MATH.FLOOR) ---
            const wrappedInput = wrapTextToArray(`Prompt: ${userPrompt}`, maxCharsPerLine);
            const promptLineHeight = 5;
            const initialPromptHeight = wrappedInput.length * promptLineHeight;
            
            const maxPromptAreaHeight = Math.floor(displayHeight * 0.35);
            const promptAreaHeight = Math.floor(Math.min(initialPromptHeight, maxPromptAreaHeight));
            
            const inputAreaTop = Math.floor(displayY + displayHeight - 6 - promptAreaHeight);
            const aiAreaHeight = Math.floor(inputAreaTop - (displayY + 16) - 4);

            // --- 1. ZONE HISTORIQUE IA (SCROLLABLE) ---
            ctx.save();
            ctx.beginPath();
            ctx.rect(displayX, displayY + 16, displayWidth - 6, aiAreaHeight);
            ctx.clip();

            // Y forcé en entier pour empêcher le scintillement de luminosité
            let aiY = Math.floor(displayY + 16 - aiScrollOffset);
            currentLinesArray.forEach((line) => {
                ctx.fillStyle = line.startsWith('>') ? '#f0a868' : '#e8eaed';
                ctx.font = '4px "JetBrains Mono", monospace';
                ctx.fillText(line, displayX + 6, aiY);
                aiY += baseLineHeight;
            });

            const totalAIHeight = currentLinesArray.length * baseLineHeight;
            aiMaxScroll = Math.max(0, totalAIHeight - aiAreaHeight);
            if (aiScrollOffset === 9999 || aiScrollOffset > aiMaxScroll) aiScrollOffset = aiMaxScroll;
            ctx.restore();

            // Scrollbar Interactive IA
            if (aiMaxScroll > 0) {
                aiScrollbarArea.x = displayX + displayWidth - 4;
                aiScrollbarArea.y = displayY + 16;
                aiScrollbarArea.h = aiAreaHeight;

                ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                ctx.fillRect(aiScrollbarArea.x, aiScrollbarArea.y, aiScrollbarArea.w, aiScrollbarArea.h);

                const barH = Math.max(6, Math.floor((aiAreaHeight / totalAIHeight) * aiAreaHeight));
                const barY = Math.floor(aiScrollbarArea.y + (aiScrollOffset / aiMaxScroll) * (aiAreaHeight - barH));
                ctx.fillStyle = '#5eead4';
                ctx.fillRect(aiScrollbarArea.x, barY, aiScrollbarArea.w, barH);
            }

            // --- SÉPARATEUR DE FLUX CYBERPUNK ---
            ctx.fillStyle = '#0a0e14';
            ctx.fillRect(displayX, inputAreaTop - 3, displayWidth, 3);
            ctx.strokeStyle = 'rgba(94, 234, 212, 0.2)';
            ctx.lineWidth = 0.5;
            ctx.beginPath(); 
            ctx.moveTo(displayX + 4, Math.floor(inputAreaTop - 1)); 
            ctx.lineTo(displayX + displayWidth - 4, Math.floor(inputAreaTop - 1)); 
            ctx.stroke();

            // --- 2. ZONE DE PROMPT PROPRE (SCROLLABLE) ---
            ctx.save();
            ctx.beginPath();
            ctx.rect(displayX, inputAreaTop, displayWidth - 6, promptAreaHeight);
            ctx.clip();

            // Y forcé en entier pour le prompt également
            let pY = Math.floor(inputAreaTop - promptScrollOffset);
            ctx.fillStyle = '#f0a868';
            ctx.font = '4px "JetBrains Mono", monospace';
            
            wrappedInput.forEach((line, index) => {
                ctx.fillText(line, displayX + 6, pY);
                
                // Vitesse du curseur radoucie (500ms) pour moins fatiguer l'œil
                if (index === wrappedInput.length - 1 && Math.floor(Date.now() / 500) % 2 === 0) {
                    const lastLineWidth = ctx.measureText(line).width;
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(Math.floor(displayX + 6 + lastLineWidth + 1), pY, 1.5, 4);
                }
                pY += promptLineHeight;
            });

            const totalPromptHeight = wrappedInput.length * promptLineHeight;
            promptMaxScroll = Math.max(0, totalPromptHeight - promptAreaHeight);
            if (!isDraggingPromptBar) promptScrollOffset = promptMaxScroll; 
            ctx.restore();

            // Scrollbar Interactive Prompt
            if (promptMaxScroll > 0) {
                promptScrollbarArea.x = displayX + displayWidth - 4;
                promptScrollbarArea.y = inputAreaTop;
                promptScrollbarArea.h = promptAreaHeight;

                ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                ctx.fillRect(promptScrollbarArea.x, promptScrollbarArea.y, promptScrollbarArea.w, promptScrollbarArea.h);

                const barH = Math.max(4, Math.floor((promptAreaHeight / totalPromptHeight) * promptAreaHeight));
                const barY = Math.floor(promptScrollbarArea.y + (promptScrollOffset / promptMaxScroll) * (promptAreaHeight - barH));
                ctx.fillStyle = '#f0a868';
                ctx.fillRect(promptScrollbarArea.x, barY, promptScrollbarArea.w, barH);
            }
        }

        ctx.restore();

        // 3. Clavier
        const bodyWidth = screenWidth * 1.12;
        ctx.fillStyle = '#3a3d42';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(Math.floor(centerX - bodyWidth / 2), Math.floor(screenY + screenHeight), Math.floor(bodyWidth), 5, [0, 0, 4, 4]);
        ctx.fill();

        ctx.restore();

        // Moteur de transition fluide (Zoom Lerp)
        if (isZooming) {
            let easeFactor = 0.05;
            scale += (currentTargetScale - scale) * easeFactor;
            if (Math.abs(currentTargetScale - scale) < 0.001) {
                scale = currentTargetScale;
                isZooming = false;
            }
        } else if (!isInteractiveMode) {
            if (currentLine < codeLines.length) {
                let fullLine = codeLines[currentLine];
                if (currentChar <= fullLine.length) {
                    displayedLines[currentLine] = fullLine.substring(0, currentChar);
                    currentChar++;
                } else {
                    currentLine++;
                    currentChar = 0;
                }
            }
        }

        requestAnimationFrame(draw);
    }

    // --- LOGIQUE D'ARRIÈRE-PLAN CYBERPUNK ---
    const bgCanvas = document.getElementById('cyber-bg-canvas');
    if (bgCanvas) {
        const bgCtx = bgCanvas.getContext('2d');
        let mouseX = 0; let mouseY = 0;
        
        window.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX / window.innerWidth) - 0.5;
            mouseY = (e.clientY / window.innerHeight) - 0.5;
        });

        function resizeBg() {
            bgCanvas.width = window.innerWidth;
            bgCanvas.height = window.innerHeight;
        }
        resizeBg();
        window.addEventListener('resize', resizeBg);

        const columns = [];
        const numColumns = 45;
        for(let i = 0; i < numColumns; i++) {
            columns.push({
                x: (i / numColumns) * window.innerWidth * 1.5 - (window.innerWidth * 0.25),
                height: Math.random() * 150 + 50,
                speed: Math.random() * 0.5 + 0.2,
                yOffset: Math.random() * 500
            });
        }

        let time = 0;
        function drawCyberBg() {
            time += 0.005;
            const w = bgCanvas.width;
            const h = bgCanvas.height;
            const horizon = h * 0.45;

            bgCtx.clearRect(0, 0, w, h);

            let glow = bgCtx.createRadialGradient(w/2 + (mouseX * -50), horizon, 10, w/2, horizon, w * 0.6);
            glow.addColorStop(0, 'rgba(94, 234, 212, 0.25)'); 
            glow.addColorStop(0.2, 'rgba(16, 21, 31, 0.6)');
            glow.addColorStop(1, '#050811');
            bgCtx.fillStyle = glow;
            bgCtx.fillRect(0, 0, w, h);

            bgCtx.save();
            columns.forEach(col => {
                col.yOffset += col.speed;
                if(col.yOffset > 100) col.yOffset = 0;
                let finalX = col.x + (mouseX * -30);
                bgCtx.fillStyle = 'rgba(29, 36, 48, 0.4)';
                bgCtx.fillRect(finalX, horizon - col.height, 18, col.height);
                
                bgCtx.fillStyle = Math.random() > 0.98 ? 'rgba(94, 234, 212, 0.7)' : 'rgba(94, 234, 212, 0.15)';
                for(let y = horizon - col.height + 5; y < horizon - 5; y += 12) {
                    if(Math.sin(y + col.yOffset) > 0.3) {
                        bgCtx.fillRect(finalX + 4, y, 3, 4);
                        bgCtx.fillRect(finalX + 11, y, 3, 4);
                    }
                }
            });
            bgCtx.restore();

            bgCtx.strokeStyle = 'rgba(94, 234, 212, 0.18)'; 
            bgCtx.lineWidth = 1;

            const numLines = 36;
            const centerX = w / 2 + (mouseX * -80);
            for (let i = 0; i <= numLines; i++) {
                bgCtx.beginPath();
                bgCtx.moveTo(centerX, horizon);
                let targetX = ((i - numLines / 2) * (w / numLines)) * 4 + w / 2;
                bgCtx.lineTo(targetX, h);
                bgCtx.stroke();
            }

            let speedOffset = (time * 40) % 64; 
            for (let y = horizon; y < h; y += 25) {
                let ratio = (y - horizon) / (h - horizon);
                let currentY = horizon + (ratio * ratio) * (h - horizon) + speedOffset * ratio;
                if (currentY <= h) {
                    bgCtx.beginPath();
                    bgCtx.moveTo(0, currentY);
                    bgCtx.lineTo(w, currentY);
                    bgCtx.stroke();
                }
            }
            requestAnimationFrame(drawCyberBg);
        }
        drawCyberBg();
    }

    // Lancement initial de la boucle en passant la méthode draw
    requestAnimationFrame(draw);

    // ==========================================
    // SECTIONS SUIVANTES (PROJETS, COMPÉTENCES, CONTACT)
    // ==========================================
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => {
        const video = card.querySelector('video');
        if (video) {
            card.addEventListener('mouseenter', () => {
                video.currentTime = 0; 
                video.play().catch(err => console.log("Lecture bloquée"));
            });
            card.addEventListener('mouseleave', () => video.pause());
        }
    });

    const toggleSkillsBtn = document.getElementById('toggleSkills');
    const skillsWrapper = document.getElementById('skillsWrapper');
    if (toggleSkillsBtn && skillsWrapper) {
        toggleSkillsBtn.addEventListener('click', () => {
            skillsWrapper.classList.toggle('reveal');
            const progressBars = skillsWrapper.querySelectorAll('.skill-progress');
            if (skillsWrapper.classList.contains('reveal')) {
                toggleSkillsBtn.textContent = "Masquer les langages";
                progressBars.forEach(bar => {
                    bar.style.setProperty('--progress-width', bar.style.width);
                });
            } else {
                toggleSkillsBtn.textContent = "Afficher les langages maîtrisés";
            }
        });
    }

    const popup = document.getElementById('custom-popup');
    const closeBtn = document.getElementById('close-popup');
    const form = document.getElementById('contact-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            fetch('/envoi', { method: 'POST', body: new FormData(this) })
            .then(res => {
                if (res.ok) { popup.classList.remove('hide'); popup.classList.add('active'); form.reset(); }
                else alert("Erreur lors de l'envoi.");
            }).catch(err => console.error(err));
        });
    }
    if (closeBtn && popup) {
        closeBtn.addEventListener('click', () => {
            popup.classList.add('hide'); 
            setTimeout(() => { popup.classList.remove('active'); popup.classList.remove('hide'); }, 300);
        });
    }
});

// ==========================================================================
    // 8. ANIMATIONS AU SCROLL (INTERSECTION OBSERVER)
    // ==========================================================================

    // Configuration de l'observateur
    const observerOptions = {
        root: null,          // Observe par rapport au viewport (l'écran)
        threshold: 0.15,     // Se déclenche quand 15% de l'élément est visible
        rootMargin: "0px 0px -50px 0px" // Déclenche l'animation un peu avant le bas de l'écran
    };

    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // L'élément entre dans l'écran : on l'affiche
                entry.target.classList.add('is-visible');
            } else {
                // L'élément sort de l'écran : on le recache (Crée l'effet d'intro/outro répété)
                // Note : Supprime cette ligne si tu veux que l'animation ne se joue qu'une seule fois
                entry.target.classList.remove('is-visible');
            }
        });
    }, observerOptions);

    // Sélection de tous les éléments à animer
    const elementsToReveal = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale');
    
    // On demande à l'observateur de surveiller chaque élément
    elementsToReveal.forEach((el) => {
        scrollObserver.observe(el);
    });


    document.addEventListener('DOMContentLoaded', () => {
    const projectCards = document.querySelectorAll('.project-card');

    projectCards.forEach((card) => {
        // Quand la souris entre sur la carte
        card.addEventListener('mouseenter', () => {
        card.classList.add('is-expanded');
        });

        // Quand la souris sort de la carte
        card.addEventListener('mouseleave', () => {
        card.classList.remove('is-expanded');
        });
    });
    });