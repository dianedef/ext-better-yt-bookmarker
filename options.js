document.addEventListener('DOMContentLoaded', () => {
   const hotkeyForm = document.getElementById('hotkeys-form');
   const exportButton = document.getElementById('export-bookmarks');
 
   // Charger les raccourcis existants
   chrome.storage.sync.get('hotkeys', ({ hotkeys }) => {
     if (hotkeys) {
       Object.keys(hotkeys).forEach(key => {
         document.getElementById(key).value = hotkeys[key];
       });
     }
   });
 
   // Enregistrer les nouveaux raccourcis
   hotkeyForm.addEventListener('submit', (e) => {
     e.preventDefault();
     const formData = new FormData(hotkeyForm);
     const hotkeys = Object.fromEntries(formData);
     chrome.storage.sync.set({ hotkeys }, () => {
       alert('Raccourcis enregistrés !');
     });
   });
 
   // Exporter les marque-pages
   exportButton.addEventListener('click', () => {
     chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
       if (bookmarks && bookmarks.length > 0) {
         const bookmarksJSON = JSON.stringify(bookmarks, null, 2);
         const blob = new Blob([bookmarksJSON], { type: 'application/json' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = 'youtube_bookmarks.json';
         a.click();
         URL.revokeObjectURL(url);
       } else {
         alert('Aucun marque-page à exporter.');
       }
     });
   });
 });