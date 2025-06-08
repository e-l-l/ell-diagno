import CaseCard from "@/components/chat-card";
import { generateNNewCases } from "@/utils/index";
import { createDatabaseManager } from "@/utils/database";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";

export default function HomeScreen() {
  const [cases, setCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<"online" | "offline" | "unknown">(
    "unknown"
  );
  const db = useSQLiteContext();
  const router = useRouter();

  useEffect(() => {
    fetchCasesWithStatus();
  }, []);

  const fetchCasesWithStatus = async () => {
    setIsLoading(true);
    try {
      const dbManager = createDatabaseManager(db);

      // Check database connection
      const isConnected = await dbManager.checkConnection();
      setDbStatus(isConnected ? "online" : "offline");

      // Fetch cases using the database manager
      const fetchedCases = await dbManager.getAllCases();
      console.log("Cases fetched:", fetchedCases.length);
      setCases(fetchedCases);

      // Only generate new cases if we have fewer than 3
      if (fetchedCases.length < 3) {
        console.log("Need to generate more cases");
        // Uncomment when you want to generate cases
        await generateNNewCases(db, 3 - fetchedCases.length, setCases);
      }
    } catch (error) {
      console.error("Error fetching cases:", error);
      Alert.alert(
        "Database Error",
        "There was an issue loading your cases. The app will continue in offline mode.",
        [{ text: "OK" }]
      );
      setDbStatus("offline");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    try {
      const dbManager = createDatabaseManager(db);
      const syncSuccess = await dbManager.attemptSync();

      if (syncSuccess) {
        Alert.alert(
          "Sync Successful",
          "Database has been synced with the server."
        );
        setDbStatus("online");
        await fetchCasesWithStatus();
      } else {
        Alert.alert(
          "Sync Failed",
          "Unable to sync with server. Check your internet connection."
        );
      }
    } catch (error) {
      console.error("Manual sync error:", error);
      Alert.alert("Sync Error", "An error occurred while syncing.");
    }
  };

  const getStatusColor = () => {
    switch (dbStatus) {
      case "online":
        return "#4CAF50";
      case "offline":
        return "#FF9800";
      default:
        return "#9E9E9E";
    }
  };

  const getStatusText = () => {
    switch (dbStatus) {
      case "online":
        return "Online";
      case "offline":
        return "Offline";
      default:
        return "Checking...";
    }
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
            backgroundColor: getStatusColor(),
            marginRight: 8,
          }}
        />
        <Text style={{ fontSize: 14, color: getStatusColor() }}>
          {getStatusText()}
        </Text>
      </View>

      {/* Manual Sync Button (only show when offline) */}
      {dbStatus === "offline" && (
        <TouchableOpacity
          onPress={handleManualSync}
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
          ? "Loading cases..."
          : cases.length > 0
          ? "Medical Cases"
          : "No cases available"}
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
            ? "No local cases found. Connect to internet to sync cases from server."
            : "No cases available. New cases will be generated automatically."}
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
