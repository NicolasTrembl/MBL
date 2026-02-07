const IS_GH_PAGES = window.location.hostname.includes('github.io');
const REPO_NAME = '/MBL';
const BASE_PATH = IS_GH_PAGES ? REPO_NAME : '';

const main = document.getElementById("main");
const h1 = document.getElementById("title");
const routes = {
    '/': 'collection/index',
    '/home': 'collection/index',
    '/search': 'collection/search',
    '/collection': 'collection/index',
    '/add': 'book/add',
    '/book': 'book/index',
    '/user': 'user/index'
};

const title = {
    '/': 'Mes livres',
    '/home': 'Mes livres',
    '/search': 'Rechercher',
    '/collection': 'Mes livres',
    '/add': 'Ajouter',
    '/book': 'Livre',
    '/user': 'Utilisateur'
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
    'searchBtn': '/search', 
    'addBtn': '/add', 
    'userBtn': '/user'
};

document.querySelectorAll('nav button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const id = e.currentTarget.id;
        const path = mapping[id] || '/home';
        console.log("Clicked on", path);
        main.classList = [];
        
        window.history.pushState({}, "", BASE_PATH + path);
        router();
    });
});

const menu = document.getElementById('menu');
document.getElementById('burgerBtn')?.addEventListener("click", () => {
    menu.classList.toggle("hidden_right");
});
document.getElementById('closeMenuBtn')?.addEventListener("click", () => {
    menu.classList.toggle("hidden_right");
});

window.addEventListener("popstate", router);

window.addEventListener("beforeunload", () => {
    if (window.currentModuleCleanup) {
        window.currentModuleCleanup();
    }
});

window.onload = router;