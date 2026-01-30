## 2026-01-30 - Stored XSS via Zod URL Validation
**Vulnerability:** Found that `z.string().url()` validation accepts `javascript:` protocol URLs, allowing Stored XSS in `googleEarthLink` (via `window.open`) and potentially `imageUrl` (though modern browsers block script execution in `img` src, it's still bad practice).
**Learning:** Standard library URL validators (like the `URL` constructor used by Zod) focus on parsing validity rather than security. `javascript:alert(1)` is a valid URL syntactically but dangerous.
**Prevention:** Always explicitly validate protocol schemes (e.g. `http://` or `https://`) when accepting URLs that might be rendered or opened by users. Use `.refine()` in Zod to enforce this.
