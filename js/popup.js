// @section: Imports, Constants, and Setup
import { showConfetti } from './uiEffects.js';
import { extractElementsSmart } from './domExtraction.js';
import { renderElementsTable, setPopupExpanded } from './renderUI.js';
import { saveExtractionToStorage, loadExtractionFromStorage } from './storage.js';

// const aiTips = [
//   'Pro tip: Prefer visible elements for automation—hidden ones may change.',
// 'AI Tip: Use CSS selectors for faster automation scripts.',
//   'AI Tip: IDs are the most stable selectors—use them if available!',
//   'AI Tip: Interactable (clickable) elements are best for automation.'
// ];
const aiTips = [
  'Did you know? [role] and [aria-label] improve accessibility and test stability.',  
  'Pro tip: Prefer visible elements for automation—hidden ones may change.', 
  'AI Tip: IDs are the most stable selectors—use them if available!', 
  'AI Tip: XPath lets you select by text, attribute, or position.', 
  'AI Tip: Use CSS selectors for faster automation scripts.', 
  'AI Tip: Filter by element type for faster locator selection.', 
  'Pro tip: Combine CSS classes for more unique selectors.',  
  'Pro tip: Prefer visible elements for automation—hidden ones may change.',
  'AI Tip: Use [data-*] attributes for custom locators.',
  'AI Tip: IDs are the most stable selectors—use them if available!',
  'AI Tip: Interactable (clickable) elements are best for automation.'
];


export const ELEMENT_TYPES = [
  { id: 'filterAll', label: 'All Elements', selector: '*' },
  { id: 'filterLinks', label: 'Links', selector: 'a' },
  { id: 'filterButtons', label: 'Buttons', selector: "button,input[type='button'],input[type='submit']" },
  { id: 'filterInputs', label: 'Inputs', selector: 'input,select,textarea' },
  { id: 'filterCombo', label: 'Combo', selector: "select,[role='combobox']" },
  { id: 'filterHeaders', label: 'Headers', selector: 'h1,h2,h3,h4,h5,h6' },
  { id: 'filterTextboxes', label: 'Textboxes', selector: "input[type='text'],input[type='search'],input[type='email'],input[type='url'],input[type='password']" },
  { id: 'filterCheckboxes', label: 'Checkboxes', selector: "input[type='checkbox']" },
  { id: 'filterRadios', label: 'Radios', selector: "input[type='radio']" },
  { id: 'filterLists', label: 'Lists', selector: 'ul,ol,li,dl,dt,dd' },
  { id: 'filterForms', label: 'Forms', selector: 'form' },
  { id: 'filterSVG', label: 'SVG', selector: 'svg' },
  { id: 'filterTables', label: 'Tables', selector: 'table,thead,tbody,tr,td,th' },
  { id: 'filterSpans', label: 'Spans', selector: 'span' },
  { id: 'filterDivs', label: 'Divs', selector: 'div' },
  { id: 'filterCustom', label: 'Custom Elements', selector: '*' }
];

// @section: UI INIT
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('ai-tip').textContent = aiTips[Math.floor(Math.random() * aiTips.length)];
  const fg = document.getElementById('filter-group');
  fg.innerHTML = ELEMENT_TYPES.map(type =>
    `<label><input type="checkbox" id="${type.id}" ${type.id === 'filterAll' ? 'checked' : ''}> ${type.label}</label>`
  ).join('');
  const allBox = document.getElementById('filterAll');
  allBox.addEventListener('change', () => {
    ELEMENT_TYPES.forEach(type => {
      if (type.id !== 'filterAll') document.getElementById(type.id).checked = allBox.checked;
    });
  });
  ELEMENT_TYPES.filter(t => t.id !== 'filterAll').forEach(type => {
    document.getElementById(type.id).addEventListener('change', () => {
      allBox.checked = ELEMENT_TYPES.slice(1).every(t => document.getElementById(t.id).checked);
    });
  });
  document.getElementById('filterVisible').addEventListener('change', function () {
    if (this.checked) document.getElementById('filterHidden').checked = false;
  });
  document.getElementById('filterHidden').addEventListener('change', function () {
    if (this.checked) document.getElementById('filterVisible').checked = false;
  });
  loadExtractionFromStorage().then(lastData => {
    if (lastData && Array.isArray(lastData)) {
      renderElementsTable(lastData);
      document.getElementById('status').innerHTML = '<span class="status-loaded">Previous extraction loaded.</span>';
    }
  });
});

// @section: Extraction Trigger
document.getElementById('extract').onclick = async () => {
  const extractBtn = document.getElementById('extract');
  extractBtn.disabled = true;
  document.getElementById('status').innerHTML = '<span class="loading">Scanning elements...</span>';
  document.getElementById('preview').innerHTML = '';
  setPopupExpanded(false);

  const filters = ELEMENT_TYPES.filter(t => document.getElementById(t.id)?.checked).map(t => t.id);
  const visibleOnly = document.getElementById('filterVisible').checked;
  const hiddenOnly = document.getElementById('filterHidden').checked;
  const shadowDOM = document.getElementById('filterShadow').checked;

  let [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  chrome.scripting.executeScript(
    {
      target: {tabId: tab.id},
      args: [{filters, visibleOnly, hiddenOnly, shadowDOM}],
      func: extractElementsSmart
    },
    async results => {
      let elements = results?.[0]?.result || [];
      if (!elements.length) {
        document.getElementById('status').innerHTML = '❌ No elements found!';
        extractBtn.disabled = false;
        return;
      }
      await saveExtractionToStorage(elements);
      renderElementsTable(elements);
      setPopupExpanded(true);
      showConfetti();
      document.getElementById('status').innerHTML = `<span>Your locators are ready!</span>`;
      extractBtn.disabled = false;
    }
  );
};
