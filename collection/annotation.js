let allAnnotations = [];
let allBooks = [];

export async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const bookIdFromUrl = urlParams.get('bookId');
    const container = document.getElementById("annotationList");
    const db = await openDB();

    const searchInput = document.getElementById('searchInput');
    const filterBookSelect = document.getElementById('filterBookSelect');
    const typeFilter = document.getElementById('filterType');
    const sortOrder = document.getElementById('sortOrder');
    
    const noteModal = document.getElementById('noteModal');
    const bookSelectAdd = document.getElementById('noteBookSelect');
    const noteText = document.getElementById('noteText');
    const noteQuote = document.getElementById('noteQuote');
    const notePage = document.getElementById('notePage');
    const noteImage = document.getElementById('noteImage');

    const [notes, books] = await Promise.all([
        new Promise(r => {
            const req = db.transaction("annotations", "readonly").objectStore("annotations").getAll();
            req.onsuccess = () => r(req.result);
        }),
        new Promise(r => {
            const req = db.transaction("books", "readonly").objectStore("books").getAll();
            req.onsuccess = () => r(req.result);
        })
    ]);

    allAnnotations = notes;
    allBooks = books;

    const bookOptions = allBooks.map(b => `<option value="${b.id}">${b.title}</option>`).join('');
    filterBookSelect.innerHTML = `<option value="all">Tous les livres</option>` + bookOptions;
    bookSelectAdd.innerHTML = bookOptions;

    if (bookIdFromUrl) {
        filterBookSelect.value = bookIdFromUrl;
        bookSelectAdd.value = bookIdFromUrl;
    }

    const render = () => {
        const query = searchInput.value.toLowerCase();
        const selectedBookId = filterBookSelect.value;
        const selectedType = typeFilter.value;
        const selectedSort = sortOrder.value;

        let filtered = allAnnotations.filter(note => {
            const matchesBook = selectedBookId === 'all' || note.bookId === selectedBookId;
            const matchesSearch = note.text.toLowerCase().includes(query) || 
                                 (note.quote && note.quote.toLowerCase().includes(query));
            const matchesType = selectedType === 'all' || 
                               (selectedType === 'has-image' && note.image) ||
                               (selectedType === 'has-quote' && note.quote);

            return matchesBook && matchesSearch && matchesType;
        });

        filtered.sort((a, b) => {
            if (selectedSort === 'date-desc') return new Date(b.date) - new Date(a.date);
            if (selectedSort === 'date-asc') return new Date(a.date) - new Date(b.date);
            if (selectedSort === 'page-asc') return (a.page || 0) - (b.page || 0);
            return 0;
        });

        container.innerHTML = filtered.length > 0 
            ? filtered.map(note => createNoteCard(note)).join('')
            : `<p style="text-align:center; padding:20px; color: var(--background-variant);">Aucune note trouvée.</p>`;
        
        lucide.createIcons();
    };

    searchInput.oninput = render;

    document.getElementById('addNoteBtn').onclick = () => {
        if (allBooks.length === 0) return;
        noteModal.classList.remove('hidden');
    };
    document.getElementById('applyFilters').onclick = () => {
        document.getElementById('filterModal').classList.add('hidden');
        render();
    };

    document.getElementById('resetFilters').onclick = () => {
        filterBookSelect.value = 'all';
        typeFilter.value = 'all';
        sortOrder.value = 'date-desc';
        render();
    };

    document.getElementById('addNoteBtn').onclick = () => noteModal.classList.remove('hidden');
    document.getElementById('closeNoteModal').onclick = () => noteModal.classList.add('hidden');

    document.getElementById('saveNoteBtn').onclick = async () => {
        if (!noteText.value.trim()) return alert("La note est vide !");

        const newNote = {
            bookId: bookSelectAdd.value,
            text: noteText.value.trim(),
            quote: noteQuote.value.trim(),
            page: parseInt(notePage.value) || null,
            image: noteImage.files[0] || null,
            date: new Date().toISOString()
        };

        const tx = db.transaction("annotations", "readwrite");
        const req = tx.objectStore("annotations").add(newNote);
        
        req.onsuccess = () => {
            allAnnotations.push({ ...newNote, id: req.result });
            noteModal.classList.add('hidden');
            noteText.value = ""; noteQuote.value = ""; notePage.value = ""; noteImage.value = "";
            render();
        };
    };

    render();
}

function createNoteCard(note) {
    const book = allBooks.find(b => b.id === note.bookId);
    const dateStr = new Date(note.date).toLocaleDateString('fr-FR');
    
    let imageHtml = "";
    if (note.image) {
        const url = URL.createObjectURL(note.image);
        imageHtml = `<img src="${url}" style="width:100%; border-radius:var(--s-radius); margin-bottom:8px; display:block;">`;
    }

    return `
        <div class="book-card note-card">
            <div class="note-card-header">
                <span class="note-title">${book ? book.title : 'Livre inconnu'}</span>
                <span>${dateStr}</span>
            </div>
            ${imageHtml}
            ${note.quote ? `
                <blockquote>
                    "${note.quote}"
                </blockquote>` : ''}
            
            <p class="note-text">
                ${note.text}
            </p>

            ${note.page ? `<div class="note-page">Page ${note.page}</div>` : ''}
        </div>
    `;
}