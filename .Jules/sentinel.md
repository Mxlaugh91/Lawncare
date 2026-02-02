## 2025-02-18 - Input Validation on Arrays and Strings
**Vulnerability:** Unbounded array inputs in Zod schemas (e.g., `z.array(z.string())`) can lead to DoS via write amplification (e.g., creating thousands of notifications from one request). Unbounded strings can cause storage or UI issues.
**Learning:** Always use `.max()` for arrays and strings in Zod schemas, especially for fields that trigger backend writes or are displayed in the UI.
**Prevention:** Review all Zod schemas for missing `.max()` constraints.
