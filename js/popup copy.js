// @section: Imports, Constants, and Setup
import { showConfetti } from "./uiEffects.js";
import { extractElementsSmart } from "./domExtraction.js";
import { renderElementsTable, setPopupExpanded } from "./renderUI.js";
import { saveExtractionToStorage, loadExtractionFromStorage } from "./storage.js";

// const aiTips = [
//   'Pro tip: Prefer visible elements for automation—hidden ones may change.',
// 'AI Tip: Use CSS selectors for faster automation scripts.',
//   'AI Tip: IDs are the most stable selectors—use them if available!',
//   'AI Tip: Interactable (clickable) elements are best for automation.'
// ];
const aiTips = [
  "Did you know? [role] and [aria-label] improve accessibility and test stability.",
  "Pro tip: Prefer visible elements for automation—hidden ones may change.",
  "AI Tip: IDs are the most stable selectors—use them if available!",
  "AI Tip: XPath lets you select by text, attribute, or position.",
  "AI Tip: Use CSS selectors for faster automation scripts.",
  "AI Tip: Filter by element type for faster locator selection.",
  "Pro tip: Combine CSS classes for more unique selectors.",
  "Pro tip: Prefer visible elements for automation—hidden ones may change.",
  "AI Tip: Use [data-*] attributes for custom locators.",
  "AI Tip: IDs are the most stable selectors—use them if available!",
  "AI Tip: Interactable (clickable) elements are best for automation.",
];

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

// Add this function in popup.js or wherever your table is rendered
function highlightLocator(cssSelector) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: "highlightElement", locator: cssSelector });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Initialize tooltips
  document.getElementById("ai-tip").textContent = aiTips[Math.floor(Math.random() * aiTips.length)];
  const fg = document.getElementById("filter-group");
  fg.innerHTML = ELEMENT_TYPES.map(
    (type) =>
      `<label><input type="checkbox" id="${type.id}" ${type.id === "filterAll" ? "checked" : ""}> ${type.label}</label>`
  ).join("");
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
  document.getElementById("filterVisible").addEventListener("change", function () {
    if (this.checked) document.getElementById("filterHidden").checked = false;
  });
  document.getElementById("filterHidden").addEventListener("change", function () {
    if (this.checked) document.getElementById("filterVisible").checked = false;
  });
  loadExtractionFromStorage().then((lastData) => {
    if (lastData && Array.isArray(lastData)) {
      window._allElementsData = lastData; // Save last data globally for search and filtering
      renderElementsTable(lastData);
      document.getElementById("status").innerHTML = '<span class="status-loaded">Previous extraction loaded.</span>';
    }
  });

  // PATCH: Expand/Collapse Logic
  const expandBtn = document.getElementById("expandBtn");
  const popupRoot = document.querySelector(".popup-root");

  // PATCH: Open in Tab Logic
  const openTabBtn = document.getElementById("openTabBtn");
  if (openTabBtn) {
    openTabBtn.onclick = () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
    };
  }

  if (expandBtn && popupRoot) {
    function setExpandBtnText() {
      if (popupRoot.classList.contains("expanded")) {
        expandBtn.textContent = "⤺ Collapse window";
      } else {
        expandBtn.textContent = "⤢ Expand window";
      }
    }
    setExpandBtnText();

    expandBtn.onclick = () => {
      popupRoot.classList.toggle("expanded");
      setExpandBtnText();
    };
  }

  // Add search event
  document.getElementById("search").addEventListener("input", function () {
    renderElementsTable(window._allElementsData || []);
  });

  //END OF DOMContentLoaded
});

// @section: Extraction Trigger
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
      window._allElementsData = elements; // Save all elements globally for search and filtering
      if (!elements.length) {
        document.getElementById("status").innerHTML = "❌ No elements found!";
        extractBtn.disabled = false;
        return;
      }
      await saveExtractionToStorage(elements);
      // Save elements globally for search and filtering
      window._allElementsData = elements; // Save all elements globally
      // Render the elements table
      renderElementsTable(elements);
      setPopupExpanded(true);
      showConfetti();
      document.getElementById("status").innerHTML = `<span>Your locators are ready!</span>`;
      extractBtn.disabled = false;
    }
  );
  // END OF Extraction Trigger
};

document.getElementById("clearBtn").onclick = async () => {
  await chrome.storage.local.remove("lastExtraction");
  document.getElementById("preview").innerHTML = "";
  document.getElementById("status").innerHTML = '<span class="status-cleared">Previous extraction cleared.</span>';
  setPopupExpanded(false);
};
document.getElementById("saveBtn").onclick = async () => {
  const elements = Array.from(document.querySelectorAll("#elementsTable tbody tr")).map((row) => {
    const cells = row.querySelectorAll("td");
    return {
      locator: cells[0].textContent.trim(),
      type: cells[1].textContent.trim(),
      text: cells[2].textContent.trim(),
      visible: cells[3].textContent.trim() === "Yes",
      hidden: cells[3].textContent.trim() === "No",
      shadowDOM: cells[4].textContent.trim() === "Yes",
    };
  });
  await saveExtractionToStorage(elements);
  document.getElementById("status").innerHTML = '<span class="status-saved">Extraction saved successfully!</span>';
};
document.getElementById("loadBtn").onclick = async () => {
  const lastData = await loadExtractionFromStorage();
  if (lastData && Array.isArray(lastData)) {
    renderElementsTable(lastData);
    document.getElementById("status").innerHTML = '<span class="status-loaded">Previous extraction loaded.</span>';
  } else {
    document.getElementById("status").innerHTML = '<span class="status-error">No previous extraction found.</span>';
  }
};
document.getElementById("expandBtn").title = "Open in new tab";
document.getElementById("clearBtn").title = "Clear previous extraction";
document.getElementById("saveBtn").title = "Save current extraction";
document.getElementById("loadBtn").title = "Load last saved extraction";
document.getElementById("test-highlight-btn").title = "Test highlight functionality";
// Add tooltips to buttons
document.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("mouseover", () => {
    const tooltip = document.createElement("span");
    tooltip.className = "tooltip";
    tooltip.textContent = btn.title;
    btn.appendChild(tooltip);
  });
  btn.addEventListener("mouseout", () => {
    const tooltip = btn.querySelector(".tooltip");
    if (tooltip) tooltip.remove();
  });
});

// @section: Highlight Element
chrome.tabs.sendMessage(tab.id, { action: "highlightElement", locator }, (response) => {
  if (response?.success) {
    console.log("[HIGHLIGHT] Element highlighted successfully.");
  } else {
    console.error("[HIGHLIGHT] Failed to highlight element:", response?.error || "Unknown error");
  }
});

// @section: Open in New Tab
document.getElementById("openTabBtn").onclick = () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
};
