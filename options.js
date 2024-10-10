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
 
   // Charger l'option de masquer les notes par défaut
   chrome.storage.sync.get('hideNotesByDefault', ({ hideNotesByDefault }) => {
     document.getElementById('hide-notes-by-default').checked = hideNotesByDefault || false;
   });
   
   // Charger l'option de masquer les boutons par défaut
   chrome.storage.sync.get('showBookmarkButtons', ({ showBookmarkButtons }) => {
     document.getElementById('showBookmarkButtons').checked = showBookmarkButtons || false;
   });

   // Ajouter des écouteurs d'événements pour les champs de raccourcis
   const hotkeyInputs = document.querySelectorAll('input[type="text"]');
   hotkeyInputs.forEach(input => {
     input.addEventListener('keydown', (e) => {
       e.preventDefault();
       const key = e.key.toUpperCase();
       const modifiers = [];
       if (e.ctrlKey) modifiers.push('Ctrl');
       if (e.altKey) modifiers.push('Alt');
       if (e.shiftKey) modifiers.push('Shift');
       const hotkey = [...modifiers, key].join('+');
       input.value = hotkey;

       // Enregistrer automatiquement le raccourci
       const hotkeys = {};
       hotkeyInputs.forEach(input => {
         hotkeys[input.id] = input.value;
       });
       chrome.storage.sync.set({ hotkeys }, () => {
         afficherNotification('Raccourci enregistré !');
       });
     });
   });

   document.getElementById('hide-notes-by-default').addEventListener('change', (e) => {
     chrome.storage.sync.set({ hideNotesByDefault: e.target.checked }, () => {
       afficherNotification('Option enregistrée !');
     });
   });

   document.getElementById('showBookmarkButtons').addEventListener('change', (e) => {
     chrome.storage.sync.set({ showBookmarkButtons: e.target.checked }, () => {
       afficherNotification('Option enregistrée !');
     });
   });

   function afficherNotification(message) {
     const notification = document.createElement('div');
     notification.textContent = message;
     notification.style.position = 'fixed';
     notification.style.top = '10px';
     notification.style.right = '10px';
     notification.style.padding = '10px';
     notification.style.backgroundColor = '#4CAF50';
     notification.style.color = 'white';
     notification.style.borderRadius = '5px';
     notification.style.zIndex = '1000';
     document.body.appendChild(notification);

     setTimeout(() => {
       notification.remove();
     }, 3000);
   }

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


 
// Dans la fonction saveOptions()
chrome.storage.sync.set({
  // ... autres options ...
  showBookmarkButtons: showBookmarkButtons.checked
}, function() {
  // Message de sauvegarde réussie
});

// Dans la fonction restoreOptions()
chrome.storage.sync.get({
  // ... autres options ...
  showBookmarkButtons: false // valeur par défaut
}, function(items) {
  // ... autres options ...
  showBookmarkButtons.checked = items.showBookmarkButtons;
});