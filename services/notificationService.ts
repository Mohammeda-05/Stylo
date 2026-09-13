import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationSettings {
  styleEncouragement: boolean;
  weeklyReports: boolean;
  lastEncouragementSent?: number;
  lastWeeklyReportSent?: number;
}

class NotificationService {
  private pushToken: string | null = null;
  private isInitialized = false;
  private permissionStatus: string = 'undetermined';

  async initialize(): Promise<boolean> {
    try {
      
      // Check if we're on a physical device
      if (!Device.isDevice) {
        return false;
      }

      // Check current permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      this.permissionStatus = existingStatus;

      // If permissions are already granted, complete initialization
      if (existingStatus === 'granted') {
        await this.completeInitialization();
        return true;
      }

      // If permissions are denied, we can't initialize but service is "ready" to request
      if (existingStatus === 'denied') {
        this.isInitialized = true; // Mark as initialized so we can handle permission requests
        return false;
      }

      // For undetermined status, mark as initialized but don't request permissions yet
      // We'll request when user actually tries to enable notifications
      this.isInitialized = true;
      return false;

    } catch (error) {
      console.error("NotificationService: Failed to initialize:");
      return false;
    }
  }

  private async completeInitialization(): Promise<void> {
    try {
      // Get push token
      this.pushToken = await this.getPushToken();
      this.isInitialized = true;
    } catch (error) {
      console.error("NotificationService: Failed to complete initialization:");
      throw error;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      
      if (!Device.isDevice) {
        return false;
      }

      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      this.permissionStatus = status;

      if (status === 'granted') {
        await this.completeInitialization();
        return true;
      }

      return false;
    } catch (error) {
      console.error("NotificationService: Failed to request permissions:");
      return false;
    }
  }

  async getPermissionStatus(): Promise<string> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      this.permissionStatus = status;
      return status;
    } catch (error) {
      console.error("NotificationService: Failed to get permission status:");
      return 'undetermined';
    }
  }

  private async getPushToken(): Promise<string> {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      if (!projectId) {
        console.warn("NotificationService: No project ID found, using default configuration");
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      
      return tokenData.data;
    } catch (error) {
      console.error("NotificationService: Failed to get push token:");
      // Don't throw error, just log it and continue without push token
      // This allows the service to work for local notifications even if push token fails
      console.warn("NotificationService: Continuing without push token - local notifications will still work");
      return '';
    }
  }

  async scheduleStyleEncouragement(): Promise<boolean> {
    try {
      if (!this.canScheduleNotifications()) {
        return false;
      }

      // Cancel existing style encouragement notifications
      await this.cancelNotificationsByTag('style-encouragement');

      // Schedule new notification for 48 hours from now
      const secondsFromNow = 48 * 60 * 60; // 48 hours in seconds

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '✨ Style Tip Time!',
          body: this.getRandomStyleTip(),
          sound: 'default',
          data: { type: 'style-encouragement' },
        },
        trigger: { 
          seconds: secondsFromNow 
        } as Notifications.TimeIntervalTriggerInput,
        identifier: 'style-encouragement',
      });

      return true;
    } catch (error) {
      console.error("NotificationService: Failed to schedule style encouragement:");
      return false;
    }
  }

  async scheduleWeeklyReport(): Promise<boolean> {
    try {
      if (!this.canScheduleNotifications()) {
        return false;
      }

      // Cancel existing weekly report notifications
      await this.cancelNotificationsByTag('weekly-report');

      // Schedule for next Sunday at 9 AM
      const triggerDate = this.getNextSunday();
      const secondsFromNow = Math.floor((triggerDate.getTime() - Date.now()) / 1000);

      // Make sure we're scheduling for the future
      if (secondsFromNow <= 0) {
        triggerDate.setDate(triggerDate.getDate() + 7);
        const newSecondsFromNow = Math.floor((triggerDate.getTime() - Date.now()) / 1000);
        
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '📊 Your Weekly Style Report',
            body: 'See how your fashion game improved this week!',
            sound: 'default',
            data: { type: 'weekly-report' },
          },
          trigger: { 
            seconds: newSecondsFromNow 
          } as Notifications.TimeIntervalTriggerInput,
          identifier: 'weekly-report',
        });

      } else {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '📊 Your Weekly Style Report',
            body: 'See how your fashion game improved this week!',
            sound: 'default',
            data: { type: 'weekly-report' },
          },
          trigger: { 
            seconds: secondsFromNow 
          } as Notifications.TimeIntervalTriggerInput,
          identifier: 'weekly-report',
        });

      }

      return true;
    } catch (error) {
      console.error("NotificationService: Failed to schedule weekly report:");
      return false;
    }
  }

  private getNextSunday(): Date {
    const now = new Date();
    const nextSunday = new Date();
    
    // Calculate days until next Sunday (0 = Sunday)
    const daysUntilSunday = (7 - now.getDay()) % 7;
    const targetDate = daysUntilSunday === 0 ? 7 : daysUntilSunday; // If today is Sunday, schedule for next Sunday
    
    nextSunday.setDate(now.getDate() + targetDate);
    nextSunday.setHours(9, 0, 0, 0); // 9 AM
    
    return nextSunday;
  }

  private getRandomStyleTip(): string {
    const tips = [
      'Try mixing textures today - pair smooth silk with chunky knits!',
      'Confidence is your best accessory. Own your style choices!',
      'Experiment with color blocking - choose 2-3 bold colors that complement each other.',
      'A well-fitted basic is worth more than an ill-fitting designer piece.',
      'Don\'t forget the power of accessories - they can transform any outfit!',
      'Mix high and low pieces for an effortlessly chic look.',
      'When in doubt, add a statement piece to elevate your outfit.',
      'Remember: fashion fades, but style is eternal. Stay true to you!',
      'Try the rule of thirds - balance your outfit with different proportions.',
      'A pop of unexpected color can make your whole outfit come alive!',
    ];
    
    return tips[Math.floor(Math.random() * tips.length)];
  }

  async scheduleTestNotification(delaySeconds: number = 2): Promise<boolean> {
    try {
      if (!this.canScheduleNotifications()) {
        return false;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notification',
          body: 'This is a test notification from STYLO!',
          sound: 'default',
          data: { type: 'test' },
        },
        trigger: { 
          seconds: delaySeconds 
        } as Notifications.TimeIntervalTriggerInput,
        identifier: `test-${Date.now()}`,
      });

      return true;
    } catch (error) {
      console.error("NotificationService: Failed to schedule test notification:");
      return false;
    }
  }

  async cancelNotificationsByTag(tag: string): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const notificationsToCancel = scheduledNotifications.filter(
        notification => notification.identifier === tag
      );

      for (const notification of notificationsToCancel) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }

    } catch (error) {
      console.error("Stylo: operation failed (notificationService.ts)");
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error("NotificationService: Failed to cancel all notifications:");
    }
  }

  async updateNotificationSettings(settings: NotificationSettings): Promise<boolean> {
    try {

      // Handle style encouragement
      if (settings.styleEncouragement) {
        const success = await this.scheduleStyleEncouragement();
        if (!success) {
          return false;
        }
      } else {
        await this.cancelNotificationsByTag('style-encouragement');
      }

      // Handle weekly reports
      if (settings.weeklyReports) {
        const success = await this.scheduleWeeklyReport();
        if (!success) {
          return false;
        }
      } else {
        await this.cancelNotificationsByTag('weekly-report');
      }

      return true;
    } catch (error) {
      console.error("NotificationService: Failed to update notification settings:");
      return false;
    }
  }

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error("NotificationService: Failed to get scheduled notifications:");
      return [];
    }
  }

  // Check if we can schedule notifications (permissions granted and initialized)
  canScheduleNotifications(): boolean {
    return this.isInitialized && this.permissionStatus === 'granted' && Device.isDevice;
  }

  // Check if the service is ready to request permissions
  isReady(): boolean {
    return this.isInitialized && Device.isDevice;
  }

  // Check if notifications are supported on this device
  isSupported(): boolean {
    return Device.isDevice;
  }

  getToken(): string | null {
    return this.pushToken;
  }

  getCurrentPermissionStatus(): string {
    return this.permissionStatus;
  }

  // Method to open device settings (iOS/Android)
  async openSettings(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        // On iOS, open the app's settings page
        await Linking.openURL('app-settings:');
      } else {
        // On Android, open the app's notification settings
        await Linking.openURL('app-settings:');
      }
    } catch (error) {
      console.error("NotificationService: Failed to open settings:");
      // Fallback to requesting permissions again
      try {
        await Notifications.requestPermissionsAsync();
      } catch (fallbackError) {
        console.error("NotificationService: Fallback permission request failed:");
      }
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Helper function to check if notifications are supported
export const isNotificationSupported = (): boolean => {
  return Device.isDevice;
};

// Helper function to get notification permission status
export const getNotificationPermissionStatus = async (): Promise<string> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch (error) {
    console.error("Failed to get notification permissions:");
    return 'undetermined';
  }
};
