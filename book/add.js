export function init() {
    let html5QrCode = null;
    let isScanning = false;
    let shouldBeScanning = false;
   
    let scannerActionQueue = Promise.resolve();

    async function queueScannerAction(actionFn) {
        scannerActionQueue = scannerActionQueue.then(actionFn).catch(err => {
            console.warn("Erreur dans la file d'attente du scanner:", err);
        });
        return scannerActionQueue;
    }

    try {
        html5QrCode = new Html5Qrcode("reader", { 
            formatsToSupport: [ Html5QrcodeSupportedFormats.EAN_13 ] 
        });
    } catch (err) {
        console.error("Erreur d'initialisation:", err);
    }
   
    const views = {
        search: document.getElementById('viewSearch'),
        scan: document.getElementById('viewScan'),
        manual: null
    }
    
    
    // Link every 'tab' button
    document.querySelectorAll('.mode-selector button').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const mode = e.currentTarget.id.replace('mode', '').toLowerCase();
            const container = document.querySelector(".add-container");

            document.querySelectorAll('.mode-selector button').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');

            if (mode === 'manual') {
                container.style.justifyContent = 'flex-start';
                document.getElementById('uploadHint')?.classList.remove('hidden');
            } else {
                container.style.justifyContent = 'space-between';
                document.getElementById('uploadHint')?.classList.add('hidden');
            }

            Object.values(views).forEach(v => v?.classList.add('hidden'));
            if (views[mode]) views[mode].classList.remove('hidden');

            if (mode === 'scan') {
                shouldBeScanning = true;
                queueScannerAction(() => startScanner());
            } else {
                shouldBeScanning = false;
                queueScannerAction(() => stopScanner());
            }
        });
    });

    const coverWrapper = document.getElementById('coverWrapper');
    const coverInput = document.getElementById('coverInput');

    coverWrapper.addEventListener('click', () => {
        if (document.getElementById('modeManual').classList.contains('active')) {
            coverInput.click();
        }
    });

    coverInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('prevCover').src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });


    function fillData(book) {
        document.getElementById('detailTitle').value = book.title || "";
        document.getElementById('detailAuthor').value = book.authors ? book.authors[0].name : (book.author_name ? book.author_name[0] : "");
        document.getElementById('detailYear').value = book.publish_date || book.first_publish_year || "";
        
        const img = document.getElementById('prevCover');
        
        let coverUrl = null;
        if (book.cover && book.cover.medium) {
            coverUrl = book.cover.medium;
        } else if (book.cover_i) {
            coverUrl = `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`;
        }

        if (coverUrl) {
            img.src = coverUrl;
        } else {
            img.src = "";
        }
    }

    const bookInput = document.getElementById('bookInput');
    const suggestions = document.getElementById('suggestions');
    
    bookInput.addEventListener('input', debounce(async () => {
        const query = bookInput.value;
        if (query.length < 3) {
            suggestions.classList.add('hidden');
            return;
        }
        
        try {
            const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`);
            const data = await res.json();
            
            suggestions.innerHTML = "";
            data.docs.forEach(doc => {
                const li = document.createElement('li');
                li.textContent = doc.title;
                li.onclick = () => {
                    fillData(doc);
                    suggestions.classList.add('hidden');
                };
                suggestions.appendChild(li);
            });
            suggestions.classList.remove('hidden');
        } catch (err) {
            console.error("Erreur de recherche:", err);
        }
    }, 500));


    async function startScanner() {
        if (isScanning || !html5QrCode) return;

        const config = { 
            fps: 60, 
            qrbox: { width: 280, height: 120 },
            focusMode: "continuous",
            aspectRatio: 1.777778,
            disableFlip: true,
            experimentalFeatures: { useBarCodeDetectorIfSupported: true }
        };

        try {
            await html5QrCode.start(
                { facingMode: "environment" },
                config, 
                onScanSuccess
            );
            isScanning = true;
            
            const dash = document.getElementById('reader__dashboard');
            if (dash) dash.style.display = 'none';

            if (!shouldBeScanning) {
                await stopScanner();
            }
        } catch (err) {
            console.error("Échec critique démarrage:", err);
            isScanning = false;
        }
    }

    async function stopScanner() {
        if (!isScanning || !html5QrCode) return;

        try {
            await html5QrCode.stop();
            isScanning = false;
            const reader = document.getElementById('reader');
            if (reader) reader.innerHTML = ''; 
        } catch (err) {
            console.warn("Erreur lors de l'arrêt (souvent sans conséquence):", err);
        }
}

    async function onScanSuccess(decodedText) {
        console.log("Code scanné:", decodedText);
        try {
            const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${decodedText}&format=json&jscmd=data`);
            const data = await res.json();
            const bookKey = `ISBN:${decodedText}`;
            if (data[bookKey]) {
                fillData(data[bookKey]);
                shouldBeScanning = false;
                await stopScanner();
            }
        } catch (err) {
            console.error("Erreur API:", err);
        }
    }

    function debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    document.getElementById('saveBookBtn')?.addEventListener('click', async () => {
        const title = document.getElementById('detailTitle').value.trim();
        const author = document.getElementById('detailAuthor').value.trim();
        const year = document.getElementById('detailYear').value.trim();
        const coverElement = document.getElementById('prevCover');
        const coverUrl = coverElement.src;

        if (!title) {
            alert("Le titre est requis !");
            return;
        }

        let coverBlob = null;
        if (coverUrl && !coverUrl.startsWith('data:')) {
            coverBlob = await fetchImageAsBlob(coverUrl);
        } else if (coverUrl.startsWith('data:')) {
            const res = await fetch(coverUrl);
            coverBlob = await res.blob();
        }

        const newBook = {
            id: crypto.randomUUID(),
            title,
            author,
            year,
            cover: coverBlob,
            status: "to-read",
            readCount: 0,
            dateAdded: new Date().toISOString()
        };

        try {
            const db = await openDB();
            const transaction = db.transaction("books", "readwrite");
            await transaction.objectStore("books").add(newBook);
                        
            window.history.pushState({}, "", "/home");
            window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (err) {
            console.error("Erreur IndexedDB:", err);
        }
    });

    lucide.createIcons();
    
    return async () => {
        console.log("Nettoyage du module add.js...");
        await stopScanner();
    };
}