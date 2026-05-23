import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "rgba(255,255,255,0.62)",
        tabBarStyle: {
          backgroundColor: "#111113",
          borderTopColor: "rgba(255,255,255,0.14)",
          height: 78,
          paddingBottom: 16,
          paddingTop: 10,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "800" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "今天" }} />
      <Tabs.Screen name="plan" options={{ title: "计划" }} />
      <Tabs.Screen name="mood" options={{ title: "心情" }} />
      <Tabs.Screen name="profile" options={{ title: "我的" }} />
    </Tabs>
  );
}
