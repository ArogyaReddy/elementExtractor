// --- renderUI.js ---

/**
 * @section: renderUI.js — Render Table & Effects
 */
export function renderElementsTable(data) {
  // --- Clear previous content ---
  const search = document.getElementById("search").value.trim();
  let filteredData;
  if (!search) {
    filteredData = data; // <--- Use ALL data when search is empty
  } else {
    filteredData = data.filter((row) => (row["Element Name"] || "").toLowerCase().includes(search.toLowerCase()));
  }

  const searchInput = document.getElementById("search");
  const clearBtn = document.getElementById("clearSearchBtn");

  // Show/hide clear button as user types
  searchInput.addEventListener("input", function () {
    clearBtn.style.display = this.value ? "flex" : "none";
    renderElementsTable(window._allElementsData || []);
  });

  // Clear search on click
  clearBtn.addEventListener("click", function () {
    searchInput.value = "";
    clearBtn.style.display = "none";
    renderElementsTable(window._allElementsData || []);
    searchInput.focus();
  });

  // Function to highlight a match the search term in a string
  function highlightMatch(str, search) {
    if (!search) return str;
    const idx = str.toLowerCase().indexOf(search.toLowerCase());
    if (idx === -1) return str;
    return (
      str.slice(0, idx) +
      '<mark style="background: #fff89a; color: #1a1a1a;">' +
      str.slice(idx, idx + search.length) +
      "</mark>" +
      str.slice(idx + search.length)
    );
  }

  // Limit to first 1000 rows for performance
  // let maxRows = 12;

  // let maxRows = 1000; // <-- Limit to 1000 rows for performance
  // Show all elements if search is empty
  let maxRows = data.length; // <-- Shows all elements!

  // If search is empty, show all elements
  // let previewHTML = `<b>Preview (first ${Math.min(maxRows, filteredData.length)}):</b>

  let previewHTML = `<b>Found ${filteredData.length} element${filteredData.length === 1 ? "" : "s"}:</b>
<table>
  <tr>
    <th>Name</th>
    <th>Type</th>
    <th>Primary Locator</th>
    <th>Secondary Locators</th>
    <th>Copy</th>
  </tr>`;

  for (let i = 0; i < Math.min(filteredData.length, maxRows); ++i) {
    let r = filteredData[i];

    // For tooltips: show full locator on hover, but just a "copy" icon
    const secLocs = (r["Secondary Locators"] || "")
      .split("||")
      .map(
        (loc) =>
          `<span class="sec-locator" title="${loc.trim()}">${loc.trim().slice(0, 32)}${
            loc.trim().length > 32 ? "…" : ""
          }</span>`
      )
      .join("<br>");

    previewHTML += `<tr>
  <td title="${r["Element Name"]}">${highlightMatch(r["Element Name"], search)}</td>

  <td><span class="el-badge">${r["Element Type"]}</span></td>
  <td title="${r["Primary Locator"]}">${r["Primary Locator"].slice(0, 36)}${
      r["Primary Locator"].length > 36 ? "…" : ""
    }</td>
  <td>${secLocs}</td>
  <td>
    <button class="copy-btn" data-copy="${r["Primary Locator"]}" title="Copy Primary">📋</button>
    <button class="hl-btn" data-locator="${r["Primary Locator"]}" title="Highlight Primary">👁️</button>
    ${
      r["Secondary Locators"]
        ? r["Secondary Locators"]
            .split("||")
            .map((loc) => `<button class="copy-btn sec" data-copy="${loc.trim()}" title="Copy Secondary">📎</button>`)
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

// Function to highlight an element by its CSS selector
// This function is called when the user clicks a highlight button in the popup
// It sends a message to the content script to highlight the element
function highlightLocator(cssSelector) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: "highlightElement", locator: cssSelector });
  });
}
// Event listener for highlight buttons in the popup
// This listens for clicks on buttons with the class "highlight-btn"
// and calls the highlightLocator function with the data-selector attribute
// This is used to highlight elements in the current tab
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("highlight-btn")) {
    const selector = e.target.getAttribute("data-selector");
    highlightLocator(selector);
  }
});

//TODO: //FUNCTION: --- bindTablePreviewButtons ---
function bindTablePreviewButtons() {
  // --- Copy buttons ---
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.onclick = (e) => {
      let text = e.target.getAttribute("data-copy");
      if (!text) return;
      navigator.clipboard.writeText(text);
      btn.textContent = "✅";
      setTimeout(() => (btn.textContent = btn.classList.contains("sec") ? "📎" : "📋"), 600);
    };
  });

  // --- Highlight buttons (only data-locator) ---
  document.querySelectorAll(".hl-btn").forEach((btn) => {
    btn.onclick = async (e) => {
      let locatorRaw = e.target.getAttribute("data-locator");
      if (!locatorRaw || typeof locatorRaw !== "string") return;

      // --- PATCH: Strip known prefixes ---
      let locator = locatorRaw
        .replace(/^byId:\s*/, "")
        .replace(/^byCss:\s*/, "")
        .replace(/^byXpath:\s*/, "")
        .trim();

      // Log what you are sending!
      console.log("[HIGHLIGHT] Will try selector:", locator);

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [locator],
        func: (locator) => {
          console.log("[INJECTED] Highlight locator:", locator);
          let el = null;
          if (locator.startsWith("#") || locator.startsWith(".")) {
            el = document.querySelector(locator);
          } else if (locator.startsWith("/")) {
            let r = document.evaluate(locator, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            el = r.singleNodeValue;
          }
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            // el.style.outline = "3px solid #FFEB3B";
            // el.style.boxShadow = "0 0 15px 5px #fffa8b88";
            el.style.outline = "3px solid #FF1744"; // Bright red
            el.style.boxShadow = "0 0 16px 6px #FF1744AA";
            console.log("[INJECTED] Highlighted element:", el);
            // Reset styles after 1.8 seconds
            setTimeout(() => {
              el.style.outline = "";
              el.style.boxShadow = "";
            }, 1800);
          } else {
            console.log("[INJECTED] Element not found for selector:", locator);
          }
        },
      });
      btn.textContent = "✨";
      setTimeout(() => (btn.textContent = btn.classList.contains("sec") ? "🔦" : "👁️"), 800);
    };
  });

  //END: bindTablePreviewButtons
}

// ---- Utility: Highlight Element on Tab ----
function highlightElementOnTab(tabId, locator, inShadowDOM) {
  chrome.scripting.executeScript({
    target: { tabId },
    args: [locator, inShadowDOM],
    func: (locator, inShadowDOM) => {
      let el = null;
      if (inShadowDOM) {
        function searchShadowRoots(node, selector) {
          if (!node) return null;
          if (node.querySelector) {
            let found = node.querySelector(selector);
            if (found) return found;
          }
          let children = node.children || [];
          for (let child of children) {
            if (child.shadowRoot) {
              let found = searchShadowRoots(child.shadowRoot, selector);
              if (found) return found;
            }
          }
          return null;
        }
        el = searchShadowRoots(document, locator);
      } else {
        if (locator.startsWith("#")) {
          el = document.querySelector(locator);
        } else if (locator.startsWith("/")) {
          let r = document.evaluate(locator, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          el = r.singleNodeValue;
        } else {
          el = document.querySelector(locator);
        }
      }
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.style.outline = "3px solid #48b5f3";
        setTimeout(() => {
          el.style.outline = "";
        }, 1500);
      }
    },
  });
}

export function setPopupExpanded(isExpanded) {
  document.querySelector(".popup-root").classList.toggle("expanded", !!isExpanded);
}
