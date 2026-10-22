/**
 * Ouvre ou ferme le menu de navigation latéral (sidebar) sur le côté de la page.
 */
function openlinks() {
    const links = document.getElementById("nav_links");
    if (!links) return;

    if (links.classList.contains("display")) {
        links.classList.remove("display");
        links.classList.add("notdisplay");
    } else {
        links.classList.remove("notdisplay");
        links.classList.add("display");
    }
}

// Alias pour assurer la compatibilité si appelé via open_links()
function open_links() {
    openlinks();
}

// Gestion des interactions une fois le DOM chargé
document.addEventListener("DOMContentLoaded", () => {
    const links = document.getElementById("nav_links");
    const button = document.getElementById("discoverlinksmobileversion");

    // Fermer le menu lors d'un clic sur l'un des liens
    const navAnchors = document.querySelectorAll("#nav_links a");
    navAnchors.forEach((a) => {
        a.addEventListener("click", () => {
            if (links && links.classList.contains("display")) {
                links.classList.remove("display");
                links.classList.add("notdisplay");
            }
        });
    });

    // Fermer le menu lors d'un clic à l'extérieur de la sidebar
    document.addEventListener("click", (event) => {
        if (!links || !links.classList.contains("display")) return;

        const isClickInsideMenu = links.contains(event.target);
        const isClickOnButton = button && button.contains(event.target);

        if (!isClickInsideMenu && !isClickOnButton) {
            links.classList.remove("display");
            links.classList.add("notdisplay");
        }
    });

    // Fermer avec la touche Échap
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && links && links.classList.contains("display")) {
            links.classList.remove("display");
            links.classList.add("notdisplay");
        }
    });
});


// Alias pour assurer la compatibilité si appelé via open_links()
function open_links() {
    openlinks();
}

// Gestion des interactions une fois le DOM chargé
document.addEventListener("DOMContentLoaded", () => {
    const links = document.getElementById("nav_links");
    const button = document.getElementById("discoverlinksmobileversion");

    // Fermer le menu lors d'un clic sur l'un des liens
    const navAnchors = document.querySelectorAll("#nav_links a");
    navAnchors.forEach((a) => {
        a.addEventListener("click", () => {
            if (links && links.classList.contains("display")) {
                links.classList.remove("display");
                links.classList.add("notdisplay");
            }
        });
    });

    // Fermer le menu lors d'un clic à l'extérieur de la sidebar
    document.addEventListener("click", (event) => {
        if (!links || !links.classList.contains("display")) return;

        const isClickInsideMenu = links.contains(event.target);
        const isClickOnButton = button && button.contains(event.target);

        if (!isClickInsideMenu && !isClickOnButton) {
            links.classList.remove("display");
            links.classList.add("notdisplay");
        }
    });

    // Fermer avec la touche Échap
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && links && links.classList.contains("display")) {
            links.classList.remove("display");
            links.classList.add("notdisplay");
        }
    });
});
