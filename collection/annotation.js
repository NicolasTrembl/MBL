let allAnnotations = [];
let allBooks = [];
let editingNoteId = null;

export async function init() {
    const db = await openDB();
    const container = document.getElementById("annotationList");
    
    const modal = document.getElementById('noteModal');
    const modalTitle = document.getElementById('modalTitle');
    const deleteBtn = document.getElementById('deleteNoteBtn');
    const bookSelect = document.getElementById('noteBookSelect');
    
    const fields = {
        text: document.getElementById('noteText'),
        quote: document.getElementById('noteQuote'),
        page: document.getElementById('notePage'),
        image: document.getElementById('noteImage')
    };

    const loadData = async () => {
        const [notes, books] = await Promise.all([
            new Promise(r => db.transaction("annotations").objectStore("annotations").getAll().onsuccess = e => r(e.target.result)),
            new Promise(r => db.transaction("books").objectStore("books").getAll().onsuccess = e => r(e.target.result))
        ]);
        allAnnotations = notes;
        allBooks = books;
        
        bookSelect.innerHTML = allBooks.map(b => `<option value="${b.id}">${b.title}</option>`).join('');
    };

    const render = () => {
        const query = document.getElementById('searchInput').value.toLowerCase();
        
        const filtered = allAnnotations.filter(n => 
            n.text.toLowerCase().includes(query) || (n.quote && n.quote.toLowerCase().includes(query))
        ).sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = filtered.length 
            ? filtered.map(note => createNoteCard(note)).join('')
            : `<p style="text-align:center; padding:40px; opacity:0.5;">Aucune note ici...</p>`;
        
        document.querySelectorAll('.edit-trigger').forEach(btn => {
            btn.onclick = () => openModal(Number(btn.dataset.id)); 
        });
    };

    const openModal = (id = null) => {
        editingNoteId = id; 
        if (id) {
            const note = allAnnotations.find(n => n.id === id);
            modalTitle.innerText = "Modifier l'annotation";
            deleteBtn.classList.remove('hidden');
            bookSelect.value = note.bookId;
            fields.text.value = note.text;
            fields.quote.value = note.quote || "";
            fields.page.value = note.page || "";
        } else {
            modalTitle.innerText = "Nouvelle Annotation";
            deleteBtn.classList.add('hidden');
            fields.text.value = ""; fields.quote.value = ""; fields.page.value = ""; fields.image.value = "";
        }
        modal.classList.remove('hidden');
    };

    document.getElementById('saveNoteBtn').onclick = async () => {
        if (!fields.text.value.trim()) return alert("Veuillez écrire une note.");

        const noteData = {
            bookId: bookSelect.value,
            text: fields.text.value.trim(),
            quote: fields.quote.value.trim(),
            page: parseInt(fields.page.value) || null,
            date: editingNoteId ? allAnnotations.find(n => n.id === editingNoteId).date : new Date().toISOString()
        };

        if (fields.image.files[0]) {
            noteData.image = fields.image.files[0];
        } else if (editingNoteId) {
            noteData.image = allAnnotations.find(n => n.id === editingNoteId).image;
        }

        const tx = db.transaction("annotations", "readwrite");
        const store = tx.objectStore("annotations");
        
        if (editingNoteId) {
            noteData.id = editingNoteId;
            store.put(noteData).onsuccess = () => {
                const idx = allAnnotations.findIndex(n => n.id === editingNoteId);
                allAnnotations[idx] = noteData;
                finishUpdate();
            };
        } else {
            const req = store.add(noteData);
            req.onsuccess = () => {
                noteData.id = req.result;
                allAnnotations.push(noteData);
                finishUpdate();
            };
        }
    };

    deleteBtn.onclick = async () => {
        if (!confirm("Supprimer définitivement cette note ?")) return;
        
        const idToDelete = Number(editingNoteId); 
        
        const tx = db.transaction("annotations", "readwrite");
        tx.objectStore("annotations").delete(idToDelete).onsuccess = () => {
            allAnnotations = allAnnotations.filter(n => n.id !== idToDelete);
            finishUpdate();
        };
    };

    const finishUpdate = () => {
        modal.classList.add('hidden');
        render();
    };

    document.getElementById('addNoteBtn').onclick = () => openModal();
    document.getElementById('closeNoteModal').onclick = () => modal.classList.add('hidden');
    document.getElementById('searchInput').oninput = render;

    await loadData();
    render();
}

function createNoteCard(note) {
    const book = allBooks.find(b => b.id === note.bookId);
    const dateStr = new Date(note.date).toLocaleDateString('fr-FR');
    const imageHtml = note.image ? `<img src="${URL.createObjectURL(note.image)}" style="width:100%; border-radius:8px; margin: 10px 0;">` : "";

    return `
        <div class="book-card note-card">
            <div class="note-card-header">
                <span class="note-title">${book ? book.title : 'Livre inconnu'}</span>
                <div style="display:flex; align-items:center; gap:12px;">
                    <span>${dateStr}</span>
                    <button class="edit-trigger" data-id="${note.id}" style="color: var(--background-variant);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16px" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pen-line-icon lucide-pen-line"><path d="M13 21h8"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>
                    </button>
                </div>
            </div>
            ${imageHtml}
            ${note.quote ? `<blockquote>"${note.quote}"</blockquote>` : ''}
            <p class="note-text">${note.text}</p>
            ${note.page ? `<div class="note-page">Page ${note.page}</div>` : ''}
        </div>
    `;
}