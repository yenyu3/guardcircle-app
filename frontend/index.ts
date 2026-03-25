import { registerRootComponent } from "expo";

import App from "./App";
import { initScamProtection } from "./src/services/android/NotificationMonitor";

// 初始化 SMS 掃描 (如果是 Android)
initScamProtection();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
