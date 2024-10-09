// Module principal
const YouTubeBookmarker = (function() {
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
    isExtensionValid: function() {
      try {
        return !!chrome.runtime && !!chrome.runtime.id;
      } catch (e) {
        console.error("Erreur lors de la vérification de la validité de l'extension:", e);
        return false;
      }
    },
    
    updateState: function() {
      state.player = document.querySelector('.html5-video-player');
      state.bookmarkButton = document.getElementById(CONSTANTS.BOOKMARK_BUTTON_ID);
      state.currentVideo = document.querySelector('video');
    },

    sendMessageToBackground: function(message) {
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

    afficherMessage: function(message, type = 'info') {
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
    addBookmark: async function() {
      if (!utils.isExtensionValid()) {
        console.error("Le contexte de l'extension n'est plus valide.");
        utils.afficherMessage("Erreur : L'extension a été rechargée ou désactivée. Veuillez rafraîchir la page.", 'error');
        return;
      }

      // Vérifier si l'input existe déjà
      const existingInputContainer = document.querySelector('.bookmark-input-container');
      
      if (existingInputContainer) {
        // Si l'input existe, le supprimer et arrêter la fonction
        existingInputContainer.remove();
        return;
      }

      const video = document.querySelector('video');
      if (video) {
        const currentTime = video.currentTime;
        const wasPlaying = !video.paused;
        video.pause(); // Mettre la vidéo en pause
        const title = document.querySelector('.title')?.textContent || 'Titre inconnu';
        const url = window.location.href;

        let thumbnail = '';
        const thumbnailElement = document.querySelector('.ytp-thumbnail-image') ||
          document.querySelector('link[rel="image_src"]') ||
          document.querySelector('meta[property="og:image"]');
        if (thumbnailElement) {
          thumbnail = thumbnailElement.src || thumbnailElement.href || thumbnailElement.content;
        }

        // Créer le conteneur pour le champ de saisie
        const inputContainer = document.createElement('div');
        inputContainer.className = 'bookmark-input-container';
        inputContainer.style.position = 'absolute';
        inputContainer.style.left = `${(currentTime / video.duration) * 100}%`;
        inputContainer.style.bottom = '70px';
        inputContainer.style.transform = 'translateX(-50%)';
        inputContainer.style.zIndex = '2000';
        // ... autres styles pour inputContainer ...

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

        inputContainer.appendChild(noteInput);
        inputContainer.appendChild(addButton);
        inputContainer.appendChild(cancelButton);

        const playerContainer = document.querySelector('.html5-video-player');
        playerContainer.appendChild(inputContainer);

        noteInput.focus();

        // Empêcher la propagation des événements clavier
        const stopPropagation = (e) => {
          e.stopPropagation();
        };

        noteInput.addEventListener('keydown', stopPropagation);
        addButton.addEventListener('keydown', stopPropagation);
        cancelButton.addEventListener('keydown', stopPropagation);

        // Fonction pour fermer le champ de saisie et supprimer les écouteurs d'événements
        const closeInput = () => {
          playerContainer.removeChild(inputContainer);
          noteInput.removeEventListener('keydown', stopPropagation);
          addButton.removeEventListener('keydown', stopPropagation);
          cancelButton.removeEventListener('keydown', stopPropagation);
          if (wasPlaying) {
            video.play(); // Reprendre la lecture si la vidéo était en cours de lecture
          }
        };


        const handleAddBookmark = async () => {
          const note = noteInput.value;
          closeInput();

          if (wasPlaying) {
            video.play(); // Reprendre la lecture si la vidéo était en cours de lecture
          }

          const bookmark = {
            time: currentTime,
            title: title,
            url: url,
            thumbnail: thumbnail,
            note: note
          };

          try {
            const response = await utils.sendMessageToBackground({ action: 'addBookmark', bookmark });
            if (response && response.success) {
              utils.afficherMessage('Marque-page ajouté !');
              bookmarkManager.loadBookmarks();
            } else {
              console.error('Erreur lors de l\'ajout du marque-page:', response);
              utils.afficherMessage('Erreur lors de l\'ajout du marque-page. Veuillez vérifier la console pour plus de détails.', 'error');
            }
          } catch (error) {
            console.error('Erreur lors de l\'envoi du message:', error);
            utils.afficherMessage('Erreur lors de l\'ajout du marque-page. L\'extension a peut-être été rechargée. Veuillez rafraîchir la page.', 'error');
          }
        };

        addButton.addEventListener('click', handleAddBookmark);
        noteInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            handleAddBookmark();
          }
        });

        cancelButton.addEventListener('click', () => {
          closeInput();
          if (wasPlaying) {
            video.play(); // Reprendre la lecture si la vidéo était en cours de lecture
          }
        });

      } else {
        console.error('Élément vidéo non trouvé');
        utils.afficherMessage('Erreur : élément vidéo non trouvé', 'error');
      }
    },

    deleteBookmark: async function(bookmark) {
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

    loadBookmarks: function() {
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

    navigateBookmarks: function(direction) {
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
    addBookmarkButton: function() {
      if (!utils.isExtensionValid()) {
        console.error("Le contexte de l'extension n'est plus valide lors de l'ajout du bouton.");
        return;
      }

      const timeDisplay = document.querySelector('.ytp-time-display');
      if (timeDisplay && !document.getElementById('bookmark-button')) { 
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

        button.addEventListener('click', bookmarkManager.addBookmark);
        console.log("Bouton de marque-page ajouté avec succès après l'affichage du temps.");
      } else {
        console.warn("Impossible d'ajouter le bouton de marque-page. Affichage du temps non trouvé ou bouton déjà présent.");
      }
    },

    addBookmarkIcon: function(bookmark) {
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

    removeExistingBookmarkIcons: function() {
      const existingIcons = document.querySelectorAll('.custom-bookmark-icon');
      existingIcons.forEach(icon => icon.remove());
    },

    addCustomStyles: function() {
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

    toggleNotesVisibility: function() {
      const infoContainers = document.querySelectorAll('.custom-bookmark-info-container');
      const isVisible = infoContainers[0]?.style.display !== 'none';
      infoContainers.forEach(container => {
        container.style.display = isVisible ? 'none' : 'block';
      });
    }
  };

  // Initialisation et gestion des événements
  const init = function() {
    if (!utils.isExtensionValid()) return;

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

  const handleVideoStateChange = function() {
    if (!utils.isExtensionValid()) return;
    bookmarkManager.loadBookmarks();
  };

  const setupHotkeys = function() {
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