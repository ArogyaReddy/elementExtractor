// Inject blink animation CSS ONCE
if (!document.getElementById("ai-highlight-style")) {
  const style = document.createElement("style");
  style.id = "ai-highlight-style";
  style.textContent = `
      .ai-highlight-blink {
        animation: ai-blink 0.5s linear 0s 4 alternate !important;
        box-shadow: 0 0 0 3px #FFD700, 0 0 12px #FFD700 !important;
        outline: 2px solid #FFD700 !important;
        z-index: 999999 !important;
        position: relative;
      }
      @keyframes ai-blink {
        0% { box-shadow: 0 0 0 3px #FFD700, 0 0 12px #FFD700; }
        100% { box-shadow: 0 0 0 6px #FF8C00, 0 0 24px #FFD700; }
      }
    `;
  document.head.appendChild(style);
}

// Highlight message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "highlightElement" && request.locator) {
    document.querySelectorAll(".ai-highlight-blink").forEach((el) => {
      el.classList.remove("ai-highlight-blink");
      el.style.boxShadow = "";
    });

    let el;
    try {
      el = document.querySelector(request.locator);
    } catch (e) {
      sendResponse({ success: false, error: "Invalid CSS selector" });
      return true;
    }
    if (el) {
      el.classList.add("ai-highlight-blink");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        el.classList.remove("ai-highlight-blink");
        el.style.boxShadow = "";
      }, 2000);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "Element not found" });
    }
    return true;
  }
});
