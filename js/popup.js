/******************************************************************************
 * @FileName: popup.js
 * @section: Popup Initialization, Extraction, and Event Bindings
 ******************************************************************************/

import { showConfetti } from "./uiEffects.js";
import { extractElementsSmart } from "./domExtraction.js";
import { renderElementsTable, setPopupExpanded } from "./renderUI.js";
import { saveExtractionToStorage, loadExtractionFromStorage } from "./storage.js";

export const ELEMENT_TYPES = [
  { id: "filterAll", label: "All Elements", selector: "*" },
  { id: "filterLinks", label: "Links", selector: "a" },
  { id: "filterButtons", label: "Buttons", selector: "button,input[type='button'],input[type='submit']" },
  { id: "filterInputs", label: "Inputs", selector: "input,select,textarea" },
  {
    id: "filterTextboxes",
    label: "Textboxes",
    selector: "input[type='text'],input[type='search'],input[type='email'],input[type='url'],input[type='password']",
  },
  { id: "filterCheckboxes", label: "Checkboxes", selector: "input[type='checkbox']" },
  { id: "filterRadios", label: "Radios", selector: "input[type='radio']" },
  { id: "filterForms", label: "Forms", selector: "form" },
  { id: "filterTables", label: "Tables", selector: "table,thead,tbody,tr,td,th" },
  { id: "filterCustom", label: "Custom Elements", selector: "*" },
];

document.addEventListener("DOMContentLoaded", () => {
  // Fill filters, wire up UI
  const fg = document.getElementById("filter-group");
  fg.innerHTML = ELEMENT_TYPES.map(
    (type) =>
      `<label><input type="checkbox" id="${type.id}" ${type.id === "filterAll" ? "checked" : ""}> ${type.label}</label>`
  ).join("");

  // Checkbox master/slave logic
  const allBox = document.getElementById("filterAll");
  allBox.addEventListener("change", () => {
    ELEMENT_TYPES.forEach((type) => {
      if (type.id !== "filterAll") document.getElementById(type.id).checked = allBox.checked;
    });
  });
  ELEMENT_TYPES.filter((t) => t.id !== "filterAll").forEach((type) => {
    document.getElementById(type.id).addEventListener("change", () => {
      allBox.checked = ELEMENT_TYPES.slice(1).every((t) => document.getElementById(t.id).checked);
    });
  });

  // Show previous results if any
  loadExtractionFromStorage().then((lastData) => {
    if (lastData && Array.isArray(lastData)) {
      window._allElementsData = lastData;
      renderElementsTable(lastData);
      document.getElementById("status").innerHTML = '<span class="status-loaded">Previous extraction loaded.</span>';
    }
  });

  // Expand/collapse
  const expandBtn = document.getElementById("expandBtn");
  const popupRoot = document.querySelector(".popup-root");
  function setExpandBtnText() {
    expandBtn.textContent = popupRoot.classList.contains("expanded") ? "⤺ Collapse window" : "⤢ Expand window";
  }
  setExpandBtnText();
  expandBtn.onclick = () => {
    popupRoot.classList.toggle("expanded");
    setExpandBtnText();
  };

  // Search event (live)
  document.getElementById("search").addEventListener("input", function () {
    renderElementsTable(window._allElementsData || []);
  });
});

// Extraction trigger (on click)
document.getElementById("extract").onclick = async () => {
  const extractBtn = document.getElementById("extract");
  extractBtn.disabled = true;
  document.getElementById("status").innerHTML = '<span class="loading">Scanning elements...</span>';
  document.getElementById("preview").innerHTML = "";
  setPopupExpanded(false);

  const filters = ELEMENT_TYPES.filter((t) => document.getElementById(t.id)?.checked).map((t) => t.id);
  const visibleOnly = document.getElementById("filterVisible").checked;
  const hiddenOnly = document.getElementById("filterHidden").checked;
  const shadowDOM = document.getElementById("filterShadow").checked;

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      args: [{ filters, visibleOnly, hiddenOnly, shadowDOM }],
      func: extractElementsSmart,
    },
    async (results) => {
      let elements = results?.[0]?.result || [];
      window._allElementsData = elements;
      if (!elements.length) {
        document.getElementById("status").innerHTML = "❌ No elements found!";
        extractBtn.disabled = false;
        return;
      }
      await saveExtractionToStorage(elements);
      renderElementsTable(elements);
      setPopupExpanded(true);
      showConfetti();
      document.getElementById("status").innerHTML = `<span>Your locators are ready!</span>`;
      extractBtn.disabled = false;
    }
  );
};
