/**
 * NotificationService - Local Notifications
 * 
 * Uses the browser's Notification API to simulate iOS local notifications.
 * In a real iOS app, this would use UNUserNotificationCenter.
 * 
 * TO INTEGRATE REAL iOS NOTIFICATIONS:
 * ```swift
 * import UserNotifications
 * 
 * // Request permission
 * UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in }
 * 
 * // Schedule notification
 * let content = UNMutableNotificationContent()
 * content.title = "Reminder"
 * content.body = "Your reminder text"
 * let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: false)
 * let request = UNNotificationRequest(identifier: "reminder-id", content: content, trigger: trigger)
 * UNUserNotificationCenter.current().add(request)
 * ```
 */

export const NotificationService = {
  /** Check if notifications are supported */
  isSupported(): boolean {
    return 'Notification' in window;
  },

  /** Request permission to show notifications */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  },

  /** Check current permission status */
  getPermissionStatus(): string {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  },

  /** Schedule a notification (simplified for web) */
  scheduleNotification(title: string, body: string, dateTime: Date): number | null {
    const now = new Date();
    const delay = dateTime.getTime() - now.getTime();
    
    if (delay <= 0) {
      // Show immediately if time has passed
      this.showNotification(title, body);
      return null;
    }
    
    const timerId = window.setTimeout(() => {
      this.showNotification(title, body);
    }, delay);
    
    return timerId;
  },

  /** Show a notification immediately */
  showNotification(title: string, body: string): void {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      console.log(`[Notification] ${title}: ${body}`);
      return;
    }
    new Notification(title, {
      body,
      icon: '📋',
    });
  },

  /** Cancel a scheduled notification */
  cancelNotification(timerId: number): void {
    window.clearTimeout(timerId);
  },
};
