import { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

async function api<T>(path: string, body?: unknown, userId?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { "x-user-id": userId } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Request failed");
  }
  return response.json() as Promise<T>;
}

export default function App() {
  const [phoneNumber, setPhoneNumber] = useState("9000000002");
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState("");
  const [pulseInfo, setPulseInfo] = useState("");
  const [error, setError] = useState("");

  async function requestOtp() {
    setError("");
    try {
      const data = await api<{ devCode?: string }>("/auth/otp/request", {
        phoneNumber,
        purpose: "LOGIN"
      });
      setOtp(data.devCode ?? "");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function verifyOtp() {
    setError("");
    try {
      const data = await api<{ userId: string }>("/auth/otp/verify", {
        phoneNumber,
        code: otp,
        purpose: "LOGIN"
      });
      setUserId(data.userId);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function loadPulse() {
    setError("");
    try {
      const data = await api<{
        groups: { friends: unknown[]; interests: unknown[]; spacesOrPromoted: unknown[] };
      }>("/pulse", undefined, userId);
      setPulseInfo(
        `friends ${data.groups.friends.length} | interests ${data.groups.interests.length} | spaces/promoted ${data.groups.spacesOrPromoted.length}`
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>telugu.social mobile (Phase 1)</Text>
        <Text style={styles.subtitle}>OTP + Pulse integration baseline</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput value={phoneNumber} onChangeText={setPhoneNumber} style={styles.input} />

          <Text style={styles.label}>OTP</Text>
          <TextInput value={otp} onChangeText={setOtp} style={styles.input} />

          <View style={styles.row}>
            <TouchableOpacity style={styles.button} onPress={requestOtp}>
              <Text style={styles.buttonText}>Request OTP</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={verifyOtp}>
              <Text style={styles.buttonText}>Verify OTP</Text>
            </TouchableOpacity>
          </View>
          <Text>User ID: {userId || "not logged in"}</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={loadPulse} disabled={!userId}>
          <Text style={styles.buttonText}>Load Pulse</Text>
        </TouchableOpacity>
        <Text style={styles.subtitle}>{pulseInfo || "No pulse loaded"}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#334155" },
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 12,
    gap: 8
  },
  label: { fontWeight: "600", color: "#0f172a" },
  input: {
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff"
  },
  row: { flexDirection: "row", gap: 8 },
  button: {
    backgroundColor: "#0f766e",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: "flex-start"
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  error: { color: "#b91c1c", fontWeight: "600" }
});

