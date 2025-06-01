/******************************************************************************
 * @FileName: renderUI.js
 * @section: Table Rendering and Highlight Handling
 ******************************************************************************/

export function renderElementsTable(data) {
  const search = document.getElementById("search").value.trim();
  let filteredData = !search
    ? data
    : data.filter((row) => (row["Element Name"] || "").toLowerCase().includes(search.toLowerCase()));
  let maxRows = data.length;

  let previewHTML = `<b>Found ${filteredData.length} element${filteredData.length === 1 ? "" : "s"}:</b>
<table>
  <tr>
    <th>Name</th>
    <th>Type</th>
    <th>Primary Locator</th>
    <th>Secondary Locators</th>
    <th>Copy/Highlight</th>
  </tr>`;

  for (let i = 0; i < Math.min(filteredData.length, maxRows); ++i) {
    let r = filteredData[i];
    // Pick best selectors: always real browser selectors for highlight
    const bestCssSelector = r["Best CSS Selector"] || r["Primary Locator"];
    const bestXPath =
      r["Best XPath"] || (r["Secondary Locators"] || "").split("||").find((x) => x.trim().startsWith("/")) || "";
    previewHTML += `<tr>
      <td title="${r["Element Name"]}">${r["Element Name"]}</td>
      <td><span class="el-badge">${r["Element Type"]}</span></td>
      <td title="${r["Primary Locator"]}">${r["Primary Locator"].slice(0, 36)}${
      r["Primary Locator"].length > 36 ? "…" : ""
    }</td>
      <td>${(r["Secondary Locators"] || "")
        .split("||")
        .map(
          (loc) =>
            `<span class="sec-locator" title="${loc.trim()}">${loc.trim().slice(0, 32)}${
              loc.trim().length > 32 ? "…" : ""
            }</span>`
        )
        .join("<br>")}</td>
      <td>
        <button class="copy-btn" data-copy="${r["Primary Locator"]}" title="Copy Primary">📋</button>
        <button class="hl-btn"
          data-locator="${bestCssSelector || ""}"
          data-xpath="${bestXPath || ""}"
          title="Highlight">👁️</button>
        ${
          r["Secondary Locators"]
            ? r["Secondary Locators"]
                .split("||")
                .map(
                  (loc) => `<button class="copy-btn sec" data-copy="${loc.trim()}" title="Copy Secondary">📎</button>`
                )
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

function bindTablePreviewButtons() {
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.onclick = (e) => {
      let text = e.target.getAttribute("data-copy");
      if (!text) return;
      navigator.clipboard.writeText(text);
      btn.textContent = "✅";
      setTimeout(() => (btn.textContent = btn.classList.contains("sec") ? "📎" : "📋"), 600);
    };
  });
  document.querySelectorAll(".hl-btn").forEach((btn) => {
    btn.onclick = async (e) => {
      let css = btn.getAttribute("data-locator");
      let xpath = btn.getAttribute("data-xpath");
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { action: "highlightElement", locator: css, xpath: xpath }, (response) => {});
      btn.textContent = "✨";
      setTimeout(() => (btn.textContent = "👁️"), 800);
    };
  });
}

export function setPopupExpanded(isExpanded) {
  document.querySelector(".popup-root").classList.toggle("expanded", !!isExpanded);
}
