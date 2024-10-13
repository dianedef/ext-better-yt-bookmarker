// Déplacer CONSTANTS en dehors du module YouTubeBookmarker
const CONSTANTS = {
  BOOKMARK_BUTTON_ID: 'bookmark-button',
  BOOKMARK_ICON_CLASS: 'custom-bookmark-icon',
  BOOKMARK_ICON_CONTAINER_CLASS: 'custom-bookmark-icon-container',
  BOOKMARK_DELETE_ICON_CLASS: 'custom-bookmark-delete-icon',
  BOOKMARK_INPUT_CONTAINER_CLASS: 'bookmark-input-container'
};

// Module principal
const YouTubeBookmarker = (function () {
  // État de l'application
  let state = {
    currentVideo: null,
    isExtensionReady: true,
    player: null,
    bookmarkButton: null,
    timeDisplay: null,
    progressBar: null,
    bookmarkInputVisible: false,
    bookmarkInputContainer: null,
    bookmarkInputElement: null,
    isInitialized: false
  };

  // Fonction pour réinitialiser l'état
  function resetState() {
    state = {
      currentVideo: null,
      isExtensionReady: true,
      player: null,
      bookmarkButton: null,
      timeDisplay: null,
      progressBar: null,
      bookmarkInputVisible: false,
      bookmarkInputContainer: null,
      bookmarkInputElement: null,
      isInitialized: false
    };
  }

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
      }, 3000); // Le message disparaît après 30 secondes
    }
  };

  // Gestion des marque-pages
  const bookmarkManager = {
    defaultBookmarks: [],

    handleBookmarkAction: async function (action, bookmark) {
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
          this.loadBookmarks();
          utils.afficherMessage("Marque-page ajouté avec succès !", 'info');
        } else {
          console.error(`Erreur lors de l'${action === 'addBookmark' ? 'ajout' : 'suppression'} du marque-page:`, response);
          utils.afficherMessage(`Erreur lors de l'${action === 'addBookmark' ? 'ajout' : 'suppression'} du marque-page. Veuillez vérifier la console pour plus de détails.`, 'error');
        }
      } catch (error) {
        const errorAction = action === 'addBookmark' ? 'l\'ajout' :
                            action === 'deleteBookmark' ? 'la suppression' : 'la mise à jour';
        console.error(`Erreur lors de ${errorAction} du marque-page:`, error);
        utils.afficherMessage(`Erreur de communication avec l'extension lors de ${errorAction} du marque-page. Veuillez réessayer.`, 'error');
        throw error;
      }
    },

    handleAddBookmark: async function () {
      if (state.bookmarkInputVisible && state.bookmarkInputContainer) {
        const note = state.bookmarkInputElement ? state.bookmarkInputElement.value : '';
        await this.saveBookmark(note);
      } else {
        await this.addBookmark();
      }
    },

    addBookmark: async function () {
      console.log("addBookmark appelé");

      const { showBookmarkButtons } = await new Promise(resolve =>
        chrome.storage.sync.get({ showBookmarkButtons: false }, resolve)
      );

      if (!state.currentVideo) {
        console.error("Erreur : Aucune vidéo en cours de lecture.");
        utils.afficherMessage("Impossible d'ajouter un marque-page : aucune vidéo en cours de lecture.", 'error');
        return;
      }

      const wasPlaying = !state.currentVideo.paused;
      state.currentVideo.pause();

      const inputContainer = document.createElement('div');
      inputContainer.className = CONSTANTS.BOOKMARK_INPUT_CONTAINER_CLASS;

      // Calculer la position horizontale
      const positionRatio = state.currentVideo.currentTime / state.currentVideo.duration;
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

      const noteInput = document.createElement('input');
      noteInput.type = 'text';
      noteInput.className = 'bookmark-input';
      noteInput.placeholder = 'Ajouter une note pour ce marque-page';

      inputContainer.appendChild(noteInput);

      if (showBookmarkButtons) {
        const addButton = document.createElement('button');
        addButton.textContent = '+';
        addButton.style.marginRight = '5px';

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'x';

        inputContainer.append(addButton, cancelButton);

        addButton.addEventListener('click', () => this.saveBookmark(noteInput.value));
        cancelButton.addEventListener('click', () => this.closeBookmarkInput());
      }

      const closeInput = () => {
        this.closeBookmarkInput();
        document.removeEventListener('click', handleOutsideClick);
      };

      const handleOutsideClick = (e) => {
        if (!inputContainer.contains(e.target) && e.target !== state.bookmarkButton) {
          closeInput();
        }
      };

      noteInput.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Escape') closeInput();
        if (e.key === 'Enter') this.saveBookmark(noteInput.value);
      });

      inputContainer.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      document.addEventListener('click', handleOutsideClick);

      if (state.player) {
        state.player.appendChild(inputContainer);
        state.bookmarkInputContainer = inputContainer;
        state.bookmarkInputElement = noteInput;
        state.bookmarkInputVisible = true;
        noteInput.focus();
      } else {
        console.error("Conteneur du lecteur non trouvé");
      }

      // Stockons l'état de lecture dans l'objet state
      state.wasPlayingBeforeBookmark = wasPlaying;
    },

    saveBookmark: async function (note) {
      const currentTime = state.currentVideo ? state.currentVideo.currentTime : 0;
      const url = window.location.href;
      const bookmark = {
        time: currentTime,
        url: url,
        note: note
      };

      this.closeBookmarkInput();
      await this.handleBookmarkAction('addBookmark', bookmark);
    },

    closeBookmarkInput: function () {
      if (state.bookmarkInputContainer) {
        state.bookmarkInputContainer.remove();
        state.bookmarkInputContainer = null;
        state.bookmarkInputElement = null;
      }
      state.bookmarkInputVisible = false;

      // Vérifier si la vidéo était en lecture avant l'ouverture de l'input
      if (state.currentVideo && state.wasPlayingBeforeBookmark) {
        state.currentVideo.play();
      }

      // Réinitialiser l'état de lecture
      state.wasPlayingBeforeBookmark = undefined;
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
        utils.afficherMessage("Erreur : L'extension a été rechargée ou désactivée. Veuillez rafraîchir la page.", 'error');
        return;
      }

      try {
        const response = await utils.sendMessageToBackground({
          action: 'deleteBookmark',
          bookmark: bookmark
        });
        if (response && response.success) {
          // Supprimer l'icône et la note du DOM
          this.removeBookmarkFromDOM(bookmark);
          // Supprimer le marque-page du stockage
          await this.removeBookmarkFromStorage(bookmark);
          utils.afficherMessage("Marque-page supprimé !");
        } else {
          console.error("Erreur lors de la suppression du marque-page:", response);
          utils.afficherMessage("Erreur lors de la suppression du marque-page. Veuillez vérifier la console pour plus de détails.", 'error');
        }
      } catch (error) {
        console.error('Erreur lors de la suppression du marque-page:', error);
        utils.afficherMessage("Une erreur est survenue lors de la suppression du marque-page.", 'error');
      }
    },

    removeBookmarkFromDOM: function (bookmark) {
      const bookmarkIcons = document.querySelectorAll('.custom-bookmark-icon-container');
      bookmarkIcons.forEach(iconContainer => {
        const iconPosition = parseFloat(iconContainer.style.left);
        const bookmarkPosition = (bookmark.time / state.currentVideo.duration) * state.progressBar.offsetWidth;
        if (Math.abs(iconPosition - bookmarkPosition) < 1) {
          iconContainer.remove();
        }
      });
    },

    removeBookmarkFromStorage: function (bookmarkToRemove) {
      return new Promise((resolve, reject) => {
        chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }

          const updatedBookmarks = bookmarks.filter(bookmark =>
            !(bookmark.url === bookmarkToRemove.url &&
              bookmark.time === bookmarkToRemove.time &&
              bookmark.note === bookmarkToRemove.note)
          );

          chrome.storage.sync.set({ bookmarks: updatedBookmarks }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
      });
    },

    loadBookmarks: function (attempts = 0) {
      console.log("Début de loadBookmarks, tentative:", attempts + 1);
      if (!utils.isExtensionValid()) {
        if (attempts < 10) {
          console.warn("Le contexte de l'extension n'est pas valide. Nouvel essai dans 1 seconde.");
          setTimeout(() => this.loadBookmarks(attempts + 1), 1000);
        } else if (attempts < 30) {
          console.error("Le contexte de l'extension reste invalide après 10 tentatives. Nouvel essai dans 1 seconde.");
          setTimeout(() => this.loadBookmarks(attempts + 1), 1000);
        } else {
          console.error("Échec de l'initialisation de l'extension après 30 tentatives.");
          utils.afficherMessage("L'extension YouTube Bookmarker n'a pas pu s'initialiser correctement. Veuillez actualiser la page.", 'error');
        }
        return;
      }

      try {
        chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
          if (chrome.runtime.lastError) {
            console.error("Erreur lors de l'accès au stockage :", chrome.runtime.lastError);
            return;
          }
          if (bookmarks && Array.isArray(bookmarks)) {
            const videoBookmarks = bookmarks.filter(b => b.url === window.location.href);
            console.log("Bookmarks pour cette vidéo :", videoBookmarks);
            uiManager.removeExistingBookmarkIcons();
            videoBookmarks.forEach(bookmark => {
              console.log("Ajout de l'icône pour le bookmark :", bookmark);
              uiManager.addBookmarkIcon(bookmark);
            });
          }
          // Appel de la fonction addDefaultBookmarks
          bookmarkManager.addDefaultBookmarks();
        });
      } catch (error) {
        console.warn("Erreur lors du chargement des marque-pages:", error);
      }
    },

    navigateBookmarks: function (direction) {
      chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
        if (!bookmarks) bookmarks = [];
        console.log("Bookmarks récupérés pour navigation :", bookmarks);
        const currentTime = state.currentVideo.currentTime;
        const currentUrl = window.location.href;
        const videoBookmarks = bookmarks.filter(b => b.url === currentUrl);
        const allBookmarks = [...this.defaultBookmarks, ...videoBookmarks].sort((a, b) => a.time - b.time);

        if (direction === 'prev') {
          const prevBookmark = allBookmarks.reverse().find(b => b.time < currentTime);
          if (prevBookmark) state.currentVideo.currentTime = prevBookmark.time;
          console.log(`Navigué vers le signet précédent : ${prevBookmark.note}`);
        } else if (direction === 'next') {
          const nextBookmark = allBookmarks.find(b => b.time > currentTime);
          if (nextBookmark) state.currentVideo.currentTime = nextBookmark.time;
          console.log(`Navigué vers le signet suivant : ${nextBookmark.note}`);
        }
      });
    },

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

  // Gestion de l'interface utilisateur
  const uiManager = {
    addBookmarkButton: function () {
      if (!utils.isExtensionValid()) {
        console.error("Le contexte de l'extension n'est plus valide lors de l'ajout du bouton.");
        return;
      }

      if (document.getElementById(CONSTANTS.BOOKMARK_BUTTON_ID)) {
        // Le bouton existe déjà, rien à faire
        return;
      }

      state.timeDisplay = document.querySelector('.ytp-time-display');
      if (!state.timeDisplay) {
        console.warn("Impossible d'ajouter le bouton de marque-page. Affichage du temps non trouvé.");
        return;
      }

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

          const iconContainer = document.createElement('div');
          iconContainer.className = 'custom-bookmark-icon-container';
          iconContainer.style.position = 'absolute';
          iconContainer.style.left = `${(bookmark.time / state.currentVideo.duration) * state.progressBar.offsetWidth}px`;
          console.log("Container d'icônes créé avec la position :", iconContainer.style.left);

          const icon = document.createElement('div');
          icon.className = 'custom-bookmark-icon';
          console.log("Icône point rouge créée");

          const infoContainer = document.createElement('div');
          infoContainer.className = 'custom-bookmark-info-container';

          const deleteIcon = document.createElement('span');
          deleteIcon.className = 'custom-bookmark-delete-icon';
          deleteIcon.innerHTML = '🗑️';
          console.log("Icône de suppression créée");

          infoContainer.appendChild(deleteIcon);

          if (bookmark.note && bookmark.note.trim() !== '') {
            const noteText = document.createElement('span');
            noteText.className = 'custom-bookmark-note';
            noteText.textContent = bookmark.note;
            infoContainer.insertBefore(noteText, deleteIcon);
            console.log("Texte de note affiché avec le contenu :", bookmark.note);
          }

          deleteIcon.addEventListener('click', (e) => {
            console.log("Clic sur l'icône de suppression");
            e.stopPropagation();
            bookmarkManager.deleteBookmark(bookmark);
          });

          // Déplacer l'écouteur de clic de molette ici
          icon.addEventListener('mouseenter', () => {
            console.log("Survol de l'icône");
            infoContainer.style.display = 'block';

            // Ajouter l'écouteur pour le clic de molette lors du survol
            icon.addEventListener('pointerdown', (e) => {
              console.log("Événement pointerdown détecté"); // Log pour vérifier si l'événement est capturé

              if (e.button === 1) { // Vérifie si le clic est un clic de molette
                e.preventDefault(); // Empêche le comportement par défaut du clic de molette
                console.log("Clic de molette détecté sur l'icône de marque-page");
                e.stopPropagation();
                bookmarkManager.deleteBookmark(bookmark);
              }
            });
          });

          icon.addEventListener('mouseleave', () => {
            console.log("Fin du survol de l'icône");
            chrome.storage.sync.get('hideNotesByDefault', ({ hideNotesByDefault }) => {
              if (hideNotesByDefault) {
                infoContainer.style.display = 'none';
              }
            });
          });

          infoContainer.addEventListener('mouseenter', () => {
            console.log("Survol du conteneur d'info");
            infoContainer.style.display = 'block';
          });

          infoContainer.addEventListener('mouseleave', () => {
            console.log("Fin du survol du conteneur d'info");
            chrome.storage.sync.get('hideNotesByDefault', ({ hideNotesByDefault }) => {
              if (hideNotesByDefault) {
                infoContainer.style.display = 'none';
              }
            });
          });

          let isDragging = false;
          let dragStartX;
          let dragStartLeft;
          let dragStartTime;

          const startDragging = (e) => {
            isDragging = true;
            dragStartX = e.clientX;
            dragStartLeft = parseFloat(iconContainer.style.left);
            dragStartTime = bookmark.time; // Enregistrer le temps initial du marque-page
            iconContainer.classList.add('dragging');
            document.addEventListener('mousemove', dragBookmark);
            document.addEventListener('mouseup', stopDragging);
            e.preventDefault();
          };

          const dragBookmark = (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - dragStartX;
            const newLeft = dragStartLeft + deltaX;

            // Limiter le déplacement à l'intérieur de la barre de progression
            const progressBarRect = state.progressBar.getBoundingClientRect();
            const minLeft = 0;
            const maxLeft = progressBarRect.width - iconContainer.offsetWidth;
            const clampedLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));

            iconContainer.style.left = `${clampedLeft}px`;
            console.log("Position actuelle de l'icône:", clampedLeft); // Log pour vérifier la position
          };

          const stopDragging = async (e) => {
            isDragging = false;
            iconContainer.classList.remove('dragging');
            document.removeEventListener('mousemove', dragBookmark);
            document.removeEventListener('mouseup', stopDragging);

            const progressBarRect = state.progressBar.getBoundingClientRect();
            const newLeft = parseFloat(iconContainer.style.left);
            const newTime = (newLeft / progressBarRect.width) * state.currentVideo.duration;

            console.log("Nouvelle position du marque-page:", newTime); // Log pour vérifier la nouvelle position

            // Vérifier si la différence de temps est supérieure à 5 secondes
            if (Math.abs(newTime - dragStartTime) > 5) {
              // Mettre à jour le marque-page avec le nouveau temps
              bookmark.time = newTime;
              await bookmarkManager.handleBookmarkAction('updateBookmark', bookmark);
            } else {
              // Remettre l'icône à sa position initiale si la différence de temps est trop petite
              iconContainer.style.left = `${(dragStartTime / state.currentVideo.duration) * progressBarRect.width}px`;
            }
          };

          iconContainer.addEventListener('mousedown', startDragging);

          icon.addEventListener('click', () => {
            console.log("Clic sur l'icône de marque-page, navigation vers :", bookmark.time);
            state.currentVideo.currentTime = bookmark.time;
          });

          iconContainer.appendChild(icon);
          iconContainer.appendChild(infoContainer);
          state.player.appendChild(iconContainer);
          console.log("Icône ajoutée au DOM");

          // Nettoyage de l'observateur lors de la suppression de l'icône
          iconContainer.addEventListener('remove', () => resizeObserver.disconnect());
        } else {
          console.warn("Éléments nécessaires non disponibles pour ajouter l'icône de marque-page. Réessai dans 500ms.");
          setTimeout(() => this.addBookmarkIcon(bookmark), 500);
        }
      } catch (error) {
        console.warn("Erreur lors de l'ajout de l'icône de marque-page:", error);
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

  const waitForYouTubePlayer = function () {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 20;
      const checkPlayer = () => {
        state.player = document.querySelector('.html5-video-player');
        state.currentVideo = document.querySelector('video');
        state.progressBar = document.querySelector('.ytp-progress-bar');
        if (state.player && state.currentVideo && state.progressBar && state.player.getBoundingClientRect().width > 0) {
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

  const reinitializeExtension = function () {
    console.log("Réinitialisation de l'extension...");

    cleanupOldElements();
    resetState();

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

    document.getElementById(CONSTANTS.BOOKMARK_BUTTON_ID)?.remove();
    uiManager.removeExistingBookmarkIcons();
  };

  // Vérifiez si les objets et fonctions nécessaires existent avant de les utiliser
  const safeCall = (func, ...args) => {
    if (typeof func === 'function') {
      return func(...args);
    } else {
      console.warn(`La fonction ${func} n'est pas définie`);
    }
  };

  // Modifiez l'API publique pour utiliser safeCall
  return {
    init: () => safeCall(init),
    addBookmark: (...args) => safeCall(bookmarkManager.addBookmark, ...args),
    deleteBookmark: (...args) => safeCall(bookmarkManager.deleteBookmark, ...args),
    navigateBookmarks: (...args) => safeCall(bookmarkManager.navigateBookmarks, ...args),
    loadBookmarks: () => safeCall(bookmarkManager.loadBookmarks),
    utils: utils,
    resetState: () => safeCall(resetState),
    reinitializeExtension: () => safeCall(reinitializeExtension),
    checkAndResetState: () => safeCall(checkAndResetState)
  };
})();

// Utiliser l'API History au lieu de MutationObserver pour une meilleure performance
let lastUrl = location.href;
window.addEventListener('yt-navigate-finish', () => {
  console.log("Événement yt-navigate-finish déclenché");
  const url = location.href;
  if (url !== lastUrl) {
    console.log("Nouvelle URL détectée :", url);
    lastUrl = url;
    if (url.includes('youtube.com/watch')) {
      console.log("Réinitialisation de l'extension pour la nouvelle vidéo");
      YouTubeBookmarker.reinitializeExtension();
    }
  }
});

// Initialisation au chargement de la page
if (window.location.href.includes('youtube.com/watch')) {
  YouTubeBookmarker.init();
}

window.addEventListener('popstate', () => {
  console.log("Événement popstate détecté");
  if (window.location.href.includes('youtube.com/watch')) {
    YouTubeBookmarker.checkAndResetState().then(() => {
      YouTubeBookmarker.utils.updateState();
      YouTubeBookmarker.loadBookmarks();
    });
  }
});

chrome.runtime.onConnect.addListener(function(port) {
  if (port.name === "contentScript") {
    port.onDisconnect.addListener(function() {
      console.error("Connexion perdue avec l'extension. Tentative de reconnexion...");
      // Tentez de vous reconnecter ou de réinitialiser l'extension ici
      setTimeout(initializeExtension, 1000);
    });
  }
});

if (!chrome.runtime) {
  console.error("L'API chrome.runtime n'est pas disponible. Vérifiez la compatibilité du navigateur.");
  // Gérez cette situation (par exemple, désactivez les fonctionnalités de l'extension)
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}