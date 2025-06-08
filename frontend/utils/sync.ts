import { SQLiteDatabase } from "expo-sqlite";

/**
 * Retry function for database sync with exponential backoff
 */
export const retrySyncWithBackoff = async (
  db: SQLiteDatabase,
  maxRetries = 1
): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `Attempting database sync (attempt ${attempt}/${maxRetries})`
      );
      await (db as any).syncLibSQL();
      console.log("Database sync successful");
      return true;
    } catch (error: any) {
      console.error(`Sync attempt ${attempt} failed:`, error);

      // Check if it's a network/server error (503, connection issues)
      const isRetriableError =
        error.message?.includes("503") ||
        error.message?.includes("Service Unavailable") ||
        error.message?.includes("network") ||
        error.message?.includes("timeout");

      if (!isRetriableError || attempt === maxRetries) {
        console.error(
          "Database sync failed after all retries, continuing without sync"
        );
        return false;
      }

      // Exponential backoff: wait 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return false;
};

/**
 * Initialize database with sync and migrations
 */
export const initializeDatabase = async (db: SQLiteDatabase): Promise<void> => {
  // Only attempt sync if we have proper credentials
  const hasCredentials =
    process.env.EXPO_PUBLIC_TURSO_DB_URL &&
    process.env.EXPO_PUBLIC_TURSO_DB_AUTH_TOKEN;

  if (hasCredentials) {
    const syncSuccess = await retrySyncWithBackoff(db);
    if (!syncSuccess) {
      console.warn("Continuing with local database only");
    }
  } else {
    console.warn("No Turso credentials found, using local database only");
  }

  // Proceed with migrations regardless of sync status
  try {
    const DBVERSION = 1;
    let res = await db.getFirstAsync<{ user_version: number } | null>(
      "PRAGMA user_version"
    );
    let currDbVersion = res?.user_version || 0;

    if (currDbVersion >= DBVERSION) {
      console.log("Database is up to date, no migrations needed");
      return;
    }

    console.log(
      `Migrating database from version ${currDbVersion} to ${DBVERSION}`
    );

    if (currDbVersion === 0) {
      await db.execAsync(
        "CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, symptoms TEXT NOT NULL, patient TEXT NOT NULL, test_info TEXT NOT NULL, diagnosis_info TEXT NOT NULL)"
      );
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS case_actions (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          type TEXT NOT NULL,
          value TEXT NOT NULL,
          is_correct INTEGER NOT NULL,
          attempt INTEGER NOT NULL,
          synced INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (case_id) REFERENCES cases (id)
        )`
      );
      console.log("Database tables created successfully");
      currDbVersion = 1;
    }

    await db.execAsync("PRAGMA user_version = " + DBVERSION);
    console.log(`Database successfully migrated to version ${DBVERSION}`);
  } catch (migrationError) {
    console.error("Error during database migration:", migrationError);
    throw migrationError; // Re-throw migration errors as they're critical
  }
};
