import { SQLiteDatabase } from "expo-sqlite";

export const sampleCaseData = {
  id: "6b1c2f46-2803-4db1-a9a9-fcf491ae26a3",
  symptoms:
    "John Doe, a 52-year-old man, presents with sudden onset severe chest pain radiating to his left arm, accompanied by shortness of breath, sweating, and a feeling of impending doom. The symptoms started about 45 minutes ago and have progressively worsened.",
  patient: "John Doe",
  test_info: [
    {
      name: "Chest X-ray",
      reply:
        "A Chest X-ray can help rule out lung problems such as pneumonia or pneumothorax, but it does not provide the detailed cardiac electrical activity needed in suspected acute coronary events. Hint: Look for a test that directly measures the heart's electrical function.",
      isCorrect: false,
    },
    {
      name: "Electrocardiogram (ECG)",
      reply:
        "Excellent choice! The ECG of John Doe revealed ST-segment elevation in leads V2-V4 with reciprocal changes in the inferior leads, aligning with an anterior wall myocardial infarction. This detailed information is essential for prompt treatment.",
      isCorrect: true,
    },
    {
      name: "CT Scan with Contrast",
      reply:
        "Although a CT scan with contrast is beneficial in diagnosing pulmonary embolism or aortic dissection, it is not the first-line test for typical myocardial infarction presentations. Hint: The most informative test directly assesses the heart's electrical activity.",
      isCorrect: false,
    },
    {
      name: "Echocardiogram",
      reply:
        "An Echocardiogram can assess cardiac function and wall motion abnormalities, but it is secondary to the immediate electrical data provided by an ECG in the setting of an acute MI. Hint: The correct test typically records the heart's electrical signals in real-time.",
      isCorrect: false,
    },
  ],
  diagnosis_info: [
    {
      name: "Unstable Angina",
      reply:
        "Unstable angina may present with chest pain but does not typically show the marked ST-segment elevations observed on this ECG. Hint: Consider the pronounced ECG changes indicating a full-thickness injury to the heart muscle.",
      isCorrect: false,
    },
    {
      name: "Acute Myocardial Infarction (Anterior Wall)",
      reply:
        "Bravo! Your selection is correct. The ECG findings along with the clinical presentation strongly indicate an anterior wall myocardial infarction, a condition requiring immediate intervention to restore blood flow and minimize heart muscle damage.",
      isCorrect: true,
    },
    {
      name: "Aortic Dissection",
      reply:
        "Aortic dissection typically presents with tearing chest pain radiating to the back, often accompanied by blood pressure differences between limbs. The ECG changes and symptom pattern in this case do not support this diagnosis. Hint: Pay close attention to the localized ST-segment changes pointing to a coronary event.",
      isCorrect: false,
    },
    {
      name: "Gastroesophageal Reflux Disease (GERD)",
      reply:
        "GERD can mimic chest pain but generally does not cause the acute, severe, crushing pain nor the specific ECG changes seen here. Hint: The sudden onset, severity, and ECG findings strongly lean toward a cardiac etiology rather than reflux.",
      isCorrect: false,
    },
  ],
  case_actions: [],
};

export const seedSampleCase = async (db: SQLiteDatabase): Promise<boolean> => {
  try {
    // Check if the sample case already exists
    const existingCase = await db.getFirstAsync(
      "SELECT id FROM cases WHERE id = ?",
      [sampleCaseData.id]
    );

    if (existingCase) {
      console.log("Sample case already exists in database");
      return true;
    }

    // Insert the sample case
    await db.runAsync(
      "INSERT INTO cases (id, symptoms, patient, test_info, diagnosis_info) VALUES (?, ?, ?, ?, ?)",
      [
        sampleCaseData.id,
        sampleCaseData.symptoms,
        sampleCaseData.patient,
        JSON.stringify(sampleCaseData.test_info),
        JSON.stringify(sampleCaseData.diagnosis_info),
      ]
    );

    console.log("Sample case seeded successfully");
    return true;
  } catch (error) {
    console.error("Error seeding sample case:", error);
    return false;
  }
};
