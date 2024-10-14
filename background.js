const BMBackground = {
  bookmarks: [],

  async initializeBookmarks() {
    try {
      await chrome.storage.sync.set({ bookmarks: [] });
    } catch (error) {
      console.error("Erreur lors de l'initialisation des marque-pages:", error);
    }
  },

  async getBookmarks() {
    try {
      const result = await chrome.storage.sync.get('bookmarks');
      return { bookmarks: result.bookmarks || [] };
    } catch (error) {
      console.error("Erreur lors de la récupération des marque-pages:", error);
      return { error: error.message };
    }
  },

  async setBookmarks(bookmarks) {
    try {
      await chrome.storage.sync.set({ bookmarks: bookmarks || [] });
    } catch (error) {
      console.error("Erreur lors de la mise à jour des bookmarks : ", error);
    }
  },

  validateBookmark(bookmark) {
    if (!bookmark.url || !bookmark.time) {
      throw new Error("Le bookmark doit contenir une URL et un temps valides.");
    }
  },

  async groupBookmarksByUrl(bookmarks) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const grouped = bookmarks.reduce((acc, bookmark) => {
          if (!acc[bookmark.url]) {
            acc[bookmark.url] = {
              title: bookmark.title,
              url: bookmark.url,
              bmList: []
            };
          }
          acc[bookmark.url].bmList.push({
            time: bookmark.time,
            note: bookmark.note
          });
          return acc;
        }, {});
        resolve(grouped);
      }, 0);
    });
  },

  async getGroupedBookmarks() {
    try {
      const result = await chrome.storage.sync.get('bookmarks');
      const groupedBookmarks = await this.groupBookmarksByUrl(result.bookmarks || []);
      return { groupedBookmarks };
    } catch (error) {
      console.error("Erreur lors de la récupération des marque-pages groupés:", error);
      return { error: error.message };
    }
  },

  async getVideoTitle(url) {
    try {
      const response = await fetch(url);
      const text = await response.text();
      const match = text.match(/<title>(.*?)<\/title>/);
      const title = match ? match[1].replace(' - YouTube', '') : 'Titre non disponible';
      return { title };
    } catch (error) {
      console.error('Erreur lors de la récupération du titre:', error);
      return { error: 'Erreur lors de la récupération du titre' };
    }
  },

  async getBookmarksByUrl(url) {
    try {
      const result = await chrome.storage.sync.get('bookmarks');
      const bookmarks = result.bookmarks || [];
      const urlBookmarks = bookmarks.filter(bookmark => bookmark.url === url);
      return { bookmarks: urlBookmarks };
    } catch (error) {
      console.error("Erreur lors de la récupération des marque-pages pour l'URL:", error);
      return { error: error.message };
    }
  },

  async addBookmark(newBookmark) {
    try {
      const result = await chrome.storage.sync.get('bookmarks');
      let bookmarks = result.bookmarks || [];
      if (!bookmarks.some(b => b.url === newBookmark.url && b.time === newBookmark.time)) {
        bookmarks.push(newBookmark);
        await chrome.storage.sync.set({ bookmarks });
        return { success: true };
      } else {
        return { error: 'Le marque-page existe déjà' };
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout du marque-page:", error);
      return { error: error.message };
    }
  },

  async deleteBookmark(bookmarkToDelete) {
    try {
      const result = await chrome.storage.sync.get('bookmarks');
      let bookmarks = result.bookmarks || [];
      const updatedBookmarks = bookmarks.filter(b => 
        !(b.url === bookmarkToDelete.url && b.time === bookmarkToDelete.time)
      );
      await chrome.storage.sync.set({ bookmarks: updatedBookmarks });
      return { success: true };
    } catch (error) {
      console.error("Erreur lors de la suppression du marque-page:", error);
      return { error: error.message };
    }
  },

  async updateBookmark(updatedBookmark) {
    try {
      const result = await chrome.storage.sync.get('bookmarks');
      let bookmarks = result.bookmarks || [];
      const index = bookmarks.findIndex(b => 
        b.url === updatedBookmark.url && b.time === updatedBookmark.originalTime
      );
      if (index !== -1) {
        bookmarks[index] = updatedBookmark;
        await chrome.storage.sync.set({ bookmarks });
        return { success: true };
      } else {
        return { error: 'Marque-page non trouvé' };
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du marque-page:", error);
      return { error: error.message };
    }
  },

  async loadInitialBookmarks() {
    try {
      const result = await chrome.storage.sync.get('bookmarks');
      this.bookmarks = result.bookmarks || [];
    } catch (error) {
      console.error("Erreur lors du chargement initial des marque-pages:", error);
    }
  },

  afficherMessage(message, type = 'info') {
    const messageContainer = document.createElement('div');
    messageContainer.className = `youtube-bookmarker-message ${type}`;
    messageContainer.textContent = message;
    document.body.appendChild(messageContainer);

    setTimeout(() => {
      messageContainer.remove();
    }, 3000);
  }
};

// Initialisation des signets lors de l'installation de l'extension
chrome.runtime.onInstalled.addListener(async () => {
  await BMBackground.initializeBookmarks();
});

// Écouteur d'événements pour les messages envoyés à l'extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch(request.action) {
    case 'getBookmarks':
      BMBackground.getBookmarks().then(sendResponse);
      break;
    case 'addBookmark':
      BMBackground.addBookmark(request.bookmark).then(sendResponse);
      break;
    case 'deleteBookmark':
      BMBackground.deleteBookmark(request.bookmark).then(sendResponse);
      break;
    case 'updateBookmark':
      BMBackground.updateBookmark(request.bookmark).then(sendResponse);
      break;
    case 'getGroupedBookmarks':
      BMBackground.getGroupedBookmarks().then(sendResponse);
      break;
    case 'getVideoTitle':
      BMBackground.getVideoTitle(request.url).then(sendResponse);
      break;
    case 'getBookmarksByUrl':
      BMBackground.getBookmarksByUrl(request.url).then(sendResponse);
      break;
    default:
      sendResponse({ error: 'Action non reconnue' });
  }
  return true; // Indique que la réponse sera envoyée de manière asynchrone
});

// Chargement initial des bookmarks
(async () => {
  try {
    const result = await chrome.storage.sync.get('bookmarks');
    BMBackground.bookmarks = result.bookmarks || [];
  } catch (error) {
    console.error("Erreur lors du chargement initial des marque-pages:", error);
  }
})();

// Exporter les fonctions
export { BMBackground };
