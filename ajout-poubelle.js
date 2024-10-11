let currentVideo = null;
let isExtensionReady = true;

function isExtensionValid() {
  try {
    return !!chrome.runtime && !!chrome.runtime.id;
  } catch (e) {
    console.error("Erreur lors de la vérification de la validité de l'extension:", e);
    return false;
  }
}

function addBookmarkButton() {
  if (!isExtensionValid()) {
    console.error("Le contexte de l'extension n'est plus valide lors de l'ajout du bouton.");
    return;
  }

  const player = document.querySelector('.html5-video-player');
  if (player && !document.getElementById('bookmark-button')) {
    const button = document.createElement('button');
    button.id = 'bookmark-button';
    button.textContent = 'Ajouter Marque-page';
    button.style.position = 'absolute';
    button.style.bottom = '60px';
    button.style.left = '40px';
    button.style.zIndex = '1000';
    player.appendChild(button);

    button.addEventListener('click', addBookmark);
    console.log("Bouton de marque-page ajouté avec succès.");
  } else {
    console.warn("Impossible d'ajouter le bouton de marque-page. Lecteur non trouvé ou bouton déjà présent.");
  }
}

function sendMessageToBackground(message) {
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
}

async function addBookmark() {
  if (!isExtensionValid()) {
    console.error("Le contexte de l'extension n'est plus valide.");
    alert("Erreur : L'extension a été rechargée ou désactivée. Veuillez rafraîchir la page.");
    return;
  }

  const video = document.querySelector('video');
  if (video) {
    const currentTime = video.currentTime;
    const title = document.querySelector('.title')?.textContent || 'Titre inconnu';
    const url = window.location.href;
    
    // Essayons différentes méthodes pour obtenir la miniature
    let thumbnail = '';
    const thumbnailElement = document.querySelector('.ytp-thumbnail-image') || 
                             document.querySelector('link[rel="image_src"]') ||
                             document.querySelector('meta[property="og:image"]');
    if (thumbnailElement) {
      thumbnail = thumbnailElement.src || thumbnailElement.href || thumbnailElement.content;
    }

    const bookmark = {
      time: currentTime,
      title: title,
      url: url,
      thumbnail: thumbnail,
      note: prompt('Ajouter une note pour ce marque-page:')
    };

    console.log('Tentative d\'ajout d\'un marque-page:', bookmark);

    try {
      const response = await sendMessageToBackground({ action: 'addBookmark', bookmark });
      if (response && response.success) {
        alert('Marque-page ajouté !');
        loadBookmarks();
      } else {
        console.error('Erreur lors de l\'ajout du marque-page:', response);
        alert('Erreur lors de l\'ajout du marque-page. Veuillez vérifier la console pour plus de détails.');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      alert('Erreur lors de l\'ajout du marque-page. L\'extension a peut-être été rechargée. Veuillez rafraîchir la page.');
    }
  } else {
    console.error('Élément vidéo non trouvé');
    alert('Erreur : élément vidéo non trouvé');
  }
}

function addBookmarkIcon(bookmark) {
  const player = document.querySelector('.html5-video-player');
  if (player) {
    const iconContainer = document.createElement('div');
    iconContainer.className = 'custom-bookmark-icon-container';
    iconContainer.style.position = 'absolute';
    iconContainer.style.left = `${(bookmark.time / currentVideo.duration) * 100}%`;
    iconContainer.style.bottom = '40px';
    iconContainer.style.zIndex = '2000';
    iconContainer.style.transform = 'translateX(-50%)';

    const icon = document.createElement('div');
    icon.className = 'custom-bookmark-icon';
    icon.style.width = '20px';
    icon.style.height = '20px';
    icon.style.borderRadius = '50%';
    icon.style.backgroundColor = 'red';
    icon.title = bookmark.note;

    const deleteIcon = document.createElement('div');
    deleteIcon.className = 'custom-bookmark-delete-icon';
    deleteIcon.innerHTML = '🗑️';
    deleteIcon.style.position = 'absolute';
    deleteIcon.style.top = '-15px';
    deleteIcon.style.left = '50%';
    deleteIcon.style.transform = 'translateX(-50%)';
    deleteIcon.style.cursor = 'pointer';
    deleteIcon.style.display = 'none';

    deleteIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteBookmark(bookmark);
    });

    iconContainer.appendChild(icon);
    iconContainer.appendChild(deleteIcon);
    player.appendChild(iconContainer);

    // Effet de survol
    iconContainer.addEventListener('mouseenter', () => {
      icon.style.width = '24px';
      icon.style.height = '24px';
      icon.style.backgroundColor = 'orange';
      deleteIcon.style.display = 'block';
    });
    iconContainer.addEventListener('mouseleave', () => {
      icon.style.width = '20px';
      icon.style.height = '20px';
      icon.style.backgroundColor = 'red';
      deleteIcon.style.display = 'none';
    });

    // Ajuster la position de l'icône lors du redimensionnement de la vidéo
    const resizeObserver = new ResizeObserver(() => {
      const progressBar = document.querySelector('.ytp-progress-bar');
      if (progressBar) {
        iconContainer.style.left = `${(bookmark.time / currentVideo.duration) * progressBar.offsetWidth}px`;
      }
    });
    resizeObserver.observe(player);

    iconContainer.addEventListener('remove', () => resizeObserver.disconnect());
  }
}

async function deleteBookmark(bookmark) {
  if (!isExtensionValid()) {
    console.error("Le contexte de l'extension n'est plus valide.");
    alert("Erreur : L'extension a été rechargée ou désactivée. Veuillez rafraîchir la page.");
    return;
  }

  try {
    const response = await sendMessageToBackground({ 
      action: 'deleteBookmark', 
      time: bookmark.time,
      url: bookmark.url
    });
    if (response && response.success) {
      alert('Marque-page supprimé !');
      loadBookmarks();
    } else {
      console.error('Erreur lors de la suppression du marque-page:', response);
      alert('Erreur lors de la suppression du marque-page. Veuillez vérifier la console pour plus de détails.');
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    alert('Erreur lors de la suppression du marque-page. L\'extension a peut-être été rechargée. Veuillez rafraîchir la page.');
  }
}

function removeExistingBookmarkIcons() {
  const existingIcons = document.querySelectorAll('.custom-bookmark-icon');
  existingIcons.forEach(icon => icon.remove());
}

function loadBookmarks() {
  if (!isExtensionValid()) {
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
      removeExistingBookmarkIcons(); // Remettre cette ligne ici
      videoBookmarks.forEach(addBookmarkIcon);
    }
  });
}

const handleVideoStateChange = function () {
   if (!utils.isExtensionValid()) return;
   waitForYouTubePlayer().then(() => {
     bookmarkManager.loadBookmarks();
   });
 };

function initializeVideo() {
  if (!isExtensionValid()) {
    console.error("Le contexte de l'extension n'est plus valide lors de l'initialisation.");
    return;
  }

  currentVideo = document.querySelector('video');
  if (currentVideo) {
    console.log("Vidéo trouvée, initialisation en cours...");
    addBookmarkButton();
    loadBookmarks();
    
    currentVideo.addEventListener('play', handleVideoStateChange);
    currentVideo.addEventListener('pause', handleVideoStateChange);
  } else {
    console.warn("Élément vidéo non trouvé. Nouvelle tentative dans 2 secondes.");
    setTimeout(initializeVideo, 2000);
  }
}

function checkExtensionState() {
  if (!isExtensionReady) {
    console.warn("L'extension n'est pas prête. Tentative de réinitialisation...");
    initializeExtension();
  }
}

function reinitializeExtension() {
  console.log("Réinitialisation de l'extension...");
  isExtensionReady = false;
  
  // Supprimer les anciens écouteurs d'événements
  if (currentVideo) {
    currentVideo.removeEventListener('play', handleVideoStateChange);
    currentVideo.removeEventListener('pause', handleVideoStateChange);
  }
  
  // Supprimer l'ancien bouton de marque-page
  const oldButton = document.getElementById('bookmark-button');
  if (oldButton) {
    oldButton.remove();
  }
  
  // Réinitialiser l'extension
  setTimeout(() => {
    initializeVideo();
    isExtensionReady = true;
  }, 1000); // Attendre 1 seconde pour s'assurer que la nouvelle page est chargée
}

// Écouteur pour les changements d'URL (navigation sur YouTube)
let lastUrl = location.href; 
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    if (url.includes('youtube.com/watch')) {
      reinitializeExtension();
    }
  }
}).observe(document, {subtree: true, childList: true});

// Initialisation au chargement de la page
if (window.location.href.includes('youtube.com/watch')) {
  initializeVideo();
}