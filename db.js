function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("MLB_Database", 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Store pour les LIVRES
            if (!db.objectStoreNames.contains("books")) {
                db.createObjectStore("books", { keyPath: "id" });
            }
            // Store pour les REVIEWS
            if (!db.objectStoreNames.contains("reviews")) {
                db.createObjectStore("reviews", { keyPath: "id", autoIncrement: true });
            }
            // Store pour les ANNOTATIONS
            if (!db.objectStoreNames.contains("annotations")) {
                db.createObjectStore("annotations", { keyPath: "id", autoIncrement: true });
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