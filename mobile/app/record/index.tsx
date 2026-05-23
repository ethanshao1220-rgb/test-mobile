import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createExerciseLog, createFoodLog, searchFoods } from "@/api/services";
import type { Food } from "@/api/types";

type RecordTab = "food" | "exercise";

export default function RecordScreen() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<RecordTab>("food");
  const [keyword, setKeyword] = useState("");
  const [amount, setAmount] = useState("100");
  const [exerciseName, setExerciseName] = useState("跑步");
  const [duration, setDuration] = useState("30");
  const [burned, setBurned] = useState("250");
  const foods = useQuery({ queryKey: ["foods", keyword], queryFn: () => searchFoods(keyword), enabled: keyword.trim().length > 0 });
  const addFood = useMutation({ mutationFn: createFoodLog, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["dashboard"] }) });
  const addExercise = useMutation({ mutationFn: createExerciseLog, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["dashboard"] }) });

  function logFood(food: Food) {
    const quantity = Number(amount) || food.quantity;
    const ratio = food.quantity ? quantity / food.quantity : 1;
    addFood.mutate({
      food_name: food.name,
      calories: Math.round(food.calories * ratio),
      protein: Number((food.protein * ratio).toFixed(1)),
      carbs: Number((food.carbs * ratio).toFixed(1)),
      fat: Number((food.fat * ratio).toFixed(1)),
      quantity,
      unit: food.unit,
      timestamp: new Date().toISOString(),
    });
  }

  function logExercise() {
    addExercise.mutate({
      activity_name: exerciseName,
      duration_min: Number(duration),
      calories_burned: Number(burned),
      timestamp: new Date().toISOString(),
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <View style={styles.content}>
          <View style={styles.overlayTopbar}>
            <Text style={styles.backText}>← 返回</Text>
            <Text style={styles.overlayTitle}>记一餐</Text>
            <View style={styles.topbarSpacer} />
          </View>

          <View style={styles.segmented}>
            <Pressable onPress={() => setTab("food")} style={[styles.segment, tab === "food" && styles.segmentActive]}>
              <Text style={[styles.segmentText, tab === "food" && styles.segmentTextActive]}>吃一点</Text>
            </Pressable>
            <Pressable onPress={() => setTab("exercise")} style={[styles.segment, tab === "exercise" && styles.segmentActive]}>
              <Text style={[styles.segmentText, tab === "exercise" && styles.segmentTextActive]}>动一下</Text>
            </Pressable>
          </View>

          {tab === "food" ? (
            <View style={styles.panel}>
              <View style={styles.searchRow}>
                <TextInput placeholder="搜索食物，如 鸡胸肉、燕麦" placeholderTextColor="#8e8e93" returnKeyType="search" onChangeText={setKeyword} style={styles.input} value={keyword} />
              </View>
              {foods.isLoading ? <ActivityIndicator color="#111111" /> : null}
              {foods.isError ? <Text style={styles.error}>搜索失败，请稍后重试。</Text> : null}
              {foods.data?.length === 0 && keyword.trim() ? <Text style={styles.hint}>没有找到匹配食物。</Text> : null}
              <FlatList
                data={foods.data ?? []}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable onPress={() => logFood(item)} style={styles.resultItem}>
                    <View style={styles.foodEmoji}><Text style={styles.foodEmojiText}>{emojiForCategory(item.category)}</Text></View>
                    <View style={styles.resultCopy}>
                      <Text style={styles.resultTitle}>{item.name}</Text>
                      <Text style={styles.hint}>每 {item.quantity}{item.unit}：{item.calories} kcal · 蛋白 {item.protein}g · 碳水 {item.carbs}g · 脂肪 {item.fat}g</Text>
                    </View>
                    <Text style={styles.category}>{item.category}</Text>
                  </Pressable>
                )}
                ListFooterComponent={
                  <View style={styles.addBar}>
                    <TextInput keyboardType="decimal-pad" onChangeText={setAmount} style={styles.amountInput} value={amount} />
                    <Text style={styles.hint}>请选择一个食物后添加。</Text>
                  </View>
                }
              />
            </View>
          ) : (
            <View style={styles.cardPanel}>
              <LabeledInput label="运动项目" value={exerciseName} onChangeText={setExerciseName} keyboardType="default" />
              <LabeledInput label="时长 分钟" value={duration} onChangeText={setDuration} />
              <LabeledInput label="消耗 kcal" value={burned} onChangeText={setBurned} />
              <Pressable disabled={addExercise.isPending} onPress={logExercise} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>{addExercise.isPending ? "记录中" : "记录运动"}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function emojiForCategory(category: string) {
  const map: Record<string, string> = { 水果: "🍎", 主食: "🍚", 蛋白质: "🍗", 饮品: "🥛", 蔬菜: "🥦", 补剂: "💊" };
  return map[category] ?? "🍽️";
}

function LabeledInput({ label, value, onChangeText, keyboardType = "decimal-pad" }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: "decimal-pad" | "default" }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput keyboardType={keyboardType} onChangeText={onChangeText} style={styles.input} value={value} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "#f4f4f6" },
  content: { flex: 1, gap: 16, padding: 18 },
  overlayTopbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  backText: { color: "#0a0a0a", fontSize: 16, fontWeight: "800" },
  overlayTitle: { color: "#0a0a0a", fontSize: 17, fontWeight: "900" },
  topbarSpacer: { width: 56 },
  segmented: { backgroundColor: "#dedee3", borderRadius: 999, flexDirection: "row", padding: 4 },
  segment: { alignItems: "center", borderRadius: 999, flex: 1, minHeight: 48, justifyContent: "center" },
  segmentActive: { backgroundColor: "#ffffff" },
  segmentText: { color: "#666666", fontWeight: "800" },
  segmentTextActive: { color: "#0a0a0a" },
  panel: { flex: 1, gap: 14 },
  searchRow: { flexDirection: "row", gap: 12 },
  input: { backgroundColor: "#f7f7f9", borderColor: "rgba(255,255,255,0.82)", borderRadius: 18, borderWidth: 1, color: "#0a0a0a", flex: 1, fontSize: 16, minHeight: 48, paddingHorizontal: 14, paddingVertical: 12 },
  resultItem: { alignItems: "center", backgroundColor: "#ffffff", borderColor: "rgba(255,255,255,0.88)", borderRadius: 22, borderWidth: 1, flexDirection: "row", gap: 12, marginBottom: 12, padding: 15, shadowColor: "#000", shadowOpacity: 0.11, shadowRadius: 18, shadowOffset: { width: 8, height: 10 } },
  foodEmoji: { alignItems: "center", backgroundColor: "#f0f0f3", borderRadius: 16, height: 42, justifyContent: "center", width: 42 },
  foodEmojiText: { fontSize: 22 },
  resultCopy: { flex: 1 },
  resultTitle: { color: "#0a0a0a", fontSize: 16, fontWeight: "900" },
  category: { color: "#666666", fontSize: 12, fontWeight: "900" },
  addBar: { gap: 10, paddingBottom: 20, paddingTop: 4 },
  amountInput: { backgroundColor: "#f7f7f9", borderColor: "rgba(255,255,255,0.82)", borderRadius: 18, borderWidth: 1, color: "#0a0a0a", fontSize: 16, minHeight: 48, paddingHorizontal: 14, paddingVertical: 12 },
  hint: { color: "#666666", fontSize: 13, lineHeight: 19 },
  error: { color: "#1c1c1e", fontSize: 14, fontWeight: "800" },
  cardPanel: { backgroundColor: "rgba(255,255,255,0.88)", borderRadius: 30, gap: 16, padding: 24, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 32, shadowOffset: { width: 14, height: 18 } },
  field: { gap: 8 },
  label: { color: "#666666", fontSize: 13, fontWeight: "800" },
  primaryButton: { alignItems: "center", backgroundColor: "#050505", borderRadius: 18, justifyContent: "center", minHeight: 48, padding: 12 },
  primaryButtonText: { color: "#fff", fontWeight: "900" },
});