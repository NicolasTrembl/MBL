let currentPage = 0;
const PAGE_SIZE = 12;

export function init() {
    const main = document.getElementById("main");
    main.innerHTML = "";
    main.classList.add("gridView");
    
    currentPage = 0;

    const sentinel = document.createElement('div');
    sentinel.id = "sentinel";
    sentinel.style.cssText = "grid-column: 1 / -1; height: 50px; display: flex; justify-content: center; align-items: center;";
    main.appendChild(sentinel);

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            loadItems(main, sentinel);
        }
    }, { root: null, threshold: 0.1 });

    observer.observe(sentinel);

    return () => {
        observer.disconnect();
        main.classList.remove("gridView");
    };
}

async function loadItems(container, sentinel) {
    try {
        const db = await openDB();
        const transaction = db.transaction("books", "readonly");
        const store = transaction.objectStore("books");

        const request = store.getAll();
        
        request.onsuccess = () => {
            const allBooks = request.result;
            allBooks.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));

            const start = currentPage * PAGE_SIZE;
            const end = start + PAGE_SIZE;
            const booksToDisplay = allBooks.slice(start, end);

            if (booksToDisplay.length === 0) {
                sentinel.textContent = allBooks.length > 0 ? "Fin de la collection" : "Aucun livre enregistré";
                return;
            }

            booksToDisplay.forEach(book => {
                const card = createBookCard(book);
                container.insertBefore(card, sentinel);
            });

            currentPage++;
        };
    } catch (err) {
        console.error("Erreur chargement items:", err);
    }
}

function createBookCard(book) {
    const div = document.createElement('div');
    div.className = "book-card-home"; 
    
    let coverSrc = ""; 
    if (book.cover instanceof Blob) {
        coverSrc = URL.createObjectURL(book.cover);
    }

    div.innerHTML = `
        <div class="cover-placeholder">
            <img src="${coverSrc}" alt="${book.title}" loading="lazy">
            <div class="book-overlay">
                <span class="status-dot ${book.status}"></span>
            </div>
        </div>
        <div class="book-meta">
            <span class="book-title">${book.title}</span>
            <span class="book-author">${book.author}</span>
        </div>
    `;

    if (book.cover instanceof Blob) {
        const img = div.querySelector('img');
        img.onload = () => URL.revokeObjectURL(img.src);
    }

    div.onclick = () => {
        window.history.pushState({}, "", `/book?id=${book.id}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    return div;
}