## 2026-02-07 - Insecure Firestore Update Rules
**Vulnerability:** The `serviceIntervals` collection allowed any authenticated user to update *any* field, including critical maintenance configuration like `description` and `hourInterval`.
**Learning:** `allow update: if isAuthenticated();` is a dangerous default for shared collections. Even if the UI only exposes certain fields, the database rule must enforce field-level restrictions using `request.resource.data.diff(resource.data).affectedKeys()`.
**Prevention:** Always use `affectedKeys().hasOnly([...])` when granting partial update access to non-admin users.
