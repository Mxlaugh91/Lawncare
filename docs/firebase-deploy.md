# Firebase deployment (Firestore rules + Cloud Functions)

This document describes the reproducible manual deploy path for the Firestore
security rules and the Cloud Functions.

GitHub Actions only publishes the web app (GitHub Pages). It has no Firebase
credentials, so `firestore.rules` and the Cloud Functions are deployed manually
from a workstation by a project owner.

- Firebase project: `xxgress-1ab4f` (configured in `.firebaserc`)
- Rules file: `firestore.rules` (configured in `firebase.json`)
- Functions source: `functions/` (configured in `firebase.json`)

## Prerequisites

- Node.js 20 (the Cloud Functions runtime configured in `functions/package.json`)
- Firebase CLI: `npm install -g firebase-tools` (or use `npx firebase-tools`)
- Access to the `xxgress-1ab4f` Firebase project

## Install dependencies

Web app (repository root):

```sh
corepack pnpm install
```

Cloud Functions (standalone package with its own `package.json`):

```sh
corepack pnpm install --dir functions
# or: cd functions && corepack pnpm install
```

With npm instead of pnpm:

```sh
npm --prefix functions install
```

## Login and project selection

```sh
firebase login
firebase use xxgress-1ab4f   # optional; .firebaserc already sets the default project
```

## Deploy

Deploy only the Firestore security rules:

```sh
firebase deploy --only firestore:rules
```

Deploy only the Cloud Functions (the `predeploy` hook compiles `functions/src`
to `functions/lib` first):

```sh
firebase deploy --only functions
```

Deploy both together:

```sh
firebase deploy --only firestore:rules,functions
```

`firebase.json` intentionally has no `hosting` section, so `firebase deploy`
never touches the web app: hosting is handled by the GitHub Pages workflow.

The functions `predeploy` hook runs
`npm --prefix "$RESOURCE_DIR" run build`, which runs `tsc` using
`functions/tsconfig.json` and writes the compiled JavaScript to `functions/lib`
(plus source maps). Install the functions dependencies before deploying.

## Verify the functions build locally

```sh
corepack pnpm --dir functions run typecheck
corepack pnpm --dir functions run build
```

## One-time migration: userDirectory backfill

The `syncUserDirectory` trigger mirrors `{ name, role, updatedAt }` from
`users/{userId}` into `userDirectory/{userId}` for every write that happens
after deployment. Users that existed before the deploy are not mirrored
automatically, so call the admin-only `backfillUserDirectory` callable once as
an authenticated admin (for example from a temporary admin action or an
authenticated script). It pages through the `users` collection and is
idempotent, so it is safe to run again.

```ts
import { getFunctions, httpsCallable } from 'firebase/functions';

const result = await httpsCallable(getFunctions(), 'backfillUserDirectory')();
console.log(result.data); // { success: true, usersSynced: <number> }
```

## CI behaviour

`.github/workflows/deploy.yml` runs `pnpm run lint`, `pnpm run typecheck` and
`pnpm exec vitest run` before the production build, then publishes `dist/` to
GitHub Pages. Firestore rules and Cloud Functions are deliberately NOT deployed
by CI because the workflow has no Firebase credentials.
