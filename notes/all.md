```js
// Deep selector: finds elements in both light DOM and ALL open shadow roots!
function deepQuerySelectorAll(selector, root = document.body) {
  let out = [];
  function findAll(node) {
    if (!node) return;
    if (node.nodeType === 1 && node.matches(selector)) out.push(node);
    // Traverse children
    for (let child of node.children || []) findAll(child);
    // Traverse shadow DOM, if open
    if (node.shadowRoot) findAll(node.shadowRoot);
  }
  findAll(root);
  return out;
}

// Handler for highlight requests from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "highlightElement" && msg.locator) {
    try {
      // Accepts selector (CSS). You can extend for XPath, etc.
      const elements = deepQuerySelectorAll(msg.locator);
      if (!elements.length) {
        sendResponse({ success: false, error: "Element not found" });
        return true;
      }
      elements.forEach((el) => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.style.transition = "outline 0.2s";
        el.style.outline = "3px solid #ffea00";
        // Remove outline after 2s
        setTimeout(() => (el.style.outline = ""), 2000);
      });
      sendResponse({ success: true, found: elements.length });
    } catch (e) {
      sendResponse({ success: false, error: e.toString() });
    }
    return true;
  }
});
```

<button class="hl-btn" data-locator="${r["Primary Locator"]}" title="Highlight Primary">👁️</button>
<button class="highlight-btn" data-selector="#login-form > button.btn">👁</button>
