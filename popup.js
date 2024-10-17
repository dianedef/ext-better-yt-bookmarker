/* // Écouteur d'événements pour les messages envoyés à l'extension
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "closePopup") {
    BMPopup.resetState();
  }
  return true;
}); */

const BMPopup = {
  state: {
    bookmarks: [],
    groupedBookmarks: {},
    bookmarksList: '',
    toggleNotesButton: null,
    deleteVideoButton: null,
    deleteBookmarkButton: null,
    settingsButton: null,
    exportMarkdownButton: null,
  },
  
  async init() {
    console.log("init this.state.groupedBookmarks", this.state.groupedBookmarks)
    console.log("init this.state.bookmarks", this.state.bookmarks)
    try {
      await this.getGroupedBookmarks();
      console.log("BMPopup init getGroupedBookmarks:", this.state.groupedBookmarks);
      this.loadBookmarksIntoHTML();
    } catch (error) {
      console.error("BMPopup init error:", error);
    }
    this.createBottomBar();
  },

  async resetState() {
    const storedBookmarks = await chrome.storage.local.get('bookmarks');
    const storedGroupedBookmarks = await chrome.storage.local.get('groupedBookmarks');

    this.state = {
      bookmarks: storedBookmarks || [],
      groupedBookmarks: storedGroupedBookmarks || {},  
      bookmarksList: document.getElementById("bookmarks-list"),
      toggleNotesButton: document.querySelector(".toggle-notes"),
      deleteVideoButton: document.querySelector(".delete-video"),
      deleteBookmarkButton: document.querySelector(".delete-bookmark"),
      settingsButton: document.getElementById("settings"),
      exportMarkdownButton: document.getElementById("export-markdown"),
    };
  },

  async getGroupedBookmarks() {
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "getGroupedBookmarks" }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });

    if (response && response.groupedBookmarks) {
      this.state.groupedBookmarks = response.groupedBookmarks;
      console.log(
        "Récupération des groupedBookmarks du background:",
        this.state.groupedBookmarks
      );
      return this.state.groupedBookmarks;
    } else {
      throw new Error(
        "Réponse invalide du background script lors de la récupération des groupedBookmarks",
        response
      );
    }
  },

  async loadBookmarksIntoHTML() {
    const bookmarksList = this.state.bookmarksList;
    bookmarksList.innerHTML = "";
    console.log("loadBookmarksIntoHTML appelé");
    const groupedBookmarks = this.state.groupedBookmarks;

    if (groupedBookmarks && Object.keys(groupedBookmarks).length > 0) {
      Object.keys(groupedBookmarks).forEach((url) => {
        const bmsForThisVideo = groupedBookmarks[url];

        Object.keys(bmsForThisVideo).forEach((bookmarkKey) => {
          const bookmark = bmsForThisVideo[bookmarkKey];
          const bookmarkElement = document.createElement("div");
          bookmarkElement.className = "bookmark-item";
          bookmarkElement.innerHTML = `
          <img src="${bookmark.thumbnailUrl}" alt="${bookmark.title}" width="30%">
          <div>
          <h3><a href="${bookmark.url}" target="_blank">${bookmark.title}</a></h3>
          <button class="delete-video" data-url="${bookmark.url}">Delete</button>
          <div>
            <button class="toggle-notes">Afficher les notes</button>
            <div class="timestamp">Timestamp: ${bookmark.timestamp}</div>
            <button class="delete-bookmark" data-url="${bookmark.url}">🗑️</button>
          </div>
        </div>
        <div class="notes-list">
          <!-- Les notes seront ajoutées ici dynamiquement -->
            </div>
          `;
          bookmarksList.appendChild(bookmarkElement);
        });
      });
    } else {
      bookmarksList.textContent = "Aucun marque-page enregistré.";
    }
  },

  async toggleNotes(event) {
    const bookmarkItem = event.target.closest(".bookmark-item");
    const notesList = bookmarkItem.querySelector(".notes-list");
    // Charger et afficher/masquer les notes ici
  },

  async deleteVideo(event) {
    const url = event.target.dataset.url;
    this.deleteVideo(url);
    console.log("Suppression de la vidéo :", url);
  },

  async openSettings() {
    chrome.runtime.openOptionsPage();
  },

  async createBottomBar() {
    const bottomBar = document.createElement("div");
    bottomBar.className = "bottom-bar";
    bottomBar.innerHTML = `
    <button id="export-markdown">Copier en Markdown</button>
    <div class="rating">
      <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
    </div>
    <button id="settings">Paramètres</button>
  `;
    document.body.appendChild(bottomBar);
  },

};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    BMPopup.state.bookmarksList = document.getElementById("bookmarks-list");
    BMPopup.state.settingsButton = document.getElementById("settings");
    BMPopup.state.exportMarkdownButton = document.getElementById("export-markdown");
    BMPopup.state.deleteVideoButton = document.querySelector(".delete-video");
    BMPopup.state.deleteBookmarkButton = document.querySelector(".delete-bookmark");
    BMPopup.state.toggleNotesButton = document.querySelector(".toggle-notes");

    // Vérifier si les éléments sont prêts avant d'ajouter les écouteurs
    if (BMPopup.state.settingsButton && BMPopup.state.exportMarkdownButton) {
      BMPopup.state.settingsButton.addEventListener("click", () =>
        BMPopup.openSettings()
      );
      BMPopup.state.exportMarkdownButton.addEventListener("click", () =>
        chrome.runtime.sendMessage({ action: "exportBookmarksAsMarkdown" })
      );
    }

    if (BMPopup.state.deleteVideoButton) {
      BMPopup.state.deleteVideoButton.addEventListener("click", (event) =>
        BMPopup.deleteVideo(event)
      );
    }

    if (BMPopup.state.deleteBookmarkButton) {
      BMPopup.state.deleteBookmarkButton.addEventListener("click", (event) =>
        BMPopup.deleteBM(event)
      );
    }

    if (BMPopup.state.toggleNotesButton) {
      BMPopup.state.toggleNotesButton.addEventListener("click", (event) =>
        BMPopup.toggleNotes(event)
      );
    }
    // Charger les marque-pages lors de l'ouverture du popup
    await BMPopup.getGroupedBookmarks();
    await BMPopup.loadBookmarksIntoHTML(); // Ajouté pour charger les marque-pages à l'ouverture
  } catch (error) {
    console.error("Erreur lors de l'initialisation :", error);
  }
});

BMPopup.init();
