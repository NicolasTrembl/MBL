const IS_GH_PAGES = window.location.hostname.includes('github.io');
const REPO_NAME = '/MBL';
const BASE_PATH = IS_GH_PAGES ? REPO_NAME : '';

const main = document.getElementById("main");
const h1 = document.getElementById("title");

// TODO: Move to utils script
function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (window.XLSX) return resolve(); // Déjà chargé

        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function updateMetaThemeColor(color) {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = "theme-color";
        document.head.appendChild(meta);
    }
    meta.setAttribute('content', color);
}

function loadSavedTheme() {
    const appliedThemeColors = localStorage.getItem('appliedThemeColors');
    
    if (appliedThemeColors) {
        try {
            const colors = JSON.parse(appliedThemeColors);
            const root = document.documentElement;
            
            Object.entries(colors).forEach(([property, value]) => {
                root.style.setProperty(property, value);
                if (property === '--background-variant') {
                    updateMetaThemeColor(value);
                }
            });
        } catch (err) {
            console.error("Erreur lors du chargement du thème:", err);
        }
    }
}

const routes = {
    '/': 'collection/home',
    '/home': 'collection/home',
    '/collection': 'collection/home',
    '/add': 'book/add',
    '/book': 'book/view',
    '/user': 'user/options',
    '/annotation': 'collection/annotation',
};

const title = {
    '/': 'Mes livres',
    '/home': 'Mes livres',
    '/collection': 'Mes livres',
    '/add': 'Ajouter',
    '/book': 'Livre',
    '/user': 'Utilisateur',
    '/annotation': 'Annotations'
};

let currentAbortController = null;

async function router() {
    let path = window.location.pathname;
    if (IS_GH_PAGES) {
        path = path.replace(REPO_NAME, '') || '/';
    }

    const cleanPath = path.split('?')[0];

    const viewName = routes[cleanPath] || 'collection/index';

    const redirect = sessionStorage.getItem('redirect');
    if (redirect) {
        sessionStorage.removeItem('redirect');
        window.history.replaceState(null, null, redirect);
    }

    if (currentAbortController) {
        currentAbortController.abort();
    }
    currentAbortController = new AbortController();
    const { signal } = currentAbortController;

    if (window.currentModuleCleanup) {
        try {
            await window.currentModuleCleanup(); 
        } catch (err) {
            console.error("Erreur lors du nettoyage:", err);
        }
        window.currentModuleCleanup = null;
    }


    h1.innerText = title[cleanPath] || "404";    
    main.innerHTML = "<div class='centering' style='height:100%; width:100%;'><p>Chargement...</p></div>";

    try {
        const response = await fetch(`${viewName}.html`, { signal });
        const html = await response.text();
        
        if (signal.aborted) return;

        main.innerHTML = html;

        const module = await import(`./${viewName}.js?t=${Date.now()}`).catch(() => null);
        
        if (module && module.init && !signal.aborted) {
            const cleanup = module.init();
            if (typeof cleanup === 'function') {
                window.currentModuleCleanup = cleanup;
            }
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            console.log('Chargement annulé car une nouvelle page a été demandée.');
        } else {
            console.error("Erreur de chargement:", err);
            main.innerHTML = "Erreur de chargement.";
        }
    }
}

const mapping = { 
    'homeBtn': '/home', 
    'addBtn': '/add', 
    'userBtn': '/user'
};

document.querySelectorAll('nav button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const id = e.currentTarget.id;
        const path = mapping[id] || '/home';
        main.classList = [];
        
        window.history.pushState({}, "", BASE_PATH + path);
        router();
    });
});

const menu = document.getElementById('menu');
const overlay = document.getElementById('overlay');

function toggleMenu() {
    menu.classList.toggle("hidden_right");
    overlay.classList.toggle("hidden");
}

document.getElementById('burgerBtn')?.addEventListener("click", toggleMenu);
document.getElementById('closeMenuBtn')?.addEventListener("click", toggleMenu);
overlay?.addEventListener("click", toggleMenu);

document.getElementById('menuAnnotations')?.addEventListener("click", () => {
    toggleMenu();
    window.history.pushState({}, "", BASE_PATH + "/annotation");
    router();
});

window.addEventListener("popstate", router);

window.addEventListener("beforeunload", () => {
    if (window.currentModuleCleanup) {
        window.currentModuleCleanup();
    }
});

loadSavedTheme();

window.onload = router;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        if (confirm("Nouvelle version disponible. Recharger ?")) {
                            window.location.reload();
                        }
                    }
                });
            });
        });
    });
}