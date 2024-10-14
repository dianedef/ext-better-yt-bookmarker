import { BMBackground } from './background.js';

async function exportBookmarksAsMarkdown(bookmarks) {
    if (!bookmarks || bookmarks.length === 0) {
        BMBackground.afficherMessage('Aucun marque-page à exporter.', 'warning');
        return;
    }

    // Grouper les signets par URL de vidéo
    const groupedBookmarks = bookmarks.reduce((acc, bookmark) => {
        if (!acc[bookmark.url]) {
            acc[bookmark.url] = {
                title: bookmark.title,
                url: bookmark.url,
                notes: []
            };
        }
        acc[bookmark.url].notes.push({
            timestamp: bookmark.timestamp,
            content: bookmark.content
        });
        return acc;
    }, {});

    let markdown = '';

    Object.values(groupedBookmarks).forEach(video => {
        markdown += `## ${video.title}\n[${video.url}](${video.url})\n\n`;
        if (video.notes && video.notes.length > 0) {
            video.notes.forEach(note => {
                markdown += `[${note.timestamp}](${video.url}&t=${note.timestamp}): ${note.content}\n`;
            });
        }
        markdown += '\n'; // Ajoute une ligne vide entre les vidéos
    });

    try {
        await navigator.clipboard.writeText(markdown);
        BMBackground.afficherMessage('Le contenu Markdown a été copié dans le presse-papier !', 'success');
    } catch (err) {
        console.error('Erreur lors de la copie dans le presse-papier:', err);
        BMBackground.afficherMessage('Impossible de copier dans le presse-papier. Veuillez vérifier les permissions de votre navigateur.', 'error');
    }
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
