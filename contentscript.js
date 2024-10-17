const YouTubeBookmarker = {

  state: {
    currentVideo: null,
    player: null,
    bookmarks: [],
    groupedBookmarks: {},
    bookmarkButton: null,
    timeDisplay: null,
    progressBar: null,
    bookmarkContainerVisible: false,
    bookmarkInputContainer: null,
    bookmarkInputElement: null,
    isInitialized: false,
    wasPlayingBeforeBookmark: true
  },

  get currentVideoTime() {
    return this.state.currentVideo ? this.state.currentVideo.currentTime : 0;
  },

  get currentUrl() {
    return window.location.href;
  },

  CONSTANTS: {
    BOOKMARK_BUTTON_ID: 'bookmark-button',
    BOOKMARK_ICON_CLASS: 'custom-bookmark-icon',
    BOOKMARK_ICON_CONTAINER_CLASS: 'custom-bookmark-icon-container',
    BOOKMARK_DELETE_ICON_CLASS: 'custom-bookmark-delete-icon',
    BOOKMARK_INPUT_CONTAINER_CLASS: 'bookmark-input-container'
  },

  
  async init() {
    await this.resetState();
    await this.loadBookmarks();
    this.addBookmarkButton();
    this.setupEventListeners();
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
    chrome.storage.local.get('hotkeys', ({ hotkeys }) => {
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
              e.stopPropagation();
              switch (action) {
                case 'add-bookmark':
                  this.handleAddBookmark(e);
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
    console.log("Événement yt-navigate-finish déclenché dans onNavigate");
    if (window.location.pathname === '/watch' && this.currentUrl.includes('youtube.com/watch')) {
      let lastUrl = this.currentUrl;
      if (lastUrl !== this.currentUrl && this.currentUrl.includes('youtube.com/watch')) {
        console.log("Nouvelle URL détectée :", this.currentUrl);
        console.log("Réinitialisation de l'extension pour la nouvelle vidéo");
        await this.resetState();
        this.addBookmarkButton();
        this.loadBookmarks();
        if (url !== lastUrl) {
        this.init();
        }
      }
    }
  },
/*  
window.addEventListener('popstate', () => {
console.log("Événement popstate détecté");
if (YouTubeBookmarker.currentUrl.includes('youtube.com/watch')) {
  YouTubeBookmarker.checkAndResetState().then(() => {
    YouTubeBookmarker.updateState();
    YouTubeBookmarker.loadBookmarks();
if (YouTubeBookmarker.currentUrl.includes('youtube.com/watch')) {
YouTubeBookmarker.init();
 async onPopState() {
    if (window.location.pathname === '/watch') {
      await this.resetState();
      this.loadBookmarks();
    }
  },
 */
  async resetState() {
    const storedBookmarks = await chrome.storage.local.get('bookmarks');
    const storedGroupedBookmarks = await chrome.storage.local.get('groupedBookmarks');
    
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
        wasPlayingBeforeBookmark: true,
        bookmarks: storedBookmarks.bookmarks || [],
        groupedBookmarks: storedGroupedBookmarks.groupedBookmarks || {}
      };
      console.log("resetstate() storedGroupedBookmarks.groupedBookmarks", storedGroupedBookmarks.groupedBookmarks);
      console.log("resetstate() storedBookmarks.bookmarks", storedBookmarks.bookmarks);
      console.log("resetstate() storedGroupedBookmarks", storedGroupedBookmarks);
      console.log("resetstate() storedBookmarks", storedBookmarks);
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

  async addBookmarkButton() {
    const player = await this.waitForYouTubePlayer();
    if (player && !this.state.bookmarkButton) {
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
        this.handleAddBookmark(e);
      });

      console.log("Bouton de marque-page ajouté avec succès.");
    } else {
      console.error("Le conteneur des contrôles est introuvable.");
    }
  },

  waitForYouTubePlayer() {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const player = document.querySelector('.html5-video-player');
        if (player) {
          clearInterval(interval);
          resolve(player);
        }
      }, 100);
    });
  },

  async handleAddBookmark(event) {
    this.state.currentVideo.pause()? this.state.wasPlayingBeforeBookmark = false : this.state.wasPlayingBeforeBookmark = true;
    this.state.currentVideo.pause()
    const isClick = event instanceof MouseEvent;
    const isHotkey = event instanceof KeyboardEvent;
    if (isClick) {
      this.state.bookmarkContainerVisible = true;
    } else if (isHotkey) {
      this.state.bookmarkContainerVisible = false;
    }
    if (this.state.bookmarkContainerVisible && this.state.bookmarkInputContainer) {
      const note = this.state.bookmarkInputElement ? this.state.bookmarkInputElement.value : '';
      await this.saveBookmark(note);
      this.closeBookmarkInput();
    } else {
      await this.addBookmark();
    }
  },

  async addBookmark() {
    if (!this.state.bookmarkInputContainer) {
      const inputContainer = document.createElement('div');
      inputContainer.className = this.CONSTANTS.BOOKMARK_INPUT_CONTAINER_CLASS;
      const positionRatio = this.currentVideoTime / this.state.currentVideo.duration;
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
      this.state.bookmarkInputContainer = inputContainer;

      const { showBookmarkButtons } = await new Promise(resolve =>
        chrome.storage.local.get({ showBookmarkButtons: false }, resolve)
      );

      if (showBookmarkButtons) {
        const addButton = document.createElement('button');
        addButton.textContent = '+';
        addButton.style.marginRight = '5px';

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'x';

        inputContainer.append(addButton, cancelButton);

        addButton.onclick = () => {
          this.saveBookmark(noteInput.value);
          this.closeBookmarkInput();
        };
        cancelButton.onclick = () => this.closeBookmarkInput();
      }

      if (this.state.player) {
        this.state.player.appendChild(inputContainer);
        this.state.bookmarkInputContainer = inputContainer;
        this.state.bookmarkInputElement = noteInput;
        noteInput.focus();
      } else {
        console.error("Conteneur du lecteur non trouvé");
      }
      
      const handleOutsideClick = (e) => {
        if (!inputContainer.contains(e.target) && e.target !== this.state.bookmarkButton) {
          document.addEventListener('click', handleOutsideClick);
          this.closeBookmarkInput();
          const videoPlayer = document.getElementById('container');
          console.log(videoPlayer);
          if (videoPlayer) {  
            videoPlayer.addEventListener('click', (e) => {
              e.preventDefault();
            });
          document.removeEventListener('click', handleOutsideClick);
          }
        }
        console.log("click, fermeture du conteneur d'input");
      };

      inputContainer.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
      });

      noteInput.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Escape') {
          console.log("Échap pressé, fermeture du conteneur d'input");
          this.closeBookmarkInput();
        }
        if (e.key === 'Enter') {
          console.log("Entrée pressée, ajout du marque-page");
          this.saveBookmark(noteInput.value);
          this.closeBookmarkInput();
        }
      });
    }
  },

  async saveBookmark(note) {
    const newBookmark = {
      time: this.currentVideoTime,
      url: this.currentUrl,
      note: note
    };

    try {
      if (!this.state.bookmarks.some(b => b.url === newBookmark.url && b.time === newBookmark.time)) {
        this.state.bookmarks.push(newBookmark);
        await chrome.storage.local.set({ bookmarks: this.state.bookmarks });
        this.affMessage("Marque-page ajouté avec succès !", 'info');
        
        const storedBookmarks = await chrome.storage.local.get('bookmarks');
        console.log("saveBookmark this.state.bookmarks:", JSON.stringify(this.state.bookmarks));
        console.log("bookmarks enregistrés dans le local storage de chrome", JSON.stringify(storedBookmarks.bookmarks));
        
        this.loadBookmarks();
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout du marque-page:", error);
    }
  },

  closeBookmarkInput() {
    if (this.state.bookmarkInputContainer) {
      this.state.bookmarkInputContainer.remove();
      this.state.bookmarkInputContainer = null;
      this.state.bookmarkInputElement = null;
      this.state.bookmarkContainerVisible = false;
    } else {
    }
    if (this.state.bookmarkInputElement) {
      this.state.bookmarkInputElement = null;
      this.state.bookmarkContainerVisible = false;
    }
    this.state.wasPlayingBeforeBookmark ? this.state.currentVideo.play() : null;
    return;
  },

  async loadBookmarks() {
    console.log("loadBookmarks this.state.bookmarks:", this.state.bookmarks);
    console.log("loadBookmarks this.state.groupedBookmarks:", this.state.groupedBookmarks);
    if (this.state.bookmarks.length === 0) {
      console.log("loadBookmarks Aucun marque-page trouvé pour cette url");
      return;
    }
    else {
      document.querySelectorAll(`.${this.CONSTANTS.BOOKMARK_ICON_CONTAINER_CLASS}`).forEach(el => el.remove());
      try {
        const bookmarksForThisUrl = this.state.bookmarks.filter(bookmark => bookmark.url === this.currentUrl);
        bookmarksForThisUrl.forEach(bookmark => this.addBookmarkIcon(bookmark));
      } catch (error) {
        console.error("loadBookmarks Erreur du chargement des marque-pages pour cette url:", error);
      }
    }
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
      this.deleteBookmark(bookmark);
    });

    icon.addEventListener('mouseenter', (e) => {
      infoContainer.style.display = 'block';
      icon.addEventListener('pointerdown', (e) => {
        if (e.button === 1) {
          this.deleteBookmark(bookmark);
        }
      });
    });

    icon.addEventListener('mouseleave', () => {
      chrome.storage.local.get('hideNotesByDefault', ({ hideNotesByDefault }) => {
        if (hideNotesByDefault) {
          infoContainer.style.display = 'none';
        }
      });
    });
    
    infoContainer.addEventListener('mouseenter', () => {
      infoContainer.style.display = 'block';
    });

    infoContainer.addEventListener('mouseleave', () => {
      chrome.storage.local.get('hideNotesByDefault', ({ hideNotesByDefault }) => {
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
      this.currentVideoTime = bookmark.time;
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
    const allBookmarks = [];
    try {
      this.defaultBookmarks = this.defaultBookmarks || [];
      if (this.state.bookmarks.length === 0) {
        this.defaultBookmarks = [
          { time: 0, note: 'Début de la vidéo' },
          { time: this.currentVideoTime, note: 'Fin de la vidéo' }
          ];
          console.log("Marque-pages par défaut ajoutés :", this.defaultBookmarks);
          allBookmarks = this.state.bookmarks.push(...this.defaultBookmarks);
        }
      else {
        allBookmarks = [...this.defaultBookmarks, ...this.state.bookmarks].sort((a, b) => a.time - b.time);
      }
      if (direction === 'prev') {
        const prevBookmark = allBookmarks.filter(b => b.time < this.currentVideoTime - 3).pop();
        if (prevBookmark) this.currentVideoTime = prevBookmark.time;
      } else if (direction === 'next') {
        const nextBookmark = allBookmarks.filter(b => b.time > this.currentVideoTime).shift();
        if (nextBookmark) this.currentVideoTime = nextBookmark.time;
      }
    } catch (error) {
      console.error("Erreur lors de la navigation vers les marque-pages :", error);
    }
  },
}

YouTubeBookmarker.init()

chrome.runtime.onConnect.addListener(function(port) {
if (port.name === "contentScript") {
  port.onDisconnect.addListener(function() {
    console.error("Connexion perdue avec l'extension. Tentative de reconnexion...");
    setTimeout(initializeExtension, 1000);
  });
}
});

if (!chrome.runtime) {
console.error("L'API chrome.runtime n'est pas disponible. Vérifiez la compatibilité du navigateur.");
}

/* 


async checkelement() {
  if (document.querySelector('video')) {
    console.log("video trouvé");
    const video = document.querySelector('video');
    console.log(video); // Vérifiez l'élément
    video.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation(); 
    }, true); 
  }
}
 */



