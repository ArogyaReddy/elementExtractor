Absolutely! Here’s a **fully-commented `popup.js`** for your Chrome extension, with liberal use of `@section`, `@function`, and inline “why/where/what/how” explanations.
**This is structured for _maximum clarity and maintainability_.**

---

```js
// ========================== @section: Imports & Constants ==========================
/**
 * @desc Import UI, extraction, rendering, and storage modules.
 * These are modularized for code clarity and separation of concerns.
 */
import { showConfetti } from "./uiEffects.js";
import { extractElementsSmart } from "./domExtraction.js";
import { renderElementsTable, setPopupExpanded } from "./renderUI.js";
import { saveExtractionToStorage, loadExtractionFromStorage } from "./storage.js";

/**
 * @desc AI tips to rotate for user education/fun.
 * Used to show a random tip in the popup header.
 */
const aiTips = [
  "Did you know? [role] and [aria-label] improve accessibility and test stability.",
  "Pro tip: Prefer visible elements for automation—hidden ones may change.",
  "AI Tip: IDs are the most stable selectors—use them if available!",
  "AI Tip: XPath lets you select by text, attribute, or position.",
  "AI Tip: Use CSS selectors for faster automation scripts.",
  "AI Tip: Filter by element type for faster locator selection.",
  "Pro tip: Combine CSS classes for more unique selectors.",
  "AI Tip: Use [data-*] attributes for custom locators.",
  "AI Tip: Interactable (clickable) elements are best for automation.",
];

/**
 * @desc All supported element type filters.
 * This array powers the filter checkboxes rendered in the popup.
 */
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

// ========================== @function: highlightLocator ==========================
/**
 * @desc Sends a message to the content script to highlight an element by locator.
 * @param {string} cssSelector - The CSS selector to highlight on the page.
 * @why Used to visually show the user which element a locator refers to.
 * @where Called by UI highlight buttons in the elements table.
 */
function highlightLocator(cssSelector) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: "highlightElement", locator: cssSelector });
  });
}

// ========================== @section: DOMContentLoaded Setup ==========================
/**
 * All DOM manipulation, event binding, and UI setup is placed in this block
 * to ensure all elements are available before code runs.
 */
document.addEventListener("DOMContentLoaded", () => {
  // ========== @section: AI Tips ==========

  // Pick a random AI tip to display in the tip bar on each popup open
  document.getElementById("ai-tip").textContent = aiTips[Math.floor(Math.random() * aiTips.length)];

  // ========== @section: Render Element Type Filters ==========
  /**
   * Render checkboxes for all element types (links, buttons, etc)
   * Why: lets the user choose which elements are included in the extraction.
   */
  const fg = document.getElementById("filter-group");
  fg.innerHTML = ELEMENT_TYPES.map(
    (type) =>
      `<label><input type="checkbox" id="${type.id}" ${type.id === "filterAll" ? "checked" : ""}> ${type.label}</label>`
  ).join("");

  // ========== @section: Filter Checkbox Logic ==========
  /**
   * - If "All Elements" is checked, check all others.
   * - If all others are checked, auto-check "All".
   * Why: convenience for selecting/deselecting all with one click.
   */
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

  // ========== @section: Visible/Hidden Toggles ==========
  /**
   * These toggles are mutually exclusive. Only one can be active at a time.
   * Why: It's not logical to select "visible only" and "hidden only" together.
   */
  document.getElementById("filterVisible").addEventListener("change", function () {
    if (this.checked) document.getElementById("filterHidden").checked = false;
  });
  document.getElementById("filterHidden").addEventListener("change", function () {
    if (this.checked) document.getElementById("filterVisible").checked = false;
  });

  // ========== @section: Restore Last Extraction ==========
  /**
   * On popup open, load previous results from chrome.storage and render.
   * Why: Lets user resume from where they left off.
   */
  loadExtractionFromStorage().then((lastData) => {
    if (lastData && Array.isArray(lastData)) {
      window._allElementsData = lastData;
      renderElementsTable(lastData);
      document.getElementById("status").innerHTML = '<span class="status-loaded">Previous extraction loaded.</span>';
    }
  });

  // ========== @section: Expand/Collapse Button ==========
  /**
   * Expands/collapses the popup width.
   * Why: For better visibility of extracted elements.
   * How: Adds/removes .expanded class from .popup-root and updates button label.
   */
  const expandBtn = document.getElementById("expandBtn");
  const popupRoot = document.querySelector(".popup-root");
  if (expandBtn && popupRoot) {
    function setExpandBtnText() {
      if (popupRoot.classList.contains("expanded")) {
        expandBtn.textContent = "⤺ Collapse window";
      } else {
        expandBtn.textContent = "⤢ Expand window";
      }
    }
    setExpandBtnText();
    expandBtn.addEventListener("click", () => {
      popupRoot.classList.toggle("expanded");
      setExpandBtnText();
    });
    expandBtn.title = "Expand/collapse the popup window";
  }

  // ========== @section: Open in Tab (Optional) ==========
  /**
   * (Optional) Opens extractor in a new browser tab.
   * Why: Gives more space for large extractions.
   */
  const openTabBtn = document.getElementById("openTabBtn");
  if (openTabBtn) {
    openTabBtn.onclick = () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
    };
    openTabBtn.title = "Open extractor in a new browser tab";
  }

  // ========== @section: Search Logic ==========
  /**
   * Filters the table in real-time as the user types.
   * Why: Quick element lookup.
   * What: Always renders the table using the unfiltered window._allElementsData.
   */
  document.getElementById("search").addEventListener("input", function () {
    renderElementsTable(window._allElementsData || []);
  });

  // ========== @section: Clear/Save/Load Buttons ==========
  /**
   * Handles clearing, saving, and loading of extractions.
   * Why: User can reset, backup, or restore their results.
   * Where: Buttons may not always exist, so use optional chaining.
   */
  const clearBtn = document.getElementById("clearBtn");
  if (clearBtn) {
    clearBtn.onclick = async () => {
      await chrome.storage.local.remove("lastExtraction");
      document.getElementById("preview").innerHTML = "";
      document.getElementById("status").innerHTML = '<span class="status-cleared">Previous extraction cleared.</span>';
      setPopupExpanded(false);
    };
    clearBtn.title = "Clear previous extraction";
  }
  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) {
    saveBtn.onclick = async () => {
      const elements = window._allElementsData || [];
      await saveExtractionToStorage(elements);
      document.getElementById("status").innerHTML = '<span class="status-saved">Extraction saved successfully!</span>';
    };
    saveBtn.title = "Save current extraction";
  }
  const loadBtn = document.getElementById("loadBtn");
  if (loadBtn) {
    loadBtn.onclick = async () => {
      const lastData = await loadExtractionFromStorage();
      if (lastData && Array.isArray(lastData)) {
        window._allElementsData = lastData;
        renderElementsTable(lastData);
        document.getElementById("status").innerHTML = '<span class="status-loaded">Previous extraction loaded.</span>';
      } else {
        document.getElementById("status").innerHTML = '<span class="status-error">No previous extraction found.</span>';
      }
    };
    loadBtn.title = "Load last saved extraction";
  }

  // ========== @section: Tooltips ==========
  /**
   * Adds a tooltip to each button, showing the button's title on hover.
   * Why: UX improvement, lets user know what a button does.
   */
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

  // ========== @section: (End of DOMContentLoaded) ==========
});

// ========================== @section: Extraction Trigger ==========================
/**
 * @desc This is the main extraction action.
 * When the user clicks "Extract Elements", this triggers a script injection into the current tab.
 * The script scans for elements according to user settings, and returns their locator data.
 * The returned data is stored, rendered, and "confetti" is shown for fun.
 */
document.getElementById("extract").onclick = async () => {
  const extractBtn = document.getElementById("extract");
  extractBtn.disabled = true;
  document.getElementById("status").innerHTML = '<span class="loading">Scanning elements...</span>';
  document.getElementById("preview").innerHTML = "";
  setPopupExpanded(false);

  // Gather settings
  const filters = ELEMENT_TYPES.filter((t) => document.getElementById(t.id)?.checked).map((t) => t.id);
  const visibleOnly = document.getElementById("filterVisible").checked;
  const hiddenOnly = document.getElementById("filterHidden").checked;
  const shadowDOM = document.getElementById("filterShadow").checked;

  // Inject the extraction function into the page
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
      renderElementsTable(elements);
      setPopupExpanded(true);
      showConfetti();
      document.getElementById("status").innerHTML = `<span>Your locators are ready!</span>`;
      extractBtn.disabled = false;
    }
  );
};

// ========================== @section: End popup.js ==========================
```

---

## **How to Use This File**

- **Paste this over your existing `popup.js`**
- Every major logic block is annotated with:

  - `@section:` for **feature or major grouping**
  - `@function:` for reusable functions/utilities
  - In-line `@desc`, `@why`, `@where`, `@what`, and `@how` in comments.

---

### **What You Get**

- You can _instantly_ see what every section does, and _why_ it exists.
- All wiring and event handlers are safe, modular, and readable.
- No top-level event handler bugs or DOM access issues.
- **Perfect for onboarding, documentation, or further enhancements!**

---

If you want this **approach applied to your other files (`renderUI.js`, etc),** just ask—happy to annotate anything for you!
