chrome.runtime.onInstalled.addListener(() => {
   chrome.storage.sync.set({ bookmarks: [] });
 });
 
 chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
   if (request.action === 'addBookmark') {
     chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
       bookmarks.push(request.bookmark);
       chrome.storage.sync.set({ bookmarks }, () => {
         sendResponse({ success: true });
       });
     });
     return true;
   } else if (request.action === 'deleteBookmark') {
     chrome.storage.sync.get('bookmarks', ({ bookmarks }) => {
       const updatedBookmarks = bookmarks.filter(b => b.time !== request.time || b.url !== request.url);
       chrome.storage.sync.set({ bookmarks: updatedBookmarks }, () => {
         sendResponse({ success: true });
       });
     });
     return true;
   }
 });