import { exportBookmarksAsMarkdown } from './export.js'; 
import { BMBackground } from './background.js'; 

document.addEventListener('DOMContentLoaded', () => {
  const bookmarksList = document.getElementById('bookmarks-list');

  function loadBookmarks() {
    chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
      bookmarksList.innerHTML = '';
      if (bookmarks && bookmarks.length > 0) {
        const groupedBookmarks = BMBackground.getGroupedBookmarks(bookmarks);
        Object.keys(groupedBookmarks).forEach(videoUrl => {
          const videoBookmarks = groupedBookmarks[videoUrl];
          videoBookmarks.forEach(bookmark => {
            const thumbnailUrl = getThumbnailUrl(bookmark.url);
            const bookmarkElement = document.createElement('div');
            bookmarkElement.className = 'bookmark-item';
            
            bookmarkElement.innerHTML = `
            <img src="${thumbnailUrl}" alt="${bookmark.title}" width="120">
            <div>
              <h3><a href="${bookmark.url}" target="_blank">${bookmark.title}</a></h3>
              <div>
                <button class="toggle-notes">Bookmarks</button>
                <button class="delete-video" data-url="${bookmark.url}">Delete</button>
              </div>
            </div>
            <div class="notes-list">
              <!-- Les notes seront ajoutées ici dynamiquement -->
            </div>
          `;
          bookmarksList.appendChild(bookmarkElement);

            // Ajouter les écouteurs d'événements ici
            const toggleNotesButton = bookmarkElement.querySelector('.toggle-notes');
            toggleNotesButton.addEventListener('click', toggleNotes);

            const deleteVideoButton = bookmarkElement.querySelector('.delete-video');
            deleteVideoButton.addEventListener('click', deleteVideo);
          });
      })} else {
        bookmarksList.textContent = 'Aucun marque-page enregistré.'; // Correction de la parenthèse
      }
    });
  }

  function toggleNotes(event) {
    const bookmarkItem = event.target.closest('.bookmark-item');
    const notesList = bookmarkItem.querySelector('.notes-list');
    // Charger et afficher/masquer les notes ici
  }

  function deleteVideo(event) {
    const url = event.target.dataset.url;
    // Supprimer la vidéo et toutes ses notes associées ici
  }

  function getThumbnailUrl(videoUrl) {
    const videoId = new URL(videoUrl).searchParams.get('v');
    return `https://img.youtube.com/vi/${videoId}/0.jpg`;
  }
  
  function openSettings() {
    chrome.runtime.openOptionsPage();
  }

  // Ajouter les boutons d'exportation, de notation et de paramètres
  const bottomBar = document.createElement('div');
  bottomBar.className = 'bottom-bar';
  bottomBar.innerHTML = `
    <button id="export-markdown">Copier en Markdown</button>
    <div class="rating">
      <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
    </div>
    <button id="settings">Paramètres</button>
  `;
  
  document.body.appendChild(bottomBar);

  document.getElementById('settings').addEventListener('click', openSettings);

  document.getElementById('export-markdown').addEventListener('click', () => {
      chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
          exportBookmarksAsMarkdown(bookmarks);
      });
  });

  loadBookmarks();
});
