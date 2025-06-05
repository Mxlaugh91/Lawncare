# Project Context Documentation

## Project Overview

This is a maintenance management application built with React, TypeScript, and Firebase. It helps companies manage maintenance tasks, equipment, and employee time tracking.

## Key Technologies

- Frontend: React + TypeScript + Vite
- State Management: Zustand
- UI Components: shadcn/ui
- Database: Firebase (Firestore)
- Authentication: Firebase Auth
- Styling: Tailwind CSS

## Directory Structure

```
src/
├── components/     # UI Components
├── contexts/      # React Context providers
├── hooks/         # Custom React hooks
├── pages/         # Page components
├── routes/        # Routing logic
├── services/      # Firebase service layer
├── store/         # Zustand state management
└── types/         # TypeScript type definitions
```

## State Management (Zustand Stores)

All stores are located in `src/store/`:

### locationStore.ts
- Manages location data with real-time updates
- Handles CRUD operations with optimistic updates
- Provides location filtering and status tracking

### equipmentStore.ts  
- Manages equipment (mowers) data
- Handles service intervals and maintenance tracking
- Provides equipment status and filtering

### timeEntryStore.ts
- Manages time entries and work logs
- Handles employee time tracking
- Provides aggregated reports and statistics

### userStore.ts
- Manages user data and roles
- Handles employee management
- Provides user filtering and lookup

### notificationStore.ts
- Manages notifications
- Handles read/unread status
- Provides notification filtering

### settingsStore.ts
- Manages system settings
- Handles season configuration
- Provides global settings access

## Firebase Services

Located in `src/services/`:

### firebase.ts
- Firebase initialization and configuration
- Core Firebase service exports

### locationService.ts
- Location CRUD operations
- Location status management
- Weekly maintenance tracking

### equipmentService.ts  
- Equipment CRUD operations
- Service interval management
- Usage tracking

### timeEntryService.ts
- Time entry creation
- Work log management  
- Report generation

### userService.ts
- User management
- Role-based access control
- User lookup services

### notificationService.ts
- Notification creation
- Read status management
- Notification queries

### seasonSettingsService.ts
- Season configuration
- Global settings management

## Authentication & Authorization

Handled by `src/contexts/AuthContext.tsx`:
- User authentication state
- Role-based access control
- Protected route handling

## Key Features

### Location Management
- Add/edit/archive locations
- Track maintenance status
- Weekly scheduling

### Equipment Management  
- Track equipment usage
- Service interval monitoring
- Maintenance logging

### Time Tracking
- Employee time entries
- Work completion tracking
- Multi-employee job tagging

### Reporting
- Weekly status reports
- Equipment maintenance reports
- Employee time summaries

## Real-time Updates

Implemented using Firebase onSnapshot:
- Location status updates
- Equipment status changes
- New time entries
- Notification delivery

## Optimistic Updates

Implemented in store actions:
- Immediate UI updates
- Background sync with Firebase
- Automatic rollback on errors

## Error Handling

Consistent error handling pattern:
- Try/catch blocks in services
- Error state in stores
- User-friendly error messages
- Automatic state rollback

## Type Safety

Strong TypeScript typing:
- Shared type definitions in `src/types/`
- Type-safe store actions
- Typed service layer
- Component prop types

## File Locations Quick Reference

### Core Configuration
- Firebase config: `src/services/firebase.ts`
- Routes: `src/routes/AppRoutes.tsx`
- Types: `src/types/index.ts`

### State Management
- Stores: `src/store/`
- Context: `src/contexts/`

### UI Components
- Layouts: `src/components/layouts/`
- UI Components: `src/components/ui/`
- Pages: `src/pages/`

### Business Logic
- Services: `src/services/`
- Utilities: `src/lib/utils.ts`