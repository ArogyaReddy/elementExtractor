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
