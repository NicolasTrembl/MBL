function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("MLB_Database", 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains("books")) {
                db.createObjectStore("books", { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains("reviews")) {
                db.createObjectStore("reviews", { keyPath: "id", autoIncrement: true });
            }
            if (!db.objectStoreNames.contains("annotations")) {
                db.createObjectStore("annotations", { keyPath: "id", autoIncrement: true });
            }

            if (!db.objectStoreNames.contains("tags")) {
                db.createObjectStore("tags", { keyPath: "name" });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function fetchImageAsBlob(url) {
    try {
        const response = await fetch(url);
        return await response.blob();
    } catch (e) {
        console.warn("Impossible de récupérer l'image pour le stockage local:", e);
        return null;
    }
}

async function getAllData() {
    const db = await openDB();
    const stores = ["books", "reviews", "annotations", "tags"];
    const data = {};

    for (const storeName of stores) {
        data[storeName] = await new Promise((resolve) => {
            const tx = db.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
        });
    }
    return data;
}

async function handleExportJSON() {
    const data = await getAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mbl_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

async function handleExportExcel() {
    try {
        console.log("Chargement de SheetJS...");
        await loadScript("https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js");
        
        const data = await getAllData(); 
        
        const wb = XLSX.utils.book_new();

        for (const [storeName, items] of Object.entries(data)) {
            const cleanedItems = items.map(item => {
                const copy = { ...item };
                if (copy.image) copy.image = "[Image]"; 
                return copy;
            });
            
            const ws = XLSX.utils.json_to_sheet(cleanedItems);
            XLSX.utils.book_append_sheet(wb, ws, storeName);
        }

        XLSX.writeFile(wb, `mbl_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
        console.error("Erreur lors de l'export Excel:", err);
        alert("Impossible de charger la bibliothèque d'exportation.");
    }
}