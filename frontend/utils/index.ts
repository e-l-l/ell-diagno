import { SQLiteDatabase } from "expo-sqlite";
import { generateCase } from "./apis";

export const generateNNewCases = async (
  db: SQLiteDatabase,
  n: number,
  setCases: (cases: any) => void
) => {
  while (n > 0) {
    const caseData = await generateCase();
    console.log("Case data", caseData);
    await db.runAsync(
      "INSERT INTO cases (id, symptoms, patient, test_info, diagnosis_info) VALUES (?, ?, ?, ?, ?)",
      [
        caseData.id,
        caseData.symptoms,
        caseData.patient,
        JSON.stringify(caseData.test_info),
        JSON.stringify(caseData.diagnosis_info),
      ]
    );
    setCases((prev: any) => [...prev, caseData]);
    n--;
  }
};
