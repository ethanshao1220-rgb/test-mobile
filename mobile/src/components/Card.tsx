import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { lightColors, spacing } from "@/theme/tokens";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export function Card({ title, subtitle, children }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: lightColors.card,
    borderColor: lightColors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    color: lightColors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    color: lightColors.muted,
    fontSize: 13,
  },
});
