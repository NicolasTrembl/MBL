export function init() {
    let html5QrCode = null;
    let isScanning = false;
    let shouldBeScanning = false;
    let selectedBookFullData = null;
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

    function parseBnfXml(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        const records = xmlDoc.getElementsByTagName("srw:record");
        const results = [];

        for (let record of records) {
            const mxcRecord = record.getElementsByTagName("mxc:record")[0];
            if (!mxcRecord) continue;

            const getUnimarc = (tag, code) => {
                const field = Array.from(mxcRecord.getElementsByTagName("mxc:datafield"))
                                .find(f => f.getAttribute("tag") === tag);
                if (!field) return null;
                const subfield = Array.from(field.getElementsByTagName("mxc:subfield"))
                                    .find(s => s.getAttribute("code") === code);
                return subfield ? subfield.textContent.trim() : null;
            };

            const title = getUnimarc("200", "a") || "Titre inconnu";

            const nom = getUnimarc("700", "a") || "";
            const prenom = getUnimarc("700", "b") || "";
            const author = `${prenom} ${nom}`.trim() || "Auteur inconnu";

            const rawYear = getUnimarc("210", "d") || getUnimarc("214", "d") || "";
            const yearMatch = rawYear.match(/\d{4}/);
            const year = yearMatch ? yearMatch[0] : "";

            let pagesRaw = getUnimarc("215", "a") || rawYear;
            let pagesMatch = pagesRaw.match(/(\d+)\s*p\./);
            const pages = pagesMatch ? pagesMatch[1] : "";

            const summary = getUnimarc("330", "a") || "Aucun résumé disponible.";

            const publisher = getUnimarc("210", "c") || "";

            const isbnRaw = getUnimarc("010", "a") || "";
            const isbn = isbnRaw.replace(/[^0-9X]/gi, "");

            results.push({
                title,
                author,
                year,
                pages,
                summary,
                publisher,
                isbn
            });
        }
        return results;
    }

    const views = {
        search: document.getElementById('viewSearch'),
        scan: document.getElementById('viewScan'),
        manual: null
    }

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

    function fillData(book) {
        selectedBookFullData = book;
        document.getElementById('detailTitle').value = book.title || "";
        document.getElementById('detailAuthor').value = book.author || "";
        document.getElementById('detailYear').value = book.year || "";
        
        const img = document.getElementById('prevCover');
        img.onerror = () => {
            if (book.isbn && img.src.includes('openlibrary')) {
                img.src = `https://books.google.com/books/content/images/frontcover/${book.isbn}?fife=w400-h600`;
            }
        };
        if (book.isbn) {
            img.src = `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg`;
        } else {
            img.src = "";
        }
    }

   

    const bookInput = document.getElementById('bookInput');
    const suggestions = document.getElementById('suggestions');

    async function searchBnf(query) {
        const baseUrl = "https://catalogue.bnf.fr/api/SRU";
        
        const cqlQuery = `bib.anywhere any "${query}" and bib.recordtype all "mon"`;
        
        const params = new URLSearchParams({
            version: "1.2",
            operation: "searchRetrieve",
            query: cqlQuery,
            maximumRecords: "10"
        });

        const url = `${baseUrl}?${params.toString()}`;
        const res = await fetch(url);
        return await res.text();
    }
    
    bookInput.addEventListener('input', debounce(async () => {
        const query = bookInput.value;
        if (query.length < 3) {
            suggestions.classList.add('hidden');
            return;
        }
        
        try {
            const xmlText = await searchBnf(encodeURIComponent(query));
            const books = parseBnfXml(xmlText);
            
            suggestions.innerHTML = "";
            books.forEach(book => {
                const li = document.createElement('li');
                li.textContent = `${book.title} (${book.author})`;
                li.onclick = () => {
                    fillData(book);
                    suggestions.classList.add('hidden');
                };
                suggestions.appendChild(li);
            });
            suggestions.classList.remove('hidden');
        } catch (err) {
            console.error("Erreur de recherche BnF:", err);
        }
    }, 750));

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
            await html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess);
            isScanning = true;
            const dash = document.getElementById('reader__dashboard');
            if (dash) dash.style.display = 'none';
            if (!shouldBeScanning) await stopScanner();
        } catch (err) {
            console.error("Échec démarrage scanner:", err);
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
            console.warn("Erreur lors de l'arrêt:", err);
        }
    }

    async function onScanSuccess(decodedText) {
        console.log("Code scanné:", decodedText);
        try {
            const url = `https://catalogue.bnf.fr/api/sru?version=1.2&operation=searchRetrieve&query=bib.isbn%20all%20%22${decodedText}%22`;
            const res = await fetch(url);
            const xmlText = await res.text();
            const books = parseBnfXml(xmlText);

            if (books.length > 0) {
                fillData(books[0]);
                shouldBeScanning = false;
                await stopScanner();
            }
        } catch (err) {
            console.error("Erreur API BnF:", err);
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

        if (!title) {
            alert("Le titre est requis !");
            return;
        }

        const coverElement = document.getElementById('prevCover');
        const coverUrl = coverElement.src;
        let coverBlob = null;
        
        if (coverUrl && !coverUrl.startsWith('data:')) {
            coverBlob = await fetchImageAsBlob(coverUrl);
        } else if (coverUrl.startsWith('data:')) {
            const res = await fetch(coverUrl);
            coverBlob = await res.blob();
        }

        const newBook = {
            id: crypto.randomUUID(),
            title: title,
            author: author,
            year: year,
            pages: selectedBookFullData?.pages || "",
            summary: selectedBookFullData?.summary || "",
            publisher: selectedBookFullData?.publisher || "",
            isbn: selectedBookFullData?.isbn || "",
            cover: coverBlob,
            status: "to-read",
            readCount: 0,
            dateAdded: new Date().toISOString()
        };

        try {
            const db = await openDB();
            const transaction = db.transaction("books", "readwrite");
            await transaction.objectStore("books").add(newBook);
            
            selectedBookFullData = null;
            
            window.history.pushState({}, "", BASE_PATH + "/home");
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