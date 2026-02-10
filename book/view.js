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

    function normalizeTag(str) {
        if (!str) return "";
        return str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase();
    }

    async function updateTagSuggestions() {
        const datalist = document.getElementById('existingTags');
        const tx = db.transaction("tags", "readonly");
        const store = tx.objectStore("tags");
        
        const allTags = await new Promise(r => {
            const req = store.getAll();
            req.onsuccess = () => r(req.result);
        });

        datalist.innerHTML = allTags
            .map(tag => `<option value="${tag.name}">`)
            .join('');
    }

    const notesBtn = document.getElementById('notesBtn');
    notesBtn.addEventListener('click', () => {
        window.history.pushState({}, "", BASE_PATH + "/annotation?bookId=" + bookId);
        router();
    });

    const bookmarkBtn = document.getElementById('bookmarkBtn');
    const bookmarkModal = document.getElementById('bookmarkModal');
    const bookmarkInput = document.getElementById('bookmarkInput');

    
    const tagModal = document.getElementById('tagModal');
    const tagInput = document.getElementById('tagInput');
    const tagsList = document.getElementById('tagsList');

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

    let currentRating = 0;

    const reviewBtn = document.getElementById('reviewBtn');
    const reviewModal = document.getElementById('reviewModal');
    const reviewText = document.getElementById('reviewText');
    const starContainer = document.getElementById('starRating');

    function setupStars() {
        starContainer.innerHTML = '';
        for (let i = 1; i <= 10; i++) {
            const div = document.createElement('div');
            const star = document.createElement('i');
            star.setAttribute('data-lucide', 'star');
            star.style.width = '24px';
            star.style.color = 'var(--highlight-color)';
            div.addEventListener('click', () => setRating(i));
            div.appendChild(star);
            starContainer.appendChild(div);

        }
        lucide.createIcons();
    }

    function setRating(rating) {
        currentRating = rating;
        const stars = starContainer.querySelectorAll('svg');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.style.fill = '#ffc107';
                star.style.color = '#ffc107';
            } else {
                star.style.fill = 'none';
                star.style.color = 'var(--highlight-color)';
            }
        });
    }

    reviewBtn.addEventListener('click', async () => {
        const tx = db.transaction("reviews", "readonly");
        const store = tx.objectStore("reviews");
        
        const allReviews = await new Promise(r => {
            const req = store.getAll();
            req.onsuccess = () => r(req.result);
        });
        
        const existingReview = allReviews.find(r => r.bookId === bookId);

        setupStars();
        if (existingReview) {
            setRating(existingReview.rating);
            reviewText.value = existingReview.comment || "";
            reviewBtn.dataset.reviewId = existingReview.id;
        } else {
            setRating(0);
            reviewText.value = "";
            delete reviewBtn.dataset.reviewId;
        }

        reviewModal.classList.remove('hidden');
    });

    document.getElementById('cancelReview').addEventListener('click', () => {
        reviewModal.classList.add('hidden');
    });

    document.getElementById('confirmReview').addEventListener('click', async () => {
        if (currentRating === 0) return alert("Veuillez donner une note");

        const tx = db.transaction("reviews", "readwrite");
        const store = tx.objectStore("reviews");

        const reviewData = {
            bookId: bookId,
            rating: currentRating,
            comment: reviewText.value.trim(),
            date: new Date().toISOString()
        };

        if (reviewBtn.dataset.reviewId) {
            reviewData.id = parseInt(reviewBtn.dataset.reviewId);
        }

        await store.put(reviewData);
        reviewModal.classList.add('hidden');
        
        updateReviewIcon(currentRating);
    });

    function updateReviewIcon(rating) {
        if (rating > 0) {
            reviewBtn.innerHTML = `<span style="font-weight: bold; color: #ffc107; align-content: center; font-size: large;">${rating}</span>`;
        } else {
            reviewBtn.innerHTML = `<i data-lucide="star"></i>`;
            lucide.createIcons();
        }
    }

    const txRev = db.transaction("reviews", "readonly");
    const reqRev = txRev.objectStore("reviews").getAll();
    reqRev.onsuccess = () => {
        const rev = reqRev.result.find(r => r.bookId === bookId);
        if (rev) updateReviewIcon(rev.rating);
    };

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

        const tagsContainer = document.getElementById('tagsList');
        const addBtn = document.getElementById('openTagModalBtn');
        tagsContainer.innerHTML = '';
        
        if (book.tags && book.tags.length > 0) {
            book.tags.forEach(tag => {
                const chip = document.createElement('span');
                chip.className = 'tag-chip';
                chip.innerHTML = `
                    ${tag} 
                    <span class="remove-tag" data-tag="${tag}">&times;</span>
                `;
                tagsContainer.appendChild(chip);
            });
        }
        tagsContainer.appendChild(addBtn);
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

    document.getElementById('openTagModalBtn').addEventListener('click', async () => {
        tagInput.value = "";
        await updateTagSuggestions();
        tagModal.classList.remove('hidden');
        tagInput.focus();
    });

    document.getElementById('confirmTag').addEventListener('click', async () => {
        const rawValue = tagInput.value.trim();
        if (!rawValue) return;
        
        const formattedTag = normalizeTag(rawValue);

        if (!currentBook.tags) currentBook.tags = [];
        
        if (!currentBook.tags.includes(formattedTag)) {
            currentBook.tags.push(formattedTag);
            
            const txBook = db.transaction("books", "readwrite");
            await txBook.objectStore("books").put(currentBook);

            const txTag = db.transaction("tags", "readwrite");
            await txTag.objectStore("tags").put({ name: formattedTag });
        }

        tagModal.classList.add('hidden');
        renderBook(currentBook);
    });

    tagsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('remove-tag')) {
            const tagToRemove = e.target.getAttribute('data-tag');
            currentBook.tags = currentBook.tags.filter(t => t !== tagToRemove);
            
            const tx = db.transaction("books", "readwrite");
            await tx.objectStore("books").put(currentBook);
            
            renderBook(currentBook);
        }
    });

    document.getElementById('cancelTag').addEventListener('click', () => {
        tagModal.classList.add('hidden');
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