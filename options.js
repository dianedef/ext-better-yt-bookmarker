import { exportBookmarksAsMarkdown, exportBookmarksAsJSON, importBookmarks } from './export.js';
import { BMBackground } from './background.js';

const BMOptions = {
    elements: {},

    init() {
        document.addEventListener('DOMContentLoaded', async () => {
            this.elements = this.getPageElements();
            await this.loadOptions();
            this.setupEventListeners();
        });
    },

    getPageElements() {
        return {
            hotkeyForm: document.getElementById('hotkeys-form'),
            exportMarkdownBtn: document.getElementById('export-markdown'),
            exportJSONBtn: document.getElementById('export-json'),
            importBtn: document.getElementById('import-bookmarks'),
            importFileInput: document.getElementById('import-file'),
            hideNotesCheckbox: document.getElementById('hide-notes-by-default'),
            showBookmarkButtonsCheckbox: document.getElementById('showBookmarkButtons'),
            hotkeyInputs: document.querySelectorAll('input[type="text"]')
        };
    },

    async loadOptions() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['hotkeys', 'hideNotesByDefault', 'showBookmarkButtons'], (result) => {
                if (result.hotkeys) {
                    Object.entries(result.hotkeys).forEach(([key, value]) => {
                        document.getElementById(key).value = value;
                    });
                }
                this.elements.hideNotesCheckbox.checked = result.hideNotesByDefault || false;
                this.elements.showBookmarkButtonsCheckbox.checked = result.showBookmarkButtons || false;
                resolve();
            });
        });
    },

    setupEventListeners() {
        this.elements.hotkeyInputs.forEach(input => {
            input.addEventListener('keydown', this.handleHotkeyInput.bind(this));
        });

        this.elements.hideNotesCheckbox.addEventListener('change', (e) => {
            chrome.storage.sync.set({ hideNotesByDefault: e.target.checked }, () => {
                console.log('Données enregistrées avec succès !');
            });
            BMBackground.afficherMessage('Option enregistrée !');
        });

        this.elements.showBookmarkButtonsCheckbox.addEventListener('change', (e) => {
            chrome.storage.sync.set({ showBookmarkButtons: e.target.checked }, () => {
                console.log('Données enregistrées avec succès !');
            });
            BMBackground.afficherMessage('Option enregistrée !');
        });

        // Exporter les marque-pages
        this.elements.exportMarkdownBtn.addEventListener('click', () => {
            chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
                exportBookmarksAsMarkdown(bookmarks);
            });
        });

        this.elements.exportJSONBtn.addEventListener('click', () => {
            chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
                exportBookmarksAsJSON(bookmarks);
            });
        });

        // Importer les marque-pages
        this.elements.importBtn.addEventListener('click', () => {
            const file = this.elements.importFileInput.files[0];
            if (!file) {
                alert('Veuillez sélectionner un fichier à importer.');
                return;
            }
            importBookmarks(file);
        });
    },

    handleHotkeyInput(e) {
        e.preventDefault();
        const hotkey = this.generateHotkeyString(e);
        e.target.value = hotkey;
        this.saveHotkeys();
    },

    generateHotkeyString(e) {
        const key = e.key.toUpperCase();
        const modifiers = ['Ctrl', 'Alt', 'Shift'].filter(mod => e[`${mod.toLowerCase()}Key`]);
        return [...modifiers, key].join('+');
    },

    saveHotkeys() {
        const hotkeys = Object.fromEntries(
            Array.from(document.querySelectorAll('input[type="text"]'))
                .map(input => [input.id, input.value])
        );
        chrome.storage.sync.set({ hotkeys });
        BMBackground.afficherMessage('Raccourci enregistré !');
    },

    handleHideNotesChange(e) {
        chrome.storage.sync.set({ hideNotesByDefault: e.target.checked }, () => {
            console.log('Données enregistrées avec succès !');
        });
        BMBackground.afficherMessage('Option enregistrée !');
    },

    handleShowBookmarkButtonsChange(e) {
        chrome.storage.sync.set({ showBookmarkButtons: e.target.checked }, () => {
            console.log('Données enregistrées avec succès !');
        });
        BMBackground.afficherMessage('Option enregistrée !');
    },
    
    handleExportMarkdown() {
        chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
            exportBookmarksAsMarkdown(bookmarks);
            BMBackground.afficherMessage('Markdown exporté !');
        });
    },
    
    handleExportJSON() {
        chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
            exportBookmarksAsJSON(bookmarks);
            BMBackground.afficherMessage('JSON exporté !');
        });
    },

    handleImport(fileInput) {
        const file = fileInput.files[0];
        if (!file) {
            alert('Veuillez sélectionner un fichier à importer.');
            return;
        }
        importBookmarks(file);
        BMBackground.afficherMessage('Importation terminée !');
    }
};

BMOptions.init();
