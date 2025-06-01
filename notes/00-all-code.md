```js
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
```

```js
/******************************************************************************
 * @FileName: renderUI.js
 * @section: Table Rendering and Highlight Handling
 ******************************************************************************/

export function renderElementsTable(data) {
  const search = document.getElementById("search").value.trim();
  let filteredData = !search
    ? data
    : data.filter((row) => (row["Element Name"] || "").toLowerCase().includes(search.toLowerCase()));
  let maxRows = data.length;

  let previewHTML = `<b>Found ${filteredData.length} element${filteredData.length === 1 ? "" : "s"}:</b>
<table>
  <tr>
    <th>Name</th>
    <th>Type</th>
    <th>Primary Locator</th>
    <th>Secondary Locators</th>
    <th>Copy/Highlight</th>
  </tr>`;

  for (let i = 0; i < Math.min(filteredData.length, maxRows); ++i) {
    let r = filteredData[i];
    // Pick best selectors: always real browser selectors for highlight
    const bestCssSelector = r["Best CSS Selector"] || r["Primary Locator"];
    const bestXPath =
      r["Best XPath"] || (r["Secondary Locators"] || "").split("||").find((x) => x.trim().startsWith("/")) || "";
    previewHTML += `<tr>
      <td title="${r["Element Name"]}">${r["Element Name"]}</td>
      <td><span class="el-badge">${r["Element Type"]}</span></td>
      <td title="${r["Primary Locator"]}">${r["Primary Locator"].slice(0, 36)}${
      r["Primary Locator"].length > 36 ? "…" : ""
    }</td>
      <td>${(r["Secondary Locators"] || "")
        .split("||")
        .map(
          (loc) =>
            `<span class="sec-locator" title="${loc.trim()}">${loc.trim().slice(0, 32)}${
              loc.trim().length > 32 ? "…" : ""
            }</span>`
        )
        .join("<br>")}</td>
      <td>
        <button class="copy-btn" data-copy="${r["Primary Locator"]}" title="Copy Primary">📋</button>
        <button class="hl-btn"
          data-locator="${bestCssSelector || ""}"
          data-xpath="${bestXPath || ""}"
          title="Highlight">👁️</button>
        ${
          r["Secondary Locators"]
            ? r["Secondary Locators"]
                .split("||")
                .map(
                  (loc) => `<button class="copy-btn sec" data-copy="${loc.trim()}" title="Copy Secondary">📎</button>`
                )
                .join("")
            : ""
        }
      </td>
    </tr>`;
  }
  previewHTML += "</table>";
  document.getElementById("preview").innerHTML = previewHTML;
  setTimeout(() => bindTablePreviewButtons(), 100);
}

function bindTablePreviewButtons() {
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.onclick = (e) => {
      let text = e.target.getAttribute("data-copy");
      if (!text) return;
      navigator.clipboard.writeText(text);
      btn.textContent = "✅";
      setTimeout(() => (btn.textContent = btn.classList.contains("sec") ? "📎" : "📋"), 600);
    };
  });
  document.querySelectorAll(".hl-btn").forEach((btn) => {
    btn.onclick = async (e) => {
      let css = btn.getAttribute("data-locator");
      let xpath = btn.getAttribute("data-xpath");
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { action: "highlightElement", locator: css, xpath: xpath }, (response) => {});
      btn.textContent = "✨";
      setTimeout(() => (btn.textContent = "👁️"), 800);
    };
  });
}

export function setPopupExpanded(isExpanded) {
  document.querySelector(".popup-root").classList.toggle("expanded", !!isExpanded);
}
```

```js
/******************************************************************************
 * @FileName: contentScript.js
 * @section: Highlight Element Handler
 ******************************************************************************/

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "highlightElement" && (request.locator || request.xpath)) {
    // Remove any previous highlights
    document.querySelectorAll(".ai-highlight-blink").forEach((el) => {
      el.classList.remove("ai-highlight-blink");
      el.style.boxShadow = "";
    });

    let el = null;
    // Try CSS selector first
    if (request.locator && typeof request.locator === "string" && request.locator.length > 0) {
      try {
        el = document.querySelector(request.locator);
      } catch (e) {
        /* ignore */
      }
    }
    // Fallback: try XPath
    if (!el && request.xpath && typeof request.xpath === "string" && request.xpath.startsWith("/")) {
      try {
        let r = document.evaluate(request.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        el = r.singleNodeValue;
      } catch (e) {
        /* ignore */
      }
    }

    if (el) {
      el.classList.add("ai-highlight-blink");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.boxShadow = "0 0 0 3px #FFD700, 0 0 12px #FFD700";
      setTimeout(() => {
        el.classList.remove("ai-highlight-blink");
        el.style.boxShadow = "";
      }, 2000);
      sendResponse && sendResponse({ success: true });
    } else {
      alert("Element not found for highlight");
      sendResponse && sendResponse({ success: false, error: "Element not found" });
    }
    return true; // async
  }
});
```

```js
{
  "manifest_version": 3,
  "name": "Element AI Extractor",
  "description": "Smart AI-powered element locator & CSV exporter for web automation.",
  "version": "2.0",
  "action": {
    "default_popup": "popup.html",
    "default_title": "Elements Extractor",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["js/contentScript.js"],
      "all_frames": true,
      "run_at": "document_end"
    }
  ],
  "permissions": ["scripting", "activeTab", "storage"],
  "host_permissions": ["<all_urls>"]
}

```

```js
/******************************************************************************
 * @FileName: domExtraction.js
 * @section: DOM Extraction for All Elements with Real Locators
 ******************************************************************************/

export function extractElementsSmart({ filters, visibleOnly, hiddenOnly, shadowDOM }) {
  const typeToSelector = {
    filterLinks: "a",
    filterButtons: "button,input[type='button'],input[type='submit']",
    filterInputs: "input,select,textarea",
    filterTextboxes:
      "input[type='text'],input[type='search'],input[type='email'],input[type='url'],input[type='password']",
    filterCheckboxes: "input[type='checkbox']",
    filterRadios: "input[type='radio']",
    filterForms: "form",
    filterTables: "table,thead,tbody,tr,td,th",
    filterCustom: "*",
  };

  // Use "*" if filterAll or empty; else build selector
  const selectors =
    !filters || filters.length === 0 || filters.includes("filterAll")
      ? "*"
      : filters.map((f) => typeToSelector[f]).join(",");

  // Utility: Recursively get elements, with shadow DOM support
  function collectFilteredElementsIncludingShadow(root, selectors, out = []) {
    for (const el of root.querySelectorAll("*")) {
      let matches = false;
      if (selectors && selectors !== "*") {
        try {
          matches = el.matches(selectors);
        } catch (e) {
          matches = false;
        }
      } else {
        matches = true;
      }
      if (matches) out.push(el);
      if (shadowDOM && el.shadowRoot) {
        collectFilteredElementsIncludingShadow(el.shadowRoot, selectors, out);
      }
    }
    return out;
  }

  // -- Real world: use window/document for popup
  let domElements = collectFilteredElementsIncludingShadow(document, selectors).slice(0, 3000);

  // Helper: Is element visible
  function isVisible(el) {
    const style = window.getComputedStyle(el);
    return style && style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null;
  }

  // CSS & XPath Generators
  function getUniqueCssSelector(el) {
    if (el.id) return `#${el.id}`;
    let path = [];
    while (el.nodeType === Node.ELEMENT_NODE && el !== document.body && el !== document.documentElement) {
      let selector = el.nodeName.toLowerCase();
      if (el.className && typeof el.className === "string") {
        selector += "." + Array.from(el.classList).join(".");
      }
      let parent = el.parentNode;
      let siblings = parent ? Array.from(parent.children).filter((e) => e.nodeName === el.nodeName) : [];
      if (siblings.length > 1) selector += `:nth-child(${Array.from(parent.children).indexOf(el) + 1})`;
      path.unshift(selector);
      el = parent;
    }
    return path.join(" > ");
  }
  function getXPath(el) {
    if (el.id) return `//*[@id="${el.id}"]`;
    let path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let idx = 1,
        sib = el.previousSibling;
      while (sib) {
        if (sib.nodeType === Node.ELEMENT_NODE && sib.nodeName === el.nodeName) idx++;
        sib = sib.previousSibling;
      }
      path.unshift(el.nodeName.toLowerCase() + `[${idx}]`);
      el = el.parentNode;
    }
    return "/" + path.join("/");
  }

  // For documentation, also generate Playwright-style locator
  function getSmartLocator(el) {
    if (el.id) return { locatorType: "byId", locator: `#${el.id}` };
    if (el.getAttribute("aria-label"))
      return { locatorType: "aria-label", locator: `[aria-label="${el.getAttribute("aria-label")}"]` };
    if (el.getAttribute("placeholder"))
      return { locatorType: "placeholder", locator: `[placeholder="${el.getAttribute("placeholder")}"]` };
    if (el.name) return { locatorType: "byName", locator: `[name="${el.name}"]` };
    if (el.className && typeof el.className === "string")
      return { locatorType: "byClass", locator: "." + el.className.split(" ").join(".") };
    if (el.innerText && el.innerText.trim().length < 40)
      return { locatorType: "byText", locator: `getByText('${el.innerText.trim()}')` };
    // fallback to CSS
    return { locatorType: "byCss", locator: getUniqueCssSelector(el) };
  }

  // Short type for table UI
  function getElementType(el) {
    if (el.matches("a")) return "LINK";
    if (el.matches("button,input[type='button'],input[type='submit']")) return "BTN";
    if (el.matches("input,select,textarea")) return "INPUT";
    if (el.matches("input[type='checkbox']")) return "CHK";
    if (el.matches("input[type='radio']")) return "RADIO";
    if (el.matches("form")) return "FORM";
    if (el.matches("table,thead,tbody,tr,td,th")) return "TABLE";
    if (el.tagName && el.tagName.includes("-")) return "CUSTOM";
    return el.tagName;
  }

  // User-facing "name" for the element
  function getElementName(el) {
    return (
      el.getAttribute("aria-label") ||
      el.getAttribute("alt") ||
      el.getAttribute("placeholder") ||
      (el.innerText ? el.innerText.trim().replace(/\s+/g, " ").slice(0, 40) : el.tagName.toLowerCase())
    );
  }

  // Compose extraction output
  const data = [];
  for (let el of domElements) {
    if (visibleOnly && !isVisible(el)) continue;
    if (hiddenOnly && isVisible(el)) continue;
    const smartLocator = getSmartLocator(el);

    // Secondary locators: Always include CSS and XPath as fallback
    const css = getUniqueCssSelector(el);
    const xpath = getXPath(el);

    const secondaryLocators = [];
    if (css && (!smartLocator.locator || smartLocator.locator !== css)) secondaryLocators.push(`byCss: ${css}`);
    if (xpath) secondaryLocators.push(`byXpath: ${xpath}`);

    data.push({
      "Element Name": getElementName(el),
      "Element Type": getElementType(el),
      "Primary Locator": `${smartLocator.locatorType}: ${smartLocator.locator}`,
      "Secondary Locators": secondaryLocators.join(" || "),
      "Best CSS Selector": css, // <---- For real browser highlight!
      "Best XPath": xpath, // <---- For real browser highlight!
      ID: el.id || "",
      "In Shadow DOM": !!el.getRootNode().host ? "Yes" : "No",
    });
  }
  return data;
}
```
