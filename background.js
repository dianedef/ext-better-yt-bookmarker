// Initialisation des signets lors de l'installation de l'extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installée ou mise à jour");
  initializeBookmarks();
});

// Fonction pour initialiser les signets
function initializeBookmarks() {
  chrome.storage.sync.set({ bookmarks: [] }, () => {
    if (chrome.runtime.lastError) {
      console.error("Erreur lors de l'initialisation des signets:", chrome.runtime.lastError);
    } else {
      console.log("Signets initialisés avec succès");
    }
  });
}

// Fonction utilitaire pour obtenir les bookmarks
function getBookmarks() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get({ bookmarks: [] }, ({ bookmarks }) => {
      if (chrome.runtime.lastError) {
        reject(new Error(`Erreur lors de la récupération des bookmarks : ${chrome.runtime.lastError.message}`));
      } else {
        resolve(bookmarks || []); // Assurons-nous de toujours renvoyer un tableau
      }
    });
  });
}

// Fonction utilitaire pour mettre à jour les bookmarks
function setBookmarks(bookmarks) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ bookmarks: bookmarks || [] }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(`Erreur lors de la mise à jour des bookmarks : ${chrome.runtime.lastError.message}`));
      } else {
        resolve({ success: true });
      }
    });
  });
}

// Fonction pour valider un bookmark
function validateBookmark(bookmark) {
  if (!bookmark.url || !bookmark.time) {
    throw new Error("Le bookmark doit contenir une URL et un temps valides.");
  }
}

// Écouteur d'événements pour les messages envoyés à l'extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "initialize") {
    chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
      if (chrome.runtime.lastError) {
        console.error("Erreur lors de l'initialisation:", chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        if (!bookmarks) {
          // Initialiser les signets si ils n'existent pas
          chrome.storage.sync.set({ bookmarks: [] }, () => {
            if (chrome.runtime.lastError) {
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
              sendResponse({ success: true });
            }
          });
        } else {
          sendResponse({ success: true });
        }
      }
    });
    return true; // Indique que la réponse sera envoyée de manière asynchrone
  } else if (request.action === "getBookmarks") {
    getBookmarks()
      .then(bookmarks => {
        sendResponse({ bookmarks });
      })
      .catch(error => {
        console.error("Erreur lors de la récupération des signets:", error);
        sendResponse({ error: error.message });
      });
    return true; // Indique que la réponse sera envoyée de manière asynchrone
  } else if (request.action === "addBookmark") {
    const newBookmark = request.bookmark;

    try {
      validateBookmark(newBookmark); // Validation du bookmark
      getBookmarks()
        .then(bookmarks => {
          // Vérifiez si le bookmark existe déjà avant de l'ajouter
          const existingBookmark = bookmarks.find(b => 
            b.url === newBookmark.url && b.time === newBookmark.time
          );
          if (!existingBookmark) {
            bookmarks.push(newBookmark); // Ajout du nouveau signet
            return setBookmarks(bookmarks);
          } else {
            sendResponse({ success: true }); // Le bookmark existe déjà, pas besoin de l'ajouter à nouveau
          }
        })
        .then(() => {
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error("Erreur lors de l'ajout du marque-page:", error);
          sendResponse({ success: false, error: error.message });
        });
    } catch (error) {
      console.error("Erreur de validation du marque-page:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Indique que la réponse sera envoyée de manière asynchrone
  } else if (request.action === "deleteBookmark") {
    const bookmarkToDelete = request.bookmark;
    getBookmarks()
      .then(bookmarks => {
        const updatedBookmarks = bookmarks.filter(b => 
          !(b.url === bookmarkToDelete.url && b.time === bookmarkToDelete.time)
        );
        return setBookmarks(updatedBookmarks);
      })
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error("Erreur lors de la suppression du marque-page:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indique que la réponse sera envoyée de manière asynchrone
  }
});
