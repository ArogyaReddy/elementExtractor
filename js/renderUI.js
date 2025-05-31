/**
 * @section: renderUI.js — Render Table & Effects
 */
export function renderElementsTable(data) {
  const search = document.getElementById('search').value;
  let filteredData = data.filter(row => (row['Element Name'] || '').toLowerCase().includes((search||'').toLowerCase()));
  let maxRows = 12;
  let previewHTML = `<b>Preview (first ${Math.min(maxRows, filteredData.length)}):</b>
    <table><tr>
    <th>Name</th>
    <th>Type</th>
    <th>Best</th>
    <th>ID</th>
    <th>CSS</th>
    <th>XPATH</th>
    <th>Shadow</th>
    <th>Copy</th>
    <th>Highlight</th></tr>`;
  for (let i = 0; i < Math.min(filteredData.length, maxRows); ++i) {
    let r = filteredData[i];
    previewHTML += `<tr>
      <td title="${r['Element Name']}">${r['Element Name']}</td>
      <td><span class="el-badge">${r['Element Type']}</span></td>
      <td title="${r['Best Locator']}">${r['Best Locator']}</td>
      <td title="${r['ID']}">${r['ID']}</td>
      <td title="${r['CSS']}">${r['CSS']}</td>
      <td title="${r['XPATH']}">${r['XPATH']}</td>
      <td>${r['In Shadow DOM'] ? `<span class="shadow-badge">Shadow</span>` : ''}</td>
      <td><button class="copy-btn" data-copy="${r['Best Locator']}" title="Copy to clipboard">📋</button></td>
      <td><button class="hl-btn" data-hl="${r['Best Locator']}" data-shadow="${r['In Shadow DOM'] ? '1' : '0'}" title="Highlight element">👁️</button></td>
    </tr>`;
  }
  previewHTML += '</table>';
  document.getElementById('preview').innerHTML = previewHTML;
  setTimeout(() => bindTablePreviewButtons(), 100);
}
function bindTablePreviewButtons() {
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.onclick = e => {
      navigator.clipboard.writeText(e.target.getAttribute('data-copy'));
      btn.textContent = '✅';
      setTimeout(() => (btn.textContent = '📋'), 600);
    };
  });
  document.querySelectorAll('.hl-btn').forEach(btn => {
    btn.onclick = async e => {
      let locator = e.target.getAttribute('data-hl');
      let inShadow = e.target.getAttribute('data-shadow') === '1';
      let [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      chrome.scripting.executeScript({
        target: {tabId: tab.id},
        args: [locator, inShadow],
        func: (locator, inShadow) => {
          let el = null;
          if (inShadow) {
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
            if (locator.startsWith('#')) {
              el = document.querySelector(locator);
            } else if (locator.startsWith('/')) {
              let r = document.evaluate(locator, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
              el = r.singleNodeValue;
            } else {
              el = document.querySelector(locator);
            }
          }
          if (el) {
            el.scrollIntoView({behavior: 'smooth', block: 'center'});
            el.style.outline = '3px solid #48b5f3';
            setTimeout(() => { el.style.outline = ''; }, 1100);
          }
        }
      });
      btn.textContent = '✨';
      setTimeout(() => (btn.textContent = '👁️'), 600);
    };
  });
}
export function setPopupExpanded(isExpanded) {
  document.querySelector('.popup-root').classList.toggle('expanded', !!isExpanded);
}
