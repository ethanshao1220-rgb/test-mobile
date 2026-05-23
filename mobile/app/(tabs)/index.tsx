import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getTodayDashboard } from "@/api/services";

export default function TodayScreen() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["dashboard", "today"], queryFn: getTodayDashboard });

  if (isLoading) return <CenteredMessage text="正在加载今日饮食执行" loading />;
  if (isError || !data) return <CenteredMessage text="今日数据加载失败" actionLabel="重试" onPress={() => void refetch()} />;

  const progress = Math.min(Math.max(data.completion_rate, 0), 100);
  const goalLabel = data.active_plan?.goal_type === "muscle_gain" ? "增肌" : "减脂";
  const hasLogged = data.food_consumed > 0 || data.exercise_burned > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topbar}>
          <View>
            <Text style={styles.eyebrow}>今日饮食执行</Text>
            <Text style={styles.title}>今天</Text>
          </View>
          <View style={styles.datePill}><Text style={styles.dateText}>{data.date}</Text></View>
        </View>

        <View style={styles.brandCard}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>F</Text></View>
          <View>
            <Text style={styles.brandTitle}>FitDiet</Text>
            <Text style={styles.brandSubtitle}>增肌减脂饮食助手</Text>
          </View>
        </View>

        <View style={styles.checkinCard}>
          <View>
            <Text style={styles.checkinKicker}>{hasLogged ? "今日已打卡" : "今日待打卡"}</Text>
            <Text style={styles.checkinTitle}>{hasLogged ? "今日已完成打卡" : "今天还没记录"}</Text>
            <Text style={styles.checkinText}>{hasLogged ? "已经完成一次记录，继续保持节奏。" : "先记一餐，完成今日饮食打卡。"}</Text>
          </View>
          <Link href="/record" asChild>
            <Pressable style={styles.primaryButton}><Text style={styles.primaryButtonText}>去记一餐</Text></Pressable>
          </Link>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderText}>还可以吃</Text>
            <Text style={styles.badge}>{goalLabel}</Text>
          </View>
          <View style={styles.gauge}>
            <Text style={styles.gaugeNumber}>{Math.round(data.remaining_calories)}</Text>
          </View>
          <Text style={styles.gaugeHint}>{data.remaining_calories >= 0 ? "剩余热量 kcal" : "已超出目标 kcal"}</Text>
          <View style={styles.compactLine}>
            <Text style={styles.compactText}>已吃 <Text style={styles.compactStrong}>{Math.round(data.food_consumed)}</Text></Text>
            <Text style={styles.compactText}>目标 <Text style={styles.compactStrong}>{Math.round(data.target_intake)}</Text></Text>
          </View>
          <View style={styles.progress}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderText}>三大营养素</Text>
            <Text style={styles.badge}>{Math.round(progress)}%</Text>
          </View>
          <MacroRow name="蛋白质" value={0} target={0} />
          <MacroRow name="碳水" value={0} target={0} />
          <MacroRow name="脂肪" value={0} target={0} />
          <Text style={styles.hint}>移动端当前接口暂未返回三大营养素明细，后续按旧版数据补齐。</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderText}>今日已记录食物</Text>
            <Text style={styles.badge}>明细</Text>
          </View>
          <Text style={styles.hint}>{hasLogged ? "今日已有记录。进入 + 可继续添加吃一点 / 动一下。" : "今天还没有记录食物。"}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderText}>今日建议</Text>
            <Text style={styles.badge}>Advice</Text>
          </View>
          <Text style={styles.advice}>先记录真实饮食，再根据剩余额度调整下一餐。</Text>
          <Text style={styles.advice}>如果今天运动了，消耗会回补到今日可吃额度。</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroRow({ name, value, target }: { name: string; value: number; target: number }) {
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroTop}><Text style={styles.macroName}>{name}</Text><Text style={styles.macroValue}>{value}g / {target}g</Text></View>
      <View style={styles.macroTrack}><View style={styles.macroFill} /></View>
    </View>
  );
}

function CenteredMessage({ text, loading, actionLabel, onPress }: { text: string; loading?: boolean; actionLabel?: string; onPress?: () => void }) {
  return (
    <SafeAreaView style={styles.centered}>
      {loading ? <ActivityIndicator color="#111111" /> : null}
      <Text style={styles.hint}>{text}</Text>
      {actionLabel ? <Pressable onPress={onPress} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{actionLabel}</Text></Pressable> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f4f4f6" },
  content: { gap: 18, padding: 18, paddingBottom: 120 },
  topbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  eyebrow: { alignSelf: "flex-start", backgroundColor: "#f7f7f9", borderColor: "rgba(0,0,0,0.08)", borderRadius: 999, borderWidth: 1, color: "#0a0a0a", fontSize: 13, fontWeight: "800", marginBottom: 10, paddingHorizontal: 12, paddingVertical: 8 },
  title: { color: "#0a0a0a", fontSize: 48, fontWeight: "900", letterSpacing: -2.5, lineHeight: 52 },
  datePill: { backgroundColor: "#ffffff", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 8, height: 10 } },
  dateText: { color: "#666666", fontSize: 12, fontWeight: "800" },
  brandCard: { alignItems: "center", backgroundColor: "#111113", borderRadius: 30, flexDirection: "row", gap: 12, padding: 20, shadowColor: "#000", shadowOpacity: 0.24, shadowRadius: 28, shadowOffset: { width: 12, height: 18 } },
  brandMark: { alignItems: "center", backgroundColor: "#050505", borderRadius: 18, height: 46, justifyContent: "center", width: 46 },
  brandMarkText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  brandTitle: { color: "#fff", fontSize: 18, fontWeight: "900", letterSpacing: -0.6 },
  brandSubtitle: { color: "rgba(255,255,255,0.62)", fontSize: 12, marginTop: 2 },
  checkinCard: { backgroundColor: "#111113", borderColor: "rgba(255,255,255,0.18)", borderRadius: 30, borderWidth: 1, gap: 18, padding: 24, shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 34, shadowOffset: { width: 14, height: 20 } },
  checkinKicker: { color: "rgba(255,255,255,0.72)", fontSize: 13, fontWeight: "800", marginBottom: 8 },
  checkinTitle: { color: "#fff", fontSize: 28, fontWeight: "900", letterSpacing: -1.2 },
  checkinText: { color: "rgba(255,255,255,0.72)", fontSize: 15, lineHeight: 22, marginTop: 8 },
  card: { backgroundColor: "rgba(255,255,255,0.88)", borderColor: "rgba(255,255,255,0.86)", borderRadius: 30, borderWidth: 1, gap: 14, padding: 24, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 32, shadowOffset: { width: 14, height: 18 } },
  cardHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  cardHeaderText: { color: "#666666", fontSize: 15, fontWeight: "700" },
  badge: { backgroundColor: "#ffffff", borderRadius: 999, color: "#0a0a0a", fontSize: 12, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 },
  gauge: { alignItems: "center", alignSelf: "center", backgroundColor: "#f0f0f3", borderRadius: 88, height: 176, justifyContent: "center", marginVertical: 4, width: 176 },
  gaugeNumber: { color: "#050505", fontSize: 48, fontWeight: "900", letterSpacing: -2 },
  gaugeHint: { color: "#666666", fontSize: 13, fontWeight: "700", textAlign: "center" },
  compactLine: { flexDirection: "row", justifyContent: "space-between" },
  compactText: { color: "#666666", fontSize: 14 },
  compactStrong: { color: "#0a0a0a", fontWeight: "900" },
  progress: { backgroundColor: "#dedee3", borderRadius: 999, height: 14, overflow: "hidden", padding: 3 },
  progressFill: { backgroundColor: "#050505", borderRadius: 999, height: "100%" },
  macroRow: { gap: 8 },
  macroTop: { flexDirection: "row", justifyContent: "space-between" },
  macroName: { color: "#0a0a0a", fontWeight: "800" },
  macroValue: { color: "#666666", fontWeight: "800" },
  macroTrack: { backgroundColor: "#dedee3", borderRadius: 999, height: 12, overflow: "hidden" },
  macroFill: { backgroundColor: "#050505", borderRadius: 999, height: "100%", width: "0%" },
  hint: { color: "#666666", fontSize: 14, lineHeight: 21 },
  advice: { color: "#666666", fontSize: 15, lineHeight: 24 },
  primaryButton: { alignItems: "center", backgroundColor: "#050505", borderRadius: 18, minHeight: 48, justifyContent: "center", paddingHorizontal: 16, paddingVertical: 12 },
  primaryButtonText: { color: "#fff", fontSize: 15, fontWeight: "900" },
  secondaryButton: { backgroundColor: "#ffffff", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 },
  secondaryButtonText: { color: "#0a0a0a", fontWeight: "900" },
  centered: { alignItems: "center", flex: 1, gap: 12, justifyContent: "center", padding: 24, backgroundColor: "#f4f4f6" },
});