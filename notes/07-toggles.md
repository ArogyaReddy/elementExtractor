Absolutely! Your toggles are much more readable, but here’s how to **perfect the look** and alignment:

---

### **🎯 Goals**

- Toggles **smaller** (matching your control size)
- Perfectly **aligned** and centered in the row
- No overlap or uneven padding
- Responsive: fit even if window shrinks

---

## **PATCH 1: HTML**

Change your toggles HTML to use **shorter, simpler markup** (no nested rows):

```html
<div class="toggle-bar">
  <label class="toggle-switch">
    <input type="checkbox" id="filterVisible" checked />
    <span class="slider"></span>
    <span>Visible Only</span>
  </label>
  <label class="toggle-switch">
    <input type="checkbox" id="filterHidden" />
    <span class="slider"></span>
    <span>Hidden Only</span>
  </label>
  <label class="toggle-switch">
    <input type="checkbox" id="filterShadow" />
    <span class="slider"></span>
    <span>Shadow DOM</span>
  </label>
</div>
```

---

## **PATCH 2: CSS**

Replace your toggle styles with this set—**smaller toggles, better spacing**:

```css
.toggle-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin: 1rem 0 0.7rem 0;
  flex-wrap: wrap;
}
.toggle-switch {
  display: flex;
  align-items: center;
  background: #181b22;
  padding: 0.14rem 0.7rem 0.14rem 0.18rem;
  border-radius: 0.7em;
  font-family: "JetBrains Mono", "Fira Mono", "Menlo", monospace;
  font-size: 1.09rem;
  color: #ffd82e;
  letter-spacing: 0.01em;
  min-width: 0;
  user-select: none;
  gap: 0.41em;
  box-shadow: 0 1px 3px #0003;
  margin-bottom: 0;
}
.toggle-switch input[type="checkbox"] {
  display: none;
}
.toggle-switch .slider {
  width: 25px;
  height: 14px;
  background: #2c3242;
  border-radius: 9px;
  position: relative;
  margin-right: 0.34em;
  transition: background 0.18s;
  box-shadow: 0 1px 3px #0002;
}
.toggle-switch .slider::before {
  content: "";
  position: absolute;
  left: 2px;
  top: 2px;
  width: 10px;
  height: 10px;
  background: #ddd;
  border-radius: 50%;
  transition: transform 0.19s cubic-bezier(0.44, 1.88, 0.57, 1.29), background 0.18s;
}
.toggle-switch input[type="checkbox"]:checked + .slider {
  background: linear-gradient(90deg, #11e5a1 50%, #35e7ef 100%);
}
.toggle-switch input[type="checkbox"]:checked + .slider::before {
  background: #ffd82e;
  transform: translateX(11px);
}
.toggle-switch span:last-child {
  font-weight: bold;
  color: #ffd82e;
  margin-left: 2px;
  font-size: 1rem;
  min-width: 65px;
}
```

---

### **NOTES**

- **No wrapping:** All toggles on one line unless the screen is very narrow.
- **Visual alignment:** The toggles now line up and match your other controls.
- **Responsive:** If the window is very narrow, toggles wrap as needed.

---

**Apply this code and you’ll have the cleanest possible toggle bar for your popup!**
Let me know if you want the toggles even smaller or want to add icons/extra flair.
