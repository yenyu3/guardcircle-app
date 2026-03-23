import { useAppStore } from '../store';

/**
 * 長輩模式 hook：只在 guardian 角色且開啟 elderMode 時生效。
 * 回傳 scale 倍率（1 或 1.25），可用於 fontSize * s.f、padding * s.p 等。
 */
export function useElderStyle() {
  const { currentUser, elderMode } = useAppStore();
  const active = currentUser.role === 'guardian' && elderMode;
  return {
    active,
    /** 字體倍率 */
    f: active ? 1.25 : 1,
    /** 間距倍率 */
    p: active ? 1.2 : 1,
    /** 圖示大小倍率 */
    i: active ? 1.3 : 1,
  };
}
