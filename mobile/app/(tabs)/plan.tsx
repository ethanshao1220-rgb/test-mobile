import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Alert,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createPlan, getLatestBodyMetric, getPlanSummary } from "@/api/services";

const periods = ["day", "week", "month"] as const;
type Period = (typeof periods)[number];

export default function PlanScreen() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<Period>("week");
  const [targetWeight, setTargetWeight] = useState("70");
  const [months, setMonths] = useState("2");
  const [frequency, setFrequency] = useState("3");
  const latestMetric = useQuery({ queryKey: ["body", "latest"], queryFn: getLatestBodyMetric });
  const summary = useQuery({
    queryKey: ["plans", "summary", period],
    queryFn: () => getPlanSummary(period),
  });
  const mutation = useMutation({
    mutationFn: createPlan,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["plans", "summary"] }),
      ]);
      Alert.alert("保存成功", "计划目标已更新。");
    },
    onError: (error) => {
      Alert.alert("保存失败", error instanceof Error ? error.message : "计划保存失败，请稍后重试。");
    },
  });

  const startWeight = latestMetric.data?.weight_kg;
  const canSave = startWeight !== undefined && Number.isFinite(Number(targetWeight));
  const durationDays = Math.max(Number(months) || 1, 1) * 30;
  const dailyDelta =
    startWeight === undefined ? null : ((Number(targetWeight) - startWeight) * 7700) / durationDays;

  function savePlan() {
    if (!canSave || startWeight === undefined) return;
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + durationDays - 1);
    mutation.mutate({
      goal_type: Number(targetWeight) < startWeight ? "fat_loss" : "muscle_gain",
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
      start_weight_kg: startWeight,
      target_weight_kg: Number(targetWeight),
      exercise_frequency_per_week: Number(frequency) || 0,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={styles.eyebrow}>周报复盘</Text>
            <Text style={styles.title}>计划</Text>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.darkHeaderText}>真实周期汇总</Text>
              <Text style={styles.darkBadge}>{periodLabel(period)}</Text>
            </View>
            {summary.isLoading ? (
              <Text style={styles.darkHint}>正在加载汇总数据</Text>
            ) : summary.isError || !summary.data ? (
              <Text style={styles.darkHint}>汇总数据加载失败，请稍后重试。</Text>
            ) : (
              <View style={styles.compareGrid}>
                <SummaryMetric
                  label="目标摄入"
                  value={`${Math.round(summary.data.target_intake)} kcal`}
                  dark
                />
                <SummaryMetric
                  label="已吃"
                  value={`${Math.round(summary.data.food_consumed)} kcal`}
                  dark
                />
                <SummaryMetric
                  label="运动回补"
                  value={`${Math.round(summary.data.exercise_burned)} kcal`}
                  dark
                />
                <SummaryMetric
                  label="剩余额度"
                  value={`${Math.round(summary.data.remaining_calories)} kcal`}
                  dark
                />
              </View>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderText}>目标设置</Text>
              <Text style={styles.badge}>Goal</Text>
            </View>
            <View style={styles.segmented}>
              {periods.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setPeriod(item)}
                  style={[styles.segment, period === item && styles.segmentActive]}
                >
                  <Text style={[styles.segmentText, period === item && styles.segmentTextActive]}>
                    {item === "day" ? "每天" : item === "week" ? "每周" : "每月"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <LabeledInput label="目标体重 kg" value={targetWeight} onChangeText={setTargetWeight} />
            <LabeledInput label="周期 月" value={months} onChangeText={setMonths} />
            <LabeledInput label="每周运动次数" value={frequency} onChangeText={setFrequency} />
            <Text style={styles.hint}>
              {dailyDelta === null
                ? "请先在我的页面记录体重，才能保存真实目标。"
                : `预计每日热量差：${Math.round(dailyDelta)} kcal`}
            </Text>
            <Pressable
              disabled={!canSave || mutation.isPending}
              onPress={savePlan}
              style={[
                styles.primaryButton,
                (!canSave || mutation.isPending) && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {mutation.isPending ? "保存中" : "保存目标"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={onChangeText}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function SummaryMetric({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <View style={styles.compareItem}>
      <Text style={dark ? styles.darkMetricLabel : styles.metricLabel}>{label}</Text>
      <Text style={dark ? styles.darkMetricValue : styles.metricValue}>{value}</Text>
    </View>
  );
}

function periodLabel(period: Period) {
  const labels: Record<Period, string> = {
    day: "今日",
    week: "本周",
    month: "本月",
  };
  return labels[period];
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "#f4f4f6" },
  content: { gap: 18, padding: 18, paddingBottom: 120 },
  eyebrow: {
    alignSelf: "flex-start",
    backgroundColor: "#f7f7f9",
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 999,
    borderWidth: 1,
    color: "#0a0a0a",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  title: { color: "#0a0a0a", fontSize: 48, fontWeight: "900", letterSpacing: -2.5, lineHeight: 52 },
  card: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderColor: "rgba(255,255,255,0.86)",
    borderRadius: 30,
    borderWidth: 1,
    gap: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 32,
    shadowOffset: { width: 14, height: 18 },
  },
  heroCard: {
    backgroundColor: "#111113",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 30,
    borderWidth: 1,
    gap: 18,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 34,
    shadowOffset: { width: 14, height: 20 },
  },
  cardHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  cardHeaderText: { color: "#666666", fontSize: 15, fontWeight: "700" },
  darkHeaderText: { color: "rgba(255,255,255,0.72)", fontSize: 15, fontWeight: "700" },
  badge: {
    backgroundColor: "#ffffff",
    borderRadius: 999,
    color: "#0a0a0a",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  darkBadge: {
    backgroundColor: "#ffffff",
    borderRadius: 999,
    color: "#111",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  compareGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  compareItem: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 22,
    minWidth: "47%",
    padding: 16,
  },
  metricLabel: { color: "#666666", fontSize: 12 },
  metricValue: { color: "#0a0a0a", fontSize: 22, fontWeight: "900" },
  darkMetricLabel: { color: "rgba(255,255,255,0.62)", fontSize: 12 },
  darkMetricValue: { color: "#fff", fontSize: 22, fontWeight: "900" },
  darkHint: { color: "rgba(255,255,255,0.72)", fontSize: 15, lineHeight: 22 },
  segmented: { backgroundColor: "#dedee3", borderRadius: 999, flexDirection: "row", padding: 4 },
  segment: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  segmentActive: { backgroundColor: "#ffffff" },
  segmentText: { color: "#666666", fontWeight: "800" },
  segmentTextActive: { color: "#0a0a0a" },
  field: { gap: 8 },
  label: { color: "#666666", fontSize: 13, fontWeight: "800" },
  input: {
    backgroundColor: "#f7f7f9",
    borderColor: "rgba(255,255,255,0.82)",
    borderRadius: 18,
    borderWidth: 1,
    color: "#0a0a0a",
    fontSize: 18,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  hint: { color: "#0a0a0a", fontSize: 16, fontWeight: "900" },
  buttonRow: { flexDirection: "row", gap: 12 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#050505",
    borderRadius: 18,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    padding: 12,
  },
  primaryButtonText: { color: "#fff", fontWeight: "900" },
  buttonDisabled: { opacity: 0.45 },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    padding: 12,
  },
  secondaryButtonText: { color: "#0a0a0a", fontWeight: "900" },
  dailyItem: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
  },
  dailyDate: { color: "#0a0a0a", fontWeight: "900" },
  dailyStatus: { color: "#666666", fontWeight: "700" },
  advice: { color: "#666666", fontSize: 15, lineHeight: 24 },
});
