/**
 * @section: domExtraction.js — Smarter Element Extraction
 * This function runs in page context!
 */
export function extractElementsSmart({ filters, visibleOnly, hiddenOnly, shadowDOM }) {
  const typeToSelector = {
    filterLinks: 'a',
    filterButtons: "button,input[type='button'],input[type='submit']",
    filterInputs: 'input,select,textarea',
    filterCombo: "select,[role='combobox']",
    filterHeaders: 'h1,h2,h3,h4,h5,h6',
    filterTextboxes: "input[type='text'],input[type='search'],input[type='email'],input[type='url'],input[type='password']",
    filterCheckboxes: "input[type='checkbox']",
    filterRadios: "input[type='radio']",
    filterLists: 'ul,ol,li,dl,dt,dd',
    filterForms: 'form',
    filterSVG: 'svg',
    filterTables: 'table,thead,tbody,tr,td,th',
    filterSpans: 'span',
    filterDivs: 'div',
    filterCustom: '*'
  };

  const selectors = filters.includes('filterAll') ? '*' : filters.map(f => typeToSelector[f]).join(',');

  function isVisible(el) {
    const style = window.getComputedStyle(el);
    return style && style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
  }
  function getRoleLocator(el) {
    if (el.getAttribute('role')) return `role=${el.getAttribute('role')}`;
    if (el.getAttribute('aria-label')) return `aria-label=${el.getAttribute('aria-label')}`;
    if (el.getAttribute('placeholder')) return `placeholder=${el.getAttribute('placeholder')}`;
    if (el.innerText && el.innerText.trim().length < 40) return `text=${el.innerText.trim()}`;
    return '';
  }
  function getUniqueCssSelector(el) {
    if (el.id) return `#${el.id}`;
    let path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      if (el.className) selector += '.' + [...el.classList].join('.');
      let parent = el.parentNode;
      let siblings = parent ? [...parent.children].filter(e => e.nodeName === el.nodeName) : [];
      if (siblings.length > 1) selector += `:nth-child(${[...parent.children].indexOf(el) + 1})`;
      path.unshift(selector);
      el = parent;
      if (!el || el === document.body) break;
    }
    return path.join(' > ');
  }
  function getXPath(el) {
    if (el.id) return `//*[@id="${el.id}"]`;
    let path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let idx = 1, sib = el.previousSibling;
      while (sib) {
        if (sib.nodeType === Node.ELEMENT_NODE && sib.nodeName === el.nodeName) idx++;
        sib = sib.previousSibling;
      }
      path.unshift(el.nodeName.toLowerCase() + `[${idx}]`);
      el = el.parentNode;
    }
    return '/' + path.join('/');
  }
  function getElementType(el) {
    if (el.matches('a')) return 'LINK';
    if (el.matches("button,input[type='button'],input[type='submit']")) return 'BTN';
    if (el.matches('input,select,textarea')) return 'INPUT';
    if (el.matches("select,[role='combobox']")) return 'COMBO';
    if (el.matches('h1,h2,h3,h4,h5,h6')) return 'HDR';
    if (el.matches("input[type='text'],input[type='search'],input[type='email'],input[type='url'],input[type='password']")) return 'TXT';
    if (el.matches("input[type='checkbox']")) return 'CHK';
    if (el.matches("input[type='radio']")) return 'RADIO';
    if (el.matches('ul,ol,li,dl,dt,dd')) return 'LIST';
    if (el.matches('form')) return 'FORM';
    if (el.matches('svg')) return 'SVG';
    if (el.matches('table,thead,tbody,tr,td,th')) return 'TABLE';
    if (el.matches('span')) return 'SPAN';
    if (el.matches('div')) return 'DIV';
    if (el.tagName && el.tagName.includes('-')) return 'CUSTOM';
    return el.tagName;
  }
  function getElementName(el) {
    return el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('placeholder') ||
      (el.innerText ? el.innerText.trim().replace(/\s+/g, ' ').slice(0, 40) : el.tagName.toLowerCase());
  }
  let domElements = [];
  try {
    domElements = Array.from(document.querySelectorAll(selectors)).slice(0, 2000);
  } catch (e) {
    domElements = Array.from(document.querySelectorAll('*')).slice(0, 2000);
  }
  const data = [];
  for (let el of domElements) {
    if (visibleOnly && !isVisible(el)) continue;
    if (hiddenOnly && isVisible(el)) continue;
    const name = getElementName(el);
    const id = el.id || '';
    const css = getUniqueCssSelector(el);
    const xpath = getXPath(el);
    const roleLocator = getRoleLocator(el);
    const elType = getElementType(el);
    data.push({
      'Element Name': name,
      'Element Type': elType,
      'Best Locator': roleLocator || (id ? `#${id}` : css),
      ID: id,
      CSS: css,
      XPATH: xpath,
      'In Shadow DOM': el.getRootNode() instanceof ShadowRoot ? 'Yes' : ''
    });
  }
  return data;
}
