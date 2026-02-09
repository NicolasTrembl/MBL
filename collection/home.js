let allBooks = [];
let selectedTags = new Set();

export async function init() {
    const gridView = document.getElementById("gridView"); 
    const db = await openDB();
    
    const tx = db.transaction("books", "readonly");
    allBooks = await new Promise(r => {
        const req = tx.objectStore("books").getAll();
        req.onsuccess = () => r(req.result);
    });

    const render = () => {
        const query = document.getElementById('searchInput').value.toLowerCase();
        const statusFilter = document.getElementById('filterStatus').value;

        const tagMode = document.getElementById('tagFilterMode').value;

        const filtered = allBooks.filter(book => {
            const matchesSearch = book.title.toLowerCase().includes(query) || 
                                 book.author.toLowerCase().includes(query) || 
                                 (book.year && book.year.toString().includes(query));
            
            const matchesStatus = statusFilter === 'all' || book.status === statusFilter;
            
            const tagsArray = Array.from(selectedTags);
            const matchesTags = selectedTags.size === 0 || (book.tags && (
                tagMode === 'and' 
                ? tagsArray.every(t => book.tags.includes(t))
                : tagsArray.some(t => book.tags.includes(t))
            ));

            return matchesSearch && matchesStatus && matchesTags;
        });

        gridView.innerHTML = "";
        filtered.forEach(book => gridView.appendChild(createBookCard(book)));
        lucide.createIcons();
    };

    document.getElementById('tagFilterMode').addEventListener('change', render);
    document.getElementById('searchInput').addEventListener('input', render);

    document.getElementById('openFilterBtn').addEventListener('click', async () => {
        await loadFilterTags(db);
        document.getElementById('filterModal').classList.remove('hidden');
    });

    document.getElementById('applyFilters').addEventListener('click', () => {
        document.getElementById('filterModal').classList.add('hidden');
        render();
    });

    document.getElementById('resetFilters').addEventListener('click', () => {
        selectedTags.clear();
        document.getElementById('filterStatus').value = 'all';
        document.getElementById('tagFilterMode').value = 'and';
        render();
        document.getElementById('filterModal').classList.add('hidden');
    });

    render();
}


async function loadFilterTags(db) {
    const container = document.getElementById('filterTagsContainer');
    const tx = db.transaction("tags", "readonly");
    const tags = await new Promise(r => {
        const req = tx.objectStore("tags").getAll();
        req.onsuccess = () => r(req.result);
    });

    container.innerHTML = tags.map(t => `
        <span class="tag-chip ${selectedTags.has(t.name) ? 'active' : ''}" 
              onclick="this.classList.toggle('active'); toggleFilterTag('${t.name}')">
            ${t.name}
        </span>
    `).join('');
}

window.toggleFilterTag = (name) => {
    if (selectedTags.has(name)) selectedTags.delete(name);
    else selectedTags.add(name);
};

function createBookCard(book) {
    const div = document.createElement('div');
    div.className = "book-card-home"; 
    
    let coverSrc = book.cover instanceof Blob ? URL.createObjectURL(book.cover) : "";

    let bannerText = book.status === 'to-read' ? "À lire" : 
                     book.status === 'finished' ? "Fini" : "Lecture";
    
    if (book.bookmark) {
        bannerText = `P. ${book.bookmark}`;
    }

    div.innerHTML = `
        <div class="cover-placeholder">
            <img src="${coverSrc}" alt="${book.title}" loading="lazy">
            <div class="status-banner ${book.status}">
                ${bannerText}
            </div>
        </div>
        <div class="book-meta">
            <span class="book-title">${book.title}</span>
            <span class="book-author">${book.author}</span>
        </div>
    `;

    div.onclick = () => {
        window.history.pushState({}, "", `${BASE_PATH}/book?id=${book.id}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    return div;
}