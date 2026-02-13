let allBooks = [];
let allReviews = [];
let selectedTags = new Set();

export async function init() {
    const gridView = document.getElementById("gridView"); 
    const db = await openDB();
    
    const [books, reviews] = await Promise.all([
        new Promise(r => {
            const req = db.transaction("books", "readonly").objectStore("books").getAll();
            req.onsuccess = () => r(req.result);
        }),
        new Promise(r => {
            const req = db.transaction("reviews", "readonly").objectStore("reviews").getAll();
            req.onsuccess = () => r(req.result);
        })
    ]);

    allBooks = books;
    allReviews = reviews;

    const render = () => {
        const query = document.getElementById('searchInput').value.toLowerCase();
        const statusFilter = document.getElementById('filterStatus').value;
        const tagMode = document.getElementById('tagFilterMode').value;
        const sortOrder = document.getElementById('sortOrder').value;

        let filtered = allBooks.filter(book => {
            const matchesSearch = book.title.toLowerCase().includes(query) || 
                                 book.author.toLowerCase().includes(query);
            
            const matchesStatus = statusFilter === 'all' || book.status === statusFilter;
            
            const tagsArray = Array.from(selectedTags);
            const matchesTags = selectedTags.size === 0 || (book.tags && (
                tagMode === 'and' 
                ? tagsArray.every(t => book.tags.includes(t))
                : tagsArray.some(t => book.tags.includes(t))
            ));

            return matchesSearch && matchesStatus && matchesTags;
        });

        filtered.sort((a, b) => {
            const reviewA = allReviews.find(r => r.bookId === a.id);
            const reviewB = allReviews.find(r => r.bookId === b.id);
            const ratingA = reviewA ? reviewA.rating : 0;
            const ratingB = reviewB ? reviewB.rating : 0;

            switch (sortOrder) {
                case 'date-desc': return new Date(b.dateUpdated || 0) - new Date(a.dateUpdated || 0);
                case 'date-asc': return new Date(a.dateUpdated || 0) - new Date(b.dateUpdated || 0);
                case 'rating-desc': return ratingB - ratingA;
                case 'rating-asc': return ratingA - ratingB;
                default: return 0;
            }
        });

        gridView.innerHTML = "";
        filtered.forEach(book => gridView.appendChild(createBookCard(book)));
    };

    const checkTagsAvailability = async () => {
        const tx = db.transaction("tags", "readonly");
        const tags = await new Promise(r => {
            const req = tx.objectStore("tags").getAll();
            req.onsuccess = () => r(req.result);
        });
        
        const section = document.getElementById('tagFilterSection');
        if (tags.length === 0) {
            section.classList.add('hidden');
        } else {
            section.classList.remove('hidden');
        }
        return tags;
    };

    document.getElementById('searchInput').addEventListener('input', render);

    document.getElementById('openFilterBtn').addEventListener('click', async () => {
        const tags = await checkTagsAvailability();
        if (tags.length > 0) {
            const container = document.getElementById('filterTagsContainer');
            container.innerHTML = tags.map(t => `
                <span class="tag-chip ${selectedTags.has(t.name) ? 'active' : ''}" 
                      onclick="this.classList.toggle('active'); toggleFilterTag('${t.name}')">
                    ${t.name}
                </span>
            `).join('');
        }
        document.getElementById('filterModal').classList.remove('hidden');
    });

    document.getElementById('applyFilters').addEventListener('click', () => {
        document.getElementById('filterModal').classList.add('hidden');
        render();
    });

    document.getElementById('resetFilters').addEventListener('click', () => {
        selectedTags.clear();
        document.getElementById('filterStatus').value = 'all';
        document.getElementById('sortOrder').value = 'date-desc';
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