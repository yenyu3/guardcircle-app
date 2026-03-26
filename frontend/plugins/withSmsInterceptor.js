/**
 * Expo Config Plugin — SMS Interceptor
 *
 * Generates native Android code at prebuild time:
 *   1. SmsReceiver        — BroadcastReceiver for SMS_RECEIVED
 *   2. SmsForegroundService — persistent foreground service
 *   3. SmsInterceptorModule — NativeModule (JS bridge)
 *   4. SmsInterceptorPackage — ReactPackage registration
 *
 * Also patches AndroidManifest and MainApplication.
 */
const {
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/* ------------------------------------------------------------------ */
/*  Java source templates                                              */
/* ------------------------------------------------------------------ */

function getSmsReceiverCode(pkg) {
  return `package ${pkg};

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.telephony.SmsMessage;
import android.util.Log;

import androidx.core.app.NotificationCompat;

/**
 * Static BroadcastReceiver for SMS_RECEIVED.
 * Works even when the app process is not running (SMS_RECEIVED is an
 * exempted implicit broadcast on Android 8+).
 *
 * Keywords are stored in SharedPreferences so they can be updated from JS.
 */
public class SmsReceiver extends BroadcastReceiver {

    private static final String TAG = "GuardCircle_SmsReceiver";
    private static final String CHANNEL_ID = "scam_alerts";
    private static final String PREFS_NAME = "SmsInterceptorPrefs";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "onReceive called, action=" + intent.getAction());

        if (!"android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) return;

        SharedPreferences prefs =
                context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean enabled = prefs.getBoolean("enabled", false);
        Log.d(TAG, "enabled=" + enabled);
        if (!enabled) return;

        Bundle bundle = intent.getExtras();
        if (bundle == null) { Log.d(TAG, "bundle is null"); return; }

        Object[] pdus = (Object[]) bundle.get("pdus");
        if (pdus == null || pdus.length == 0) { Log.d(TAG, "no pdus"); return; }

        String format = bundle.getString("format");
        StringBuilder fullMessage = new StringBuilder();
        String sender = "";

        for (Object pdu : pdus) {
            SmsMessage sms = SmsMessage.createFromPdu((byte[]) pdu, format);
            fullMessage.append(sms.getMessageBody());
            sender = sms.getDisplayOriginatingAddress();
        }

        String body = fullMessage.toString();
        Log.d(TAG, "SMS from=" + sender + " body=" + body);

        String keywordsStr = prefs.getString("keywords", "");
        Log.d(TAG, "keywords=" + keywordsStr);
        if (keywordsStr.isEmpty()) { Log.d(TAG, "no keywords set"); return; }

        String[] keywords = keywordsStr.split(",");
        String matched = null;
        for (String kw : keywords) {
            if (!kw.isEmpty() && body.contains(kw)) {
                matched = kw;
                break;
            }
        }

        Log.d(TAG, "matched=" + matched);
        if (matched != null) {
            final String fSender = sender;
            final String fBody = body;
            final String fMatched = matched;
            new Handler(Looper.getMainLooper()).postDelayed(
                () -> sendAlert(context, fSender, fBody, fMatched),
                3500
            );
        }
    }

    /* ---- notification ---- */

    private void sendAlert(Context context, String sender, String body, String keyword) {
        NotificationManager nm =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "詐騙警報", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("即時詐騙簡訊警報");
            nm.createNotificationChannel(ch);
        }

        Intent launch = context.getPackageManager()
                .getLaunchIntentForPackage(context.getPackageName());
        PendingIntent pi = PendingIntent.getActivity(
                context, 0, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String title = "⚠️ 疑似詐騙簡訊";
        String text  = "來自 " + sender + " 的訊息含有可疑關鍵字「" + keyword + "」";
        String big   = text + "\\n\\n請勿點擊連結或提供個資！";

        NotificationCompat.Builder builder =
                new NotificationCompat.Builder(context, CHANNEL_ID)
                        .setSmallIcon(android.R.drawable.ic_dialog_alert)
                        .setContentTitle(title)
                        .setContentText(text)
                        .setStyle(new NotificationCompat.BigTextStyle().bigText(big))
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setDefaults(NotificationCompat.DEFAULT_ALL)
                        .setCategory(NotificationCompat.CATEGORY_ALARM)
                        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                        .setAutoCancel(true)
                        .setContentIntent(pi);

        nm.notify((int) System.currentTimeMillis(), builder.build());
    }
}
`;
}

function getSmsForegroundServiceCode(pkg) {
  return `package ${pkg};

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

/**
 * Foreground service that keeps the app process alive so the
 * BroadcastReceiver and JS bridge remain active.
 */
public class SmsForegroundService extends Service {

    private static final String CHANNEL_ID = "sms_protection";
    private static final int NOTIFICATION_ID = 1001;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Intent launch = getPackageManager()
                .getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = PendingIntent.getActivity(
                this, 0, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification notification =
                new NotificationCompat.Builder(this, CHANNEL_ID)
                        .setContentTitle("GuardCircle 防護中")
                        .setContentText("即時監控簡訊，保護您免受詐騙")
                        .setSmallIcon(android.R.drawable.ic_lock_lock)
                        .setOngoing(true)
                        .setContentIntent(pi)
                        .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "簡訊防護服務",
                    NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("GuardCircle 背景防護服務");
            getSystemService(NotificationManager.class)
                    .createNotificationChannel(ch);
        }
    }
}
`;
}

function getSmsInterceptorModuleCode(pkg) {
  return `package ${pkg};

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;

/**
 * NativeModule exposed to JS as "SmsInterceptor".
 */
public class SmsInterceptorModule extends ReactContextBaseJavaModule {

    private static final String TAG = "GuardCircle_Module";
    private static final String PREFS_NAME = "SmsInterceptorPrefs";

    public SmsInterceptorModule(ReactApplicationContext ctx) { super(ctx); }

    @Override
    public String getName() { return "SmsInterceptor"; }

    /* ---- SMS: start / stop ---- */

    @ReactMethod
    public void startProtection(Promise promise) {
        Log.d(TAG, "startProtection called");
        try {
            Context ctx = getReactApplicationContext();
            prefs(ctx).edit().putBoolean("enabled", true).apply();
            Log.d(TAG, "enabled=true saved");

            Intent svc = new Intent(ctx, SmsForegroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(svc);
            } else {
                ctx.startService(svc);
            }
            Log.d(TAG, "foreground service started");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "startProtection error", e);
            promise.reject("START_ERR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopProtection(Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            prefs(ctx).edit().putBoolean("enabled", false).apply();
            ctx.stopService(new Intent(ctx, SmsForegroundService.class));
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("STOP_ERR", e.getMessage());
        }
    }

    /* ---- SMS: status ---- */

    @ReactMethod
    public void isProtectionRunning(Promise promise) {
        try {
            promise.resolve(prefs(getReactApplicationContext())
                    .getBoolean("enabled", false));
        } catch (Exception e) {
            promise.reject("CHECK_ERR", e.getMessage());
        }
    }

    /* ---- keywords ---- */

    @ReactMethod
    public void updateKeywords(ReadableArray keywords, Promise promise) {
        try {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < keywords.size(); i++) {
                if (i > 0) sb.append(",");
                sb.append(keywords.getString(i));
            }
            String kw = sb.toString();
            prefs(getReactApplicationContext()).edit()
                    .putString("keywords", kw).apply();
            Log.d(TAG, "keywords updated: " + kw);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "updateKeywords error", e);
            promise.reject("KW_ERR", e.getMessage());
        }
    }

    /* ---- Notification interception (Phase 2) ---- */

    @ReactMethod
    public void isNotificationAccessEnabled(Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            String pkgName = ctx.getPackageName();
            String flat = Settings.Secure.getString(
                    ctx.getContentResolver(), "enabled_notification_listeners");
            boolean enabled = flat != null && flat.contains(pkgName);
            Log.d(TAG, "notificationAccess enabled=" + enabled);
            promise.resolve(enabled);
        } catch (Exception e) {
            promise.reject("NOTIF_CHECK_ERR", e.getMessage());
        }
    }

    @ReactMethod
    public void openNotificationAccessSettings(Promise promise) {
        try {
            Intent intent = new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getReactApplicationContext().startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("NOTIF_OPEN_ERR", e.getMessage());
        }
    }

    @ReactMethod
    public void setNotificationInterceptionEnabled(boolean enabled, Promise promise) {
        try {
            prefs(getReactApplicationContext()).edit()
                    .putBoolean("notif_intercept_enabled", enabled).apply();
            Log.d(TAG, "notif_intercept_enabled=" + enabled);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("NOTIF_SET_ERR", e.getMessage());
        }
    }

    @ReactMethod
    public void isNotificationInterceptionEnabled(Promise promise) {
        try {
            promise.resolve(prefs(getReactApplicationContext())
                    .getBoolean("notif_intercept_enabled", false));
        } catch (Exception e) {
            promise.reject("NOTIF_GET_ERR", e.getMessage());
        }
    }

    private SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }
}
`;
}

function getSmsInterceptorPackageCode(pkg) {
  return `package ${pkg};

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class SmsInterceptorPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext ctx) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new SmsInterceptorModule(ctx));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext ctx) {
        return Collections.emptyList();
    }
}
`;
}

function getNotificationInterceptorServiceCode(pkg) {
  return `package ${pkg};

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.provider.Telephony;
import android.os.Looper;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import androidx.core.app.NotificationCompat;

/**
 * NotificationListenerService — intercepts notifications from ALL apps.
 * Checks content against scam keywords and sends an alert if matched.
 */
public class NotificationInterceptorService extends NotificationListenerService {

    private static final String TAG = "GuardCircle_NotifListener";
    private static final String CHANNEL_ID = "scam_alerts";
    private static final String PREFS_NAME = "SmsInterceptorPrefs";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        // Skip our own notifications to avoid infinite loop
        if (sbn.getPackageName().equals(getPackageName())) return;

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        if (!prefs.getBoolean("notif_intercept_enabled", false)) return;

        // Skip default SMS app if SMS protection is already enabled (avoid duplicate alerts)
        if (prefs.getBoolean("enabled", false)) {
            String defaultSmsApp = Telephony.Sms.getDefaultSmsPackage(this);
            if (sbn.getPackageName().equals(defaultSmsApp)) {
                Log.d(TAG, "Skipping SMS app notification (handled by SmsReceiver)");
                return;
            }
        }

        // Extract notification text
        Notification notification = sbn.getNotification();
        if (notification == null || notification.extras == null) return;

        CharSequence titleCs = notification.extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence textCs = notification.extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigTextCs = notification.extras.getCharSequence(Notification.EXTRA_BIG_TEXT);

        String title = titleCs != null ? titleCs.toString() : "";
        String text = textCs != null ? textCs.toString() : "";
        String bigText = bigTextCs != null ? bigTextCs.toString() : "";

        String combined = title + " " + text + " " + bigText;
        if (combined.trim().isEmpty()) return;

        Log.d(TAG, "Notification from " + sbn.getPackageName() + ": " + combined.substring(0, Math.min(combined.length(), 100)));

        // Check keywords
        String keywordsStr = prefs.getString("keywords", "");
        if (keywordsStr.isEmpty()) return;

        String[] keywords = keywordsStr.split(",");
        String matched = null;
        for (String kw : keywords) {
            if (!kw.isEmpty() && combined.contains(kw)) {
                matched = kw;
                break;
            }
        }

        if (matched != null) {
            Log.d(TAG, "MATCH keyword=" + matched + " from " + sbn.getPackageName());
            String appName = getAppName(sbn.getPackageName());
            final String fAppName = appName;
            final String fCombined = combined;
            final String fMatched = matched;
            new Handler(Looper.getMainLooper()).postDelayed(
                () -> sendAlert(fAppName, fCombined, fMatched),
                2000
            );
        }
    }

    private String getAppName(String packageName) {
        PackageManager pm = getPackageManager();
        try {
            return pm.getApplicationLabel(
                    pm.getApplicationInfo(packageName, 0)).toString();
        } catch (Exception e) {
            return packageName;
        }
    }

    private void sendAlert(String appName, String content, String keyword) {
        Log.d(TAG, "sendAlert for app=" + appName + " keyword=" + keyword);
        try {
            NotificationManager nm =
                    (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel ch = new NotificationChannel(
                        CHANNEL_ID, "詐騙警報", NotificationManager.IMPORTANCE_HIGH);
                ch.setDescription("即時詐騙通知警報");
                nm.createNotificationChannel(ch);
            }

            Intent launch = getPackageManager()
                    .getLaunchIntentForPackage(getPackageName());
            PendingIntent pi = launch != null
                    ? PendingIntent.getActivity(this, 0, launch,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)
                    : null;

            String alertTitle = "⚠️ 疑似詐騙通知";
            String alertText = appName + " 的通知含有可疑關鍵字「" + keyword + "」";
            String big = alertText + "\\n\\n請勿點擊連結或提供個資！";

            NotificationCompat.Builder builder =
                    new NotificationCompat.Builder(this, CHANNEL_ID)
                            .setSmallIcon(android.R.drawable.ic_dialog_alert)
                            .setContentTitle(alertTitle)
                            .setContentText(alertText)
                            .setStyle(new NotificationCompat.BigTextStyle().bigText(big))
                            .setPriority(NotificationCompat.PRIORITY_HIGH)
                            .setDefaults(NotificationCompat.DEFAULT_ALL)
                            .setCategory(NotificationCompat.CATEGORY_ALARM)
                            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                            .setAutoCancel(true);

            if (pi != null) builder.setContentIntent(pi);

            nm.notify((int) (System.currentTimeMillis() % Integer.MAX_VALUE), builder.build());
            Log.d(TAG, "alert notification sent");
        } catch (Exception e) {
            Log.e(TAG, "sendAlert error", e);
        }
    }
}
`;
}

/* ------------------------------------------------------------------ */
/*  Config plugin helpers                                              */
/* ------------------------------------------------------------------ */

/** Write the four Java source files into the android project. */
function withJavaSources(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const root = cfg.modRequest.projectRoot;
      const pkg = cfg.android?.package ?? "com.angelaliii.guardcircle";
      const dir = path.join(
        root,
        "android",
        "app",
        "src",
        "main",
        "java",
        ...pkg.split(".")
      );
      fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(path.join(dir, "SmsReceiver.java"), getSmsReceiverCode(pkg));
      fs.writeFileSync(path.join(dir, "SmsForegroundService.java"), getSmsForegroundServiceCode(pkg));
      fs.writeFileSync(path.join(dir, "SmsInterceptorModule.java"), getSmsInterceptorModuleCode(pkg));
      fs.writeFileSync(path.join(dir, "SmsInterceptorPackage.java"), getSmsInterceptorPackageCode(pkg));
      fs.writeFileSync(path.join(dir, "NotificationInterceptorService.java"), getNotificationInterceptorServiceCode(pkg));

      return cfg;
    },
  ]);
}

/** Patch AndroidManifest: permissions + receiver + service declarations. */
function withManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    /* ---- permissions ---- */
    if (!manifest["uses-permission"]) manifest["uses-permission"] = [];
    const perms = manifest["uses-permission"];

    const needed = [
      "android.permission.RECEIVE_SMS",
      "android.permission.READ_SMS",
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_SPECIAL_USE",
    ];
    for (const p of needed) {
      if (!perms.find((x) => x.$?.["android:name"] === p)) {
        perms.push({ $: { "android:name": p } });
      }
    }

    /* ---- application children ---- */
    const app = manifest.application[0];

    /* receiver */
    if (!app.receiver) app.receiver = [];
    const receiverName = ".SmsReceiver";
    if (!app.receiver.find((r) => r.$?.["android:name"] === receiverName)) {
      app.receiver.push({
        $: {
          "android:name": receiverName,
          "android:enabled": "true",
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.provider.Telephony.SMS_RECEIVED" } },
            ],
          },
        ],
      });
    }

    /* foreground service */
    if (!app.service) app.service = [];
    const serviceName = ".SmsForegroundService";
    if (!app.service.find((s) => s.$?.["android:name"] === serviceName)) {
      app.service.push({
        $: {
          "android:name": serviceName,
          "android:enabled": "true",
          "android:exported": "false",
          "android:foregroundServiceType": "specialUse",
        },
        property: [
          {
            $: {
              "android:name": "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE",
              "android:value": "Monitors incoming SMS for scam detection",
            },
          },
        ],
      });
    }

    /* notification listener service */
    const notifServiceName = ".NotificationInterceptorService";
    if (!app.service.find((s) => s.$?.["android:name"] === notifServiceName)) {
      app.service.push({
        $: {
          "android:name": notifServiceName,
          "android:enabled": "true",
          "android:exported": "true",
          "android:permission": "android.permission.BIND_NOTIFICATION_LISTENER_SERVICE",
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.service.notification.NotificationListenerService" } },
            ],
          },
        ],
      });
    }

    return cfg;
  });
}

/** Register SmsInterceptorPackage in MainApplication. */
function withPackageRegistration(config) {
  return withMainApplication(config, (cfg) => {
    let contents = cfg.modResults.contents;
    const lang = cfg.modResults.language;
    const pkg = cfg.android?.package ?? "com.angelaliii.guardcircle";

    if (lang === "kt" || lang === "kotlin") {
      /* ---- Kotlin ---- */
      const importLine = `import ${pkg}.SmsInterceptorPackage`;
      if (!contents.includes(importLine)) {
        contents = contents.replace(
          /^(package .+)$/m,
          `$1\n${importLine}`
        );
      }
      const addLine = `packages.add(SmsInterceptorPackage())`;
      if (!contents.includes(addLine)) {
        contents = contents.replace(
          /(PackageList\(this\)\.packages)/,
          `$1.apply { add(SmsInterceptorPackage()) }`
        );
      }
    } else {
      /* ---- Java ---- */
      const importLine = `import ${pkg}.SmsInterceptorPackage;`;
      if (!contents.includes(importLine)) {
        contents = contents.replace(
          /^(package .+;)$/m,
          `$1\nimport ${pkg}.SmsInterceptorPackage;`
        );
      }
      const addLine = `packages.add(new SmsInterceptorPackage())`;
      if (!contents.includes(addLine)) {
        contents = contents.replace(
          /(return packages;)/,
          `packages.add(new SmsInterceptorPackage());\n            $1`
        );
      }
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

/* ------------------------------------------------------------------ */
/*  Main plugin                                                        */
/* ------------------------------------------------------------------ */

function withSmsInterceptor(config) {
  config = withJavaSources(config);
  config = withManifest(config);
  config = withPackageRegistration(config);
  return config;
}

module.exports = withSmsInterceptor;
