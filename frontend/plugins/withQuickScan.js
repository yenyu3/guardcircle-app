/**
 * Expo Config Plugin — Quick Scan
 *
 * Android:
 *   1. QuickScanOverlayService  — floating bubble overlay
 *   2. ScreenCaptureActivity    — transparent activity for MediaProjection consent
 *   3. ScreenCaptureService     — foreground service that takes the screenshot
 *   4. QuickScanModule          — NativeModule (JS bridge)
 *   5. QuickScanPackage         — ReactPackage registration
 *
 * iOS:
 *   1. Share Extension target   — receives text/URLs from other apps
 *   2. URL scheme registration  — guardcircle:// deep link
 *
 * Also patches AndroidManifest and MainApplication.
 */
const {
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
  withInfoPlist,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/* ================================================================== */
/*  Android Java source templates                                      */
/* ================================================================== */

function getQuickScanOverlayServiceCode(pkg) {
  return `package ${pkg};

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageView;

import androidx.core.app.NotificationCompat;

/**
 * Overlay service that draws a draggable floating bubble on screen.
 * Tap → launches ScreenCaptureActivity to capture and analyse.
 */
public class QuickScanOverlayService extends Service {

    private static final String TAG = "GuardCircle_Overlay";
    private static final String CHANNEL_ID = "quick_scan_overlay";
    private static final int NOTIFICATION_ID = 2001;
    private static final int BUBBLE_SIZE_DP = 56;

    private WindowManager windowManager;
    private View bubbleView;
    private WindowManager.LayoutParams params;

    private int screenWidth;
    private int screenHeight;

    // Drag tracking
    private float initialTouchX, initialTouchY;
    private int initialX, initialY;
    private boolean isDragging;
    private static final int CLICK_THRESHOLD = 12; // dp

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, buildNotification(),
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE
                        ? ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE : 0);

        if (bubbleView == null) {
            createBubble();
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (bubbleView != null) {
            try { windowManager.removeView(bubbleView); } catch (Exception ignored) {}
            bubbleView = null;
        }
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    /* ---- Bubble UI ---- */

    private void createBubble() {
        DisplayMetrics dm = getResources().getDisplayMetrics();
        float density = dm.density;
        screenWidth = dm.widthPixels;
        screenHeight = dm.heightPixels;

        int sizePx = (int) (BUBBLE_SIZE_DP * density);
        int clickThresholdPx = (int) (CLICK_THRESHOLD * density);

        // Container
        FrameLayout container = new FrameLayout(this);
        container.setAlpha(0.85f);

        // Custom bubble icon — clipped to shield shape
        ImageView icon = new ImageView(this);
        icon.setImageResource(R.drawable.ball);
        icon.setScaleType(ImageView.ScaleType.CENTER_CROP);
        icon.setClipToOutline(true);
        icon.setOutlineProvider(new android.view.ViewOutlineProvider() {
            @Override
            public void getOutline(View view, android.graphics.Outline outline) {
                int w = view.getWidth();
                int h = view.getHeight();
                android.graphics.Path path = new android.graphics.Path();
                // Shield: peaked top, wide shoulders, tapers to bottom point
                path.moveTo(w * 0.5f, 0);
                path.quadTo(w * 0.05f, h * 0.02f, 0, h * 0.28f);
                path.quadTo(0.0f, h * 0.72f, w * 0.5f, h);
                path.quadTo(w, h * 0.72f, w, h * 0.28f);
                path.quadTo(w * 0.95f, h * 0.02f, w * 0.5f, 0);
                path.close();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    outline.setPath(path);
                } else {
                    outline.setConvexPath(path);
                }
            }
        });

        FrameLayout.LayoutParams iconParams = new FrameLayout.LayoutParams(sizePx, sizePx);
        container.addView(icon, iconParams);

        // Window layout params
        int overlayType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

        params = new WindowManager.LayoutParams(
                sizePx, sizePx,
                overlayType,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = screenWidth - sizePx - 20;
        params.y = screenHeight / 3;

        // Touch handling: drag + tap
        container.setOnTouchListener((v, event) -> {
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    initialTouchX = event.getRawX();
                    initialTouchY = event.getRawY();
                    initialX = params.x;
                    initialY = params.y;
                    isDragging = false;
                    container.setAlpha(1.0f);
                    return true;

                case MotionEvent.ACTION_MOVE:
                    float dx = event.getRawX() - initialTouchX;
                    float dy = event.getRawY() - initialTouchY;
                    if (Math.abs(dx) > clickThresholdPx || Math.abs(dy) > clickThresholdPx) {
                        isDragging = true;
                    }
                    if (isDragging) {
                        params.x = initialX + (int) dx;
                        params.y = initialY + (int) dy;
                        windowManager.updateViewLayout(container, params);
                    }
                    return true;

                case MotionEvent.ACTION_UP:
                    container.setAlpha(0.85f);
                    if (!isDragging) {
                        // TAP — launch screen capture
                        onBubbleTapped();
                    } else {
                        // Snap to nearest edge
                        snapToEdge(container, sizePx);
                    }
                    return true;
            }
            return false;
        });

        bubbleView = container;
        windowManager.addView(bubbleView, params);
        Log.d(TAG, "Bubble created");
    }

    private void snapToEdge(View view, int sizePx) {
        int midX = params.x + sizePx / 2;
        if (midX < screenWidth / 2) {
            params.x = 8;
        } else {
            params.x = screenWidth - sizePx - 8;
        }
        // Clamp Y
        params.y = Math.max(0, Math.min(params.y, screenHeight - sizePx));
        windowManager.updateViewLayout(view, params);
    }

    private void onBubbleTapped() {
        Log.d(TAG, "Bubble tapped — launching screen capture");
        // Temporarily hide bubble so it's not in the screenshot
        if (bubbleView != null) bubbleView.setVisibility(View.INVISIBLE);

        Intent captureIntent = new Intent(this, ScreenCaptureActivity.class);
        // KEY: use FLAG_ACTIVITY_NEW_TASK + FLAG_ACTIVITY_MULTIPLE_TASK
        // so this Activity launches in its own task and does NOT bring
        // the main React Native activity to the foreground.
        captureIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_MULTIPLE_TASK
                | Intent.FLAG_ACTIVITY_NO_ANIMATION);
        startActivity(captureIntent);

        // Re-show bubble after capture completes
        if (bubbleView != null) {
            bubbleView.postDelayed(() -> {
                if (bubbleView != null) bubbleView.setVisibility(View.VISIBLE);
            }, 3000);
        }
    }

    /* ---- Notification ---- */

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "快速掃描懸浮球",
                    NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("GuardCircle 快速掃描懸浮球服務");
            getSystemService(NotificationManager.class)
                    .createNotificationChannel(ch);
        }
    }

    private Notification buildNotification() {
        Intent launch = getPackageManager()
                .getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = PendingIntent.getActivity(
                this, 0, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("快速掃描已啟用")
                .setContentText("點擊懸浮球即可擷取畫面並偵測可疑內容")
                .setSmallIcon(android.R.drawable.ic_menu_camera)
                .setOngoing(true)
                .setContentIntent(pi)
                .build();
    }
}
`;
}

function getScreenCaptureActivityCode(pkg) {
  return `package ${pkg};

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import android.os.Bundle;
import android.util.Log;

/**
 * Transparent Activity that requests MediaProjection consent.
 * Runs in its own task (via taskAffinity + launchMode in manifest).
 *
 * KEY DESIGN: We must start the foreground service WHILE this activity
 * is still in the foreground. Android 12+ blocks startForegroundService()
 * from the background. The service itself delays the actual capture so
 * the user returns to their previous app first.
 */
public class ScreenCaptureActivity extends Activity {

    private static final String TAG = "GuardCircle_Capture";
    private static final int REQUEST_MEDIA_PROJECTION = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        MediaProjectionManager mpm = (MediaProjectionManager)
                getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        startActivityForResult(mpm.createScreenCaptureIntent(), REQUEST_MEDIA_PROJECTION);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == REQUEST_MEDIA_PROJECTION) {
            if (resultCode == RESULT_OK && data != null) {
                Log.d(TAG, "MediaProjection permission granted");

                // Start service NOW while we still have a foreground activity.
                // The service will delay the actual capture internally.
                try {
                    Intent svc = new Intent(this, ScreenCaptureService.class);
                    svc.putExtra("resultCode", resultCode);
                    svc.putExtra("resultData", data);
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        startForegroundService(svc);
                    } else {
                        startService(svc);
                    }
                    Log.d(TAG, "ScreenCaptureService started");
                } catch (Exception e) {
                    Log.e(TAG, "Failed to start ScreenCaptureService", e);
                }
            } else {
                Log.d(TAG, "MediaProjection permission denied");
            }
            // Finish after starting the service — user returns to their previous app
            finish();
        }
    }
}
`;
}

function getScreenCaptureServiceCode(pkg) {
  return `package ${pkg};

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.DisplayMetrics;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.ByteBuffer;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Foreground service that captures a single screenshot via MediaProjection,
 * saves it to internal storage, then launches the main app for analysis.
 *
 * Uses ImageReader.OnImageAvailableListener instead of a fixed delay,
 * so we reliably wait for a frame to become available.
 */
public class ScreenCaptureService extends Service {

    private static final String TAG = "GuardCircle_ScreenCap";
    private static final String CHANNEL_ID = "screen_capture";
    private static final int NOTIFICATION_ID = 2002;
    private static final long CAPTURE_TIMEOUT_MS = 5000;

    private MediaProjection mediaProjection;
    private VirtualDisplay virtualDisplay;
    private ImageReader imageReader;
    private Handler handler;
    private final AtomicBoolean captured = new AtomicBoolean(false);

    @Override
    public void onCreate() {
        super.onCreate();
        handler = new Handler(Looper.getMainLooper());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        createChannel();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, buildNotification(),
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
        } else {
            startForeground(NOTIFICATION_ID, buildNotification());
        }

        // NOTE: Activity.RESULT_OK == -1, so we must use a different
        // sentinel value to detect "extra not present".
        int resultCode = intent.getIntExtra("resultCode", 0);
        Intent resultData = intent.getParcelableExtra("resultData");

        if (resultCode != -1 || resultData == null) {
            // resultCode must be RESULT_OK (-1) and resultData must be non-null
            Log.e(TAG, "Invalid result data, resultCode=" + resultCode
                    + " resultData=" + (resultData != null ? "ok" : "null"));
            stopSelf();
            return START_NOT_STICKY;
        }

        try {
            MediaProjectionManager mpm = (MediaProjectionManager)
                    getSystemService(MEDIA_PROJECTION_SERVICE);
            mediaProjection = mpm.getMediaProjection(resultCode, resultData);
            if (mediaProjection == null) {
                Log.e(TAG, "getMediaProjection returned null");
                stopSelf();
                return START_NOT_STICKY;
            }
            // Android 14+ requires registering a callback before createVirtualDisplay
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                mediaProjection.registerCallback(new android.media.projection.MediaProjection.Callback() {
                    @Override
                    public void onStop() {
                        Log.d(TAG, "MediaProjection stopped");
                        cleanup();
                        stopSelf();
                    }
                }, handler);
            }
            // Delay capture by 800ms so the ScreenCaptureActivity has time
            // to finish and the user's previous app is back in the foreground.
            // This ensures we screenshot the target app, not our own UI.
            Log.d(TAG, "Delaying capture 800ms for activity to finish...");
            handler.postDelayed(this::captureScreen, 800);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start capture", e);
            stopSelf();
        }
        return START_NOT_STICKY;
    }

    private void captureScreen() {
        DisplayMetrics dm = getResources().getDisplayMetrics();
        int width = dm.widthPixels;
        int height = dm.heightPixels;
        int density = dm.densityDpi;

        imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2);

        // Use OnImageAvailableListener — fires when a frame is ready
        imageReader.setOnImageAvailableListener(reader -> {
            if (!captured.compareAndSet(false, true)) return; // only once
            Log.d(TAG, "Image available — capturing");

            Image image = null;
            try {
                image = reader.acquireLatestImage();
                if (image != null) {
                    String filePath = saveImage(image, width, height);
                    if (filePath != null) {
                        launchAppWithScreenshot(filePath);
                    } else {
                        Log.e(TAG, "saveImage returned null");
                    }
                } else {
                    Log.e(TAG, "acquireLatestImage returned null");
                }
            } catch (Exception e) {
                Log.e(TAG, "Capture error", e);
            } finally {
                if (image != null) image.close();
                cleanup();
                stopSelf();
            }
        }, handler);

        try {
            virtualDisplay = mediaProjection.createVirtualDisplay(
                    "GuardCircleCapture",
                    width, height, density,
                    DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                    imageReader.getSurface(),
                    null, handler);
        } catch (Exception e) {
            Log.e(TAG, "createVirtualDisplay error", e);
            cleanup();
            stopSelf();
            return;
        }

        // Timeout fallback — if no frame arrives within 5s, give up
        handler.postDelayed(() -> {
            if (captured.compareAndSet(false, true)) {
                Log.e(TAG, "Capture timed out — no frame received");
                cleanup();
                stopSelf();
            }
        }, CAPTURE_TIMEOUT_MS);
    }

    private String saveImage(Image image, int width, int height) {
        try {
            Image.Plane[] planes = image.getPlanes();
            ByteBuffer buffer = planes[0].getBuffer();
            int pixelStride = planes[0].getPixelStride();
            int rowStride = planes[0].getRowStride();
            int rowPadding = rowStride - pixelStride * width;

            Bitmap bitmap = Bitmap.createBitmap(
                    width + rowPadding / pixelStride, height,
                    Bitmap.Config.ARGB_8888);
            bitmap.copyPixelsFromBuffer(buffer);

            // Crop to actual screen width (remove row padding)
            if (bitmap.getWidth() > width) {
                Bitmap cropped = Bitmap.createBitmap(bitmap, 0, 0, width, height);
                bitmap.recycle();
                bitmap = cropped;
            }

            // Clean up old captures
            File dir = new File(getFilesDir(), "quick_scan");
            if (!dir.exists()) dir.mkdirs();
            File[] old = dir.listFiles();
            if (old != null) {
                for (File f : old) f.delete();
            }

            File file = new File(dir, "capture_" + System.currentTimeMillis() + ".png");

            FileOutputStream fos = new FileOutputStream(file);
            bitmap.compress(Bitmap.CompressFormat.PNG, 90, fos);
            fos.flush();
            fos.close();
            bitmap.recycle();

            Log.d(TAG, "Screenshot saved: " + file.getAbsolutePath());
            return file.getAbsolutePath();
        } catch (Exception e) {
            Log.e(TAG, "saveImage error", e);
            return null;
        }
    }

    private void launchAppWithScreenshot(String filePath) {
        // Store path in SharedPreferences so the JS side can pick it up
        getSharedPreferences("QuickScanPrefs", MODE_PRIVATE)
                .edit()
                .putString("pending_screenshot", filePath)
                .apply();
        Log.d(TAG, "Stored pending_screenshot: " + filePath);

        Intent launch = getPackageManager()
                .getLaunchIntentForPackage(getPackageName());
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                    | Intent.FLAG_ACTIVITY_CLEAR_TOP
                    | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(launch);
            Log.d(TAG, "Launched app with screenshot");
        }
    }

    private void cleanup() {
        if (virtualDisplay != null) {
            try { virtualDisplay.release(); } catch (Exception ignored) {}
            virtualDisplay = null;
        }
        if (mediaProjection != null) {
            try { mediaProjection.stop(); } catch (Exception ignored) {}
            mediaProjection = null;
        }
        if (imageReader != null) {
            try { imageReader.close(); } catch (Exception ignored) {}
            imageReader = null;
        }
    }

    @Override
    public void onDestroy() {
        cleanup();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "螢幕擷取",
                    NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("螢幕擷取服務");
            getSystemService(NotificationManager.class)
                    .createNotificationChannel(ch);
        }
    }

    private Notification buildNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("正在擷取畫面…")
                .setSmallIcon(android.R.drawable.ic_menu_camera)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }
}
`;
}

function getQuickScanModuleCode(pkg) {
  return `package ${pkg};

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

/**
 * NativeModule exposed to JS as "QuickScanModule".
 * Controls the overlay bubble and checks permissions.
 */
public class QuickScanModule extends ReactContextBaseJavaModule {

    private static final String TAG = "GuardCircle_QuickScan";
    private static final String PREFS_NAME = "QuickScanPrefs";

    public QuickScanModule(ReactApplicationContext ctx) { super(ctx); }

    @Override
    public String getName() { return "QuickScanModule"; }

    /* ---- Overlay permission ---- */

    @ReactMethod
    public void canDrawOverlays(Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                promise.resolve(Settings.canDrawOverlays(ctx));
            } else {
                promise.resolve(true); // Pre-M always allowed
            }
        } catch (Exception e) {
            promise.reject("OVERLAY_CHECK_ERR", e.getMessage());
        }
    }

    @ReactMethod
    public void requestOverlayPermission(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        android.net.Uri.parse("package:" +
                                getReactApplicationContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getReactApplicationContext().startActivity(intent);
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("OVERLAY_REQ_ERR", e.getMessage());
        }
    }

    /* ---- Overlay service control ---- */

    @ReactMethod
    public void startOverlay(Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                    && !Settings.canDrawOverlays(ctx)) {
                promise.reject("NO_PERMISSION", "Overlay permission not granted");
                return;
            }

            Intent svc = new Intent(ctx, QuickScanOverlayService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(svc);
            } else {
                ctx.startService(svc);
            }

            prefs(ctx).edit().putBoolean("overlay_active", true).apply();
            Log.d(TAG, "Overlay started");
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("START_ERR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopOverlay(Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            ctx.stopService(new Intent(ctx, QuickScanOverlayService.class));
            prefs(ctx).edit().putBoolean("overlay_active", false).apply();
            Log.d(TAG, "Overlay stopped");
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("STOP_ERR", e.getMessage());
        }
    }

    @ReactMethod
    public void isOverlayActive(Promise promise) {
        try {
            promise.resolve(prefs(getReactApplicationContext())
                    .getBoolean("overlay_active", false));
        } catch (Exception e) {
            promise.reject("CHECK_ERR", e.getMessage());
        }
    }

    /**
     * Check if the app was launched via a QUICK_SCAN intent with a screenshot.
     * Returns the screenshot file path and clears it, or null if none pending.
     */
    @ReactMethod
    public void consumePendingScreenshot(Promise promise) {
        try {
            Context ctx = getReactApplicationContext();
            SharedPreferences p = prefs(ctx);
            String path = p.getString("pending_screenshot", null);
            if (path != null) {
                p.edit().remove("pending_screenshot").apply();
                // Verify file exists
                java.io.File f = new java.io.File(path);
                if (f.exists()) {
                    promise.resolve(path);
                    return;
                }
            }
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("CONSUME_ERR", e.getMessage());
        }
    }

    private SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }
}
`;
}

function getQuickScanPackageCode(pkg) {
  return `package ${pkg};

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class QuickScanPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext ctx) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new QuickScanModule(ctx));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext ctx) {
        return Collections.emptyList();
    }
}
`;
}

/* ================================================================== */
/*  iOS Share Extension templates                                      */
/* ================================================================== */

function getShareExtensionSwiftCode() {
  return `import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

/**
 * GuardCircle Share Extension
 * Receives text / URLs from other apps (LINE, Safari, etc.)
 * and forwards them to the main app via URL scheme for scam analysis.
 */
class ShareViewController: UIViewController {

    private let appScheme = "guardcircle"

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor.black.withAlphaComponent(0.3)
        handleSharedContent()
    }

    private func handleSharedContent() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            close()
            return
        }

        for item in items {
            guard let attachments = item.attachments else { continue }

            for provider in attachments {
                // Handle URLs
                if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] (data, error) in
                        if let url = data as? URL {
                            self?.openMainApp(with: url.absoluteString, type: "url")
                        }
                    }
                    return
                }

                // Handle plain text
                if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] (data, error) in
                        if let text = data as? String {
                            self?.openMainApp(with: text, type: "text")
                        }
                    }
                    return
                }
            }
        }

        close()
    }

    private func openMainApp(with content: String, type: String) {
        guard let encoded = content.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "\\(appScheme)://quickscan?type=\\(type)&content=\\(encoded)") else {
            close()
            return
        }

        // Open main app via URL scheme
        var responder: UIResponder? = self
        while responder != nil {
            if let application = responder as? UIApplication {
                application.open(url, options: [:], completionHandler: nil)
                break
            }
            responder = responder?.next
        }

        // If we can't find UIApplication (expected in extension), use openURL workaround
        let selector = sel_registerName("openURL:")
        responder = self
        while responder != nil {
            if responder!.responds(to: selector) {
                responder!.perform(selector, with: url)
                break
            }
            responder = responder?.next
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            self?.close()
        }
    }

    private func close() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}
`;
}

function getShareExtensionInfoPlist(bundleId) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleDisplayName</key>
    <string>守護圈掃描</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>${bundleId}.ShareExtension</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>XPC!</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.share-services</string>
        <key>NSExtensionPrincipalClass</key>
        <string>ShareViewController</string>
        <key>NSExtensionAttributes</key>
        <dict>
            <key>NSExtensionActivationRule</key>
            <dict>
                <key>NSExtensionActivationSupportsText</key>
                <true/>
                <key>NSExtensionActivationSupportsWebURLWithMaxCount</key>
                <integer>1</integer>
            </dict>
        </dict>
    </dict>
</dict>
</plist>
`;
}

/* ================================================================== */
/*  Config plugin helpers — Android                                    */
/* ================================================================== */

/** Write Java source files into the android project. */
function withJavaSources(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const root = cfg.modRequest.projectRoot;
      const pkg = cfg.android?.package ?? "com.angelaliii.guardcircle";
      const dir = path.join(
        root, "android", "app", "src", "main", "java",
        ...pkg.split(".")
      );
      fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(
        path.join(dir, "QuickScanOverlayService.java"),
        getQuickScanOverlayServiceCode(pkg)
      );
      fs.writeFileSync(
        path.join(dir, "ScreenCaptureActivity.java"),
        getScreenCaptureActivityCode(pkg)
      );
      fs.writeFileSync(
        path.join(dir, "ScreenCaptureService.java"),
        getScreenCaptureServiceCode(pkg)
      );
      fs.writeFileSync(
        path.join(dir, "QuickScanModule.java"),
        getQuickScanModuleCode(pkg)
      );
      fs.writeFileSync(
        path.join(dir, "QuickScanPackage.java"),
        getQuickScanPackageCode(pkg)
      );

      return cfg;
    },
  ]);
}

/** Patch AndroidManifest: permissions + overlay service + capture activity/service. */
function withManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    /* ---- permissions ---- */
    if (!manifest["uses-permission"]) manifest["uses-permission"] = [];
    const perms = manifest["uses-permission"];

    const needed = [
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_SPECIAL_USE",
      "android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION",
    ];
    for (const p of needed) {
      if (!perms.find((x) => x.$?.["android:name"] === p)) {
        perms.push({ $: { "android:name": p } });
      }
    }

    /* ---- application children ---- */
    const app = manifest.application[0];
    if (!app.service) app.service = [];
    if (!app.activity) app.activity = [];

    /* QuickScanOverlayService */
    const overlayName = ".QuickScanOverlayService";
    if (!app.service.find((s) => s.$?.["android:name"] === overlayName)) {
      app.service.push({
        $: {
          "android:name": overlayName,
          "android:enabled": "true",
          "android:exported": "false",
          "android:foregroundServiceType": "specialUse",
        },
        property: [
          {
            $: {
              "android:name": "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE",
              "android:value": "Displays floating scan bubble overlay for quick scam detection",
            },
          },
        ],
      });
    }

    /* ScreenCaptureService */
    const captureSvcName = ".ScreenCaptureService";
    if (!app.service.find((s) => s.$?.["android:name"] === captureSvcName)) {
      app.service.push({
        $: {
          "android:name": captureSvcName,
          "android:enabled": "true",
          "android:exported": "false",
          "android:foregroundServiceType": "mediaProjection",
        },
      });
    }

    /* ScreenCaptureActivity — transparent, separate task so it doesn't
       bring the main RN activity to the foreground */
    const captureActName = ".ScreenCaptureActivity";
    if (!app.activity.find((a) => a.$?.["android:name"] === captureActName)) {
      const pkg = cfg.android?.package ?? "com.angelaliii.guardcircle";
      app.activity.push({
        $: {
          "android:name": captureActName,
          "android:theme": "@android:style/Theme.Translucent.NoTitleBar",
          "android:exported": "false",
          "android:excludeFromRecents": "true",
          "android:noHistory": "true",
          "android:taskAffinity": pkg + ".screencapture",
          "android:launchMode": "singleInstance",
        },
      });
    }

    return cfg;
  });
}

/** Register QuickScanPackage in MainApplication. */
function withPackageRegistration(config) {
  return withMainApplication(config, (cfg) => {
    let contents = cfg.modResults.contents;
    const lang = cfg.modResults.language;
    const pkg = cfg.android?.package ?? "com.angelaliii.guardcircle";

    if (lang === "kt" || lang === "kotlin") {
      const importLine = `import ${pkg}.QuickScanPackage`;
      if (!contents.includes(importLine)) {
        contents = contents.replace(
          /^(package .+)$/m,
          `$1\n${importLine}`
        );
      }
      const addLine = `packages.add(QuickScanPackage())`;
      if (!contents.includes(addLine)) {
        contents = contents.replace(
          /(PackageList\(this\)\.packages)/,
          `$1.apply { add(QuickScanPackage()) }`
        );
      }
    } else {
      const importLine = `import ${pkg}.QuickScanPackage;`;
      if (!contents.includes(importLine)) {
        contents = contents.replace(
          /^(package .+;)$/m,
          `$1\nimport ${pkg}.QuickScanPackage;`
        );
      }
      const addLine = `packages.add(new QuickScanPackage())`;
      if (!contents.includes(addLine)) {
        contents = contents.replace(
          /(return packages;)/,
          `packages.add(new QuickScanPackage());\n            $1`
        );
      }
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

/* ================================================================== */
/*  Config plugin helpers — iOS                                        */
/* ================================================================== */

/** Write Share Extension source files into ios project. */
function withShareExtensionFiles(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const root = cfg.modRequest.projectRoot;
      const bundleId = cfg.ios?.bundleIdentifier ?? "com.angelaliii.guardcircle";
      const extDir = path.join(root, "ios", "ShareExtension");
      fs.mkdirSync(extDir, { recursive: true });

      fs.writeFileSync(
        path.join(extDir, "ShareViewController.swift"),
        getShareExtensionSwiftCode()
      );
      fs.writeFileSync(
        path.join(extDir, "Info.plist"),
        getShareExtensionInfoPlist(bundleId)
      );

      return cfg;
    },
  ]);
}

/** Add guardcircle:// URL scheme to the main app's Info.plist. */
function withUrlScheme(config) {
  return withInfoPlist(config, (cfg) => {
    if (!cfg.modResults.CFBundleURLTypes) {
      cfg.modResults.CFBundleURLTypes = [];
    }

    const existing = cfg.modResults.CFBundleURLTypes.find(
      (t) => t.CFBundleURLSchemes?.includes("guardcircle")
    );
    if (!existing) {
      cfg.modResults.CFBundleURLTypes.push({
        CFBundleURLName: "com.angelaliii.guardcircle",
        CFBundleURLSchemes: ["guardcircle"],
      });
    }

    return cfg;
  });
}

/* ================================================================== */
/*  Main plugin                                                        */
/* ================================================================== */

function withQuickScan(config) {
  // Android
  config = withJavaSources(config);
  config = withManifest(config);
  config = withPackageRegistration(config);

  // iOS
  config = withShareExtensionFiles(config);
  config = withUrlScheme(config);

  return config;
}

module.exports = withQuickScan;
