## 2026-02-05 - Permission Creep in Firestore Rules
**Vulnerability:** Found `allow update` rules in `firestore.rules` that granted full document update permissions to authenticated users for `timeEntries` and `serviceIntervals`.
**Learning:** Using `isAuthenticated()` alone for update operations allows users to modify *any* field in the document (including critical ones like `hours` or `hourInterval`), not just the intended fields.
**Prevention:** Always restrict update operations using `request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])` to limit the scope of changes, even for trusted roles like employees.
