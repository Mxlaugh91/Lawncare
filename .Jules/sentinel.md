## 2025-02-18 - Zod URL Validation Vulnerability
**Vulnerability:** Zod's `z.string().url()` validation accepts `javascript:` protocol URLs, which can lead to Stored Cross-Site Scripting (XSS) if the URL is rendered in an `href` or `src` attribute.
**Learning:** Standard library validators often strictly follow specs (like WHATWG URL) which may be too permissive for security contexts. "Valid URL" != "Safe URL".
**Prevention:** Always use `.refine()` to explicitly allow only `http:` and `https:` protocols when validating user-provided URLs.
