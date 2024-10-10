// Module principal
const YouTubeBookmarker = (function () {
  // Constantes
  const CONSTANTS = {
    BOOKMARK_BUTTON_ID: 'bookmark-button',
    BOOKMARK_ICON_CLASS: 'custom-bookmark-icon',
    BOOKMARK_ICON_CONTAINER_CLASS: 'custom-bookmark-icon-container',
    BOOKMARK_DELETE_ICON_CLASS: 'custom-bookmark-delete-icon',
    BOOKMARK_INPUT_CONTAINER_CLASS: 'bookmark-input-container'
  };

  // État de l'application
  const state = {
    currentVideo: null,
    isExtensionReady: true,
    player: null,
    bookmarkButton: null,
    timeDisplay: null,
    progressBar: null
  };


  // Fonctions utilitaires
  const utils = {
    isExtensionValid: function () {
      try {
        return !!chrome.runtime && !!chrome.runtime.id;
      } catch (e) {
        console.error("Erreur lors de la vérification de la validité de l'extension:", e);
        return false;
      }
    },

    updateState: function () {
      console.log("Mise à jour de l'état");
      state.player = document.querySelector('.html5-video-player');
      state.bookmarkButton = document.getElementById(CONSTANTS.BOOKMARK_BUTTON_ID);
      state.currentVideo = document.querySelector('video');
      // Mise à jour des nouvelles références DOM
      state.timeDisplay = document.querySelector('.ytp-time-display');
      state.progressBar = state.player ? state.player.querySelector('.ytp-progress-bar') : null;
      console.log("État mis à jour :", state);
    },

    sendMessageToBackground: function (message) {
      return new Promise((resolve, reject) => {
        if (!chrome.runtime || !chrome.runtime.id) {
          reject(new Error("Le contexte de l'extension n'est plus valide."));
          return;
        }
        try {
          chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    },

    afficherMessage: function (message, type = 'info') {
      const messageContainer = document.createElement('div');
      messageContainer.className = `youtube-bookmarker-message ${type}`;
      messageContainer.textContent = message;
      document.body.appendChild(messageContainer);

      setTimeout(() => {
        messageContainer.remove();
      }, 3000);
    }
  };

  // Gestion des marque-pages
  const bookmarkManager = {
    handleBookmarkAction: async function(action, bookmark) {
      if (!utils.isExtensionValid()) {
        console.error("Le contexte de l'extension n'est plus valide.");
        utils.afficherMessage("Erreur : L'extension a été rechargée ou désactivée. Veuillez rafraîchir la page.", 'error');
        return;
      }

      try {
        const response = await utils.sendMessageToBackground({
          action: action,
          bookmark: bookmark
        });
        if (response && response.success) {
          utils.afficherMessage(`Marque-page ${action === 'addBookmark' ? 'ajouté' : 'supprimé'} !`);
          this.loadBookmarks();
        } else {
          console.error(`Erreur lors de l'${action === 'addBookmark' ? 'ajout' : 'suppression'} du marque-page:`, response);
          utils.afficherMessage(`Erreur lors de l'${action === 'addBookmark' ? 'ajout' : 'suppression'} du marque-page. Veuillez vérifier la console pour plus de détails.`, 'error');
        }
      } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        utils.afficherMessage(`Une erreur est survenue lors de l'${action === 'addBookmark' ? 'ajout' : 'suppression'} du marque-page.`, 'error');
      }
    },

    addBookmark: async function () {
      console.log("addBookmark appelé");

      if (!state.currentVideo) {
        console.error("Erreur : Aucune vidéo en cours de lecture.");
        utils.afficherMessage("Impossible d'ajouter un marque-page : aucune vidéo en cours de lecture.", 'error');
        return;
      }

      const currentTime = state.currentVideo.currentTime;
      const wasPlaying = !state.currentVideo.paused;
      state.currentVideo.pause();

      // Calculer la position horizontale
      const positionRatio = currentTime / state.currentVideo.duration;
      let leftPosition = positionRatio * 100;

      // Ajuster la position si elle est trop proche des bords
      const containerWidth = 240; // Largeur estimée du conteneur en pixels
      const playerWidth = state.player.offsetWidth;
      const minPosition = (containerWidth / 2 / playerWidth) * 100;
      const maxPosition = 100 - minPosition;

      if (leftPosition < minPosition) {
        leftPosition = minPosition;
      } else if (leftPosition > maxPosition) {
        leftPosition = maxPosition;
      }

      console.log("Création de la modale de saisie");

      const inputContainer = document.createElement('div');
      inputContainer.className = 'bookmark-input-container';
      inputContainer.style.left = `${leftPosition}%`;

      const noteInput = document.createElement('input');
      noteInput.type = 'text';
      noteInput.className = 'bookmark-input';
      noteInput.placeholder = 'Ajouter une note pour ce marque-page';

      const addButton = document.createElement('button');
      addButton.textContent = '+';
      addButton.style.marginRight = '5px';

      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'x';

      inputContainer.append(noteInput, addButton, cancelButton);

      const closeInput = () => {
        inputContainer.remove();
        document.removeEventListener('click', handleOutsideClick);
        if (wasPlaying) state.currentVideo.play();
      };

      const handleOutsideClick = (e) => {
        if (!inputContainer.contains(e.target) && e.target !== state.bookmarkButton) {
          closeInput();
        }
      };

      const handleAddBookmark = async () => {
        const note = noteInput.value;
        const currentTime = state.currentVideo ? state.currentVideo.currentTime : 0;
        const url = window.location.href;
        const bookmark = {
          time: currentTime,
          url: url,
          note: note
        };
        closeInput();
        console.log("Logique d'ajout de marque-page exécutée");
        
        if (wasPlaying && state.currentVideo) {
          state.currentVideo.play();
        }

        await this.handleBookmarkAction('addBookmark', bookmark);
      };

      noteInput.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Escape') closeInput();
        if (e.key === 'Enter') handleAddBookmark();
      });

      addButton.addEventListener('click', handleAddBookmark);
      cancelButton.addEventListener('click', closeInput);

      // Empêcher la propagation du clic à l'intérieur de la modale
      inputContainer.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      document.addEventListener('click', handleOutsideClick);

      if (!state.player) {
        console.error("Conteneur du lecteur non trouvé");
        return;
      }
      state.player.appendChild(inputContainer);
      console.log("Modale ajoutée au DOM");
      noteInput.focus();
    },

    addDefaultBookmarks: function() {
      if (state.currentVideo) {
        const url = window.location.href;

        const startBookmark = {
          time: 0,
          note: 'Début de la vidéo',
          url: url
        };

        const endBookmark = {
          time: state.currentVideo.duration,
          note: 'Fin de la vidéo',
          url: url
        };

        // Ici, vous pouvez ajouter la logique pour sauvegarder ces marque-pages par défaut
        // Par exemple :
        // this.addBookmark(startBookmark);
        // this.addBookmark(endBookmark);
      } else {
        console.warn("Impossible d'ajouter les marque-pages par défaut : aucune vidéo trouvée.");
      }
    },

    deleteBookmark: async function (bookmark) {
      const confirmDelete = confirm(`Voulez-vous vraiment supprimer ce marque-page : "${bookmark.note}" ?`);

      if (confirmDelete) {
        await this.handleBookmarkAction('deleteBookmark', bookmark);
      }
    },

    loadBookmarks: function () {
      if (!utils.isExtensionValid()) {
        console.error("Le contexte de l'extension n'est plus valide.");
        return;
      }

      chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
        if (chrome.runtime.lastError) {
          console.error("Erreur lors de l'accès au stockage :", chrome.runtime.lastError);
          return;
        }
        if (bookmarks && Array.isArray(bookmarks)) {
          const videoBookmarks = bookmarks.filter(b => b.url === window.location.href);
          uiManager.removeExistingBookmarkIcons();
          videoBookmarks.forEach(uiManager.addBookmarkIcon);
        }
      });
    },

    navigateBookmarks: function (direction) {
      chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
        if (!bookmarks || bookmarks.length === 0) return;

        const currentTime = state.currentVideo.currentTime;
        const currentUrl = window.location.href;
        const videoBookmarks = bookmarks.filter(b => b.url === currentUrl);

        if (direction === 'prev') {
          const prevBookmark = videoBookmarks.reverse().find(b => b.time < currentTime);
          if (prevBookmark) state.currentVideo.currentTime = prevBookmark.time;
        } else if (direction === 'next') {
          const nextBookmark = videoBookmarks.find(b => b.time > currentTime);
          if (nextBookmark) state.currentVideo.currentTime = nextBookmark.time;
        }
      });
    },

    deleteCurrentBookmark: function() {
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

  // Gestion de l'interface utilisateur
  const uiManager = {
    addBookmarkButton: function () {
      if (!utils.isExtensionValid()) {
        console.error("Le contexte de l'extension n'est plus valide lors de l'ajout du bouton.");
        return;
      }
      
      if (state.timeDisplay && !state.bookmarkButton) {
        console.log("Ajout du bouton de marque-page");
        const button = document.createElement('button');
        button.id = CONSTANTS.BOOKMARK_BUTTON_ID;
        button.title = 'Ajouter un marque-page';
        
        // Créer une icône SVG pour le bouton
        const svgIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgIcon.setAttribute("viewBox", "0 0 24 24");
        svgIcon.setAttribute("width", "18");
        svgIcon.setAttribute("height", "18");
        svgIcon.innerHTML = '<path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" fill="white"/>';
        
        const buttonText = document.createElement('span');
        buttonText.textContent = 'Ajouter un marque-page';
        
        button.appendChild(svgIcon);
        button.appendChild(buttonText);
        
        // Utilisation de state.timeDisplay au lieu de document.querySelector
        state.timeDisplay.parentNode.insertBefore(button, state.timeDisplay.nextSibling);
        state.bookmarkButton = button;
        
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("Bouton de marque-page cliqué - avant addBookmark");
          
          try {
            if (typeof bookmarkManager === 'undefined' || typeof bookmarkManager.addBookmark !== 'function') {
              console.error("bookmarkManager ou sa méthode addBookmark n'est pas définie correctement");
              return;
            }
            
            bookmarkManager.addBookmark();
            console.log("Fonction addBookmark appelée avec succès");
          } catch (error) {
            console.error("Erreur lors de l'appel à addBookmark:", error);
          }
          
          console.log("Après l'appel à addBookmark");
        });
        console.log("Bouton de marque-page ajouté avec succès après l'affichage du temps.");
      } else {
        console.warn("Impossible d'ajouter le bouton de marque-page. Affichage du temps non trouvé ou bouton déjà présent.");
      }
      
    },
    
    addBookmarkIcon: function (bookmark) {
      console.log("Début de addBookmarkIcon pour le marque-page :", bookmark);
      
      if (state.player && state.progressBar) {
        console.log("state.player trouvé :", state.player);
        
        const iconContainer = document.createElement('div');
        iconContainer.className = 'custom-bookmark-icon-container';
        iconContainer.style.position = 'absolute';
        // Utilisation de state.progressBar au lieu de querySelector
        iconContainer.style.left = `${(bookmark.time / state.currentVideo.duration) * state.progressBar.offsetWidth}px`;
        console.log("Container d'icônes créé avec la position :", iconContainer.style.left);

        const icon = document.createElement('div');
        icon.className = 'custom-bookmark-icon';
        console.log("Icône point rouge créée");

        const infoContainer = document.createElement('div');
        infoContainer.className = 'custom-bookmark-info-container';
        console.log("Container d'info créé");
        
        const noteText = document.createElement('span');
        noteText.className = 'custom-bookmark-note';
        noteText.textContent = bookmark.note;
        console.log("Texte de note créé avec le contenu :", bookmark.note);

        const deleteIcon = document.createElement('span');
        deleteIcon.className = 'custom-bookmark-delete-icon';
        deleteIcon.innerHTML = '🗑️';
        console.log("Icône de suppression créée");

        infoContainer.appendChild(noteText);
        infoContainer.appendChild(deleteIcon);

        deleteIcon.addEventListener('click', (e) => {
          console.log("Clic sur l'icône de suppression");
          e.stopPropagation();
          bookmarkManager.deleteBookmark(bookmark);
        });

        icon.addEventListener('click', () => {
          console.log("Clic sur l'icône de marque-page, navigation vers :", bookmark.time);
          state.currentVideo.currentTime = bookmark.time;
        });

        iconContainer.appendChild(icon);
        iconContainer.appendChild(infoContainer);
        state.player.appendChild(iconContainer);
        
        console.log("Tous les éléments ont été ajoutés au DOM");

        // Effet de survol
        icon.addEventListener('mouseenter', () => {
          console.log("Survol de l'icône");
          infoContainer.style.display = 'block';
        });

        infoContainer.addEventListener('mouseenter', () => {
          console.log("Survol du conteneur d'info");
          infoContainer.style.display = 'block';
        });

        infoContainer.addEventListener('mouseleave', () => {
          console.log("Fin du survol du conteneur d'info");
          infoContainer.style.display = 'none';
        });

        // Ajuster la position de l'icône lors du redimensionnement de la vidéo
        const resizeObserver = new ResizeObserver(() => {
          console.log("Redimensionnement détecté");
          if (state.progressBar) {
            iconContainer.style.left = `${(bookmark.time / state.currentVideo.duration) * state.progressBar.offsetWidth}px`;
            console.log("Nouvelle position de l'icône :", iconContainer.style.left);
          }
        });
        resizeObserver.observe(state.player);

        iconContainer.addEventListener('remove', () => {
          console.log("Icône supprimée, déconnexion de l'observateur");
          resizeObserver.disconnect();
        });
      } else {
        console.error("Le lecteur vidéo au moment de l'ajout des icônes de notes n'est pas disponible dans l'état actuel.");
      }
    },

    removeExistingBookmarkIcons: function () {
      const existingIcons = document.querySelectorAll('.custom-bookmark-icon');
      existingIcons.forEach(icon => icon.remove());
    },
    
    addDynamicStyles: function () {
      const style = document.createElement('style');
      style.textContent = `
        /* Ajoutez ici uniquement les styles qui doivent être calculés dynamiquement */
      `;
      document.head.appendChild(style);
    },

    toggleNotesVisibility: function () {
      const infoContainers = document.querySelectorAll('.custom-bookmark-info-container');
      const isVisible = infoContainers[0]?.style.display !== 'none';
      infoContainers.forEach(container => {
        container.style.display = isVisible ? 'none' : 'block';
      });
    }
  };

  // Initialisation et gestion des événements
  const init = function () {
    console.log("Initialisation de l'extension");
    if (!utils.isExtensionValid()) {
      console.error("Extension non valide");
      return;
    }

    utils.updateState();
    uiManager.addDynamicStyles();
    setupHotkeys();

    if (state.currentVideo) {
      console.log("Vidéo trouvée, initialisation en cours...");
      uiManager.addBookmarkButton();
      bookmarkManager.addDefaultBookmarks();
      bookmarkManager.loadBookmarks();

      state.currentVideo.addEventListener('play', handleVideoStateChange);
      state.currentVideo.addEventListener('pause', handleVideoStateChange);
    } else {
      console.warn("Élément vidéo non trouvé. Nouvelle tentative dans 2 secondes.");
      setTimeout(init, 2000);
    }
  };

  const handleVideoStateChange = function () {
    if (!utils.isExtensionValid()) return;
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

  // API publique
  return {
    init: init,
    addBookmark: bookmarkManager.addBookmark,
    deleteBookmark: bookmarkManager.deleteBookmark,
    navigateBookmarks: bookmarkManager.navigateBookmarks
  };
})();

// Initialisation au chargement de la page
if (window.location.href.includes('youtube.com/watch')) {
  YouTubeBookmarker.init();
}

// Écouteur pour les changements d'URL (navigation sur YouTube)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    if (url.includes('youtube.com/watch')) {
      utils.updateState();
      YouTubeBookmarker.init();
    }
  }
}).observe(document, { subtree: true, childList: true });