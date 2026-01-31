## 2024-05-24 - Custom Selection Lists & Keyboard Accessibility
**Learning:** Custom selection lists implemented with `div` elements and `onClick` handlers are invisible to keyboard users and lack semantic meaning for screen readers. Using `button` elements with `role="radio"` (inside a `radiogroup`) instantly fixes tab navigation and key activation without complex custom event handling.
**Action:** When designing "card-like" selection interfaces, always base them on `<button>` elements or `<input type="radio">` rather than generic `<div>`s, ensuring native focus and interaction support.
