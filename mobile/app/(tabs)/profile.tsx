import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createBodyMetric, getLatestBodyMetric, getProfile } from "@/api/services";

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const latestMetric = useQuery({ queryKey: ["body", "latest"], queryFn: getLatestBodyMetric });
  const [weight, setWeight] = useState("72.5");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const mutation = useMutation({
    mutationFn: createBodyMetric,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["body"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });

  function saveBodyMetric() {
    mutation.mutate({
      record_date: new Date().toISOString().slice(0, 10),
      weight_kg: Number(weight),
      chest_cm: chest ? Number(chest) : undefined,
      waist_cm: waist ? Number(waist) : undefined,
      hip_cm: hip ? Number(hip) : undefined,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={styles.eyebrow}>基础资料</Text>
            <Text style={styles.title}>我的</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}><Text style={styles.cardHeaderText}>基础资料</Text><Text style={styles.badge}>Profile</Text></View>
            <DisplayField label="昵称" value={profile.data?.nickname ?? "加载中"} />
            <DisplayField label="性别" value={profile.data?.gender === "female" ? "女" : "男"} />
            <DisplayField label="年龄" value={profile.data ? `${profile.data.age}` : "--"} />
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}><Text style={styles.cardHeaderText}>身体信息</Text><Text style={styles.badge}>Body</Text></View>
            <DisplayField label="身高 cm" value={profile.data ? `${profile.data.height_cm}` : "--"} />
            <LabeledInput label="当前体重 kg" value={weight} onChangeText={setWeight} />
            <LabeledInput label="胸围 cm（选填）" value={chest} onChangeText={setChest} />
            <LabeledInput label="腰围 cm（选填）" value={waist} onChangeText={setWaist} />
            <LabeledInput label="臀围 cm（选填）" value={hip} onChangeText={setHip} />
            <Pressable disabled={mutation.isPending} onPress={saveBodyMetric} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{mutation.isPending ? "记录中" : "记录今日体重"}</Text>
            </Pressable>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.cardHeader}><Text style={styles.darkHeaderText}>算法结果</Text><Text style={styles.darkBadge}>{latestMetric.data?.body_fat_formula ?? "Body"}</Text></View>
            <View style={styles.metricGrid}>
              <Metric label="BMI" value={latestMetric.data?.bmi} />
              <Metric label="体脂率" value={latestMetric.data?.body_fat_percent} suffix="%" />
              <Metric label="BMR" value={latestMetric.data?.bmr} />
              <Metric label="TDEE" value={latestMetric.data?.tdee} />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}><Text style={styles.cardHeaderText}>软件设置</Text><Text style={styles.badge}>Settings</Text></View>
            <Text style={styles.hint}>主题：浅色</Text>
            <Text style={styles.hint}>提醒：开启后续接入</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LabeledInput({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput keyboardType="decimal-pad" onChangeText={onChangeText} style={styles.input} value={value} />
    </View>
  );
}

function DisplayField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.displayField}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.displayValue}>{value}</Text>
    </View>
  );
}

function Metric({ label, value, suffix = "" }: { label: string; value?: number; suffix?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value === undefined ? "--" : `${Math.round(value)}${suffix}`}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "#f4f4f6" },
  content: { gap: 18, padding: 18, paddingBottom: 120 },
  eyebrow: { alignSelf: "flex-start", backgroundColor: "#f7f7f9", borderColor: "rgba(0,0,0,0.08)", borderRadius: 999, borderWidth: 1, color: "#0a0a0a", fontSize: 13, fontWeight: "800", marginBottom: 10, paddingHorizontal: 12, paddingVertical: 8 },
  title: { color: "#0a0a0a", fontSize: 48, fontWeight: "900", letterSpacing: -2.5, lineHeight: 52 },
  card: { backgroundColor: "rgba(255,255,255,0.88)", borderColor: "rgba(255,255,255,0.86)", borderRadius: 30, borderWidth: 1, gap: 16, padding: 24, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 32, shadowOffset: { width: 14, height: 18 } },
  heroCard: { backgroundColor: "#111113", borderColor: "rgba(255,255,255,0.18)", borderRadius: 30, borderWidth: 1, gap: 18, padding: 24, shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 34, shadowOffset: { width: 14, height: 20 } },
  cardHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  cardHeaderText: { color: "#666666", fontSize: 15, fontWeight: "700" },
  darkHeaderText: { color: "rgba(255,255,255,0.72)", fontSize: 15, fontWeight: "700" },
  badge: { backgroundColor: "#ffffff", borderRadius: 999, color: "#0a0a0a", fontSize: 12, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 },
  darkBadge: { backgroundColor: "#ffffff", borderRadius: 999, color: "#111", fontSize: 12, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6 },
  field: { gap: 8 },
  label: { color: "#666666", fontSize: 13, fontWeight: "800" },
  input: { backgroundColor: "#f7f7f9", borderColor: "rgba(255,255,255,0.82)", borderRadius: 18, borderWidth: 1, color: "#0a0a0a", fontSize: 18, minHeight: 48, paddingHorizontal: 14, paddingVertical: 12 },
  displayField: { backgroundColor: "#ffffff", borderRadius: 18, gap: 4, padding: 14 },
  displayValue: { color: "#0a0a0a", fontSize: 18, fontWeight: "900" },
  secondaryButton: { alignItems: "center", backgroundColor: "#ffffff", borderRadius: 18, justifyContent: "center", minHeight: 48, padding: 12 },
  secondaryButtonText: { color: "#0a0a0a", fontWeight: "900" },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metric: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 22, minWidth: "47%", padding: 16 },
  metricValue: { color: "#fff", fontSize: 24, fontWeight: "900" },
  metricLabel: { color: "rgba(255,255,255,0.62)", fontSize: 12, marginTop: 4 },
  hint: { color: "#666666", fontSize: 15, lineHeight: 23 },
});