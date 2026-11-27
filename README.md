# MediCore – ECG Loading System

A unified ECG heartbeat animation system for MediCore, designed to provide consistent, recognizable loading feedback across the healthcare management platform.

## Overview

The MediCore ECG Loading System uses a medical-monitor-inspired heartbeat animation as the application's standard loading indicator.

It provides visual feedback during application startup, authentication, data retrieval, form submissions, medical record operations, AI processing and other asynchronous activities.

The system is designed to maintain a consistent healthcare-oriented visual identity while keeping the interface responsive and accessible.

## Design Identity

| Property | Value |
|---|---|
| Product | MediCore |
| Feature | ECG Universal Loading System |
| Primary colour | `#0878D1` |
| Secondary colour | `#123B63` |
| Background | `#FFFFFF` |
| Animation style | ECG heartbeat waveform |
| Design approach | Minimal, professional, accessible |

## Features

- Animated ECG heartbeat waveform.
- Reusable loading components.
- Full-screen and inline loading indicators.
- Button-level loading feedback.
- Splash screen animation.
- Context-specific loading messages.
- Consistent loading experience across application modules.
- Lifecycle-aware animation handling.
- Error and retry states.
- Responsive Android layouts.
- Reduced-motion accessibility support.

## Component Architecture

```text
MediCore
└── core
    └── ui
        └── loading
            ├── MediCoreECGLoader.kt
            ├── MediCoreFullScreenLoader.kt
            ├── MediCoreInlineLoader.kt
            ├── MediCoreButtonLoader.kt
            ├── MediCorePageLoader.kt
            ├── MediCoreSplashLoader.kt
            └── LoadingState.kt
```

The components should share a common ECG animation implementation to avoid inconsistent behaviour across screens.

## Loading States

| State | Behaviour |
|---|---|
| Idle | No loading indicator |
| Loading | ECG animation displayed |
| Success | Loading indicator removed |
| Error | Error message and retry action |

## Application Coverage

The loading system can be used across:

- Application startup and splash screen
- Login and registration
- User profile and hospital selection
- Dashboards
- Patient management
- Doctor management
- Appointment management
- Electronic health records
- Prescriptions
- Laboratory management
- Pharmacy and inventory
- Billing and payments
- AI assistant and report generation
- Notifications and settings
- File uploads and downloads

## Loading Duration Policy

The initial splash experience may use a configurable minimum display duration of 3 seconds.

Normal application operations must not use artificial loading delays.

The ECG animation should:

1. Start when an actual operation begins.
2. Remain visible while the operation is processing.
3. Disappear when the operation completes.
4. Display an appropriate error state if the operation fails.

This avoids unnecessary waiting during everyday hospital workflows.

## Loading Messages

Examples of context-aware messages:

| Operation | Message |
|---|---|
| Application startup | Preparing MediCore... |
| Authentication | Verifying your account... |
| Dashboard | Loading your dashboard... |
| Patient records | Fetching patient records... |
| Appointments | Checking appointment availability... |
| Medical records | Loading clinical information... |
| AI processing | Generating medical report... |
| Synchronization | Synchronizing hospital data... |

## Technology Stack

### Android
- Kotlin
- Jetpack Compose
- Compose Canvas and animation APIs
- Kotlin Coroutines
- MVVM architecture
- Lifecycle-aware state collection

### Website (if implemented)
- React or Next.js
- CSS animations or SVG
- Reusable loading components

## Implementation Guidelines

- Keep the ECG animation reusable.
- Avoid unnecessary recomposition.
- Do not block the main thread.
- Use lifecycle-aware loading states.
- Prevent duplicate loading indicators.
- Preserve user input during failed requests.
- Respect accessibility and reduced-motion preferences.
- Do not display false success messages.
- Do not expose sensitive medical information in loading messages.

## Error Handling

The loading system must handle:

- Network disconnection
- Server errors
- Request timeouts
- Invalid API responses
- Expired authentication sessions
- Permission failures

Provide clear error messages and retry functionality wherever appropriate.

## Quality Requirements

- Consistent visual appearance.
- Smooth animation.
- Responsive layouts.
- No unnecessary API delays.
- No frozen interface.
- Proper loading-state cleanup.
- Compatibility with existing backend integration.

## Project Objective

The MediCore ECG Loading System establishes a consistent medical-themed loading experience throughout the platform.

Its purpose is to improve interface feedback, reinforce product identity and maintain a professional user experience during asynchronous operations.

---

**MediCore**  
*Hospital & Medical Management System*
