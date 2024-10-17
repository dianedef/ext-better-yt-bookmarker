     this.closeBookmarkInput();
      await this.handleBookmarkAction('addBookmark', bookmark);
    },

    addDefaultBookmarks: function () {
      if (state.currentVideo) {
        console.log("Vidéo trouvée, ajout des marque-pages par défaut");
        this.defaultBookmarks = [
          { time: 0, note: 'Début de la vidéo' },
          { time: state.currentVideo.duration, note: 'Fin de la vidéo' }
        ];
        console.log("Marque-pages par défaut ajoutés :", this.defaultBookmarks);
      } else {
        console.log("Impossible d'ajouter les marque-pages par défaut : aucune vidéo trouvée.");
      }
    },

    deleteBookmark: async function (bookmark) {
      if (!utils.isExtensionValid()) {
        console.error("Le contexte de l'extension n'est plus valide.");
        utils.afficherMessage("Erreur : L'extension a été rechargée ou désactivée. Veuillez rafraîchir 
        la page.", 'error');
        return;
      }

      try {
        const response = await utils.sendMessageToBackground({
          action: 'deleteBookmark',
          bookmark: bookmark
        });
        if (response && response.success) {
          this.removeBookmarkFromDOM(bookmark);
          await this.removeBookmarkFromStorage(bookmark);
          utils.afficherMessage("Marque-page supprimé !");
        } else {
          console.error("Erreur lors de la suppression du marque-page:", response);
          utils.afficherMessage("Erreur lors de la suppression du marque-page. Veuillez vérifier la 
          console pour plus de détails.", 'error');
        }
      } catch (error) {
        console.error('Erreur lors de la suppression du marque-page:', error);
        utils.afficherMessage("Une erreur est survenue lors de la suppression du marque-page.", 
        'error');
      }

    removeBookmarkFromStorage: function (bookmarkToRemove) {
      return new Promise((resolve, reject) => {
        chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }



navigateBookmarks: function (direction) {
  chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
    if (!bookmarks) bookmarks = [];
    console.log("Bookmarks récupérés pour navigation :", bookmarks);
    const currentTime = state.currentVideo.currentTime;
    const currentUrl = window.location.href;
    const videoBookmarks = bookmarks.filter(b => b.url === currentUrl);
    

deleteCurrentBookmark: function () {
  chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
    if (!bookmarks || bookmarks.length === 0) return;

    const currentTime = state.currentVideo.currentTime;
    const currentUrl = window.location.href;
    const bookmarkToDelete = bookmarks.find(b =>
      b.url === currentUrl && Math.abs(b.time - currentTime) <= 5
    );

    if (bookmarkToDelete) {
      this.deleteBookmark(bookmarkToDelete);
    } else {
      utils.afficherMessage('Aucun marque-page à supprimer à proximité.', 'info');
    }
  });
},
}


 
    const svgIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgIcon.setAttribute("viewBox", "0 0 24 24");
    svgIcon.setAttribute("width", "18");
    svgIcon.setAttribute("height", "18");
    svgIcon.innerHTML = '<path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 
    18V5h10v13z" fill="white"/>';

    const buttonText = document.createElement('span');

    button.appendChild(svgIcon);
    button.appendChild(buttonText);

    state.timeDisplay.parentNode.insertBefore(button, state.timeDisplay.nextSibling);
    state.bookmarkButton = button;

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      bookmarkManager.handleAddBookmark();
    });

    console.log("Bouton de marque-page ajouté avec succès après l'affichage du temps.");
  },

  addBookmarkIcon: function (bookmark) {
    console.log("Début de addBookmarkIcon pour le bookmark :", bookmark);

    try {
      if (state.player && state.progressBar && state.currentVideo && state.currentVideo.duration) {
        console.log("Tous les éléments nécessaires sont disponibles");



iconContainer.style.left = `${(bookmark.time / state.currentVideo.duration) * state.
progressBar.offsetWidth}px`;



toggleNotesVisibility: function () {
  const infoContainers = document.querySelectorAll('.custom-bookmark-info-container');
  const isVisible = infoContainers[0]?.style.display !== 'none';
  infoContainers.forEach(container => {
    container.style.display = isVisible ? 'none' : 'block';
  });
}
};

const waitForYouTubePlayer = function () {
return new Promise((resolve, reject) => {
  let attempts = 0;
  const maxAttempts = 20;
  const checkPlayer = () => {
    state.player = document.querySelector('.html5-video-player');
    state.currentVideo = document.querySelector('video');
    state.progressBar = document.querySelector('.ytp-progress-bar');
    if (state.player && state.currentVideo && state.progressBar && state.player.
    getBoundingClientRect().width > 0) {
      const resizeObserver = new ResizeObserver(debounce(() => {
        console.log("Taille du lecteur vidéo modifiée");
        bookmarkManager.loadBookmarks();
      }, 250));

      resizeObserver.observe(state.player);

      // Nettoyage de l'observateur lors de la réinitialisation de l'extension
      const originalReinitializeExtension = YouTubeBookmarker.reinitializeExtension;
      YouTubeBookmarker.reinitializeExtension = function() {
        resizeObserver.disconnect();
        originalReinitializeExtension();
      };

      resolve();
    } else if (attempts >= maxAttempts) {
      reject(new Error("Impossible de trouver le lecteur YouTube après plusieurs tentatives."));
    } else {
      attempts++;
      setTimeout(checkPlayer, 250);
    }
  };
  checkPlayer();
});
};

let clickCount = 0;
let lastClickTime = 0;
let lastVideoTime = 0;

function handleProgressBarClick(event) {
const currentTime = new Date().getTime();
const timeSinceLastClick = currentTime - lastClickTime;

if (timeSinceLastClick < 500) {
  clickCount++;
} else {
  clickCount = 1;
}

lastClickTime = currentTime;

if (clickCount === 2) {
  console.log("Double-clic détecté sur la barre de progression");

  if (!state.progressBar || !state.currentVideo) {
    console.warn("Barre de progression ou vidéo non disponible");
    return;
  }
  const progressBarRect = state.progressBar.getBoundingClientRect();
  const clickPosition = event.clientX - progressBarRect.left;
  const clickRatio = clickPosition / progressBarRect.width;
  lastVideoTime = clickRatio * state.currentVideo.duration;
  state.currentVideo.currentTime = lastVideoTime;

  const currentUrl = window.location.href;
  
  const bookmark = {
    time: lastVideoTime,
    url: currentUrl,
    note: ''
  };
  console.log("Temps de la vidéo mis à jour :", state.currentVideo.currentTime);
  bookmarkManager.handleAddBookmark(bookmark);
}

if (clickCount === 3) {
  console.log("Triple-clic détecté, ajout d'un marque-page sans note");

  chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
    if (!bookmarks) bookmarks = [];

    const currentUrl = window.location.href;
    const existingBookmark = bookmarks.find(b =>
      b.url === currentUrl && Math.abs(b.time - lastVideoTime) < 5
    );

    if (existingBookmark) {
      console.log("Un marque-page existe déjà à cet endroit :", existingBookmark);
      return;
    }

    const bookmark = {
      time: lastVideoTime,
      url: currentUrl,
      note: '' // Marque-page sans note
    };

    bookmarkManager.handleBookmarkAction('addBookmark', bookmark);
    console.log("Marque-page ajouté à :", lastVideoTime);
  });

  clickCount = 0; // Réinitialiser le compteur après le triple clic
}
}

// Ajoutez cet écouteur d'événement lors de l'initialisation
const init = function () {
console.log("Début de init");
if (!utils.isExtensionValid()) {
  console.error("Extension non valide");
  return;
}

if (document.getElementById(CONSTANTS.BOOKMARK_BUTTON_ID)) {
  console.log("Le bouton de marque-page est déjà présent. Initialisation ignorée.");
  return;
}

// Vérifiez si l'état a déjà été initialisé
if (!state.isInitialized) {
  console.log("Initialisation de l'état...");
  resetState();
  utils.updateState();
  state.isInitialized = true;
} else {
  console.log("L'état a déjà été initialisé. Mise à jour de l'état uniquement.");
  utils.updateState();
}

uiManager.addDynamicStyles();
setupHotkeys();

waitForYouTubePlayer()
  .then(() => {
    console.log("Lecteur YouTube trouvé, initialisation en cours...");
    uiManager.addBookmarkButton();
    bookmarkManager.loadBookmarks();
    if (state.currentVideo) {
      state.currentVideo.addEventListener('loadedmetadata', () => {
        bookmarkManager.loadBookmarks();
        console.log("eventlistener loadedmetadata chargés");
      });

      state.currentVideo.addEventListener('play', handleVideoStateChange);
      state.currentVideo.addEventListener('pause', handleVideoStateChange);
      state.progressBar.addEventListener('click', handleProgressBarClick);

    } else {
      console.warn("Élément vidéo non trouvé après l'initialisation du lecteur.");
    }
  })
  .catch(error => {
    console.error("Erreur lors de l'initialisation:", error);
  });
};

const checkAndResetState = function () {
console.log("Vérification de l'état...");
return new Promise((resolve) => {
  if (!state.player || !state.currentVideo || !state.progressBar) {
    console.warn("État invalide détecté, réinitialisation...");
    resetState();
    utils.updateState();
  }
  bookmarkManager.loadBookmarks();
  resolve();
});
};

const handleVideoStateChange = function () {
if (!utils.isExtensionValid()) return;
checkAndResetState().catch(error => {
  console.warn("Erreur lors de la vérification/réinitialisation de l'état:", error);
});
bookmarkManager.loadBookmarks();
};

const setupHotkeys = function () {
chrome.storage.sync.get('hotkeys', ({ hotkeys }) => {
  if (hotkeys) {
    document.addEventListener('keydown', (e) => {
      const pressedHotkey = [
        e.ctrlKey ? 'Ctrl' : '',
        e.altKey ? 'Alt' : '',
        e.shiftKey ? 'Shift' : '',
        e.key.toUpperCase()
      ].filter(Boolean).join('+');

      Object.entries(hotkeys).forEach(([action, hotkey]) => {
        if (pressedHotkey === hotkey) {
          e.preventDefault();
          switch (action) {
            case 'add-bookmark':
              bookmarkManager.addBookmark();
              break;
            case 'prev-bookmark':
              bookmarkManager.navigateBookmarks('prev');
              break;
            case 'next-bookmark':
              bookmarkManager.navigateBookmarks('next');
              break;
            case 'delete-bookmark':
              deleteCurrentBookmark();
              break;
            case 'toggle-notes':
              uiManager.toggleNotesVisibility();
              break;
          }
        }
      });
    });
  }
});
};

waitForYouTubePlayer()
  .then(() => {
    console.log("Lecteur YouTube trouvé, réinitialisation en cours...");
    init();
  })
  .catch(error => {
    console.error("Erreur lors de la réinitialisation:", error);
  });
};

const cleanupOldElements = function () {
if (state.currentVideo) {
  state.currentVideo.removeEventListener('play', handleVideoStateChange);
  state.currentVideo.removeEventListener('pause', handleVideoStateChange);
}
