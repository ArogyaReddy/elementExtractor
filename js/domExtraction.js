// @section: domExtraction.js
export function extractElementsSmart({ filters, visibleOnly, hiddenOnly, shadowDOM }) {
  // --- NESTED HELPER FUNCTION ---
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
  // --- END OF NESTED HELPER FUNCTION ---

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

  // const selectors = (!filters || filters.length === 0 || filters.includes("filterAll")) ? "*" : filters.map((f) => typeToSelector[f]).join(",");

  // TODO:--- Helper: Find all shadow roots in the page ---
  function findAllShadowRoots(root = document, out = []) {
    for (const el of root.querySelectorAll("*")) {
      if (el.shadowRoot) {
        out.push(el.shadowRoot);
        findAllShadowRoots(el.shadowRoot, out);
      }
    }
    return out;
  }

  // TODO:--- Helper: Collect elements (optionally only in shadow roots) ---
  function collectElements({ selectors, onlyInShadowRoots }) {
    let elements = [];
    if (onlyInShadowRoots) {
      // 1. Find all shadow roots
      let shadowRoots = findAllShadowRoots(document);
      // 2. For each shadow root, collect elements
      for (const shadowRoot of shadowRoots) {
        elements.push(...Array.from(shadowRoot.querySelectorAll(selectors)));
      }
    } else {
      // Main DOM only, do NOT traverse into shadow roots
      elements = Array.from(document.querySelectorAll(selectors));
    }
    return elements;
  }

  // --- Actual extraction step ---
  const selectors =
    !filters || filters.length === 0 || filters.includes("filterAll")
      ? "*"
      : filters.map((f) => typeToSelector[f]).join(",");

  // Log the filters and selectors for debugging
  console.log("Extracting elements with filters:", filters);
  console.log("Using selectors:", selectors);
  console.log("Shadow DOM enabled:", !!shadowDOM);

  // console.log('filters:', filters);
  // console.log("Selectors:", selectors);

  let domElements = collectElements({ selectors, onlyInShadowRoots: !!shadowDOM }).slice(0, 2000);

  // let domElements = [];
  // // Now calls the nested helper function
  // domElements = collectFilteredElementsIncludingShadow(document, selectors).slice(0, 2000);

  console.log("Found elements:", domElements.length);
  const data = [];
  for (let el of domElements) {
    if (visibleOnly && !isVisible(el)) continue;
    if (hiddenOnly && isVisible(el)) continue;

    const smartLocator = getSmartLocator(el);

    const row = {
      "Element Name": getElementName(el),
      "Element Type": getElementType(el),
      "Locator Type": smartLocator.locatorType,
      "Best Locator": smartLocator.locator,
      ID: el.id || "",
      CSS: getUniqueCssSelector(el),
      XPATH: getXPath(el),
      "In Shadow DOM": !!el.getRootNode().host ? "Yes" : "No",
    };

    // ---- Add this console output! ----
    console.log(
      `%c[Extracted]%c ${row["Element Name"]} %c| %cBest: %c${row["Best Locator"]} %c| CSS: %c${row.CSS} %c| XPATH: %c${row.XPATH}`,
      "color:#9af; font-weight:bold;", // [Extracted]
      "color:white; font-weight:bold;", // element name
      "color:gray;",
      "color:#8ff; font-weight:bold;", // Best:
      "color:#3af;",
      "color:gray;",
      "color:#afa;",
      "color:gray;",
      "color:#fa3;"
    );

    data.push(row);
    // data.push({
    //   "Element Name": getElementName(el),
    //   "Element Type": getElementType(el),
    //   "Locator Type": smartLocator.locatorType,
    //   "Best Locator": smartLocator.locator,
    //   ID: el.id || "",
    //   CSS: getUniqueCssSelector(el),
    //   XPATH: getXPath(el),
    //   "In Shadow DOM": !!el.getRootNode().host ? "Yes" : "No",
    // });
  }
  return data;

  // --- Other helper functions remain nested inside extractElementsSmart ---
  function isVisible(el) {
    const style = window.getComputedStyle(el);
    return style && style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null;
  }

  function getRoleLocator(el) {
    // ... implementation ...
    if (el.getAttribute("role")) return `role=${el.getAttribute("role")}`;
    if (el.getAttribute("aria-label")) return `aria-label=${el.getAttribute("aria-label")}`;
    if (el.getAttribute("placeholder")) return `placeholder=${el.getAttribute("placeholder")}`;
    const innerText = el.innerText ? el.innerText.trim() : "";
    if (innerText && innerText.length < 40 && innerText.length > 0) return `text=${innerText}`;
    return "";
  }

  function getUniqueCssSelector(el) {
    // ... implementation ...
    if (!el || typeof el.matches !== "function") return "invalid_element"; // Basic guard
    if (el.id) return `#${el.id.trim().replace(/\s+/g, "-")}`; // Sanitize ID slightly
    let path = [];
    let currentEl = el;
    while (currentEl && currentEl.nodeType === Node.ELEMENT_NODE) {
      let selector = currentEl.nodeName.toLowerCase();
      if (currentEl.id) {
        selector = `#${currentEl.id.trim().replace(/\s+/g, "-")}`;
        path.unshift(selector);
        break; // ID is unique, no need to go further
      } else if (currentEl.className && typeof currentEl.className === "string") {
        const classes = currentEl.className
          .trim()
          .split(/\s+/)
          .filter((c) => c)
          .join(".");
        if (classes) selector += "." + classes;
      }

      const parent = currentEl.parentNode;
      if (parent && parent.children) {
        const siblings = Array.from(parent.children).filter((e) => e.nodeName === currentEl.nodeName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(currentEl);
          if (index !== -1) {
            selector += `:nth-of-type(${index + 1})`;
          }
        }
      }
      path.unshift(selector);
      currentEl = parent;
      if (!currentEl || currentEl === document.body || currentEl === document.documentElement) break;
    }
    return path.join(" > ");
  }

  function getXPath(el) {
    // ... implementation ...
    if (el.id) return `//*[@id="${el.id}"]`;
    let path = [];
    let currentEl = el;
    while (currentEl && currentEl.nodeType === Node.ELEMENT_NODE) {
      let idx = 0;
      let sib = currentEl.previousSibling;
      while (sib) {
        if (sib.nodeType === Node.ELEMENT_NODE && sib.nodeName === currentEl.nodeName) {
          idx++;
        }
        sib = sib.previousSibling;
      }
      let nodeDesc = currentEl.nodeName.toLowerCase();
      // For HTML documents, elements are typically uppercase, but XPath is case-sensitive for element names.
      // However, in browser DOM, nodeName might be uppercase. Let's stick to toLowerCase().
      path.unshift(nodeDesc + `[${idx + 1}]`);
      currentEl = currentEl.parentNode;
      if (!currentEl || currentEl === document.documentElement) break; // Stop at documentElement
    }
    return "/" + (currentEl === document.documentElement ? "" : "html/") + path.join("/"); // Add /html if path doesn't start from it
  }

  function getElementType(el) {
    // ... implementation ...
    if (el.matches("a")) return "LINK";
    if (el.matches("button,input[type='button'],input[type='submit']")) return "BTN";
    // Order matters: more specific input types first
    if (el.matches("input[type='checkbox']")) return "CHK";
    if (el.matches("input[type='radio']")) return "RADIO";
    if (
      el.matches("input[type='text'],input[type='search'],input[type='email'],input[type='url'],input[type='password']")
    )
      return "TXT";
    if (el.matches("select,[role='combobox']")) return "COMBO"; // Check this after specific inputs
    if (el.matches("input")) return "INPUT_OTHER"; // Generic input if not caught above
    if (el.matches("textarea")) return "TEXTAREA"; // Keep textarea separate from generic input
    if (el.matches("h1,h2,h3,h4,h5,h6")) return "HDR";
    if (el.matches("ul,ol,li,dl,dt,dd")) return "LIST";
    if (el.matches("form")) return "FORM";
    if (el.matches("svg")) return "SVG";
    if (el.matches("table,thead,tbody,tr,td,th")) return "TABLE";
    if (el.matches("span")) return "SPAN";
    if (el.matches("div")) return "DIV";
    if (el.tagName && el.tagName.includes("-")) return "CUSTOM_EL"; // More descriptive
    return el.tagName ? el.tagName.toUpperCase() : "UNKNOWN"; // Return uppercase tagname as fallback
  }

  function getElementName(el) {
    // ... implementation ...
    const ariaLabel = el.getAttribute("aria-label");
    if (ariaLabel) return ariaLabel.trim().replace(/\s+/g, " ").slice(0, 50);

    const altText = el.getAttribute("alt");
    if (altText) return altText.trim().replace(/\s+/g, " ").slice(0, 50);

    const placeholder = el.getAttribute("placeholder");
    if (placeholder) return placeholder.trim().replace(/\s+/g, " ").slice(0, 50);

    const innerText = el.innerText;
    if (innerText) {
      const cleanInnerText = innerText.trim().replace(/\s+/g, " ").slice(0, 50);
      if (cleanInnerText) return cleanInnerText;
    }
    // Fallback to title attribute if present
    const title = el.getAttribute("title");
    if (title) return title.trim().replace(/\s+/g, " ").slice(0, 50);

    // Fallback for image if no alt text
    if (el.tagName.toLowerCase() === "img" && el.src) {
      const srcParts = el.src.split("/");
      const imageName = srcParts[srcParts.length - 1].split(".")[0]; // Get filename without extension
      return imageName ? `img:${imageName.slice(0, 40)}` : "Image";
    }

    return el.tagName ? el.tagName.toLowerCase() : "unknown_element";
  }

  function getSmartLocator(el) {
    // ... implementation ...
    const role = el.getAttribute("role");
    let name = "";
    let nameSource = ""; // To understand where the name came from

    const ariaLabel = el.getAttribute("aria-label");
    if (ariaLabel) {
      name = ariaLabel.trim();
      nameSource = "aria-label";
    } else {
      const ariaLabelledBy = el.getAttribute("aria-labelledby");
      if (ariaLabelledBy) {
        const labelEl = document.getElementById(ariaLabelledBy);
        if (labelEl) {
          name = labelEl.textContent ? labelEl.textContent.trim() : "";
          nameSource = "aria-labelledby";
        }
      }
    }
    // If role-name still not found from aria attributes, try innerText or value for certain roles
    if (role && !name) {
      if (
        el.tagName.toLowerCase() === "button" ||
        role === "button" ||
        role === "link" ||
        role === "menuitem" ||
        role === "heading"
      ) {
        if (el.innerText && el.innerText.trim().length > 0 && el.innerText.trim().length < 50) {
          // Increased length slightly
          name = el.innerText.trim();
          nameSource = "innerText (for role)";
        } else if (
          el.value &&
          el.tagName.toLowerCase() === "input" &&
          (el.type === "button" || el.type === "submit" || el.type === "reset")
        ) {
          name = el.value.trim();
          nameSource = "value (for input button role)";
        }
      }
    }
    // If still no name, and it's a common interactive element, try a broader innerText check
    if (!name && el.innerText && el.innerText.trim().length > 0 && el.innerText.trim().length < 50) {
      if (el.tagName.match(/BUTTON|A|SUMMARY|LABEL/i) || role) {
        // Consider role as well
        name = el.innerText.trim();
        nameSource = "innerText (general)";
      }
    }

    // Sanitize name for locator string (escape quotes, etc.)
    const sanitizedName = name.replace(/'/g, "\\'");

    if (role && sanitizedName) {
      return {
        locatorType: `getByRole (${nameSource || "inferred"})`,
        locator: `page.getByRole('${role}', { name: '${sanitizedName}' })`,
      };
    }
    // If only role is present and it's unique enough (e.g., 'navigation', 'main')
    if (
      role &&
      !sanitizedName &&
      ["navigation", "main", "banner", "contentinfo", "search", "form", "region", "complementary"].includes(role)
    ) {
      // Check if this role is unique enough on its own
      const elementsWithSameRole = document.querySelectorAll(`[role="${role}"]`);
      if (elementsWithSameRole.length === 1 && elementsWithSameRole[0] === el) {
        return { locatorType: "getByRole (unique)", locator: `page.getByRole('${role}')` };
      }
    }

    // 2. getByLabel (for form elements if they have an associated label)
    if (el.labels && el.labels.length > 0 && el.labels[0].textContent) {
      const labelText = el.labels[0].textContent.trim().replace(/'/g, "\\'");
      if (labelText) {
        return {
          locatorType: "getByLabel",
          locator: `page.getByLabel('${labelText}')`,
        };
      }
    }
    // Attempt to find label for input if el.labels is not populated (e.g. aria-labelledby)
    if (!el.labels || el.labels.length === 0) {
      let labelText = "";
      if (el.id) {
        const labelForEl = document.querySelector(`label[for="${el.id}"]`);
        if (labelForEl && labelForEl.textContent) {
          labelText = labelForEl.textContent.trim().replace(/'/g, "\\'");
        }
      }
      if (labelText) {
        return { locatorType: "getByLabel (found via for-attribute)", locator: `page.getByLabel('${labelText}')` };
      }
    }

    // 3. getByText (short visible text, prioritize interactive elements or elements with explicit roles)
    const directInnerText =
      el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE ? el.firstChild.textContent.trim() : "";
    if (directInnerText && directInnerText.length > 0 && directInnerText.length < 50) {
      // Prioritize if it's clearly an interactive element or has a role
      if (el.tagName.match(/BUTTON|A|SUMMARY|H\d|P|SPAN|DIV/i) || role) {
        const sanitizedDirectInnerText = directInnerText.replace(/'/g, "\\'");
        return {
          locatorType: "getByText (direct)",
          locator: `page.getByText('${sanitizedDirectInnerText}', { exact: true })`, // Consider exact: true for direct text
        };
      }
    } else if (el.innerText && el.innerText.trim().length > 0 && el.innerText.trim().length < 50) {
      // Broader check if directInnerText wasn't suitable
      if (el.tagName.match(/BUTTON|A|SUMMARY|H\d|P|SPAN|DIV/i) || role) {
        const sanitizedInnerText = el.innerText.trim().replace(/'/g, "\\'");
        return {
          locatorType: "getByText (innerText)",
          locator: `page.getByText('${sanitizedInnerText}')`,
        };
      }
    }

    // 4. getByPlaceholder for inputs
    const placeholderText = el.getAttribute("placeholder");
    if (placeholderText) {
      const sanitizedPlaceholder = placeholderText.trim().replace(/'/g, "\\'");
      return {
        locatorType: "getByPlaceholder",
        locator: `page.getByPlaceholder('${sanitizedPlaceholder}')`,
      };
    }

    // 5. getByTitle
    const titleText = el.getAttribute("title");
    if (titleText) {
      const sanitizedTitle = titleText.trim().replace(/'/g, "\\'");
      return { locatorType: "getByTitle", locator: `page.getByTitle('${sanitizedTitle}')` };
    }

    // 6. getByAltText (for images)
    if (el.tagName.toLowerCase() === "img" && el.alt) {
      const sanitizedAlt = el.alt.trim().replace(/'/g, "\\'");
      return { locatorType: "getByAltText", locator: `page.getByAltText('${sanitizedAlt}')` };
    }

    // 7. Fallbacks: ID, unique CSS, then XPath
    if (el.id) {
      const sanitizedId = el.id.trim().replace(/\s+/g, "-"); // Basic sanitization for ID
      return { locatorType: "id", locator: `#${sanitizedId}` };
    }

    // Using a more robust unique CSS selector from getUniqueCssSelector helper
    const cssSelector = getUniqueCssSelector(el);
    if (
      cssSelector &&
      cssSelector !== "invalid_element" &&
      !cssSelector.toLowerCase().startsWith("html > body >") &&
      cssSelector.length < 100
    ) {
      // Avoid overly generic or long CSS
      // Basic check if this CSS selector is unique enough
      try {
        const elementsWithSameCss = document.querySelectorAll(cssSelector);
        if (elementsWithSameCss.length === 1 && elementsWithSameCss[0] === el) {
          return { locatorType: "css (unique)", locator: `'${cssSelector}'` }; // Playwright often takes string selector
        }
      } catch (e) {
        /* ignore if selector is invalid for querySelectorAll */
      }
    }

    // As last resort: XPath
    return { locatorType: "xpath", locator: getXPath(el) };
  }
}
