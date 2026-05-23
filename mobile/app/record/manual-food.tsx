import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FoodLogInput, Unit } from "@/api/types";
import { flushOutbox } from "@/offline/sync";
import { submitFoodLogWithOffline } from "@/offline/submitLogs";
import { useSyncState } from "@/offline/useSyncState";

type FeedbackTone = "success" | "error" | "info";

type Feedback = {
  text: string;
  tone: FeedbackTone;
};

const units: Unit[] = ["g", "ml", "serving"];

export default function ManualFoodScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const syncState = useSyncState();
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("0");
  const [carbs, setCarbs] = useState("0");
  const [fat, setFat] = useState("0");
  const [quantity, setQuantity] = useState("100");
  const [unit, setUnit] = useState<Unit>("g");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function refreshAfterSubmit() {
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    await syncState.reload();
  }

  function buildInput(): FoodLogInput | null {
    const trimmedName = foodName.trim();
    const caloriesValue = Number(calories);
    const proteinValue = Number(protein);
    const carbsValue = Number(carbs);
    const fatValue = Number(fat);
    const quantityValue = Number(quantity);

    if (!trimmedName) {
      setFeedback({ text: "请输入食物名称。", tone: "error" });
      return null;
    }
    if (!Number.isFinite(caloriesValue) || caloriesValue < 0) {
      setFeedback({ text: "请输入有效热量。", tone: "error" });
      return null;
    }
    if (!Number.isFinite(proteinValue) || proteinValue < 0) {
      setFeedback({ text: "请输入有效蛋白质。", tone: "error" });
      return null;
    }
    if (!Number.isFinite(carbsValue) || carbsValue < 0) {
      setFeedback({ text: "请输入有效碳水。", tone: "error" });
      return null;
    }
    if (!Number.isFinite(fatValue) || fatValue < 0) {
      setFeedback({ text: "请输入有效脂肪。", tone: "error" });
      return null;
    }
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      setFeedback({ text: "请输入大于 0 的数量。", tone: "error" });
      return null;
    }

    return {
      food_name: trimmedName,
      calories: caloriesValue,
      protein: proteinValue,
      carbs: carbsValue,
      fat: fatValue,
      quantity: quantityValue,
      unit,
      timestamp: new Date().toISOString(),
    };
  }

  async function submit() {
    const input = buildInput();
    if (!input) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const result = await submitFoodLogWithOffline(input);
      await refreshAfterSubmit();
      setFeedback(
        result === "synced"
          ? { text: "已记录到今日饮食。", tone: "success" }
          : { text: "网络不可用，已离线保存，稍后会自动同步。", tone: "info" },
      );
      if (result === "queued") void flushOutbox().then(refreshAfterSubmit);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.topbar}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>← 返回</Text>
            </Pressable>
            <Text style={styles.title}>手动录入</Text>
            <View style={styles.topbarSpacer} />
          </View>

          {syncState.pendingCount > 0 || syncState.isSyncing ? (
            <View style={styles.syncBanner}>
              <Text style={styles.syncBannerText}>
                {syncState.isSyncing
                  ? "正在同步离线记录"
                  : `待同步 ${syncState.pendingCount} 条记录`}
              </Text>
              <Pressable
                disabled={syncState.isSyncing}
                onPress={() => void flushOutbox().then(refreshAfterSubmit)}
              >
                <Text style={styles.syncAction}>重试同步</Text>
              </Pressable>
            </View>
          ) : null}

          {feedback ? (
            <View style={[styles.feedback, styles[feedback.tone]]}>
              <Text style={styles.feedbackText}>{feedback.text}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <LabeledInput
              label="食物名称"
              value={foodName}
              onChangeText={setFoodName}
              keyboardType="default"
            />
            <LabeledInput label="热量 kcal" value={calories} onChangeText={setCalories} />
            <LabeledInput label="蛋白质 g" value={protein} onChangeText={setProtein} />
            <LabeledInput label="碳水 g" value={carbs} onChangeText={setCarbs} />
            <LabeledInput label="脂肪 g" value={fat} onChangeText={setFat} />
            <LabeledInput label="数量" value={quantity} onChangeText={setQuantity} />
            <View style={styles.unitRow}>
              {units.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setUnit(item)}
                  style={[styles.unitButton, unit === item && styles.unitButtonActive]}
                >
                  <Text style={[styles.unitText, unit === item && styles.unitTextActive]}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable disabled={isSubmitting} onPress={submit} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{isSubmitting ? "保存中" : "保存食物"}</Text>
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
  keyboardType = "decimal-pad",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "decimal-pad" | "default";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "#f4f4f6" },
  content: { gap: 16, padding: 18, paddingBottom: 80 },
  topbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  backButton: { minWidth: 56, paddingVertical: 8 },
  backText: { color: "#0a0a0a", fontSize: 16, fontWeight: "800" },
  title: { color: "#0a0a0a", fontSize: 17, fontWeight: "900" },
  topbarSpacer: { width: 56 },
  syncBanner: {
    alignItems: "center",
    backgroundColor: "#111113",
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  syncBannerText: { color: "rgba(255,255,255,0.78)", flex: 1, fontSize: 13, fontWeight: "800" },
  syncAction: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  feedback: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 },
  feedbackText: { color: "#0a0a0a", fontSize: 14, fontWeight: "800", lineHeight: 20 },
  success: { backgroundColor: "#e7f7ec" },
  error: { backgroundColor: "#f8e8e8" },
  info: { backgroundColor: "#ececf1" },
  card: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 30,
    gap: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 32,
    shadowOffset: { width: 14, height: 18 },
  },
  field: { gap: 8 },
  label: { color: "#666666", fontSize: 13, fontWeight: "800" },
  input: {
    backgroundColor: "#f7f7f9",
    borderColor: "rgba(255,255,255,0.82)",
    borderRadius: 18,
    borderWidth: 1,
    color: "#0a0a0a",
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  unitRow: { flexDirection: "row", gap: 10 },
  unitButton: {
    alignItems: "center",
    backgroundColor: "#dedee3",
    borderRadius: 999,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  unitButtonActive: { backgroundColor: "#050505" },
  unitText: { color: "#666666", fontWeight: "900" },
  unitTextActive: { color: "#ffffff" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#050505",
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 48,
    padding: 12,
  },
  primaryButtonText: { color: "#fff", fontWeight: "900" },
});
