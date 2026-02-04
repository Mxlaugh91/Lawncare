## 2024-05-22 - Unused Permissive Firestore Rule
**Vulnerability:** A Firestore rule allowed users tagged in a time entry to update the entire document, including sensitive fields like hours and employee ID.
**Learning:** Feature ideas (like "marking as complete") left in rules but implemented differently in code can leave dormant high-severity vulnerabilities.
**Prevention:** Verify that every permissive rule in `firestore.rules` has a corresponding and necessary usage in the application code. Remove unused rules immediately.
