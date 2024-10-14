const YouTubeBookmarker = {

  state: {
    currentVideo: null,
    player: null,
    bookmarkButton: null,
    timeDisplay: null,
    progressBar: null,
    bookmarkInputVisible: false,
    bookmarkInputContainer: null,
    bookmarkInputElement: null,
    isInitialized: false,
    wasPlayingBeforeBookmark: false
  },

  CONSTANTS: {
    BOOKMARK_BUTTON_ID: 'bookmark-button',
    BOOKMARK_ICON_CLASS: 'custom-bookmark-icon',
    BOOKMARK_ICON_CONTAINER_CLASS: 'custom-bookmark-icon-container',
    BOOKMARK_DELETE_ICON_CLASS: 'custom-bookmark-delete-icon',
    BOOKMARK_INPUT_CONTAINER_CLASS: 'bookmark-input-container'
  },

  init() {
    this.setupEventListeners();
    this.loadBookmarks();
  },


  updateState: function () {
    console.log("Mise à jour de l'état");
    this.state.player = document.querySelector('.html5-video-player');
    this.state.bookmarkButton = document.getElementById(this.CONSTANTS.BOOKMARK_BUTTON_ID);
    this.state.currentVideo = document.querySelector('video');
    this.state.timeDisplay = document.querySelector('.ytp-time-display');
    this.state.progressBar = this.state.player ? this.state.player.querySelector('.ytp-progress-bar') : null;
    console.log("État mis à jour :", this.state);
  },

  setupEventListeners() {
    document.addEventListener('yt-navigate-finish', () => this.onNavigate());
    document.addEventListener('keydown', (e) => this.setupHotkeys(e));
    window.addEventListener('popstate', () => this.onPopState());
    this.setupHotkeys();
  },

  affMessage(message, type = 'info') {
    const messageContainer = document.createElement('div');
    messageContainer.className = `youtube-bookmarker-message ${type}`;
    messageContainer.textContent = message;
    document.body.appendChild(messageContainer);

    setTimeout(() => {
      messageContainer.remove();
    }, 3000);
  },

  setupHotkeys() {
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
                  this.handleAddBookmark();
                  break;
                case 'prev-bookmark':
                  this.navigateBookmarks('prev');
                  break;
                case 'next-bookmark':
                  this.navigateBookmarks('next');
                  break;
                case 'delete-bookmark':
                  this.deleteCurrentBookmark();
                  break;
                case 'toggle-notes':
                  this.toggleNotesVisibility();
                  break;
              }
            }
          });
        });
      }
  })
  },
  

  toggleNotesVisibility() {
  },

  async onNavigate() {
    if (window.location.pathname === '/watch') {
      await this.resetState();
      this.addBookmarkButton();
      this.loadBookmarks();
    }
  },

  async onPopState() {
    if (window.location.pathname === '/watch') {
      await this.resetState();
      this.loadBookmarks();
    }
  },

  async resetState() {
    this.state = {
      currentVideo: document.querySelector('video'),
      player: document.querySelector('.html5-video-player'),
      bookmarkButton: document.getElementById(this.CONSTANTS.BOOKMARK_BUTTON_ID),
      timeDisplay: document.querySelector('.ytp-time-display'),
      progressBar: document.querySelector('.ytp-progress-bar'),
      bookmarkInputVisible: false,
      bookmarkInputContainer: null,
      bookmarkInputElement: null,
      isInitialized: true,
      wasPlayingBeforeBookmark: false
    };
  },

  addBookmarkButton() {
    const controls = document.querySelector('.ytp-time-display');
    if (controls && !this.state.bookmarkButton) {
      const button = document.createElement('button');
      button.id = this.CONSTANTS.BOOKMARK_BUTTON_ID;
      
      const svgIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgIcon.setAttribute("viewBox", "0 0 24 24");
      svgIcon.setAttribute("width", "22");
      svgIcon.setAttribute("height", "18");
      svgIcon.innerHTML = '<path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" fill="white"/>';

      const buttonText = document.createElement('span');
      buttonText.textContent = 'Ajouter un marque-page';

      button.appendChild(svgIcon);
      button.appendChild(buttonText);

      this.state.timeDisplay.parentNode.insertBefore(button, this.state.timeDisplay.nextSibling);
      this.state.bookmarkButton = button;

      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleAddBookmark();
      });

      console.log("Bouton de marque-page ajouté avec succès après l'affichage du temps.");
    }
  },

  async handleAddBookmark() {
    if (this.state.bookmarkInputVisible && this.state.bookmarkInputContainer) {
      const note = this.state.bookmarkInputElement ? this.state.bookmarkInputElement.value : '';
      await this.saveBookmark(note);
    } else {
      await this.addBookmark();
    }
  },

  async addBookmark() {
    if (!this.state.currentVideo) {
      afMessage("Impossible d'ajouter un marque-page : aucune vidéo en cours de lecture.", 'error');
      return;
    }

    if (!this.state.player) {
      console.error("Conteneur du lecteur non trouvé");
      return;
    }

    this.state.currentVideo.pause();

    const inputContainer = document.createElement('div');
    inputContainer.className = this.CONSTANTS.BOOKMARK_INPUT_CONTAINER_CLASS;

    const positionRatio = this.state.currentVideo.currentTime / this.state.currentVideo.duration;
    let leftPosition = positionRatio * 100;

    const containerWidth = 240;
    const playerWidth = this.state.player.offsetWidth;
    const minPosition = (containerWidth / 2 / playerWidth) * 100;
    const maxPosition = 100 - minPosition;

    leftPosition = Math.max(minPosition, Math.min(leftPosition, maxPosition));
    inputContainer.style.left = `${leftPosition}%`;

    const noteInput = document.createElement('input');
    noteInput.type = 'text';
    noteInput.className = 'bookmark-input';
    noteInput.placeholder = 'Ajouter une note pour ce marque-page';

    inputContainer.appendChild(noteInput);

    const { showBookmarkButtons } = await new Promise(resolve =>
      chrome.storage.sync.get({ showBookmarkButtons: false }, resolve)
    );

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
      if (!inputContainer.contains(e.target) && e.target !== this.state.bookmarkButton) {
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

    if (this.state.player) {
      this.state.player.appendChild(inputContainer);
      this.state.bookmarkInputContainer = inputContainer;
      this.state.bookmarkInputElement = noteInput;
      this.state.bookmarkInputVisible = true;
      noteInput.focus();
    } else {
      console.error("Conteneur du lecteur non trouvé");
    }
  },

  async saveBookmark(note) {
    const currentTime = this.state.currentVideo ? this.state.currentVideo.currentTime : 0;
    const url = window.location.href;
    const bookmark = {
      time: currentTime,
      url: url,
      note: note
    };

    this.closeBookmarkInput();
    try {
      const response = await chrome.runtime.sendMessage({ action: 'addBookmark', bookmark });
      if (response.success) {
        this.affMessage("Marque-page ajouté avec succès !", 'info');
        this.loadBookmarks();
      } else {
        this.affMessage(`Erreur lors de l'ajout du marque-page : ${response.error}`, 'error');
      }
    } catch (error) {
      this.affMessage(`Erreur de communication avec l'extension : ${error}`, 'error');
    }
  },

  closeBookmarkInput() {
    if (this.state.bookmarkInputContainer) {
      this.state.bookmarkInputContainer.remove();
      this.state.bookmarkInputContainer = null;
      this.state.bookmarkInputElement = null;
    }
    this.state.bookmarkInputVisible = false;

    if (this.state.currentVideo && this.state.wasPlayingBeforeBookmark) {
      this.state.currentVideo.play();
    }

    this.state.wasPlayingBeforeBookmark = false;
  },

  async loadBookmarks() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getBookmarksByUrl', url: window.location.href });
      if (response.bookmarks) {
        this.displayBookmarks(response.bookmarks);
      } else {
        console.error("Erreur lors du chargement des marque-pages:", response.error);
      }
    } catch (error) {
      console.error("Erreur de communication avec l'extension:", error);
    }
  },

  displayBookmarks(bookmarks) {
    this.removeExistingBookmarkIcons();
    bookmarks.forEach(bookmark => this.addBookmarkIcon(bookmark));
  },

  removeExistingBookmarkIcons() {
    document.querySelectorAll(`.${this.CONSTANTS.BOOKMARK_ICON_CONTAINER_CLASS}`).forEach(el => el.remove());
  },

  addBookmarkIcon(bookmark) {
    if (!this.state.progressBar || !this.state.currentVideo) return;

    const iconContainer = document.createElement('div');
    iconContainer.className = this.CONSTANTS.BOOKMARK_ICON_CONTAINER_CLASS;
    iconContainer.style.left = `${(bookmark.time / this.state.currentVideo.duration) * 100}%`;

    const icon = document.createElement('div');
    icon.className = this.CONSTANTS.BOOKMARK_ICON_CLASS;

    const infoContainer = document.createElement('div');
    infoContainer.className = 'custom-bookmark-info-container';

    const deleteIcon = document.createElement('span');
    deleteIcon.className = this.CONSTANTS.BOOKMARK_DELETE_ICON_CLASS;
    deleteIcon.innerHTML = '🗑️';

    infoContainer.appendChild(deleteIcon);

    if (bookmark.note && bookmark.note.trim() !== '') {
      const noteText = document.createElement('span');
      noteText.className = 'custom-bookmark-note';
      noteText.textContent = bookmark.note;
      infoContainer.insertBefore(noteText, deleteIcon);
    }

    deleteIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteBookmark(bookmark);
    });

    icon.addEventListener('mouseenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      infoContainer.style.display = 'block';
    });

    icon.addEventListener('pointerdown', (e) => { // Ajout de cet événement
      e.preventDefault(); // Empêche l'interaction avec l'interface de YouTube
      e.stopPropagation(); // Empêche la propagation de l'événement
      if (e.button === 1) {
        this.deleteBookmark(bookmark);
      }
    });

    icon.addEventListener('mouseleave', (e) => {
      chrome.storage.sync.get('hideNotesByDefault', ({ hideNotesByDefault }) => {
        if (hideNotesByDefault) {
          infoContainer.style.display = 'none';
        }
      });
    });
    
    infoContainer.addEventListener('mouseenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      infoContainer.style.display = 'block';
    });

    infoContainer.addEventListener('pointerdown', (e) => { // Ajout de cet événement
      e.preventDefault(); // Empêche l'interaction avec l'interface de YouTube
      e.stopPropagation(); // Empêche la propagation de l'événement
    });

    infoContainer.addEventListener('mouseleave', () => {
      chrome.storage.sync.get('hideNotesByDefault', ({ hideNotesByDefault }) => {
        if (hideNotesByDefault) {
          infoContainer.style.display = 'none';
        }
      });
    });

    let isDragging = false;
    let dragStartX, dragStartLeft, dragStartTime;

    const startDragging = (e) => {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartLeft = parseFloat(iconContainer.style.left);
      dragStartTime = bookmark.time;
      iconContainer.classList.add('dragging');
      document.addEventListener('mousemove', dragBookmark);
      document.addEventListener('mouseup', stopDragging);
      e.preventDefault();
    };


    const dragBookmark = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - dragStartX;
      const newLeft = dragStartLeft + deltaX;
      const progressBarRect = this.state.progressBar.getBoundingClientRect();
      const minLeft = 0;
      const maxLeft = progressBarRect.width - iconContainer.offsetWidth;
      const clampedLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
      iconContainer.style.left = `${clampedLeft}px`;
    };

    const stopDragging = async (e) => {
      isDragging = false;
      iconContainer.classList.remove('dragging');
      document.removeEventListener('mousemove', dragBookmark);
      document.removeEventListener('mouseup', stopDragging);

      const progressBarRect = this.state.progressBar.getBoundingClientRect();
      const newLeft = parseFloat(iconContainer.style.left);
      const newTime = (newLeft / progressBarRect.width) * this.state.currentVideo.duration;

      if (Math.abs(newTime - dragStartTime) > 5) {
        bookmark.time = newTime;
        try {
          await chrome.runtime.sendMessage({ action: 'updateBookmark', bookmark });
          this.loadBookmarks();
        } catch (error) {
          console.error("Erreur lors de la mise à jour du marque-page:", error);
          iconContainer.style.left = `${(dragStartTime / this.state.currentVideo.duration) * progressBarRect.width}px`;
        }
      } else {
        iconContainer.style.left = `${(dragStartTime / this.state.currentVideo.duration) * progressBarRect.width}px`;
      }
    };

    iconContainer.addEventListener('mousedown', startDragging);

    icon.addEventListener('click', () => {
      this.state.currentVideo.currentTime = bookmark.time;
    });

    iconContainer.appendChild(icon);
    iconContainer.appendChild(infoContainer);
    this.state.progressBar.appendChild(iconContainer);
  },

  async deleteBookmark(bookmark) {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'deleteBookmark', bookmark });
      if (response.success) {
        this.affMessage("Marque-page supprimé !");
        this.loadBookmarks();
      } else {
        this.affMessage(`Erreur lors de la suppression du marque-page : ${response.error}`, 'error');
      }
    } catch (error) {
      this.affMessage(`Erreur de communication avec l'extension : ${error}`, 'error');
    }
  },

  async navigateBookmarks(direction) {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getBookmarksByUrl', url: window.location.href });
      if (response.bookmarks) {
        const currentTime = this.state.currentVideo.currentTime;
        const allBookmarks = [...this.defaultBookmarks, ...videoBookmarks].sort((a, b) => a.time - b.
        time);
    
        if (direction === 'prev') {
          const prevBookmark = allBookmarks.reverse().find(b => b.time < currentTime);
          if (prevBookmark) state.currentVideo.currentTime = prevBookmark.time;
          console.log(`Navigué vers le signet précédent : ${prevBookmark.note}`);
        } else if (direction === 'next') {
          const nextBookmark = allBookmarks.find(b => b.time > currentTime);
          if (nextBookmark) state.currentVideo.currentTime = nextBookmark.time;
          console.log(`Navigué vers le signet suivant : ${nextBookmark.note}`);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la navigation vers les marque-pages :", error);
    }
  },
}


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
        YouTubeBookmarker.init();
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
        YouTubeBookmarker.updateState();
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