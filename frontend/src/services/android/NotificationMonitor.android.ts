import * as Notifications from "expo-notifications";
import { PermissionsAndroid, Platform } from "react-native";
import SmsAndroid from "react-native-get-sms-android";

// 1. 定義高風險關鍵字 (可從後端動態更新)
const RISK_KEYWORDS = [
  "ATM",
  "解除分期",
  "輔助認證",
  "飆股",
  "強勢股",
  "領取飆股",
  "帳戶凍結",
  "安全帳戶",
  "LINE Pay",
  "驗證碼",
  "http",
  "https",
  "bit.ly",
  "goo.gl",
];

// 2. 檢查是否為詐騙訊息
const isScamMessage = (text: string | null): boolean => {
  if (!text) return false;
  return RISK_KEYWORDS.some((keyword) => text.includes(keyword));
};

// 3. 掃描最近的簡訊
export const scanSmsMessages = async (count: number = 10) => {
  try {
    const filter = {
      box: "inbox",
      read: 0, // 0 = unread, 1 = read
      indexFrom: 0,
      maxCount: count,
    };

    SmsAndroid.list(
      JSON.stringify(filter),
      (fail: string) => {
        console.log("Failed with this error: " + fail);
      },
      (count: number, smsList: string) => {
        const arr = JSON.parse(smsList);

        arr.forEach(async (object: any) => {
          const { body, address } = object;
          console.log(`收到簡訊: [${address}] ${body}`);

          if (isScamMessage(body)) {
            // 觸發本地警告通知
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "⚠️ 疑似詐騙簡訊",
                body: `偵測到來自 ${address} 的可疑訊息，請勿點擊連結或提供個資！`,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
                data: { detectedText: body },
              },
              trigger: null, // 立即發送
            });
          }
        });
      },
    );
  } catch (error) {
    console.error(error);
  }
};

// 4. 初始化監聽器 (在 App 啟動時呼叫)
export const initScamProtection = async () => {
  if (Platform.OS === "android") {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: "需要簡訊權限",
          message: "GuardCircle 需要讀取您的簡訊以協助偵測詐騙訊息",
          buttonNeutral: "稍後询问",
          buttonNegative: "取消",
          buttonPositive: "確定",
        },
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log("SMS permission granted");
        // 初始化後執行一次掃描
        scanSmsMessages();
      } else {
        console.log("SMS permission denied");
      }
    } catch (err) {
      console.warn(err);
    }
  }
};

// 移除 Headless Task 匯出，因為 react-native-get-sms-android 不支援背景監聽
export const notificationHeadlessTask = null;
export const RNAndroidNotificationListenerHeadlessJsName = null;
