document.addEventListener('DOMContentLoaded', () => {
   const bookmarksList = document.getElementById('bookmarks-list');
 
   function loadBookmarks() {
     chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
       bookmarksList.innerHTML = '';
       if (bookmarks && bookmarks.length > 0) {
         bookmarks.forEach(bookmark => {
           const bookmarkElement = document.createElement('div');
           bookmarkElement.className = 'bookmark-item';
           bookmarkElement.innerHTML = `
             <img src="${bookmark.thumbnail}" alt="${bookmark.title}" width="120">
             <h3>${bookmark.title}</h3>
             <a href="${bookmark.url}" target="_blank">Voir la vidéo</a>
             <button class="delete-bookmark" data-time="${bookmark.time}" data-url="${bookmark.url}">🗑️</button>
           `;
           bookmarksList.appendChild(bookmarkElement);
         });

         // Ajouter des écouteurs d'événements pour les boutons de suppression
         document.querySelectorAll('.delete-bookmark').forEach(button => {
           button.addEventListener('click', deleteBookmark);
         });
       } else {
         bookmarksList.textContent = 'Aucun marque-page enregistré.';
       }
     });
   }

   function deleteBookmark(event) {
     const time = parseFloat(event.target.dataset.time);
     const url = event.target.dataset.url;

     chrome.runtime.sendMessage({ 
       action: 'deleteBookmark', 
       time: time,
       url: url
     }, (response) => {
       if (response && response.success) {
         loadBookmarks();
       } else {
         console.error('Erreur lors de la suppression du marque-page');
       }
     });
   }

   loadBookmarks();
 });