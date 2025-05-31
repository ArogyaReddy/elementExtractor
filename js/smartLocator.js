// ================= @section: Smart Locators Generator =====================
// Generate human-friendly locators in Playwright/Testing Library style
// Usage: getSmartLocators(element) -> returns { bestType, bestLocator, allLocators }

function getSmartLocators(element) {
  const locators = {};

  // 1. Test ID (most stable if present)
  const testId = element.getAttribute('data-testid') || element.getAttribute('data-test') || element.getAttribute('data-test-id');
  if (testId) locators['testid'] = `getByTestId('${testId}')`;

  // 2. Role (with name)
  const role = element.getAttribute('role');
  let labelOrName = element.getAttribute('aria-label') || element.getAttribute('aria-labelledby');
  // Try to get label from <label> too
  if (!labelOrName && element.labels && element.labels.length > 0) labelOrName = element.labels[0].innerText.trim();
  if (role) {
    if (labelOrName) locators['role'] = `getByRole('${role}', { name: '${labelOrName}' })`;
    else locators['role'] = `getByRole('${role}')`;
  }

  // 3. Label Text (inputs, buttons, etc)
  if (labelOrName) locators['label'] = `getByLabelText('${labelOrName}')`;

  // 4. Placeholder (for inputs)
  const placeholder = element.getAttribute('placeholder');
  if (placeholder) locators['placeholder'] = `getByPlaceholderText('${placeholder}')`;

  // 5. Alt text (for images/icons)
  const alt = element.getAttribute('alt');
  if (alt) locators['alt'] = `getByAltText('${alt}')`;

  // 6. Visible text (for buttons/links/etc)
  let visibleText = (element.innerText || '').trim();
  // Only use if not just whitespace, not crazy long, not all digits
  if (visibleText && visibleText.length < 64 && /\D/.test(visibleText)) {
    locators['text'] = `getByText('${visibleText}')`;
  }

  // 7. Fallback to ID, name, CSS, XPath if no good "smart" locator
  const id = element.id;
  if (id) locators['id'] = `#${id}`;
  const nameAttr = element.getAttribute('name');
  if (nameAttr) locators['name'] = `[name="${nameAttr}"]`;

  // 8. Fallbacks
  // Simple CSS selector
  locators['css'] = generateUniqueCssSelector(element);
  // XPath
  locators['xpath'] = generateXPath(element);

  // Pick best (prefer in this order)
  const priority = ['testid','role','label','placeholder','alt','text','id','name','css','xpath'];
  let bestType = priority.find(key => locators[key]);
  let bestLocator = bestType ? locators[bestType] : locators['css'];

  return { bestType, bestLocator, allLocators: locators };
}

// Helper: Unique CSS selector (reuse your existing function or this)
function generateUniqueCssSelector(el) {
  if (el.id) return `#${el.id}`;
  let path = [];
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.nodeName.toLowerCase();
    if (el.className) selector += '.' + Array.from(el.classList).join('.');
    let parent = el.parentNode;
    let siblings = parent ? Array.from(parent.children).filter(e => e.nodeName === el.nodeName) : [];
    if (siblings.length > 1) selector += `:nth-child(${Array.from(parent.children).indexOf(el) + 1})`;
    path.unshift(selector);
    el = parent;
    if (!el || el === document.body) break;
  }
  return path.join(' > ');
}

// Helper: XPath (reuse your existing function)
function generateXPath(el) {
  if (el.id) return `//*[@id="${el.id}"]`;
  let path = [];
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let idx = 1, sib = el.previousSibling;
    while (sib) {
      if (sib.nodeType === Node.ELEMENT_NODE && sib.nodeName === el.nodeName) idx++;
      sib = sib.previousSibling;
    }
    path.unshift(el.nodeName.toLowerCase() + '[' + idx + ']');
    el = el.parentNode;
  }
  return '/' + path.join('/');
}
