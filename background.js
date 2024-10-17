// Initialisation des signets lors de l'installation de l'extension
chrome.runtime.onInstalled.addListener(async () => {
  try {
    console.log("BMBackground : Extension installée");
    await BMBackground.init();
    console.log("BMBackground init() this.state.bookmarks", BMBackground.state.bookmarks);
    console.log("BMBackground init() this.state.groupedBookmarks", BMBackground.state.groupedBookmarks);
  } catch (error) {
    console.error("BMBackground Erreur lors de l'initialisation :", error);
  }
});

// Définition de la fonction clearLocalStorage
async function clearLocalStorage() {
  await chrome.storage.local.clear();
  console.log("BMBackground : stockage local effacé.");
}

// Écouteur d'événements pour les messages envoyés à l'extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch(request.action) {
    case 'deleteBookmark':
      BMBackground.deleteBookmark(request.bookmark).then(sendResponse);
      console.log("BMBackground : deleteBookmark réponse du background");
      break;
    case 'updateBookmark':
      BMBackground.updateBookmark(request.bookmark).then(sendResponse);
      console.log("BMBackground : updateBookmark réponse du background");
      break;
    case 'getGroupedBookmarks':
      console.log("BMBackground Message reçu : getGroupedBookmarks");
      BMBackground.getGroupedBookmarks().then(groupedBookmarks => {
        console.log("BMBackground Sending grouped bookmarks:", groupedBookmarks);
        sendResponse({ groupedBookmarks });
        }).catch(error => {
          console.error("BMBackground Erreur lors de la récupération des groupes de marque-pages:", error);
          sendResponse({ error: error.message });
        });
      return true;
    case 'getVideoTitle':
      BMBackground.getVideoTitle(request.url).then(sendResponse);
      console.log("BMBackground : getVideoTitle réponse du background");
      break;
    case 'getBookmarksByUrl':
      BMBackground.getBookmarksByUrl(request.url).then(sendResponse);
      console.log("BMBackground : getBookmarksByUrl réponse du background");
      break;
    default:
      sendResponse({ error: 'Action non reconnue' });
  }
  return true; // Indique que la réponse sera envoyée de manière asynchrone
});

const BMBackground = {
  state: {
    groupedBookmarks: {},
    bookmarks: []
  },
  
  async init() {
    console.log("BMBackground : initialisation des bookmarks");
    try {
      const resultBookmarks = await chrome.storage.local.get('bookmarks');
      this.state.bookmarks = resultBookmarks.bookmarks || [];
      
      if (resultBookmarks.bookmarks === undefined) {
        console.log("BMBackground : bookmarks non trouvés, création d'un tableau vide");
        chrome.storage.local.set({ bookmarks: [] });
      }

      const resultGrouped = await chrome.storage.local.get('groupedBookmarks');
      this.state.groupedBookmarks = resultGrouped.groupedBookmarks || {};
      
      console.log("BMBackground init() storedBookmarks", resultBookmarks);
      console.log("BMBackground init() storedGroupedBookmarks", resultGrouped);
    } catch (error) {
      console.error("BMBackground init() error:", error);
    }
  },

  async setBookmarks(bookmarks) {
    try {
      await chrome.storage.local.set({ bookmarks: bookmarks || [] });
    } catch (error) {
      console.error("BMBackground Erreur lors de la mise à jour des bookmarks : ", error);
    }
  },

  validateBookmark(bookmark) {
    if (!bookmark.url || !bookmark.time) {
      throw new Error("BMBackground validateBookmark : Le bookmark doit contenir une URL et un temps valides.");
    }
  },

  async groupBookmarksByUrl(bookmarks) {
    console.log("BMBackground : groupBookmarksByUrl appelé avec bookmarks:", bookmarks);
    return new Promise((resolve) => {
        setTimeout(() => {
            const grouped = bookmarks.reduce((acc, bookmark) => {
                if (!bookmark.url || !bookmark.time) {
                  console.warn("Marque-page manquant des propriétés requises:", bookmark);
                  return acc;
                }
                
                if (!acc[bookmark.url]) {
                  acc[bookmark.url] = {
                    title: bookmark.title || 'Titre non disponible',
                    url: bookmark.url,
                    bmList: []
                    };
                  }
                acc[bookmark.url].bmList.push({
                    time: bookmark.time,
                    note: bookmark.note || '',
                });
                return acc;
            }, {});

            this.state.groupedBookmarks = grouped;

            resolve(grouped);
        }, 0);
    });
  },

  async getGroupedBookmarks() {
    console.log("BMBackground getGroupedBookmarks appelé");
    try {
      const result = await chrome.storage.local.get('bookmarks');
      const bookmarks = result.bookmarks;
      console.log("BMBackground storage de bookmarks", bookmarks);
      console.log("BMBackground this.state.bookmarks", this.state.bookmarks);
      
      // Si aucun bookmark n'est trouvé dans le storage ou que bookmarks est undefined, renvoyer un objet vide
      if (!bookmarks || bookmarks.length === 0) {
        console.log("Aucun bookmark trouvé ou bookmarks undefined, renvoi d'un objet vide");
        this.state.groupedBookmarks = {};
        return this.state.groupedBookmarks;
      }
      
      // Si les bookmarks sont identiques et que groupedBookmarks existe, renvoyer groupedBookmarks
      if (this.state.bookmarks.length === bookmarks.length && Object.keys(this.state.groupedBookmarks).length > 0) {
        console.log("BMBackground Retour des groupedBookmarks en cache");
        return this.state.groupedBookmarks;
      }

      // Si le nombre de bookmarks a changé, regrouper les bookmarks
      else if (this.state.bookmarks.some(bookmark => !bookmarks.includes(bookmark) || bookmarks.length<1)) {
        console.log("Le nombre de bookmarks a changé, regroupement nécessaire");
        this.state.bookmarks = bookmarks;

        const groupedBookmarks = await this.groupBookmarksByUrl(bookmarks);
        
        for (const url in groupedBookmarks) {
          const group = groupedBookmarks[url];
          group.title = (await this.getVideoTitle(url)).title;
          group.thumbnailUrl = await this.getThumbnailUrl(url);
        }

        this.state.groupedBookmarks = groupedBookmarks;
        
        await chrome.storage.local.set({ groupedBookmarks: groupedBookmarks });
        console.log("BMBackground groupedBookmarks", groupedBookmarks);
        
        return groupedBookmarks;
      }
    } catch (error) {
      console.error("BMBackground Erreur lors de la récupération des groupes de marque-pages:", error);
      throw error;
    }
  },

  async getThumbnailUrl(videoUrl) {
    const videoId = new URL(videoUrl).searchParams.get('v');
    return `https://img.youtube.com/vi/${videoId}/0.jpg`;
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
      const result = await chrome.storage.local.get('bookmarks');
      const bookmarks = result.bookmarks || [];
      const urlBookmarks = bookmarks.filter(bookmark => bookmark.url === url);
      return { bookmarks: urlBookmarks };
    } catch (error) {
      console.error("BMBackground Erreur lors de la récupération des marque-pages pour l'URL:", error);
      return { error: error.message };
    }
  },

  async deleteBookmark(bookmarkToDelete) {
    try {
      const result = await chrome.storage.local.get('bookmarks');
      let bookmarks = result.bookmarks || [];
      const updatedBookmarks = bookmarks.filter(b => 
        !(b.url === bookmarkToDelete.url && b.time === bookmarkToDelete.time)
      );
      await chrome.storage.local.set({ bookmarks: updatedBookmarks });
      return { success: true };
    } catch (error) {
      console.error("Erreur lors de la suppression du marque-page:", error);
      return { error: error.message };
    }
  },

  async updateBookmark(updatedBookmark) {
    try {
      const result = await chrome.storage.local.get('bookmarks');
      let bookmarks = result.bookmarks || [];
      const index = bookmarks.findIndex(b => 
        b.url === updatedBookmark.url && b.time === updatedBookmark.originalTime
      );
      if (index !== -1) {
        bookmarks[index] = updatedBookmark;
        await chrome.storage.local.set({ bookmarks });
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
      const result = await chrome.storage.local.get('bookmarks');
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
  },

  async exportBookmarksAsMarkdown(bookmarks) {
    if (!bookmarks || bookmarks.length === 0) {
        this.afficherMessage('Aucun marque-page à exporter.', 'warning');
        return;
    }
    console.log("BMBackground : bookmarks:", bookmarks);
    const groupedBookmarks = this.getGroupedBookmarks(bookmarks);
    console.log("BMBackground : groupedBookmarks:", groupedBookmarks);

    let markdown = '';

    Object.values(groupedBookmarks).forEach(video => {
        markdown += `## ${video.title}\n[${video.url}](${video.url})\n![Thumbnail](${video.thumbnailUrl})\n`;
        if (video.bmList && video.bmList.length > 0) {
            video.bmList.forEach(bmList => {
                markdown += `[${bmList.timestamp}](${video.url}&t=${bmList.timestamp}): ${bmList.content}\n`;
            });
        }
        markdown += '\n';
    });

    try {
        await navigator.clipboard.writeText(markdown);
        this.afficherMessage('Le contenu Markdown a été copié dans le presse-papier !', 'success');
    } catch (err) {
        console.error('BMBackground Erreur lors de la copie dans le presse-papier:', err);
        this.afficherMessage('Impossible de copier dans le presse-papier. Veuillez vérifier les permissions de votre navigateur.', 'error');
    }
  },

  async exportBookmarksAsJSON(bookmarks) {
    const json = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
      a.download = 'bookmarks.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  },

  async importBookmarks(file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const bookmarks = JSON.parse(event.target.result);
              await chrome.storage.local.set({ bookmarks }); // Utilisation de local au lieu de sync
              alert('Marque-pages importés avec succès !');
          } catch (error) {
              alert('Erreur lors de l\'importation du fichier. Assurez-vous qu\'il s\'agit d\'un fichier JSON valide.');
          }
      };
      reader.readAsText(file);
  },
};
