import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import { Colors, Radius, Shadow } from "../theme";
import { useAppStore } from "../store";
import { mockEvents } from "../mock";
import { useElderStyle } from "../hooks/useElderStyle";

const DS = {
  primary: "#89502e",
  primaryContainer: "#ffb38a",
  onSurface: "#1f1b12",
  onSurfaceVariant: "#52443c",
  surfaceContainerLow: "#fcf2e3",
  surfaceContainerHighest: "#ebe1d3",
  outlineVariant: "#d7c2b9",
};

// ── Radar Chart ───────────────────────────────────────────────
type RadarAxis = { label: string; value: number };

function RadarChart({ axes }: { axes: RadarAxis[] }) {
  const SIZE = 180;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = 62;
  const n = axes.length;
  const LABEL_OFFSET = 18;

  function point(i: number, ratio: number) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      x: cx + R * ratio * Math.cos(angle),
      y: cy + R * ratio * Math.sin(angle),
    };
  }

  function labelPoint(i: number) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      x: cx + (R + LABEL_OFFSET) * Math.cos(angle),
      y: cy + (R + LABEL_OFFSET) * Math.sin(angle),
    };
  }

  function toPath(pts: { x: number; y: number }[]) {
    return (
      pts
        .map(
          (p, i) =>
            `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
        )
        .join(" ") + " Z"
    );
  }

  const gridLevels = [0.33, 0.66, 1];
  const dataPoints = axes.map((a, i) => point(i, Math.max(a.value, 0.06)));
  const gridPaths = gridLevels.map((lvl) =>
    toPath(axes.map((_, i) => point(i, lvl))),
  );
  const dataPath = toPath(dataPoints);

  return (
    <View style={{ width: SIZE, height: SIZE, alignSelf: "center" }}>
      <Svg width={SIZE} height={SIZE}>
        <Defs>
          <SvgLinearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={DS.primary} stopOpacity="0.4" />
            <Stop
              offset="1"
              stopColor={DS.primaryContainer}
              stopOpacity="0.2"
            />
          </SvgLinearGradient>
        </Defs>
        {/* grid */}
        {gridPaths.map((d, i) => (
          <Path
            key={i}
            d={d}
            stroke={DS.outlineVariant}
            strokeWidth={1}
            fill="none"
          />
        ))}
        {/* axis lines */}
        {axes.map((_, i) => {
          const to = point(i, 1);
          return (
            <Path
              key={i}
              d={`M ${cx} ${cy} L ${to.x.toFixed(1)} ${to.y.toFixed(1)}`}
              stroke={DS.outlineVariant}
              strokeWidth={1}
              fill="none"
            />
          );
        })}
        {/* data area */}
        <Path
          d={dataPath}
          fill="url(#radarFill)"
          stroke={DS.primary}
          strokeWidth={2}
        />
        {/* data dots */}
        {dataPoints.map((p, i) => (
          <Path
            key={i}
            d={`M ${p.x} ${p.y} m -4 0 a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0`}
            fill={DS.primary}
          />
        ))}
      </Svg>
      {/* labels outside SVG for text rendering */}
      {axes.map((a, i) => {
        const lp = labelPoint(i);
        return (
          <Text
            key={i}
            style={[
              styles.radarLabel,
              {
                position: "absolute",
                left: lp.x - 24,
                top: lp.y - 10,
                width: 48,
                textAlign: "center",
              },
            ]}
          >
            {a.label}
          </Text>
        );
      })}
    </View>
  );
}

// ── Section Header ────────────────────────────────────────────
function SectionHeader({ title, elderScale }: { title: string; elderScale?: number }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <Text style={[styles.sectionTitle, elderScale ? { fontSize: 18 * elderScale } : undefined]}>{title}</Text>
    </View>
  );
}

// ── Stat Row ──────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.statCard}>
      <View
        style={[
          styles.statIconBox,
          { backgroundColor: (color ?? DS.primary) + "22" },
        ]}
      >
        <Ionicons name={icon as any} size={20} color={color ?? DS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────
export default function WeeklyReportScreen() {
  const navigation = useNavigation();
  const { currentUser, events, family } = useAppStore();
  const s = useElderStyle();
  const role = currentUser.role;

  // 從 store.events 動態計算所有數據
  const totalScans = events.length;
  const blocked = events.filter(
    (e) => e.status === "safe" && e.riskLevel !== "safe",
  ).length;
  const highRisk = events.filter((e) => e.riskLevel === "high").length;
  const safePct =
    totalScans > 0
      ? Math.round(((totalScans - highRisk) / totalScans) * 100)
      : 0;
  const blockPct =
    totalScans > 0 ? Math.round((blocked / totalScans) * 100) : 0;

  // 成員查詢統計：從 events 按 userNickname 分組
  const memberStatsMap: Record<string, { scans: number; blocked: number }> = {};
  events.forEach((e) => {
    if (!memberStatsMap[e.userNickname])
      memberStatsMap[e.userNickname] = { scans: 0, blocked: 0 };
    memberStatsMap[e.userNickname].scans += 1;
    if (e.status === "safe" && e.riskLevel !== "safe")
      memberStatsMap[e.userNickname].blocked += 1;
  });
  const memberStats = Object.entries(memberStatsMap).map(([nickname, v]) => ({
    nickname,
    ...v,
  }));

  // 最常見詐騙類型
  const scamTypeCounts: Record<string, number> = {};
  events
    .filter((e) => e.scamType && e.scamType !== "無")
    .forEach((e) => {
      scamTypeCounts[e.scamType] = (scamTypeCounts[e.scamType] ?? 0) + 1;
    });
  const topScamType =
    Object.entries(scamTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "無詐騙記錄";

  // 雷達圖資料
  const activeMembers = family.members.filter((m) =>
    events.some((e) => e.userNickname === m.nickname),
  ).length;
  const resolvedCount = events.filter((e) => e.resolvedAt).length;
  const resolveRate = events.length > 0 ? resolvedCount / events.length : 0;

  const axes: RadarAxis[] = [
    { label: "查詢量", value: Math.min(totalScans / 20, 1) },
    { label: "攔截率", value: blockPct / 100 },
    { label: "安全率", value: safePct / 100 },
    {
      label: "成員活躍",
      value: Math.min(activeMembers / Math.max(family.members.length, 1), 1),
    },
    { label: "處理速度", value: resolveRate },
  ];

  const handleDownloadPdf = async () => {
    const memberRows = memberStats
      .map(
        (m) =>
          `<tr>
            <td>${m.nickname}</td>
            <td style="text-align:center">${m.scans}</td>
            <td style="text-align:center;color:${m.blocked > 0 ? '#16a34a' : '#52443c'}">${m.blocked}</td>
          </tr>`,
      )
      .join('');

    const trendRows = [
      { label: '假冒銀行客服', change: '+34%', up: true },
      { label: '投資詐騙', change: '+18%', up: true },
      { label: '網路購物詐騙', change: '-5%', up: false },
    ]
      .map(
        (t) =>
          `<tr>
            <td>${t.label}</td>
            <td style="text-align:right;font-weight:700;color:${t.up ? '#dc2626' : '#16a34a'}">${t.change}</td>
          </tr>`,
      )
      .join('');

    const solverSection =
      role === 'solver'
        ? `<div class="section">
            <div class="section-header"><div class="accent"></div><span>個人貢獻</span></div>
            <div class="stats-grid">
              <div class="stat-item"><div class="stat-num" style="color:#89502e">${currentUser.contributionPoints ?? 0}</div><div class="stat-label">累積積分</div></div>
              <div class="stat-item"><div class="stat-num">${currentUser.reportCount ?? 0}</div><div class="stat-label">舉報次數</div></div>
            </div>
          </div>`
        : '';

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, sans-serif; background: #fff8f1; color: #1f1b12; padding: 32px; }
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .logo { font-size: 13px; font-weight: 800; color: #89502e; letter-spacing: 2px; }
  .date-badge { font-size: 11px; font-weight: 700; color: #89502e; background: rgba(137,80,46,0.12); border: 1px solid rgba(137,80,46,0.25); border-radius: 99px; padding: 4px 12px; letter-spacing: 1px; }
  h1 { font-size: 22px; font-weight: 800; color: #1f1b12; line-height: 1.4; margin-bottom: 4px; }
  .meta { font-size: 11px; color: #89502e88; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 28px; }
  .section { margin-bottom: 24px; }
  .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .accent { width: 4px; height: 20px; border-radius: 2px; background: #89502e; }
  .section-header span { font-size: 16px; font-weight: 700; color: #1f1b12; }
  .stats-grid { display: flex; background: #fcf2e3; border-radius: 12px; padding: 16px; gap: 0; }
  .stat-item { flex: 1; text-align: center; }
  .stat-item + .stat-item { border-left: 1px solid #d7c2b9; }
  .stat-num { font-size: 26px; font-weight: 900; }
  .stat-label { font-size: 10px; font-weight: 600; color: #52443c; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; }
  th { background: #fcf2e3; font-size: 11px; font-weight: 700; color: #52443c; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 14px; text-align: left; }
  td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid #ebe1d3; }
  tr:last-child td { border-bottom: none; }
  .scam-box { background: #fef2f2; border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 12px; }
  .scam-icon { font-size: 20px; }
  .scam-type { font-size: 18px; font-weight: 800; }
  .scam-hint { font-size: 12px; color: #52443c; margin-top: 6px; }
  .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #89502e88; }
</style>
</head>
<body>
  <div class="header">
    <span class="logo">GUARDCIRCLE</span>
    <span class="date-badge">WEEKLY · 2026/03/23 – 03/29</span>
  </div>
  <h1>03/23 – 03/29 家庭防詐報告</h1>
  <div class="meta">2026/03/23 – 03/29</div>

  <div class="section">
    <div class="section-header"><div class="accent"></div><span>本週數據總覽</span></div>
    <div class="stats-grid">
      <div class="stat-item"><div class="stat-num">${totalScans}</div><div class="stat-label">總查詢</div></div>
      <div class="stat-item"><div class="stat-num" style="color:#16a34a">${blocked}</div><div class="stat-label">攔截</div></div>
      <div class="stat-item"><div class="stat-num" style="color:#dc2626">${highRisk}</div><div class="stat-label">高風險</div></div>
      <div class="stat-item"><div class="stat-num" style="color:#89502e">${safePct}%</div><div class="stat-label">安全率</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-header"><div class="accent"></div><span>${role === 'guardian' ? '守護你的人' : '成員查詢統計'}</span></div>
    <table>
      <thead><tr><th>成員</th><th style="text-align:center">查詢次數</th><th style="text-align:center">攔截次數</th></tr></thead>
      <tbody>${memberRows}</tbody>
    </table>
  </div>

  ${solverSection}

  <div class="section">
    <div class="section-header"><div class="accent"></div><span>本週最常見詐騙</span></div>
    <div class="scam-box">
      <span class="scam-icon">⚠️</span>
      <div><div class="scam-type">${topScamType}</div><div class="scam-hint">遇到此類訊息請先傳給守護圈確認，不要獨自判斷。</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-header"><div class="accent"></div><span>本週詐騙趨勢</span></div>
    <table>
      <thead><tr><th>詐騙類型</th><th style="text-align:right">趨勢</th></tr></thead>
      <tbody>${trendRows}</tbody>
    </table>
  </div>

  <div class="footer">由 GuardCircle 自動產生 · ${new Date().toLocaleDateString('zh-TW')}</div>
</body>
</html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const fileName = 'GuardCircle_家庭防詐報告_2026-03-23.pdf';
      const destUri = FileSystem.cacheDirectory + fileName;
      await FileSystem.copyAsync({ from: uri, to: destUri });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(destUri, { mimeType: 'application/pdf', dialogTitle: 'GuardCircle 家庭防詐報告 2026-03-23' });
      } else {
        Alert.alert('提示', '此裝置不支援分享功能');
      }
    } catch {
      Alert.alert('錯誤', '產生 PDF 失敗，請稍後再試');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={DS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>本週報告</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero headline */}
        <Text style={[styles.heroTitle, s.active && { fontSize: 22 * s.f, lineHeight: 32 * s.f }]}>03/23 – 03/29 家庭防詐報告</Text>
        <View style={styles.metaRow}>
          <View style={styles.tagPill}>
            <Text style={styles.tagText}>WEEKLY</Text>
          </View>
          <Text style={styles.metaDate}>2026/03/23 – 03/29</Text>
        </View>

        {/* Summary stats */}
        <SectionHeader title="本週數據總覽" />
        <View style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statsGridItem}>
              <Text style={[styles.statsGridNum, s.active && { fontSize: 22 * s.f }]}>{totalScans}</Text>
              <Text style={[styles.statsGridLabel, s.active && { fontSize: 11 * s.f }]}>總查詢</Text>
            </View>
            <View style={styles.statsGridDivider} />
            <View style={styles.statsGridItem}>
              <Text style={[styles.statsGridNum, { color: Colors.safe }, s.active && { fontSize: 22 * s.f }]}>
                {blocked}
              </Text>
              <Text style={[styles.statsGridLabel, s.active && { fontSize: 11 * s.f }]}>攔截</Text>
            </View>
            <View style={styles.statsGridDivider} />
            <View style={styles.statsGridItem}>
              <Text style={[styles.statsGridNum, { color: Colors.danger }, s.active && { fontSize: 22 * s.f }]}>
                {highRisk}
              </Text>
              <Text style={[styles.statsGridLabel, s.active && { fontSize: 11 * s.f }]}>高風險</Text>
            </View>
            <View style={styles.statsGridDivider} />
            <View style={styles.statsGridItem}>
              <Text style={[styles.statsGridNum, { color: DS.primary }, s.active && { fontSize: 22 * s.f }]}>
                {safePct}%
              </Text>
              <Text style={[styles.statsGridLabel, s.active && { fontSize: 11 * s.f }]}>安全率</Text>
            </View>
          </View>
        </View>

        {/* Radar Chart — gatekeeper & solver only */}
        {role !== 'guardian' && (
          <>
            <SectionHeader title="防詐能力雷達" />
            <View style={styles.radarCard}>
              <RadarChart axes={axes} />
              <Text style={styles.radarHint}>五項指標綜合評估本週守護表現</Text>
            </View>
          </>
        )}

        {/* Role-specific sections */}
        {role === "guardian" && (
          <>
            <SectionHeader title="守護你的人" elderScale={s.active ? s.f : undefined} />
            <View style={styles.memberListCard}>
              {memberStats.map((m, i) => (
                <View
                  key={m.nickname}
                  style={[
                    styles.memberRow,
                    i < memberStats.length - 1 && styles.memberRowBorder,
                    s.active && { paddingVertical: 14 * s.p },
                  ]}
                >
                  <View style={[styles.memberAvatar, s.active && { width: 36 * s.i, height: 36 * s.i, borderRadius: 18 * s.i }]}>
                    <Text style={[styles.memberAvatarText, s.active && { fontSize: 15 * s.f }]}>{m.nickname[0]}</Text>
                  </View>
                  <Text style={[styles.memberName, s.active && { fontSize: 14 * s.f }]}>{m.nickname}</Text>
                  <Text style={[styles.memberStat, s.active && { fontSize: 13 * s.f }]}>查詢 {m.scans} 次</Text>
                  {m.blocked > 0 && (
                    <View style={styles.blockedPill}>
                      <Text style={[styles.blockedText, s.active && { fontSize: 11 * s.f }]}>擋下 {m.blocked}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            <SectionHeader title="本週最常見詐騙" elderScale={s.active ? s.f : undefined} />
            <View style={styles.topScamCard}>
              <View style={styles.topScamIconRow}>
                <Ionicons name="warning" size={s.active ? 24 * s.i : 24} color={Colors.danger} />
                <Text style={[styles.topScamType, s.active && { fontSize: 20 * s.f }]}>{topScamType}</Text>
              </View>
              <Text style={[styles.topScamHint, s.active && { fontSize: 13 * s.f, lineHeight: 22 * s.f }]}>
                遇到此類訊息請先傳給守護圈確認，不要獨自判斷。
              </Text>
            </View>
          </>
        )}

        {role === "gatekeeper" && (
          <>
            <SectionHeader title="成員查詢統計" />
            <View style={styles.memberListCard}>
              {memberStats.map((m, i) => (
                <View
                  key={m.nickname}
                  style={[
                    styles.memberRow,
                    i < memberStats.length - 1 && styles.memberRowBorder,
                  ]}
                >
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{m.nickname[0]}</Text>
                  </View>
                  <Text style={styles.memberName}>{m.nickname}</Text>
                  <Text style={styles.memberStat}>查詢 {m.scans} 次</Text>
                  {m.blocked > 0 && (
                    <View style={styles.blockedPill}>
                      <Text style={styles.blockedText}>擋下 {m.blocked}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            <SectionHeader title="本週最常見詐騙" />
            <View style={styles.topScamCard}>
              <View style={styles.topScamIconRow}>
                <Ionicons name="warning" size={24} color={Colors.danger} />
                <Text style={styles.topScamType}>{topScamType}</Text>
              </View>
              <Text style={styles.topScamHint}>
                提醒家人遇到此類訊息立即回報，勿自行處理。
              </Text>
            </View>

            <SectionHeader title="本週詐騙趨勢" />
            <View style={styles.trendCard}>
              {[
                { label: "假冒銀行客服", change: "+34%", up: true },
                { label: "投資詐騙", change: "+18%", up: true },
                { label: "網路購物詐騙", change: "-5%", up: false },
              ].map((t) => (
                <View key={t.label} style={styles.trendRow}>
                  <Ionicons
                    name={t.up ? "trending-up" : "trending-down"}
                    size={18}
                    color={t.up ? Colors.danger : Colors.safe}
                  />
                  <Text style={styles.trendLabel}>{t.label}</Text>
                  <Text
                    style={[
                      styles.trendChange,
                      { color: t.up ? Colors.danger : Colors.safe },
                    ]}
                  >
                    {t.change}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {role === "solver" && (
          <>
            <SectionHeader title="個人貢獻" />
            <View style={styles.summaryCard}>
              <StatCard
                icon="star"
                label="累積積分"
                value={`${currentUser.contributionPoints ?? 0} 分`}
                color={DS.primary}
              />
              <StatCard
                icon="flag"
                label="舉報次數"
                value={`${currentUser.reportCount ?? 0} 次`}
              />
              <StatCard
                icon="shield-checkmark"
                label="本週攔截貢獻"
                value={`${blocked} 次`}
                color={Colors.safe}
              />
            </View>

            <SectionHeader title="本週詐騙趨勢" />
            <View style={styles.trendCard}>
              {[
                { label: "假冒銀行客服", change: "+34%", up: true },
                { label: "投資詐騙", change: "+18%", up: true },
                { label: "網路購物詐騙", change: "-5%", up: false },
              ].map((t) => (
                <View key={t.label} style={styles.trendRow}>
                  <Ionicons
                    name={t.up ? "trending-up" : "trending-down"}
                    size={18}
                    color={t.up ? Colors.danger : Colors.safe}
                  />
                  <Text style={styles.trendLabel}>{t.label}</Text>
                  <Text
                    style={[
                      styles.trendChange,
                      { color: t.up ? Colors.danger : Colors.safe },
                    ]}
                  >
                    {t.change}
                  </Text>
                </View>
              ))}
            </View>

            <SectionHeader title="最常見詐騙" />
            <View style={styles.topScamCard}>
              <View style={styles.topScamIconRow}>
                <Ionicons name="warning" size={24} color={Colors.danger} />
                <Text style={styles.topScamType}>{topScamType}</Text>
              </View>
              <Text style={styles.topScamHint}>
                持續回報此類案例，幫助更多人識破詐騙。
              </Text>
            </View>
          </>
        )}

        {/* Download PDF CTA — gatekeeper only */}
        {role === 'gatekeeper' && (
          <TouchableOpacity
            onPress={handleDownloadPdf}
            activeOpacity={0.85}
            style={{ marginTop: 32 }}
          >
            <LinearGradient
              colors={[DS.primary, DS.primaryContainer]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shareBtn}
            >
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.shareBtnText}>下載家庭報告</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.bg,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: DS.primary },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  container: { paddingHorizontal: 20, paddingBottom: 48 },

  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: DS.onSurface,
    lineHeight: 32,
    letterSpacing: -0.3,
    marginTop: 8,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  tagPill: {
    backgroundColor: "rgba(137,80,46,0.15)",
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(137,80,46,0.25)",
  },
  tagText: {
    fontSize: 11,
    fontWeight: "800",
    color: DS.primary,
    letterSpacing: 1,
  },
  metaDate: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1f1b1266",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  statsCard: {
    backgroundColor: DS.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: 20,
    marginBottom: 28,
  },
  summaryCard: {
    backgroundColor: DS.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: 20,
    marginBottom: 28,
    gap: 12,
  },
  statsGrid: { flexDirection: "row", alignItems: "center" },
  statsGridItem: { flex: 1, alignItems: "center", gap: 4 },
  statsGridNum: { fontSize: 22, fontWeight: "900", color: DS.onSurface },
  statsGridLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: DS.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statsGridDivider: {
    width: 1,
    height: 40,
    backgroundColor: DS.outlineVariant,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  sectionAccent: {
    width: 4,
    height: 22,
    borderRadius: 2,
    backgroundColor: DS.primary,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: DS.onSurface },

  radarCard: {
    backgroundColor: DS.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: 20,
    marginBottom: 28,
    alignItems: "center",
    gap: 8,
  },
  radarLabel: { fontSize: 10, fontWeight: "700", color: DS.onSurfaceVariant },
  radarHint: { fontSize: 12, color: DS.onSurfaceVariant, textAlign: "center" },

  memberListCard: {
    backgroundColor: "#fff",
    borderRadius: Radius.lg,
    marginBottom: 28,
    overflow: "hidden",
    ...Shadow.card,
    borderWidth: 1,
    borderColor: DS.primary + "0D",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: DS.surfaceContainerHighest,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.surfaceContainerHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: { fontSize: 15, fontWeight: "700", color: DS.primary },
  memberName: { flex: 1, fontSize: 14, fontWeight: "600", color: DS.onSurface },
  memberStat: { fontSize: 13, color: DS.onSurfaceVariant },
  blockedPill: {
    backgroundColor: Colors.safeBg,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  blockedText: { fontSize: 11, fontWeight: "700", color: Colors.safe },

  topScamCard: {
    backgroundColor: Colors.dangerBg,
    borderRadius: Radius.lg,
    padding: 20,
    marginBottom: 28,
    gap: 10,
  },
  topScamIconRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  topScamType: { fontSize: 20, fontWeight: "800", color: DS.onSurface },
  topScamHint: { fontSize: 13, color: DS.onSurfaceVariant, lineHeight: 20 },

  trendCard: {
    backgroundColor: DS.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: 20,
    marginBottom: 28,
    gap: 14,
  },
  trendRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  trendLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: DS.onSurface },
  trendChange: { fontSize: 15, fontWeight: "800" },

  statCard: { flexDirection: "row", alignItems: "center", gap: 14 },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: { fontSize: 12, color: DS.onSurfaceVariant, fontWeight: "500" },
  statValue: { fontSize: 18, fontWeight: "800", color: DS.onSurface },

  shareBtn: {
    borderRadius: Radius.lg,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    ...Shadow.strong,
  },
  shareBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
