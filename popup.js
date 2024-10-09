document.addEventListener('DOMContentLoaded', () => {
   const bookmarksList = document.getElementById('bookmarks-list');
 
   chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
     if (bookmarks && bookmarks.length > 0) {
       bookmarks.forEach(bookmark => {
         const bookmarkElement = document.createElement('div');
         bookmarkElement.innerHTML = `
           <img src="${bookmark.thumbnail}" alt="${bookmark.title}" width="120">
           <h3>${bookmark.title}</h3>
           <a href="${bookmark.url}" target="_blank">Voir la vidéo</a>
         `;
         bookmarksList.appendChild(bookmarkElement);
       });
     } else {
       bookmarksList.textContent = 'Aucun marque-page enregistré.';
     }
   });
 });