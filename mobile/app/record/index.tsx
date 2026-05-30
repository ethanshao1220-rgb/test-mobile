import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getProfile, searchFoods } from "@/api/services";
import type { ExerciseLogInput, Food, FoodLogInput, Unit } from "@/api/types";
import { submitExerciseLogWithOffline, submitFoodLogWithOffline } from "@/offline/submitLogs";
import { flushOutbox } from "@/offline/sync";
import { useSyncState } from "@/offline/useSyncState";

type RecordTab = "food" | "exercise";
type FeedbackTone = "success" | "error" | "info";

type Feedback = {
  text: string;
  tone: FeedbackTone;
};

type ExercisePreset = {
  key: string;
  label: string;
  met: number;
};

const exercisePresets: ExercisePreset[] = [
  { key: "running", label: "跑步", met: 8.3 },
  { key: "walking", label: "快走", met: 4.3 },
  { key: "basketball", label: "篮球", met: 6.5 },
  { key: "strength", label: "力量训练", met: 5.0 },
];

export default function RecordScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const syncState = useSyncState();
  const profile = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const [tab, setTab] = useState<RecordTab>("food");
  const [keyword, setKeyword] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [exerciseName, setExerciseName] = useState(exercisePresets[0].label);
  const [duration, setDuration] = useState("30");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const foods = useQuery({
    queryKey: ["foods", keyword],
    queryFn: () => searchFoods(keyword),
    enabled: keyword.trim().length > 0,
  });

  const selectedFood = foods.data?.find((item) => item.id === selectedFoodId) ?? null;
  const selectedUnitOption =
    selectedFood?.unit_options.find((option) => option.unit === selectedUnit) ?? null;
  const suggestedBurned = (() => {
    const preset = exercisePresets.find((item) => item.label === exerciseName);
    const weight = profile.data?.current_weight_kg;
    const durationValue = Number(duration);
    if (!preset || !weight || !Number.isFinite(durationValue) || durationValue <= 0) return "";
    return String(estimateCalories(preset.met, weight, durationValue));
  })();

  async function refreshAfterSubmit() {
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    await syncState.reload();
  }

  async function submitFoodLog(input: FoodLogInput) {
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

  async function submitExerciseLog(input: ExerciseLogInput) {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const result = await submitExerciseLogWithOffline(input);
      await refreshAfterSubmit();
      setFeedback(
        result === "synced"
          ? { text: "已记录到今日运动。", tone: "success" }
          : { text: "网络不可用，已离线保存，稍后会自动同步。", tone: "info" },
      );
      if (result === "queued") void flushOutbox().then(refreshAfterSubmit);
    } finally {
      setIsSubmitting(false);
    }
  }

  function selectFood(food: Food) {
    const defaultUnit = food.unit_options[0];
    setSelectedFoodId(food.id);
    setSelectedUnit(defaultUnit?.unit ?? food.unit);
    setAmount(String(defaultUnit ? defaultUnit.ratio : food.quantity));
    setFeedback({ text: `已选择 ${food.name}，请确认单位和数量后添加。`, tone: "info" });
  }

  function logFood() {
    if (!selectedFood || !selectedUnitOption) {
      setFeedback({ text: "请先选择一个食物。", tone: "error" });
      return;
    }
    const quantity = Number(amount);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setFeedback({ text: "请输入大于 0 的食物数量。", tone: "error" });
      return;
    }
    const normalizedQuantity = quantity * selectedUnitOption.ratio;
    const ratio = selectedFood.quantity ? normalizedQuantity / selectedFood.quantity : 1;
    void submitFoodLog({
      food_name: selectedFood.name,
      calories: Math.round(selectedFood.calories * ratio),
      protein: Number((selectedFood.protein * ratio).toFixed(1)),
      carbs: Number((selectedFood.carbs * ratio).toFixed(1)),
      fat: Number((selectedFood.fat * ratio).toFixed(1)),
      quantity,
      unit: selectedUnitOption.unit,
      timestamp: new Date().toISOString(),
    });
  }

  function logExercise() {
    const durationValue = Number(duration);
    const burnedValue = Number(suggestedBurned);
    if (!exerciseName.trim()) {
      setFeedback({ text: "请选择运动项目。", tone: "error" });
      return;
    }
    if (!Number.isFinite(durationValue) || durationValue <= 0) {
      setFeedback({ text: "请输入大于 0 的运动时长。", tone: "error" });
      return;
    }
    if (!Number.isFinite(burnedValue) || burnedValue <= 0) {
      setFeedback({ text: "请输入大于 0 的运动消耗。", tone: "error" });
      return;
    }
    void submitExerciseLog({
      activity_name: exerciseName.trim(),
      duration_min: durationValue,
      calories_burned: burnedValue,
      timestamp: new Date().toISOString(),
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          <View style={styles.overlayTopbar}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>← 返回</Text>
            </Pressable>
            <Text style={styles.overlayTitle}>记一餐</Text>
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

          <View style={styles.segmented}>
            <Pressable
              onPress={() => setTab("food")}
              style={[styles.segment, tab === "food" && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, tab === "food" && styles.segmentTextActive]}>
                吃一点
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setTab("exercise")}
              style={[styles.segment, tab === "exercise" && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, tab === "exercise" && styles.segmentTextActive]}>
                动一下
              </Text>
            </Pressable>
          </View>

          {tab === "food" ? (
            <View style={styles.panel}>
              <View style={styles.searchRow}>
                <TextInput
                  placeholder="搜索食物，如 鸡胸肉、燕麦"
                  placeholderTextColor="#8e8e93"
                  returnKeyType="search"
                  onChangeText={setKeyword}
                  style={styles.input}
                  value={keyword}
                />
              </View>

              {!keyword.trim() ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.hint}>输入食物名称后开始搜索。</Text>
                </View>
              ) : null}

              {foods.isLoading ? (
                <View style={styles.stateCard}>
                  <ActivityIndicator color="#111111" />
                  <Text style={styles.hint}>正在搜索食物...</Text>
                </View>
              ) : null}

              {foods.isError ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.errorText}>搜索失败，请稍后重试。</Text>
                </View>
              ) : null}

              {foods.data?.length === 0 && keyword.trim() && !foods.isLoading && !foods.isError ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.hint}>没有找到匹配食物。</Text>
                  <Pressable
                    onPress={() => router.push("./manual-food")}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>手动录入食物</Text>
                  </Pressable>
                </View>
              ) : null}

              <FlatList
                data={foods.data ?? []}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => selectFood(item)}
                    style={[
                      styles.resultItem,
                      selectedFoodId === item.id ? styles.resultItemActive : null,
                    ]}
                  >
                    <View style={styles.foodEmoji}>
                      <Text style={styles.foodEmojiText}>{emojiForCategory(item.category)}</Text>
                    </View>
                    <View style={styles.resultCopy}>
                      <Text style={styles.resultTitle}>{item.name}</Text>
                      <Text style={styles.hint}>
                        每 {item.quantity}
                        {unitLabel(item.unit)}：{item.calories} kcal · 蛋白 {item.protein}g · 碳水 {item.carbs}
                        g · 脂肪 {item.fat}g
                      </Text>
                    </View>
                    <Text style={styles.category}>{item.category}</Text>
                  </Pressable>
                )}
                ListFooterComponent={
                  <View style={styles.addBar}>
                    {selectedFood ? (
                      <View style={styles.unitRow}>
                        {selectedFood.unit_options.map((option) => (
                          <Pressable
                            key={`${selectedFood.id}-${option.unit}`}
                            onPress={() => {
                              setSelectedUnit(option.unit);
                              setAmount(String(option.ratio));
                            }}
                            style={[
                              styles.unitButton,
                              selectedUnit === option.unit && styles.unitButtonActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.unitButtonText,
                                selectedUnit === option.unit && styles.unitButtonTextActive,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}

                    <TextInput
                      keyboardType="decimal-pad"
                      onChangeText={setAmount}
                      style={styles.amountInput}
                      value={amount}
                    />
                    <Text style={styles.hint}>
                      {selectedFood && selectedUnitOption
                        ? `当前单位：${selectedUnitOption.label}，输入数量后点击“记录食物”。`
                        : "请选择一个食物后添加。"}
                    </Text>
                    <Pressable
                      disabled={!selectedFood || isSubmitting}
                      onPress={logFood}
                      style={[
                        styles.primaryButton,
                        (!selectedFood || isSubmitting) && styles.primaryButtonDisabled,
                      ]}
                    >
                      <Text style={styles.primaryButtonText}>{isSubmitting ? "记录中" : "记录食物"}</Text>
                    </Pressable>
                  </View>
                }
              />
            </View>
          ) : (
            <View style={styles.cardPanel}>
              <Text style={styles.label}>运动项目</Text>
              <View style={styles.exercisePresetGrid}>
                {exercisePresets.map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setExerciseName(item.label)}
                    style={[
                      styles.exercisePreset,
                      exerciseName === item.label && styles.exercisePresetActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.exercisePresetText,
                        exerciseName === item.label && styles.exercisePresetTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <LabeledInput label="时长 分钟" value={duration} onChangeText={setDuration} />
              <ReadonlyField label="消耗 kcal" value={suggestedBurned || "--"} />
              <Text style={styles.hint}>根据当前体重、运动项目和时长自动计算。</Text>
              <Pressable disabled={isSubmitting} onPress={logExercise} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>{isSubmitting ? "记录中" : "记录运动"}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function emojiForCategory(category: string) {
  const map: Record<string, string> = {
    水果: "🍎",
    主食: "🍚",
    蛋白质: "🍗",
    饮品: "🥛",
    蔬菜: "🥦",
    补剂: "💊",
  };
  return map[category] ?? "🍽️";
}

function estimateCalories(met: number, weightKg: number, durationMin: number) {
  return Math.round((met * 3.5 * weightKg * durationMin) / 200);
}

function unitLabel(unit: Unit) {
  const labels: Record<Unit, string> = {
    g: "克",
    ml: "毫升",
    serving: "份",
    bowl: "碗",
    piece: "个",
    cup: "杯",
  };
  return labels[unit];
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

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.readonlyField}>
        <Text style={styles.readonlyValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "#f4f4f6" },
  content: { flex: 1, gap: 16, padding: 18 },
  overlayTopbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  backButton: { minWidth: 56, paddingVertical: 8 },
  backText: { color: "#0a0a0a", fontSize: 16, fontWeight: "800" },
  overlayTitle: { color: "#0a0a0a", fontSize: 17, fontWeight: "900" },
  topbarSpacer: { width: 56 },
  segmented: { backgroundColor: "#dedee3", borderRadius: 999, flexDirection: "row", padding: 4 },
  segment: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
  },
  segmentActive: { backgroundColor: "#ffffff" },
  segmentText: { color: "#666666", fontWeight: "800" },
  segmentTextActive: { color: "#0a0a0a" },
  panel: { flex: 1, gap: 14 },
  searchRow: { flexDirection: "row", gap: 12 },
  stateCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 22,
    gap: 10,
    padding: 18,
  },
  input: {
    backgroundColor: "#f7f7f9",
    borderColor: "rgba(255,255,255,0.82)",
    borderRadius: 18,
    borderWidth: 1,
    color: "#0a0a0a",
    flex: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readonlyField: {
    alignItems: "flex-start",
    backgroundColor: "#ececf1",
    borderColor: "rgba(255,255,255,0.82)",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readonlyValue: { color: "#0a0a0a", fontSize: 16, fontWeight: "900" },
  resultItem: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "rgba(255,255,255,0.88)",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    padding: 15,
    shadowColor: "#000",
    shadowOpacity: 0.11,
    shadowRadius: 18,
    shadowOffset: { width: 8, height: 10 },
  },
  resultItemActive: {
    borderColor: "#111113",
    borderWidth: 1.5,
  },
  foodEmoji: {
    alignItems: "center",
    backgroundColor: "#f0f0f3",
    borderRadius: 16,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  foodEmojiText: { fontSize: 22 },
  resultCopy: { flex: 1 },
  resultTitle: { color: "#0a0a0a", fontSize: 16, fontWeight: "900" },
  category: { color: "#666666", fontSize: 12, fontWeight: "900" },
  unitRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  unitButton: {
    alignItems: "center",
    backgroundColor: "#dedee3",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  unitButtonActive: { backgroundColor: "#050505" },
  unitButtonText: { color: "#666666", fontWeight: "900" },
  unitButtonTextActive: { color: "#ffffff" },
  addBar: { gap: 10, paddingBottom: 20, paddingTop: 4 },
  amountInput: {
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
  hint: { color: "#666666", fontSize: 13, lineHeight: 19 },
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
  emptyCard: { backgroundColor: "#ffffff", borderRadius: 22, gap: 12, padding: 16 },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#050505",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 44,
    padding: 12,
  },
  secondaryButtonText: { color: "#ffffff", fontWeight: "900" },
  errorText: { color: "#1c1c1e", fontSize: 14, fontWeight: "800" },
  cardPanel: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 30,
    gap: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 32,
    shadowOffset: { width: 14, height: 18 },
  },
  exercisePresetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  exercisePreset: {
    alignItems: "center",
    backgroundColor: "#dedee3",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 42,
    minWidth: "47%",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  exercisePresetActive: { backgroundColor: "#050505" },
  exercisePresetText: { color: "#666666", fontWeight: "900" },
  exercisePresetTextActive: { color: "#ffffff" },
  field: { gap: 8 },
  label: { color: "#666666", fontSize: 13, fontWeight: "800" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#050505",
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 48,
    padding: 12,
  },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: "#fff", fontWeight: "900" },
});
