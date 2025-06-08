import { SQLiteDatabase } from "expo-sqlite";

export interface DatabaseError extends Error {
  code?: string;
  sqlite?: boolean;
}

export class DatabaseManager {
  private db: SQLiteDatabase;
  private isOnline: boolean = true;

  constructor(database: SQLiteDatabase) {
    this.db = database;
  }

  /**
   * Check if the database is properly synced and online
   */
  async checkConnection(): Promise<boolean> {
    try {
      // Simple query to test database connectivity
      await this.db.getFirstAsync("SELECT 1");
      this.isOnline = true;
      return true;
    } catch (error) {
      console.warn("Database connection check failed:", error);
      this.isOnline = false;
      return false;
    }
  }

  /**
   * Safely execute a database operation with retry logic
   */
  async safeExecute<T>(
    operation: () => Promise<T>,
    maxRetries: number = 2
  ): Promise<T | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        console.error(`Database operation failed (attempt ${attempt}):`, error);

        const isRetriableError =
          error.message?.includes("database is locked") ||
          error.message?.includes("busy") ||
          error.message?.includes("timeout");

        if (!isRetriableError || attempt === maxRetries) {
          console.error("Database operation failed after all retries");
          return null;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
    return null;
  }

  /**
   * Get all cases with error handling
   */
  async getAllCases(): Promise<any[]> {
    const result = await this.safeExecute(async () => {
      return await this.db.getAllAsync("SELECT * FROM cases ORDER BY id DESC");
    });
    return result || [];
  }

  /**
   * Insert a new case with error handling
   */
  async insertCase(caseData: {
    id: string;
    symptoms: string;
    patient: string;
    test_info: string;
    diagnosis_info: string;
  }): Promise<boolean> {
    const result = await this.safeExecute(async () => {
      await this.db.runAsync(
        "INSERT INTO cases (id, symptoms, patient, test_info, diagnosis_info) VALUES (?, ?, ?, ?, ?)",
        [
          caseData.id,
          caseData.symptoms,
          caseData.patient,
          caseData.test_info,
          caseData.diagnosis_info,
        ]
      );
      return true;
    });
    return result === true;
  }

  /**
   * Insert a case action with error handling
   */
  async insertCaseAction(actionData: {
    id: string;
    case_id: string;
    type: string;
    value: string;
    is_correct: number;
    attempt: number;
    synced: number;
    created_at: string;
  }): Promise<boolean> {
    const result = await this.safeExecute(async () => {
      await this.db.runAsync(
        "INSERT INTO case_actions (id, case_id, type, value, is_correct, attempt, synced, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          actionData.id,
          actionData.case_id,
          actionData.type,
          actionData.value,
          actionData.is_correct,
          actionData.attempt,
          actionData.synced,
          actionData.created_at,
        ]
      );
      return true;
    });
    return result === true;
  }

  /**
   * Get case by ID with error handling
   */
  async getCaseById(id: string): Promise<any | null> {
    const result = await this.safeExecute(async () => {
      return await this.db.getFirstAsync("SELECT * FROM cases WHERE id = ?", [
        id,
      ]);
    });
    return result;
  }

  /**
   * Get unused cases (cases with less than 2 correct actions)
   */
  async getUnusedCases(): Promise<any[]> {
    const result = await this.safeExecute(async () => {
      // Get all cases with their correct action counts
      const query = `
        SELECT c.*, 
               COALESCE(correct_actions.count, 0) as correct_actions_count
        FROM cases c
        LEFT JOIN (
          SELECT case_id, COUNT(*) as count
          FROM case_actions 
          WHERE is_correct = 1
          GROUP BY case_id
        ) correct_actions ON c.id = correct_actions.case_id
        WHERE COALESCE(correct_actions.count, 0) < 2
        ORDER BY c.id DESC
      `;
      return await this.db.getAllAsync(query);
    });
    return result || [];
  }

  /**
   * Print all case_action table contents for debugging
   */
  async printCaseActionTable(): Promise<void> {
    const result = await this.safeExecute(async () => {
      return await this.db.getAllAsync(
        "SELECT * FROM case_actions ORDER BY created_at DESC"
      );
    });

    if (result && result.length > 0) {
      console.log("=== CASE_ACTION TABLE CONTENTS ===");
      console.table(result);
      console.log(`Total case_actions: ${result.length}`);
    } else {
      console.log("=== CASE_ACTION TABLE ===");
      console.log("No case_actions found in the database");
    }
  }

  /**
   * Attempt to sync with remote database
   */
  async attemptSync(): Promise<boolean> {
    try {
      if ("syncLibSQL" in this.db) {
        await (this.db as any).syncLibSQL();
        console.log("Manual sync successful");
        this.isOnline = true;
        return true;
      }
    } catch (error) {
      console.error("Manual sync failed:", error);
      this.isOnline = false;
    }
    return false;
  }

  /**
   * Check if database is in online mode
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }
}

/**
 * Create a database manager instance
 */
export const createDatabaseManager = (
  database: SQLiteDatabase
): DatabaseManager => {
  return new DatabaseManager(database);
};
