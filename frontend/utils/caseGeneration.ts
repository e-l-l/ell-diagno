import { SQLiteDatabase } from "expo-sqlite";
import { generateCase, getUnusedCases } from "./apis";

export const generateNNewCases = async (
  db: SQLiteDatabase,
  n: number,
  setCases: (cases: any) => void
) => {
  let remainingCases = n;

  // First try to get unused cases
  try {
    const unusedCasesResponse = await getUnusedCases();
    const unusedCases = unusedCasesResponse.cases || [];

    // Use as many unused cases as we can (up to n)
    const casesToUse = unusedCases.slice(0, remainingCases);

    for (const caseData of casesToUse) {
      console.log("Using unused case data", caseData);
      // For unused cases, caseData is already the case object (not wrapped in a 'case' property)
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
      // Wrap the case data to match the expected format for setCases
      setCases((prev: any) => [...prev, { case: caseData }]);
      remainingCases--;
    }
  } catch (error) {
    console.log(
      "Failed to fetch unused cases, will generate all cases:",
      error
    );
    remainingCases = n; // Reset to generate all cases if unused cases fetch fails
  }

  // Generate remaining cases if needed
  while (remainingCases > 0) {
    const caseData = await generateCase();
    console.log("Generated case data", caseData);
    // For generated cases, caseData.case contains the actual case object
    await db.runAsync(
      "INSERT INTO cases (id, symptoms, patient, test_info, diagnosis_info) VALUES (?, ?, ?, ?, ?)",
      [
        caseData.case.id,
        caseData.case.symptoms,
        caseData.case.patient,
        JSON.stringify(caseData.case.test_info),
        JSON.stringify(caseData.case.diagnosis_info),
      ]
    );
    setCases((prev: any) => [...prev, caseData]);
    remainingCases--;
  }
};
