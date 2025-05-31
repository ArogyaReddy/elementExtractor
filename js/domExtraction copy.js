//TODO:- // 1. Create a function to extract elements from the DOM based on filters
// @section: domExtraction.js
export function extractElementsSmart({ filters, visibleOnly, hiddenOnly, shadowDOM }) {
  // Place this OUTSIDE of extractElementsSmart
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
      if (el.shadowRoot) {
        collectFilteredElementsIncludingShadow(el.shadowRoot, selectors, out);
      }
    }
    return out;
  }

  const typeToSelector = {
    filterLinks: "a",
    filterButtons: "button,input[type='button'],input[type='submit']",
    filterInputs: "input,select,textarea",
    filterCombo: "select,[role='combobox']",
    filterHeaders: "h1,h2,h3,h4,h5,h6",
    filterTextboxes:
      "input[type='text'],input[type='search'],input[type='email'],input[type='url'],input[type='password']",
    filterCheckboxes: "input[type='checkbox']",
    filterRadios: "input[type='radio']",
    filterLists: "ul,ol,li,dl,dt,dd",
    filterForms: "form",
    filterSVG: "svg",
    filterTables: "table,thead,tbody,tr,td,th",
    filterSpans: "span",
    filterDivs: "div",
    filterCustom: "*",
  };

  //  const selectors = filters.includes("filterAll") ? "*" : filters.map((f) => typeToSelector[f]).join(",");
  const selectors =
    !filters || filters.length === 0 || filters.includes("filterAll")
      ? "*"
      : filters.map((f) => typeToSelector[f]).join(",");

  console.log("filters:", filters);
  console.log("Selectors:", selectors);

  let domElements = [];
  domElements = collectFilteredElementsIncludingShadow(document, selectors).slice(0, 2000);
  // 3. Log how many elements were found
  console.log("Found elements:", domElements.length);

  const data = [];
  for (let el of domElements) {
    if (visibleOnly && !isVisible(el)) continue;
    if (hiddenOnly && isVisible(el)) continue;

    const smartLocator = getSmartLocator(el);

    data.push({
      "Element Name": getElementName(el), // ✅
      "Element Type": getElementType(el),
      "Locator Type": smartLocator.locatorType,
      "Best Locator": smartLocator.locator,
      ID: el.id || "",
      CSS: getUniqueCssSelector(el),
      XPATH: getXPath(el),
      "In Shadow DOM": !!el.getRootNode().host ? "Yes" : "No",
    });
  }
  return data;

  function isVisible(el) {
    const style = window.getComputedStyle(el);
    return style && style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null;
  }

  //TODO: // 1. Create a function to get role, aria-label, placeholder, or text
  /**
   * @function getRoleLocator
   * @desc Try to return a robust locator based on role, aria-label, placeholder, or text.
   * @param {HTMLElement} el
   * @returns {string}
   */
  function getRoleLocator(el) {
    if (el.getAttribute("role")) return `role=${el.getAttribute("role")}`;
    if (el.getAttribute("aria-label")) return `aria-label=${el.getAttribute("aria-label")}`;
    if (el.getAttribute("placeholder")) return `placeholder=${el.getAttribute("placeholder")}`;
    if (el.innerText && el.innerText.trim().length < 40) return `text=${el.innerText.trim()}`;
    return "";
  }

  //TODO: // 1. Create functions to get unique CSS selector and XPath
  function getUniqueCssSelector(el) {
    if (el.id) return `#${el.id}`;
    let path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      if (el.className) selector += "." + [...el.classList].join(".");
      let parent = el.parentNode;
      let siblings = parent ? [...parent.children].filter((e) => e.nodeName === el.nodeName) : [];
      if (siblings.length > 1) selector += `:nth-child(${[...parent.children].indexOf(el) + 1})`;
      path.unshift(selector);
      el = parent;
      if (!el || el === document.body) break;
    }
    return path.join(" > ");
  }

  //TODO: // 1. Create a function to get XPath
  /**
   * @function getXPath
   * @desc Generate a unique XPath for an element.
   * @param {HTMLElement} el
   * @returns {string}
   */
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

  //TODO: -- 1. Create a function to get element type and name
  /**
   * @function getElementType
   * @desc Get a short type name for an element based on its tag and attributes.
   * @param {HTMLElement} el
   * @returns {string}
   */
  function getElementType(el) {
    if (el.matches("a")) return "LINK";
    if (el.matches("button,input[type='button'],input[type='submit']")) return "BTN";
    if (el.matches("input,select,textarea")) return "INPUT";
    if (el.matches("select,[role='combobox']")) return "COMBO";
    if (el.matches("h1,h2,h3,h4,h5,h6")) return "HDR";
    if (
      el.matches("input[type='text'],input[type='search'],input[type='email'],input[type='url'],input[type='password']")
    )
      return "TXT";
    if (el.matches("input[type='checkbox']")) return "CHK";
    if (el.matches("input[type='radio']")) return "RADIO";
    if (el.matches("ul,ol,li,dl,dt,dd")) return "LIST";
    if (el.matches("form")) return "FORM";
    if (el.matches("svg")) return "SVG";
    if (el.matches("table,thead,tbody,tr,td,th")) return "TABLE";
    if (el.matches("span")) return "SPAN";
    if (el.matches("div")) return "DIV";
    if (el.tagName && el.tagName.includes("-")) return "CUSTOM";
    return el.tagName;
  }

  //TODO:- // 1. Create a function to get element name (aria-label, alt, placeholder, or text)
  function getElementName(el) {
    return (
      el.getAttribute("aria-label") ||
      el.getAttribute("alt") ||
      el.getAttribute("placeholder") ||
      (el.innerText ? el.innerText.trim().replace(/\s+/g, " ").slice(0, 40) : el.tagName.toLowerCase())
    );
  }

  //TODO: // 2. Create a smart locator function that tries to mimic Playwright's getByRole, getByLabel, etc.
  /**
   * @function getSmartLocator
   * @desc Try to return a smart, robust locator (Playwright-style) for an element.
   * @param {HTMLElement} el
   * @returns {{locatorType: string, locator: string}}
   */
  function getSmartLocator(el) {
    // 1. Try "role + name" (like Playwright's getByRole)
    const role = el.getAttribute("role");
    let name = "";
    if (el.getAttribute("aria-label")) name = el.getAttribute("aria-label");
    else if (el.getAttribute("aria-labelledby")) {
      const labelEl = document.getElementById(el.getAttribute("aria-labelledby"));
      if (labelEl) name = labelEl.textContent.trim();
    } else if (el.innerText && el.innerText.length < 40) {
      name = el.innerText.trim();
    }

    if (role && name) {
      return {
        locatorType: "role+name",
        locator: `getByRole('${role}', { name: '${name}' })`,
      };
    }

    // 2. Label (for inputs/buttons)
    if (el.labels && el.labels.length) {
      return {
        locatorType: "label",
        locator: `getByLabel('${el.labels[0].textContent.trim()}')`,
      };
    }

    // 3. Text content (short visible text, for links/buttons)
    if (el.tagName.match(/BUTTON|A/) && el.innerText && el.innerText.length < 40) {
      return {
        locatorType: "text",
        locator: `getByText('${el.innerText.trim()}')`,
      };
    }

    // 4. Placeholder for inputs
    if (el.placeholder) {
      return {
        locatorType: "placeholder",
        locator: `getByPlaceholder('${el.placeholder}')`,
      };
    }

    // 5. Fallbacks
    if (el.id) return { locatorType: "id", locator: `#${el.id}` };
    if (el.className)
      return {
        locatorType: "class",
        locator: "." + el.className.split(" ").join("."),
      };

    // As last resort: XPath
    return { locatorType: "xpath", locator: getXPath(el) };
  }
}

/**
 * Recursively collect all elements, including those in shadow roots.
 * @param {Element|Document} root
 * @param {Array} out
 * @returns {Array}
 */
function collectAllElementsIncludingShadow(root, out = []) {
  for (const el of root.querySelectorAll("*")) {
    out.push(el);
    if (el.shadowRoot) {
      collectAllElementsIncludingShadow(el.shadowRoot, out);
    }
  }
  return out;
}
