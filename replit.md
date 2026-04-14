# ServiceHub - Service Status & Support Platform

## Overview
ServiceHub is a comprehensive Progressive Web App (PWA) designed to provide a centralized platform for service status monitoring and customer support. It enables customers to track service health, receive real-time alerts, access news updates, and submit support tickets with integrated real-time messaging. For administrators, the platform offers extensive control over users, services, alerts, and news content. The project aims to deliver a native app-like experience through PWA capabilities, ensuring accessibility and engagement across devices. Key capabilities include real-time service status, push notifications, an integrated support ticketing system, and comprehensive admin tools.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
When the user says "change the version to...", update the version string in `client/src/pages/settings-page.tsx`, `client/src/components/app-sidebar.tsx`, and `client/src/components/bottom-nav.tsx` without further explanation.

## System Architecture
ServiceHub is built with a modern web stack, emphasizing PWA capabilities and real-time communication, designed for a responsive and engaging user experience across all devices.

### UI/UX Decisions
The frontend uses React with Vite, TailwindCSS, and Shadcn UI for a modern aesthetic, featuring system/light/dark theme modes and mobile-responsive design. Navigation includes a fixed bottom bar for mobile and a sticky header. Page transitions are animated based on route depth. Haptic feedback is integrated for interactive elements. Loading states use content-shaped skeletons, and images are lazy-loaded with shimmer placeholders.

### Technical Implementations
- **Frontend**: React, Vite, TailwindCSS, Shadcn UI, Wouter.
- **Backend**: Express.js, secured with session-based authentication using scrypt.
- **Database**: PostgreSQL, managed via Drizzle ORM.
- **Real-time Communication**: WebSockets for messaging and admin chat.
- **File Management**: Multer for file uploads, storing data as base64 in PostgreSQL.
- **PWA Features**: Service Worker and Web App Manifest for installability, offline support, push notifications, and app badge management.
- **Push Notifications**: Web Push API with VAPID for service alerts and ticket updates.

### Feature Specifications
- **Authentication & Authorization**: Local username/password authentication with granular, role-based admin permissions.
- **Service Monitoring**: Comprehensive service status tracking with automated alerts and consolidated notifications. Includes URL monitoring with various check types, incident tracking, and admin management.
- **Support Ticketing**: Category-based system with real-time messaging, ticket transfer, typing indicators, and email/push notifications. Includes optimistic message sending and smart auto-scroll.
- **Admin Communications**: Real-time admin chat with threads, file attachments, and broadcast priority alerts.
- **Customer Engagement**: News stories with rich text editing (TipTap) supporting bold, italic, underline, text color, alignment, and inline images; customer message center for two-way threaded communication with admins.
- **Unified Notification Center**: In-app notification system with a bell icon, unread badges, and distinct notification types for various events.
- **User Onboarding**: Setup reminders for push notifications and service configuration.
- **Password Reset**: Self-service forgot password flow via email.
- **Admin Activity Logs**: Comprehensive logging of major system events with permission-based viewing.
- **Downloads**: Admin-managed downloadable content for customers.
- **Email Template Protection**: Prevents overwriting of customized email templates during updates.

## External Dependencies
- **Database**: PostgreSQL
- **Email Service**: SendGrid
- **Web Push API**: VAPID