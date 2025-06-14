# Project Context Documentation

## Project Overview

This is a maintenance management application built with React, TypeScript, and Firebase. It helps companies manage lawn maintenance tasks, equipment tracking, and employee time registration.

## Key Technologies

- Frontend: React + TypeScript + Vite
- State Management: Zustand
- UI Components: shadcn/ui + Radix UI
- Database: Firebase (Firestore)
- Authentication: Firebase Auth
- Styling: Tailwind CSS
- Icons: Lucide React
- Forms: React Hook Form + Zod
- Routing: React Router
- PWA: vite-plugin-pwa

## PWA Configuration

### PWA Setup (vite.config.ts)
The application is configured as a Progressive Web App using `vite-plugin-pwa`:

```typescript
VitePWA({
  registerType: 'autoUpdate',
  injectRegister: 'auto',
  includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'vite.svg'],
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    runtimeCaching: [
      {
        urlPattern: /^https?:\/\/firestore\.googleapis\.com/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'firestore-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
          cacheableResponse: {
            statuses: [200],
          },
        },
      },
    ],
  },
  manifest: {
    name: 'PlenPilot',
    short_name: 'PlenPilot',
    description: 'A maintenance management application for lawn care.',
    theme_color: '#22c55e',
    background_color: '#f8fafc',
    display: 'standalone',
    scope: '/Lawncare/',
    start_url: '/Lawncare/',
    orientation: 'portrait-primary',
    lang: 'no',
    icons: [/* various icon sizes */]
  }
})
```

### PWA Update Management (src/components/PwaUpdater.tsx)
- Uses the official `virtual:pwa-register/react` hook
- Provides user-friendly update notifications
- Handles automatic service worker registration
- Shows update prompts when new versions are available

### Caching Strategy
- **NetworkFirst** strategy for Firestore API calls
- Automatic cache management with 30-day expiration
- Caches up to 50 entries for offline functionality
- Only caches successful responses (status 200)

### Dependencies
- `vite-plugin-pwa`: Development dependency for PWA functionality
- Removed manual service worker registration from `main.tsx`
- Automatic service worker injection and registration

## Directory Structure ##

```
src/
├── components/     # UI Components
│   ├── layouts/   # Layout components
│   │   ├── AdminLayout.tsx
│   │   └── EmployeeLayout.tsx
│   ├── ui/        # shadcn/ui components
│   ├── admin/     # Admin-specific components
│   │   ├── equipment/
│   │   │   ├── AddIntervalDialog.tsx
│   │   │   ├── AddMowerDialog.tsx
│   │   │   ├── EquipmentStatsCards.tsx
│   │   │   ├── MowerCard.tsx
│   │   │   └── MowerList.tsx
│   │   └── operations/
│   │       ├── LocationListTable.tsx
│   │       ├── LocationMobileCards.tsx
│   │       ├── OperationsFilters.tsx
│   │       ├── OperationsHeader.tsx
│   │       └── OperationsStatsCards.tsx
│   ├── notifications/ # Notification components
│   │   ├── NotificationBell.tsx
│   │   └── TimeEntryDialog.tsx
│   └── PwaUpdater.tsx # PWA update management
├── contexts/      # React Context providers
│   └── AuthContext.tsx
├── hooks/         # Custom React hooks
│   ├── use-toast.ts
│   └── useFirebaseMessaging.ts
├── lib/           # Utility functions
│   └── utils.ts
├── pages/         # Page components
│   ├── admin/     # Admin pages
│   │   ├── Archive.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Employees.tsx
│   │   ├── Equipment.tsx
│   │   ├── Locations.tsx
│   │   ├── Operations.tsx
│   │   └── Settings.tsx
│   ├── employee/  # Employee pages
│   │   ├── time-entry/  # Time entry components (refactored)
│   │   │   ├── EmployeeSelector.tsx
│   │   │   ├── LocationSelector.tsx
│   │   │   ├── TimeEntryHeader.tsx
│   │   │   ├── TimeEntryHoursInput.tsx
│   │   │   ├── TimeEntryEdgeCutting.tsx
│   │   │   ├── TimeEntryEquipment.tsx
│   │   │   ├── TimeEntryNotes.tsx
│   │   │   ├── TimeEntrySubmitButton.tsx
│   │   │   ├── TimeEntryCompletedState.tsx
│   │   │   └── index.ts
│   │   ├── Dashboard.tsx
│   │   ├── History.tsx
│   │   └── TimeEntry.tsx
│   ├── auth/      # Authentication pages
│   │   └── LoginPage.tsx
│   └── NotFoundPage.tsx
├── routes/        # Routing logic
│   ├── AdminRoute.tsx
│   ├── AppRoutes.tsx
│   └── ProtectedRoute.tsx
├── services/      # Firebase service layer
│   ├── adminService.ts
│   ├── authService.ts
│   ├── equipmentService.ts
│   ├── firebase.ts
│   ├── locationService.ts
│   ├── notificationService.ts
│   ├── seasonSettingsService.ts
│   ├── timeEntryService.ts
│   └── userService.ts
├── store/         # Zustand state management
│   ├── equipmentStore.ts
│   ├── index.ts
│   ├── locationStore.ts
│   ├── notificationStore.ts
│   ├── settingsStore.ts
│   ├── timeEntryStore.ts
│   └── userStore.ts
├── types/         # TypeScript type definitions
│   └── index.ts
├── App.tsx        # Main App component
├── main.tsx       # Application entry point
├── index.css      # Global styles
└── sw.js          # Service Worker
```

## State Management (Zustand Stores)

### locationStore.ts
```typescript
interface LocationState {
  locations: Location[];
  loading: boolean;
  error: string | null;
  
  // Real-time updates
  initRealtimeUpdates: () => void;
  cleanup: () => void;
  
  // CRUD operations
  fetchLocations: () => Promise<void>;
  addLocation: (data: LocationData) => Promise<string>;
  updateLocation: (id: string, data: Partial<Location>) => Promise<void>;
  archiveLocation: (id: string) => Promise<void>;
  restoreLocation: (id: string) => Promise<void>;
  
  // Status tracking
  getLocationsDueForService: () => Promise<Location[]>;
  getLocationsWithWeeklyStatus: (week: number) => Promise<LocationWithStatus[]>;
  
  // Selectors
  getActiveLocations: () => Location[];
  getArchivedLocations: () => Location[];
}
```

### equipmentStore.ts
```typescript
interface EquipmentState {
  mowers: Mower[];
  loading: boolean;
  error: string | null;
  
  // CRUD operations
  fetchMowers: () => Promise<void>;
  addMower: (data: MowerData) => Promise<string>;
  updateMowerDetails: (id: string, data: Partial<Mower>) => Promise<void>;
  deleteMower: (id: string) => Promise<void>;
  
  // Service tracking
  logMowerUsage: (id: string, hours: number) => Promise<void>;
  resetServiceInterval: (mowerId: string, intervalId: string, userId: string) => Promise<void>;
  addServiceInterval: (mowerId: string, data: ServiceIntervalData) => Promise<void>;
  deleteServiceInterval: (mowerId: string, intervalId: string) => Promise<void>;
  
  // Selectors
  getMowersNeedingService: () => Mower[];
}
```

### timeEntryStore.ts
```typescript
interface TimeEntryState {
  timeEntries: TimeEntry[];
  loading: boolean;
  error: string | null;
  
  // Time entry operations
  addTimeEntry: (data: TimeEntryData) => Promise<string>;
  getTimeEntriesForLocation: (locationId: string, week?: number) => Promise<TimeEntry[]>;
  getTimeEntriesForEmployee: (employeeId: string, start?: Date, end?: Date) => Promise<TimeEntry[]>;
  
  // Reports and aggregation
  getWeeklyAggregatedHoursByEmployee: () => Promise<Record<string, number>>;
  getRecentTimeEntries: (count?: number) => Promise<TimeEntry[]>;
  
  // Employee tagging
  tagEmployeeForTimeEntry: (entryId: string, employeeId: string) => Promise<void>;
  getPendingTimeEntriesForEmployee: (employeeId: string) => Promise<TimeEntry[]>;
}
```

### userStore.ts
```typescript
interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
  
  // User operations
  fetchUsers: () => Promise<void>;
  addEmployee: (data: EmployeeData) => Promise<string>;
  getUserById: (id: string) => Promise<User | null>;
  getUsersByIds: (ids: string[]) => Promise<User[]>;
  
  // Selectors
  getEmployees: () => User[];
  getAdmins: () => User[];
}
```

### notificationStore.ts
```typescript
interface NotificationState {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  
  // Notification operations
  fetchUnreadNotifications: (userId: string) => Promise<void>;
  addNotification: (data: NotificationData) => Promise<string>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
}
```

### settingsStore.ts
```typescript
interface SettingsState {
  seasonSettings: SeasonSettings | null;
  loading: boolean;
  error: string | null;
  
  // Settings operations
  fetchSeasonSettings: () => Promise<void>;
  updateSeasonSettings: (settings: Partial<SeasonSettings>) => Promise<void>;
}
```

## Firebase Services

### locationService.ts
- Location CRUD operations with transaction support
- Real-time location status updates
- Weekly maintenance status calculation
- Location archiving with automatic cleanup

### equipmentService.ts
- Equipment management with usage tracking
- Service interval management with history
- Maintenance logging with user attribution
- Equipment deletion with related data cleanup

### timeEntryService.ts
- Time entry creation with transaction support
- Work completion tracking
- Multi-employee job coordination
- Aggregated time reports

### userService.ts
- User management and role assignment
- Employee data management
- Bulk user operations
- User lookup and filtering

### notificationService.ts
- Real-time notification delivery
- Read status tracking
- Notification querying and filtering
- Bulk notification operations

### seasonSettingsService.ts
- Season configuration management
- Global settings coordination
- Year-based settings versioning

## Authentication & Authorization

### AuthContext (contexts/AuthContext.tsx)
```typescript
interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}
```

Features:
- Email/password authentication
- Role-based access control
- Protected route handling
- Real-time auth state monitoring

## Key Features

### Location Management
- Add/edit locations with validation
- Track maintenance schedules
- Monitor completion status
- Archive inactive locations
- Real-time status updates

### Equipment Management
- Track equipment usage hours
- Monitor service intervals
- Log maintenance history
- Service notifications
- Usage reporting

### Time Tracking
- Employee time registration
- Multi-employee job coordination
- Work completion verification
- Time aggregation reports
- Historical time logs

### Notification System
- Real-time notifications
- Job tagging notifications
- Service due alerts
- Read status tracking
- Bulk operations

## Component Architecture

### Time Entry Components (Refactored)
The time entry functionality has been refactored into smaller, focused components:

- **TimeEntryHeader.tsx** - Page title, week number, and date display
- **TimeEntryHoursInput.tsx** - Hours input with quick-select buttons
- **TimeEntryEdgeCutting.tsx** - Edge cutting toggle and status
- **TimeEntryEquipment.tsx** - Collapsible equipment selection
- **TimeEntryNotes.tsx** - Collapsible notes section
- **TimeEntrySubmitButton.tsx** - Submit button with loading states
- **TimeEntryCompletedState.tsx** - "All tasks completed" display
- **EmployeeSelector.tsx** - Team member selection (enhanced with React.memo)
- **LocationSelector.tsx** - Location selection (enhanced with React.memo)

### Performance Optimizations
- **React.memo** - Prevents unnecessary re-renders of components
- **useCallback** - Memoizes event handlers to prevent child re-renders
- **Component splitting** - Smaller components load faster and are easier to optimize
- **Lazy loading** - Components can be loaded on-demand

## Error Handling

### Transaction Support
- Atomic operations for related updates
- Automatic rollback on failure
- Data consistency guarantees
- Error state management

### Optimistic Updates
- Immediate UI feedback
- Background synchronization
- Automatic state rollback
- Loading state handling

## Type Safety

### Core Types (types/index.ts)
```typescript
interface Location {
  id: string;
  name: string;
  address: string;
  maintenanceFrequency: number;
  edgeCuttingFrequency: number;
  startWeek: number;
  notes: string;
  lastMaintenanceWeek?: number;
  lastEdgeCuttingWeek?: number;
  isArchived: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface TimeEntry {
  id: string;
  locationId: string;
  employeeId: string;
  date: Timestamp;
  hours: number;
  edgeCuttingDone: boolean;
  mowerId?: string;
  notes?: string;
  taggedEmployeeIds?: string[];
  createdAt: Timestamp;
}

interface Mower {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  totalHours: number;
  serviceIntervals?: ServiceInterval[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  createdAt: Timestamp;
}
```

## Utility Functions (lib/utils.ts)

### Date Utilities
```typescript
getISOWeekNumber(date: Date): number
getISOWeekDates(weekNumber: number): { start: Date; end: Date }
formatDateToShortLocale(date: Date): string
```

### Styling Utilities
```typescript
cn(...inputs: ClassValue[]): string  // Tailwind class merging
```

## File Locations Quick Reference

### Core Configuration
- Firebase config: `src/services/firebase.ts`
- Routes: `src/routes/AppRoutes.tsx`
- Types: `src/types/index.ts`
- Utils: `src/lib/utils.ts`
- PWA Config: `vite.config.ts`
- PWA Updater: `src/components/PwaUpdater.tsx`

### State Management
- Stores: `src/store/`
- Context: `src/contexts/`

### UI Components
- Layouts: `src/components/layouts/`
- UI Components: `src/components/ui/`
- Admin Components: `src/components/admin/`
- Pages: `src/pages/`
- Time Entry Components: `src/pages/employee/time-entry/`

### Business Logic
- Services: `src/services/`
- Hooks: `src/hooks/`

### Recent Refactoring
The TimeEntry page has been refactored from a single large component (~500+ lines) into multiple smaller, focused components (~50-100 lines each). This improves:
- **Maintainability** - Easier to find and modify specific functionality
- **Performance** - Better memoization and reduced re-renders
- **Reusability** - Components can be reused in other parts of the app
- **Testing** - Smaller components are easier to test in isolation
- **Development** - Faster hot module replacement and debugging