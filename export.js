// export.js
function exportBookmarksAsMarkdown(bookmarks) {
    let markdown = '';

    bookmarks.forEach(video => {
        markdown += `## ${video.title}\n[${video.url}](${video.url})\n\n`;
        video.notes.forEach(note => {
            markdown += `[${note.timestamp}][${note.url}]: ${note.content}\n`;
        });
        markdown += '\n'; // Ajoute une ligne vide entre les vidéos
    });

    // Créer un blob et un lien pour télécharger le fichier Markdown
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookmarks.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportBookmarksAsJSON(bookmarks) {
    const json = JSON.stringify(bookmarks, null, 2); // Formate le JSON avec des espaces
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookmarks.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importBookmarks(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const bookmarks = JSON.parse(event.target.result);
            chrome.storage.sync.set({ bookmarks }, () => {
                alert('Marque-pages importés avec succès !');
            });
        } catch (error) {
            alert('Erreur lors de l\'importation du fichier. Assurez-vous qu\'il s\'agit d\'un fichier JSON valide.');
        }
    };
    reader.readAsText(file);
}

// Exposez les fonctions pour qu'elles soient accessibles
export { exportBookmarksAsMarkdown, exportBookmarksAsJSON, importBookmarks };
