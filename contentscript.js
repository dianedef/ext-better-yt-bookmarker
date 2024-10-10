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
  let state = {
    currentVideo: null,
    isExtensionReady: true,
    player: null,
    bookmarkButton: null
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
      console.log("Mise à jour de l'état"); // Aj
      state.player = document.querySelector('.html5-video-player');
      state.bookmarkButton = document.getElementById(CONSTANTS.BOOKMARK_BUTTON_ID);
      state.currentVideo = document.querySelector('video');
      console.log("État mis à jour :", state); // 
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
      messageContainer.style.position = 'fixed';
      messageContainer.style.top = '10px';
      messageContainer.style.right = '10px';
      messageContainer.style.padding = '10px';
      messageContainer.style.borderRadius = '5px';
      messageContainer.style.zIndex = '9999';
      messageContainer.style.backgroundColor = type === 'error' ? '#ffcccc' : '#ccffcc';
      messageContainer.style.color = '#333';
      messageContainer.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

      document.body.appendChild(messageContainer);

      setTimeout(() => {
        messageContainer.remove();
      }, 3000);
    }
  };

  // Gestion des marque-pages
  const bookmarkManager = {
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

      console.log("Création de la modale de saisie"); // Ajoutez ce log

      const inputContainer = document.createElement('div');
      inputContainer.className = 'bookmark-input-container';
      inputContainer.style.position = 'absolute';
      inputContainer.style.bottom = '70px';
      inputContainer.style.zIndex = '2000';

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

      inputContainer.style.left = `${leftPosition}%`;
      inputContainer.style.transform = 'translateX(-50%)';

      const noteInput = document.createElement('input');
      noteInput.type = 'text';
      noteInput.placeholder = 'Ajouter une note pour ce marque-page';
      noteInput.style.marginRight = '10px';
      noteInput.style.padding = '5px';

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
        try {

          if (wasPlaying && state.currentVideo) {
            state.currentVideo.play(); // Reprendre la lecture si la vidéo était en cours de lecture
          }

          const response = await utils.sendMessageToBackground({
            action: 'addBookmark',
            bookmark: bookmark
          });
          if (response && response.success) {
            utils.afficherMessage('Marque-page ajouté !');
            bookmarkManager.loadBookmarks();
          } else {
            console.error('Erreur lors de l\'ajout du marque-page:', response);
            utils.afficherMessage('Erreur lors de l\'ajout du marque-page. Veuillez vérifier la console pour plus de détails.', 'error');
          }
        } catch (error) {
          console.error('Erreur lors de l\'envoi du message:', error);
          utils.afficherMessage('Une erreur est survenue lors de l\'ajout du marque-page.', 'error');
        }
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

      const playerContainer = document.querySelector('.html5-video-player');
      if (!playerContainer) {
        console.error("Conteneur du lecteur non trouvé");
        return;
      }
      playerContainer.appendChild(inputContainer);
      console.log("Modale ajoutée au DOM");
      noteInput.focus();
    },

    deleteBookmark: async function (bookmark) {
      if (!utils.isExtensionValid()) {
        console.error("Le contexte de l'extension n'est plus valide.");
        utils.afficherMessage("Erreur : L'extension a été rechargée ou désactivée. Veuillez rafraîchir la page.", 'error');
        return;
      }

      const confirmDelete = confirm(`Voulez-vous vraiment supprimer ce marque-page : "${bookmark.note}" ?`);

      if (confirmDelete) {
        try {
          const response = await utils.sendMessageToBackground({
            action: 'deleteBookmark',
            time: bookmark.time,
            url: bookmark.url
          });
          if (response && response.success) {
            utils.afficherMessage('Marque-page supprimé !');
            bookmarkManager.loadBookmarks();
          } else {
            console.error('Erreur lors de la suppression du marque-page:', response);
            utils.afficherMessage('Erreur lors de la suppression du marque-page. Veuillez vérifier la console pour plus de détails.', 'error');
          }
        } catch (error) {
          console.error('Erreur lors de l\'envoi du message:', error);
          utils.afficherMessage('Erreur lors de la suppression du marque-page. L\'extension a peut-être été rechargée. Veuillez rafraîchir la page.', 'error');
        }
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
          uiManager.removeExistingBookmarkIcons(); // Remettre cette ligne ici
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
    }
  };

  // Gestion de l'interface utilisateur
  const uiManager = {
    addBookmarkButton: function () {
      if (!utils.isExtensionValid()) {
        console.error("Le contexte de l'extension n'est plus valide lors de l'ajout du bouton.");
        return;
      }
      
      const timeDisplay = document.querySelector('.ytp-time-display');
      if (timeDisplay && !document.getElementById('bookmark-button')) {
        console.log("Ajout du bouton de marque-page"); // Ajoutez ce log
        const button = document.createElement('button');
        button.id = 'bookmark-button';
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
        
        // Insérer le bouton après l'affichage du temps
        timeDisplay.parentNode.insertBefore(button, timeDisplay.nextSibling);
        
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
      
      
      console.log("wesh"); // Ajoutez ce log
    },
    
    addBookmarkIcon: function (bookmark) {
      const player = document.querySelector('.html5-video-player');
      if (player) {
        const iconContainer = document.createElement('div');
        iconContainer.className = 'custom-bookmark-icon-container';
        iconContainer.style.position = 'absolute';
        iconContainer.style.left = `${(bookmark.time / state.currentVideo.duration) * 100}%`;
        iconContainer.style.bottom = '40px';
        iconContainer.style.zIndex = '2000';
        iconContainer.style.transform = 'translateX(-50%)';

        const icon = document.createElement('div');
        icon.className = 'custom-bookmark-icon';
        icon.style.width = '20px';
        icon.style.height = '20px';
        icon.style.borderRadius = '50%';
        icon.style.backgroundColor = 'red';
        icon.style.cursor = 'pointer';

        const infoContainer = document.createElement('div');
        infoContainer.className = 'custom-bookmark-info-container';
        infoContainer.style.position = 'absolute';
        infoContainer.style.bottom = '25px';
        infoContainer.style.left = '50%';
        infoContainer.style.transform = 'translateX(-50%)';
        infoContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        infoContainer.style.backdropFilter = 'blur(5px)';
        infoContainer.style.color = 'white';
        infoContainer.style.padding = '8px';
        infoContainer.style.borderRadius = '4px';
        infoContainer.style.border = '2px solid #ff0000';
        infoContainer.style.display = 'none';
        infoContainer.style.zIndex = '2001';
        infoContainer.style.whiteSpace = 'nowrap';

        const noteText = document.createElement('span');
        noteText.className = 'custom-bookmark-note';
        noteText.textContent = bookmark.note;
        noteText.style.fontSize = '14px';
        noteText.style.marginRight = '10px';

        const deleteIcon = document.createElement('span');
        deleteIcon.className = 'custom-bookmark-delete-icon';
        deleteIcon.innerHTML = '🗑️';
        deleteIcon.style.cursor = 'pointer';

        infoContainer.appendChild(noteText);
        infoContainer.appendChild(deleteIcon);

        deleteIcon.addEventListener('click', (e) => {
          e.stopPropagation();
          bookmarkManager.deleteBookmark(bookmark);
        });

        icon.addEventListener('click', () => {
          state.currentVideo.currentTime = bookmark.time;
        });

        iconContainer.appendChild(icon);
        iconContainer.appendChild(infoContainer);
        player.appendChild(iconContainer);

        // Effet de survol
        iconContainer.addEventListener('mouseenter', () => {
          icon.style.width = '24px';
          icon.style.height = '24px';
          icon.style.backgroundColor = 'orange';
          infoContainer.style.display = 'block';
        });
        iconContainer.addEventListener('mouseleave', () => {
          icon.style.width = '20px';
          icon.style.height = '20px';
          icon.style.backgroundColor = 'red';
          infoContainer.style.display = 'none';
        });

        // Ajuster la position de l'icône lors du redimensionnement de la vidéo
        const resizeObserver = new ResizeObserver(() => {
          const progressBar = document.querySelector('.ytp-progress-bar');
          if (progressBar) {
            iconContainer.style.left = `${(bookmark.time / state.currentVideo.duration) * progressBar.offsetWidth}px`;
          }
        });
        resizeObserver.observe(player);

        iconContainer.addEventListener('remove', () => resizeObserver.disconnect());
      }
    },

    removeExistingBookmarkIcons: function () {
      const existingIcons = document.querySelectorAll('.custom-bookmark-icon');
      existingIcons.forEach(icon => icon.remove());
    },

    addCustomStyles: function () {
      const style = document.createElement('style');
      style.textContent = `
        #bookmark-button {
          background: none !important;
          border: none !important;
          color: rgb(209, 207, 207) !important;
          font-size: 13px !important;
          font: Century Gothic;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
        }
        #bookmark-button svg {
          margin-right: 5px !important;
        }
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
    uiManager.addCustomStyles();
    setupHotkeys();

    if (state.currentVideo) {
      console.log("Vidéo trouvée, initialisation en cours...");
      uiManager.addBookmarkButton();
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
      YouTubeBookmarker.init();
    }
  }
}).observe(document, { subtree: true, childList: true });