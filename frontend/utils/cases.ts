import { Alert } from "react-native";
import { SQLiteDatabase } from "expo-sqlite";
import { createDatabaseManager } from "./database";
import { DatabaseStatus } from "./status";
import { generateNNewCases } from "./caseGeneration";

/**
 * Fetch cases with database status check
 */
export const fetchCasesWithStatus = async (
  db: SQLiteDatabase,
  setCases: (cases: any[]) => void,
  setDbStatus: (status: DatabaseStatus) => void,
  setIsLoading: (loading: boolean) => void
): Promise<void> => {
  setIsLoading(true);
  try {
    const dbManager = createDatabaseManager(db);

    // Check database connection
    const isConnected = await dbManager.checkConnection();
    setDbStatus(isConnected ? "online" : "offline");

    // Print case_action table for debugging
    await dbManager.printCaseActionTable();

    // Fetch only unused cases (cases with less than 2 correct actions)
    const fetchedCases = await dbManager.getUnusedCases();
    console.log("Unused cases fetched:", fetchedCases.length);
    setCases(fetchedCases);

    // Only generate new cases if we have fewer than 3 unused cases
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

/**
 * Handle manual database sync
 */
export const handleManualSync = async (
  db: SQLiteDatabase,
  setDbStatus: (status: DatabaseStatus) => void,
  onSyncComplete?: () => Promise<void>
): Promise<void> => {
  try {
    const dbManager = createDatabaseManager(db);
    const syncSuccess = await dbManager.attemptSync();

    if (syncSuccess) {
      Alert.alert(
        "Sync Successful",
        "Database has been synced with the server."
      );
      setDbStatus("online");
      if (onSyncComplete) {
        await onSyncComplete();
      }
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
