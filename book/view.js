export async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('id');
    const db = await openDB();
    let isEditing = false;
    let currentBook = null;

    if (!bookId) return goBack();

    try {
        const tx = db.transaction("books", "readonly");
        currentBook = await new Promise(r => {
            const req = tx.objectStore("books").get(bookId);
            req.onsuccess = () => r(req.result);
        });
        if (!currentBook) throw new Error();
        renderBook(currentBook);
    } catch (e) {
        alert("Livre introuvable");
        return goBack();
    }

    const bookmarkBtn = document.getElementById('bookmarkBtn');
    const bookmarkModal = document.getElementById('bookmarkModal');
    const bookmarkInput = document.getElementById('bookmarkInput');

    bookmarkBtn.addEventListener('click', () => {
        bookmarkInput.value = currentBook.bookmark || "";
        bookmarkModal.classList.remove('hidden');
        bookmarkInput.focus();
    });

    document.getElementById('cancelBookmark').addEventListener('click', () => {
        bookmarkModal.classList.add('hidden');
    });

    document.getElementById('confirmBookmark').addEventListener('click', async () => {
        const pageValue = parseInt(bookmarkInput.value);
        
        if (isNaN(pageValue) && bookmarkInput.value !== "") {
            return alert("Veuillez entrer un nombre valide");
        }

        const tx = db.transaction("books", "readwrite");
        const store = tx.objectStore("books");
        
        currentBook.bookmark = bookmarkInput.value === "" ? null : pageValue;
        
        await store.put(currentBook);
        
        bookmarkModal.classList.add('hidden');
        renderBook(currentBook); 
    });

    function renderBook(book) {
        document.getElementById('detailTitle').value = book.title;
        document.getElementById('detailAuthor').value = book.author;
        document.getElementById('detailYear').value = book.year;
        document.getElementById('detailStatus').value = book.status || "to-read";
        
        const bookmarkBtn = document.getElementById('bookmarkBtn');
        if (book.bookmark) {
            bookmarkBtn.innerHTML = `<span style="font-weight: bold; font-size: 1.1rem;">${book.bookmark}</span>`;
        } else {
            bookmarkBtn.innerHTML = `<i data-lucide="bookmark"></i>`;
            lucide.createIcons();
        }

        if (book.cover instanceof Blob) {
            document.getElementById('prevCover').src = URL.createObjectURL(book.cover);
        }
    }

    const toggleEditBtn = document.getElementById('toggleEditBtn');
    const editActions = document.getElementById('editActions');
    const editOverlay = document.getElementById('editOverlay');
    const inputs = ['detailTitle', 'detailAuthor', 'detailYear'];

    toggleEditBtn.addEventListener('click', () => {
        isEditing = !isEditing;
        
        toggleEditBtn.innerHTML = isEditing ? '<i data-lucide="x"></i>' : '<i data-lucide="edit-3"></i>';
        toggleEditBtn.style.background = isEditing ? '#dc3545' : '';

        inputs.forEach(id => {
            const el = document.getElementById(id);
            el.readOnly = !isEditing;
            el.classList.toggle('readonly-input', !isEditing);
        });

        editActions.classList.toggle('hidden', !isEditing);
        editOverlay.classList.toggle('hidden', !isEditing);
        lucide.createIcons();
    });

    document.getElementById('detailStatus').addEventListener('change', async (e) => {
        const newStatus = e.target.value;
        const tx = db.transaction("books", "readwrite");
        const store = tx.objectStore("books");
        const book = await new Promise(r => {
            const req = store.get(bookId);
            req.onsuccess = () => r(req.result);
        });
        
        book.status = newStatus;
        await store.put(book);
    });

    document.getElementById('saveBookBtn').addEventListener('click', async () => {
        const title = document.getElementById('detailTitle').value.trim();
        if (!title) return alert("Le titre est requis");

        const tx = db.transaction("books", "readwrite");
        const store = tx.objectStore("books");
        
        const updatedData = {
            ...currentBook,
            title,
            author: document.getElementById('detailAuthor').value.trim(),
            year: document.getElementById('detailYear').value.trim(),
            status: document.getElementById('detailStatus').value,
            dateUpdated: new Date().toISOString()
        };

        const coverSrc = document.getElementById('prevCover').src;
        if (coverSrc.startsWith('data:')) {
            const res = await fetch(coverSrc);
            updatedData.cover = await res.blob();
        }

        await store.put(updatedData);
        alert("Modifications enregistrées");
        location.reload();
    });

    document.getElementById('coverWrapper').addEventListener('click', () => {
        if (isEditing) document.getElementById('coverInput').click();
    });

    document.getElementById('coverInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => document.getElementById('prevCover').src = ev.target.result;
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('deleteBookBtn').addEventListener('click', async () => {
        if (confirm("Supprimer ce livre ?")) {
            const tx = db.transaction("books", "readwrite");
            await tx.objectStore("books").delete(bookId);
            goBack();
        }
    });

    function goBack() {
        window.history.pushState({}, "", BASE_PATH + "/home");
        window.dispatchEvent(new PopStateEvent('popstate'));
    }

    lucide.createIcons();
}