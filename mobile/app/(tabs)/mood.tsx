import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const moodQuotes = [
  "先照顾好今天的自己，改变会自然发生。",
  "记录不是约束，是帮你看清自己。",
  "今天做到一点点，也比昨天更接近目标。",
  "不用完美，坚持比完美更重要。",
  "身体会记得你认真对待它的每一天。",
  "情绪可以被看见，饮食也可以被重新选择。",
];

const moodOptions = ["很好", "还可以", "有压力", "想放弃"];

export default function MoodScreen() {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [mood, setMood] = useState("");
  const [note, setNote] = useState("");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function refreshQuote() {
    setQuoteIndex((current) => (current + 1) % moodQuotes.length);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={styles.eyebrow}>今日鼓励</Text>
          <Text style={styles.title}>心情</Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.darkHeaderText}>今日鼓励</Text>
            <Text style={styles.darkBadge}>Mindset</Text>
          </View>
          <Text style={styles.quote}>{moodQuotes[quoteIndex]}</Text>
          <Pressable onPress={refreshQuote} style={styles.darkSecondaryButton}>
            <Text style={styles.darkSecondaryButtonText}>换一句</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderText}>今日状态</Text>
            <Text style={styles.badge}>{today}</Text>
          </View>
          <View style={styles.moodGrid}>
            {moodOptions.map((item) => (
              <Pressable
                key={item}
                onPress={() => setMood(item)}
                style={[styles.moodOption, mood === item && styles.moodOptionActive]}
              >
                <Text style={[styles.moodText, mood === item && styles.moodTextActive]}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderText}>日记</Text>
            <Text style={styles.badge}>Local</Text>
          </View>
          <Text style={styles.label}>写下今天的感受</Text>
          <TextInput
            multiline
            onChangeText={setNote}
            placeholder="比如今天为什么吃多了、哪里做得不错、明天想怎么调整。"
            placeholderTextColor="#8e8e93"
            style={styles.textarea}
            textAlignVertical="top"
            value={note}
          />
          <Text style={styles.hint}>
            {mood || note ? "当前心情记录已保存在本页面。" : "心情和日记会保存在当前页面状态。"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  quote: { color: "#fff", fontSize: 30, fontWeight: "900", letterSpacing: -1.2, lineHeight: 38 },
  darkSecondaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  darkSecondaryButtonText: { color: "#0a0a0a", fontWeight: "900" },
  moodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  moodOption: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 22,
    minHeight: 52,
    justifyContent: "center",
    minWidth: "47%",
    padding: 14,
  },
  moodOptionActive: { backgroundColor: "#050505" },
  moodText: { color: "#0a0a0a", fontWeight: "900" },
  moodTextActive: { color: "#ffffff" },
  label: { color: "#666666", fontSize: 13, fontWeight: "800" },
  textarea: {
    backgroundColor: "#f7f7f9",
    borderColor: "rgba(255,255,255,0.82)",
    borderRadius: 18,
    borderWidth: 1,
    color: "#0a0a0a",
    fontSize: 16,
    minHeight: 190,
    padding: 14,
  },
  hint: { color: "#666666", fontSize: 13, lineHeight: 20 },
});
