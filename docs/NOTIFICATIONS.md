# Notifications System

A comprehensive, ADHD-friendly notifications system for the ADHD Dashboard.

## Features

### 🔔 Notification Types
- **Task Reminders** - Gentle reminders for upcoming tasks
- **Location Reminders** - Context-aware notifications when arriving at locations with tasks
- **Achievement Unlocked** - Celebrate earning achievements
- **Level Up** - Celebrate reaching new levels
- **Quest Completed** - Track daily quest progress
- **Streak at Risk** - Gentle warnings to maintain streaks
- **Daily Summary** - End-of-day productivity recap

### 🔔 UI Components
- **NotificationBell** - Bell icon with unread badge and animation
- **NotificationDropdown** - Full-featured dropdown with filtering
- **NotificationItem** - Individual notification display

### 🔌 Real-time Features
- Supabase Realtime subscriptions for instant updates
- Toast notifications for new alerts
- Push notifications via Service Worker
- Gentle sound effects (optional)

### 📱 PWA Support
- Service Worker for background notifications
- Push notification subscription API
- Offline notification queue

## API Routes

### `GET /api/notifications`
List user notifications with optional filtering:
- `?is_read=true|false` - Filter by read status
- `?type=task_reminder` - Filter by type
- `?limit=50` - Limit results
- `?offset=0` - Pagination offset

### `POST /api/notifications`
Create a new notification:
```json
{
  "type": "task_reminder",
  "title": "Task reminder",
  "message": "Your task is due soon",
  "data": { "task_id": "..." }
}
```

### `PATCH /api/notifications/[id]/read`
Mark a notification as read/unread:
```json
{ "is_read": true }
```

### `POST /api/notifications/clear`
Mark all notifications as read.

### `DELETE /api/notifications/clear`
Delete read notifications older than 7 days.

### `POST /api/notifications/subscribe`
Subscribe to push notifications (PWA).

## Hooks

### `useNotifications(userId?)`
Main hook for notification management:
```typescript
const {
  notifications,
  unreadCount,
  loading,
  markAsRead,
  markAllAsRead,
  clearReadNotifications,
  refreshNotifications,
  isSubscribed,
} = useNotifications(userId);
```

### `useLocationNotifications({ userId, currentLocation, enabled })`
Trigger location-based notifications:
```typescript
useLocationNotifications({
  userId,
  currentLocation,
  enabled: true,
});
```

### `usePushNotifications()`
Manage push notification subscriptions:
```typescript
const {
  isSupported,
  permission,
  isSubscribed,
  requestPermission,
  subscribe,
  unsubscribe,
  showLocalNotification,
} = usePushNotifications();
```

## Helper Functions

### Creating Notifications
```typescript
import { notifyLevelUp, notifyAchievementUnlocked } from '@/lib/notifications';

// Level up notification
await notifyLevelUp(5, 'Master');

// Achievement notification
await notifyAchievementUnlocked('Task Master', 'Complete 50 tasks');

// Location reminder
await notifyLocationReminder('St Thomas Aquinas', 3);

// Streak warning
await notifyStreakAtRisk('daily_tasks', 4, 1);
```

## Database Schema

### notifications table
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### push_subscriptions table
```sql
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT,
    auth TEXT,
    subscription_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);
```

## Integration Points

### Gamification System
- Level ups trigger `notifyLevelUp()`
- Achievements trigger `notifyAchievementUnlocked()`
- XP gains can trigger level up notifications

### Task Completion
- Task reminders use `notifyTaskReminder()`
- Streak warnings use `notifyStreakAtRisk()`

### Location System
- Location arrivals trigger `notifyLocationReminder()`
- Shows count of tasks at current location

## ADHD-Friendly Design

### Notification Principles
1. **Gentle but noticeable** - Soft sounds, not jarring
2. **Actionable** - Direct links to relevant actions
3. **Non-intrusive** - Quiet hours support
4. **Dopamine-positive** - Celebrations for achievements
5. **Context-aware** - Location-based suggestions

### Sound Design
- Short, pleasant tones
- Different sounds for different types
- Can be disabled in settings

### Visual Design
- Clear icons for each type
- Color coding (blue=info, green=success, red=warning)
- Smooth animations
- Readable in all lighting conditions

## Environment Variables

```env
# Push Notifications (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

## Testing

### Manual Testing Checklist
- [ ] Create test notification
- [ ] Mark notification as read
- [ ] Clear all notifications
- [ ] Test location reminder
- [ ] Test achievement notification
- [ ] Test level up notification
- [ ] Test push notification subscription
- [ ] Test service worker registration

### Browser DevTools
- Application > Service Workers - Check registration
- Application > Push - Test push notifications
- Network - Verify API calls
- Console - Check for errors

## Migration

Run migrations in order:
1. `20240213000001_add_notifications.sql`
2. `20240213000002_add_push_subscriptions.sql`

## Future Enhancements

- [ ] Smart notification timing (respect focus mode)
- [ ] AI-powered notification prioritization
- [ ] Weekly digest option
- [ ] Notification scheduling
- [ ] Custom notification sounds
- [ ] Notification analytics
