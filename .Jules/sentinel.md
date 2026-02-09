## 2024-05-24 - Firestore Partial Update Permissions
**Vulnerability:** Permissive `allow update: if isAuthenticated()` rule on `serviceIntervals` collection allowing any user to modify critical business logic fields.
**Learning:** Firestore rules often start permissive for development but must be locked down. Also, restrictive rules on `users` collection inadvertently blocked functional requirements (FCM token updates).
**Prevention:** Always use `request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])` when allowing non-admin updates to restrict the scope of changes to specific fields.
