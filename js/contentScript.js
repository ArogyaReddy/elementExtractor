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
