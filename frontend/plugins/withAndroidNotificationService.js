const { withAndroidManifest } = require('@expo/config-plugins');

const withAndroidNotificationService = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;

    // 1. 添加權限
    if (!androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = [];
    }
    const permissions = androidManifest.manifest['uses-permission'];

    // BIND_NOTIFICATION_LISTENER_SERVICE application needed
    if (
      !permissions.find(
        (p) =>
          p.$['android:name'] ===
          'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
      )
    ) {
      permissions.push({
        $: {
          'android:name':
            'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
        },
      });
    }

    // QUERY_ALL_PACKAGES or specific queries might be needed for some Android versions to see other packages
    // But basic listener might work without it for just receiving notifications
    // react-native-android-notification-listener often requires this service declaration:

    const mainApplication = androidManifest.manifest.application[0];
    if (!mainApplication.service) {
      mainApplication.service = [];
    }

    // Check if service already exists
    const serviceName =
      'com.leandrosimenes.reactnativeandroidnotificationlistener.RNAndroidNotificationListenerService';
    // The package uses a specific service name in its manifest, but we might need to ensure it's there or
    // simply rely on the library's own AAR/Manifest merging.
    // However, the BIND_NOTIFICATION_LISTENER_SERVICE permission is protected and must be granted to a service.

    // According to the library documentation (and common issues), the library *should* merge its own manifest.
    // But we MUST ensure the permission is there in the app's manifest merging process.
    // The code above adds the permission.

    // We also need to add the service if it's not automatically merged or if we want to be explicit.
    // The library defines:
    // <service android:name="com.leandrosimenes.reactnativeandroidnotificationlistener.RNAndroidNotificationListenerService"
    //          android:label="@string/service_name"
    //          android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE">
    //     <intent-filter>
    //         <action android:name="android.service.notification.NotificationListenerService" />
    //     </intent-filter>
    // </service>

    // Usually, modern React Native libraries with AARs handle this.
    // If the library is older or pure java source, we might need it.
    // Given the issues often faced with Expo and Native Modules, adding the permission is the critical part.
    // The service definition usually comes from the library's AndroidManifest.xml which gets merged.

    return config;
  });
};

module.exports = withAndroidNotificationService;
