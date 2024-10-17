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
        BMBackground.afficherMessage("Marque-page ajouté avec succès !", 'info');
        this.loadBookmarks();
      } else {
        BMBackground.afficherMessage(`Erreur lors de l'ajout du marque-page : ${response.error}`, 'error');
      }
    } catch (error) {
      BMBackground.afficherMessage(`Erreur de communication avec l'extension : ${error}`, 'error');
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
      const response = await chrome.runtime.sendMessage({ action: 'getBookmarksByUrl', url: window.location.
      href });
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

    icon.addEventListener('mouseenter', () => {
      infoContainer.style.display = 'block';
      icon.addEventListener('pointerdown', (e) => {
        if (e.button === 1) {
          e.preventDefault();
          e.stopPropagation();
          this.deleteBookmark(bookmark);
        }
      });
    });

    icon.addEventListener('mouseleave', () => {
      chrome.storage.sync.get('hideNotesByDefault', ({ hideNotesByDefault }) => {
        if (hideNotesByDefault) {
          infoContainer.style.display = 'none';
        }
      });
    });

    infoContainer.addEventListener('mouseenter', () => {
      infoContainer.style.display = 'block';
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
          iconContainer.style.left = `${(dragStartTime / this.state.currentVideo.duration) * progressBarRect.
          width}px`;
        }
      } else {
        iconContainer.style.left = `${(dragStartTime / this.state.currentVideo.duration) * progressBarRect.
        width}px`;
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
        BMBackground.afficherMessage("Marque-page supprimé !");
        this.loadBookmarks();
      } else {
        BMBackground.afficherMessage(`Erreur lors de la suppression du marque-page : ${response.error}`, 
        'error');
      }
    } catch (error) {
      BMBackground.afficherMessage(`Erreur de communication avec l'extension : ${error}`, 'error');
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
