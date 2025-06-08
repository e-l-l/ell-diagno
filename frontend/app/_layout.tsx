import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { SQLiteProvider } from "expo-sqlite";
import { initializeDatabase } from "@/utils/sync";

export default function Layout() {
  return (
    <SQLiteProvider
      databaseName="ell-diagno"
      options={{
        libSQLOptions: {
          url: process.env.EXPO_PUBLIC_TURSO_DB_URL || "",
          authToken: process.env.EXPO_PUBLIC_TURSO_DB_AUTH_TOKEN || "",
        },
      }}
      onInit={initializeDatabase}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaView>
    </SQLiteProvider>
  );
}
