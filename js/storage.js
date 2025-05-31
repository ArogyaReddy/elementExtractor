/**
 * @section: storage.js — Save/Load Extraction Results
 */
export function saveExtractionToStorage(data) {
  return new Promise(resolve => {
    chrome.storage.local.set({ lastExtractedData: data }, resolve);
  });
}
export function loadExtractionFromStorage() {
  return new Promise(resolve => {
    chrome.storage.local.get(['lastExtractedData'], res => resolve(res.lastExtractedData));
  });
}
