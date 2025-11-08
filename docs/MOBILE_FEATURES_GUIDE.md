# Mobile Features Guide

## Overview

This guide explains how to use the new mobile-optimized features in AMD Pro, your field service management PWA.

## Installing the App

### On Android
1. Open the app in Chrome
2. Tap the banner "Install AMD Pro" or
3. Tap the menu (⋮) → "Add to Home screen"
4. Confirm installation
5. App icon appears on your home screen

### On iOS
1. Open the app in Safari
2. Tap the Share button (□↑)
3. Scroll and tap "Add to Home Screen"
4. Name it "AMD Pro" and tap "Add"
5. App icon appears on your home screen

## Mobile Navigation

### Bottom Navigation Bar
The app features a thumb-friendly bottom navigation bar with 5 main sections:
- **Home**: Dashboard overview
- **Tour**: Today's job schedule
- **Parts**: Parts inventory and search
- **Analytics**: Business metrics
- **More**: Additional settings and options

The bottom nav is only visible on mobile devices (hidden on desktop).

## Job Management

### Swipeable Job Cards
On the Tour page, job cards support swipe gestures:

- **Swipe Right → Navigate**: Opens Maps with directions to the job
- **Swipe Left → Call**: Dials the customer's phone number

You can also tap the action buttons at the bottom of each card.

### Pull to Refresh
On list pages (jobs, customers, parts):
1. Pull down from the top of the screen
2. Hold until the refresh icon appears
3. Release to refresh the data

## Device Features

### Camera Integration
To add photos to a job:
1. Open the job details
2. Tap "Take Photo"
3. Grant camera permission (first time only)
4. Take the photo
5. Photo is attached to the job

**Note**: Photos taken offline are queued and uploaded when you're back online.

### Phone Dialer
To call a customer:
1. Tap the "Call" button on any job card, or
2. Swipe left on a job card, or
3. Tap the phone number in job/customer details

The phone dialer opens automatically with the number.

### GPS Navigation
To navigate to a job:
1. Tap the "Navigate" button on any job card, or
2. Swipe right on a job card, or
3. Tap the address in job details

The app will open:
- **Apple Maps** on iOS devices
- **Google Maps** on Android/other devices

## Offline Mode

### How It Works
AMD Pro caches your data so you can work without internet:
- View jobs, customers, and parts
- Create new jobs and time entries
- Take photos
- Add notes

All changes are saved locally and sync automatically when you're back online.

### Offline Indicator
When you go offline:
- An orange banner appears at the top: "You're offline. Changes will sync when connected."
- The banner disappears when you're back online
- A green banner briefly confirms: "Back online"

### What's Cached
- All viewed job data
- Customer information
- Parts inventory
- Recent photos
- App interface and styles

### Manual Sync
If sync doesn't happen automatically:
1. Make sure you have an internet connection
2. Pull down to refresh on any list page
3. Or reopen the app

## Touch-Optimized Interface

### Touch Targets
All interactive elements are at least 44×44 pixels (Apple's recommended minimum):
- Buttons
- Links
- Form fields
- Navigation items

### Active States
Interactive elements provide visual feedback:
- Buttons scale slightly when pressed
- Links highlight on touch
- Swipe actions show background colors

## Safety Features

### Safe Area Support
The app respects device safe areas:
- Notch/camera cutout avoidance
- Home indicator spacing on iOS
- Status bar clearance

### Zoom Prevention
Input fields are sized to prevent unwanted zooming on iOS (minimum 16px font size).

### Pull-to-Refresh Override
Native browser pull-to-refresh is disabled to prevent conflicts with the app's own refresh feature.

## Tips & Tricks

### Quick Actions (Android)
On Android, long-press the app icon for quick shortcuts:
- Today's Jobs
- New Job
- Parts Search

### Haptic Feedback
On supported devices, you'll feel a subtle vibration when:
- Making a phone call
- Important actions complete

### Battery Saving
To conserve battery in the field:
1. Enable "Low Power Mode" on iOS
2. Enable "Battery Saver" on Android
3. The app continues to work with reduced animations

### Background Sync
If you make changes offline and close the app:
1. Changes are saved locally
2. They sync automatically next time you open the app
3. Or when your device reconnects to internet (if app is open)

## Troubleshooting

### App Won't Install
- **iOS**: Use Safari browser (not Chrome)
- **Android**: Use Chrome browser
- Clear browser cache and try again
- Make sure you have storage space

### Camera Not Working
1. Check camera permissions in device settings
2. Grant camera access to AMD Pro
3. Try closing and reopening the app
4. Restart your device if issue persists

### Data Not Syncing
1. Check internet connection
2. Open the app (must be in foreground)
3. Pull down to refresh
4. Wait a few seconds for sync to complete

### Offline Mode Not Working
1. Open the app while online first
2. Visit the pages you need (to cache them)
3. Service worker needs HTTPS to work
4. Check service worker in Chrome DevTools

### Bottom Nav Not Showing
- Bottom nav is mobile-only (screen width < 768px)
- On desktop, use the sidebar navigation instead
- Try portrait orientation on tablets

## Privacy & Data

### What's Stored Locally
- Jobs you've viewed
- Customer information
- Parts data
- Photos (until uploaded)
- App cache (HTML, CSS, JS)

### Clearing Local Data
To clear cached data:
1. Open device settings
2. Find AMD Pro (or browser if not installed)
3. Clear storage/data
4. Reopen app to re-download

**Warning**: Unsynced changes will be lost!

### Data Usage
- Initial app load: ~150 KB
- Cached for offline: ~1-2 MB
- Photos: Variable (compressed automatically)

## Best Practices

### At Start of Day
1. Open app while on WiFi
2. Let all jobs sync/cache
3. Verify today's tour loaded
4. Check parts inventory updated

### During Field Work
1. Add photos immediately after work
2. Complete time entries right away
3. Update job status as you go
4. Add notes while details are fresh

### End of Day
1. Connect to WiFi
2. Open app to sync all changes
3. Verify all photos uploaded
4. Check tomorrow's schedule

## Getting Help

### In-App Support
- Tap "More" → "Help & Support"
- Access user guides
- Submit feedback

### Technical Issues
- Email: support@amdpro.com
- Phone: 1-800-AMD-PRO1
- Hours: 24/7 for emergencies

---

**Need more help?** Check out our video tutorials at [amdpro.com/mobile-guide](https://amdpro.com/mobile-guide)
