import CaseCard from "@/components/chat-card";
import { generateNNewCases } from "@/utils/index";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { fetchCasesWithStatus, handleManualSync } from "@/utils/cases";
import { getStatusColor, getStatusText, DatabaseStatus } from "@/utils/status";

export default function HomeScreen() {
  const [cases, setCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus>("unknown");
  const db = useSQLiteContext();
  const router = useRouter();

  useEffect(() => {
    handleFetchCases();
  }, []);

  const handleFetchCases = async () => {
    await fetchCasesWithStatus(db, setCases, setDbStatus, setIsLoading);
  };

  const handleSync = async () => {
    await handleManualSync(db, setDbStatus, handleFetchCases);
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: "white",
      }}
    >
      {/* Database Status Indicator */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 10,
          position: "absolute",
          top: 60,
          right: 20,
        }}
      >
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: getStatusColor(dbStatus),
            marginRight: 8,
          }}
        />
        <Text style={{ fontSize: 14, color: getStatusColor(dbStatus) }}>
          {getStatusText(dbStatus)}
        </Text>
      </View>

      {/* Manual Sync Button (only show when offline) */}
      {dbStatus === "offline" && (
        <TouchableOpacity
          onPress={handleSync}
          style={{
            backgroundColor: "#2196F3",
            padding: 10,
            borderRadius: 5,
            marginBottom: 20,
            position: "absolute",
            top: 100,
            right: 20,
          }}
        >
          <Text style={{ color: "white", fontSize: 12 }}>Retry Sync</Text>
        </TouchableOpacity>
      )}

      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 20 }}>
        {isLoading
          ? "Loading unused cases..."
          : cases.length > 0
          ? "Medical Cases"
          : "No unused cases available"}
      </Text>

      {!isLoading && cases.length === 0 && (
        <Text
          style={{
            fontSize: 16,
            color: "#666",
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          {dbStatus === "offline"
            ? "No unused local cases found. Connect to internet to sync cases from server."
            : "No unused cases available. Cases with less than 2 correct actions will appear here."}
        </Text>
      )}

      {cases.map((caseItem) => (
        <CaseCard
          key={caseItem.id}
          title={caseItem.patient}
          onPress={() => router.push(`/chat/${caseItem.id}`)}
        />
      ))}
    </View>
  );
}
