// app/(tabs)/chat.tsx
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { createDatabaseManager } from "@/utils/database";
import uuid from "react-native-uuid";

interface TestOption {
  name: string;
  reply: string;
  isCorrect: boolean;
}

interface DiagnosisOption {
  name: string;
  reply: string;
  isCorrect: boolean;
}

interface CaseData {
  id: string;
  symptoms: string;
  patient: string;
  test_info: TestOption[];
  diagnosis_info: DiagnosisOption[];
  case_actions: any[];
}

interface CaseAction {
  id: string;
  case_id: string;
  type: "test" | "diagnosis";
  value: string;
  is_correct: number;
  attempt: number;
  synced: number;
  created_at: string;
}

export default function CaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  const [testAttempts, setTestAttempts] = useState<{ [key: string]: number }>(
    {}
  );
  const [diagnosisAttempts, setDiagnosisAttempts] = useState<{
    [key: string]: number;
  }>({});
  const [testFeedback, setTestFeedback] = useState<{
    [key: string]: { reply: string; isCorrect: boolean };
  }>({});
  const [diagnosisFeedback, setDiagnosisFeedback] = useState<{
    [key: string]: { reply: string; isCorrect: boolean };
  }>({});
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"tests" | "diagnosis">("tests");

  useEffect(() => {
    if (id) {
      loadCase();
    }
  }, [id]);

  const loadCase = async () => {
    try {
      const dbManager = createDatabaseManager(db);
      const case_data = await dbManager.getCaseById(id!);

      if (case_data) {
        const parsedCase: CaseData = {
          ...case_data,
          test_info: JSON.parse(case_data.test_info),
          diagnosis_info: JSON.parse(case_data.diagnosis_info),
          case_actions: [],
        };
        setCaseData(parsedCase);

        // Load existing actions to restore state
        const actions = await db.getAllAsync(
          "SELECT * FROM case_actions WHERE case_id = ? ORDER BY created_at ASC",
          [id!]
        );

        // Restore state from previous actions
        const testAttemptMap: { [key: string]: number } = {};
        const diagnosisAttemptMap: { [key: string]: number } = {};
        const selectedTestList: string[] = [];
        const selectedDiagnosisList: string[] = [];
        const testFeedbackMap: {
          [key: string]: { reply: string; isCorrect: boolean };
        } = {};
        const diagnosisFeedbackMap: {
          [key: string]: { reply: string; isCorrect: boolean };
        } = {};

        actions.forEach((action: any) => {
          if (action.type === "test") {
            testAttemptMap[action.value] =
              (testAttemptMap[action.value] || 0) + 1;
            if (!selectedTestList.includes(action.value)) {
              selectedTestList.push(action.value);
              const testInfo = parsedCase.test_info.find(
                (t) => t.name === action.value
              );
              if (testInfo) {
                testFeedbackMap[action.value] = {
                  reply: testInfo.reply,
                  isCorrect: testInfo.isCorrect,
                };
              }
            }
          } else if (action.type === "diagnosis") {
            diagnosisAttemptMap[action.value] =
              (diagnosisAttemptMap[action.value] || 0) + 1;
            if (!selectedDiagnosisList.includes(action.value)) {
              selectedDiagnosisList.push(action.value);
              const diagnosisInfo = parsedCase.diagnosis_info.find(
                (d) => d.name === action.value
              );
              if (diagnosisInfo) {
                diagnosisFeedbackMap[action.value] = {
                  reply: diagnosisInfo.reply,
                  isCorrect: diagnosisInfo.isCorrect,
                };
              }
            }
          }
        });

        setTestAttempts(testAttemptMap);
        setDiagnosisAttempts(diagnosisAttemptMap);
        setSelectedTests(selectedTestList);
        setSelectedDiagnoses(selectedDiagnosisList);
        setTestFeedback(testFeedbackMap);
        setDiagnosisFeedback(diagnosisFeedbackMap);

        // Determine phase based on actions
        if (
          selectedTestList.length > 0 &&
          selectedTestList.some(
            (test) =>
              parsedCase.test_info.find((t) => t.name === test)?.isCorrect
          )
        ) {
          setPhase("diagnosis");
        }
      } else {
        Alert.alert("Error", "Case not found");
        router.back();
      }
    } catch (error) {
      console.error("Error loading case:", error);
      Alert.alert("Error", "Failed to load case");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const logAction = async (
    type: "test" | "diagnosis",
    value: string,
    isCorrect: boolean
  ) => {
    try {
      const dbManager = createDatabaseManager(db);
      const currentAttempts =
        type === "test" ? testAttempts : diagnosisAttempts;
      const attemptNumber = (currentAttempts[value] || 0) + 1;

      const actionData: CaseAction = {
        id: uuid.v4() as string,
        case_id: id!,
        type,
        value,
        is_correct: isCorrect ? 1 : 0,
        attempt: attemptNumber,
        synced: 0,
        created_at: new Date().toISOString(),
      };

      await dbManager.insertCaseAction(actionData);

      // Update attempt count
      if (type === "test") {
        setTestAttempts((prev) => ({ ...prev, [value]: attemptNumber }));
      } else {
        setDiagnosisAttempts((prev) => ({ ...prev, [value]: attemptNumber }));
      }
    } catch (error) {
      console.error("Error logging action:", error);
    }
  };

  const selectTest = async (test: TestOption) => {
    if (selectedTests.includes(test.name)) return;

    await logAction("test", test.name, test.isCorrect);

    setSelectedTests((prev) => [...prev, test.name]);
    setTestFeedback((prev) => ({
      ...prev,
      [test.name]: { reply: test.reply, isCorrect: test.isCorrect },
    }));

    // If correct test is selected, move to diagnosis phase
    if (test.isCorrect) {
      setTimeout(() => {
        setPhase("diagnosis");
      }, 2000);
    }
  };

  const selectDiagnosis = async (diagnosis: DiagnosisOption) => {
    if (selectedDiagnoses.includes(diagnosis.name)) return;

    await logAction("diagnosis", diagnosis.name, diagnosis.isCorrect);

    setSelectedDiagnoses((prev) => [...prev, diagnosis.name]);
    setDiagnosisFeedback((prev) => ({
      ...prev,
      [diagnosis.name]: {
        reply: diagnosis.reply,
        isCorrect: diagnosis.isCorrect,
      },
    }));

    // If correct diagnosis is selected, show completion message
    if (diagnosis.isCorrect) {
      setTimeout(() => {
        Alert.alert(
          "Congratulations!",
          "You've successfully diagnosed the patient. Great work!",
          [{ text: "OK", onPress: () => router.back() }]
        );
      }, 2000);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading case...</Text>
      </View>
    );
  }

  if (!caseData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Case not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medical Case</Text>
      </View>

      {/* Patient Info */}
      <View style={styles.patientCard}>
        <Text style={styles.patientName}>Patient: {caseData.patient}</Text>
        <Text style={styles.symptomsTitle}>Presenting Symptoms:</Text>
        <Text style={styles.symptomsText}>{caseData.symptoms}</Text>
      </View>

      {/* Phase Indicator */}
      <View style={styles.phaseIndicator}>
        <View
          style={[styles.phaseStep, phase === "tests" && styles.activePhase]}
        >
          <Text
            style={[
              styles.phaseText,
              phase === "tests" && styles.activePhaseText,
            ]}
          >
            1. Tests
          </Text>
        </View>
        <View style={styles.phaseLine} />
        <View
          style={[
            styles.phaseStep,
            phase === "diagnosis" && styles.activePhase,
          ]}
        >
          <Text
            style={[
              styles.phaseText,
              phase === "diagnosis" && styles.activePhaseText,
            ]}
          >
            2. Diagnosis
          </Text>
        </View>
      </View>

      {/* Tests Section */}
      {phase === "tests" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Diagnostic Tests</Text>
          <Text style={styles.sectionSubtitle}>
            Choose the most appropriate test for this patient
          </Text>

          {caseData.test_info.map((test, index) => {
            const isSelected = selectedTests.includes(test.name);
            const feedback = testFeedback[test.name];

            return (
              <View key={index} style={styles.optionContainer}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    isSelected &&
                      (feedback?.isCorrect
                        ? styles.correctOption
                        : styles.incorrectOption),
                  ]}
                  onPress={() => selectTest(test)}
                  disabled={isSelected}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.selectedOptionText,
                    ]}
                  >
                    {test.name}
                  </Text>
                  {isSelected && (
                    <Text style={styles.statusIcon}>
                      {feedback?.isCorrect ? "✓" : "✗"}
                    </Text>
                  )}
                </TouchableOpacity>

                {isSelected && feedback && (
                  <View
                    style={[
                      styles.feedbackContainer,
                      feedback.isCorrect
                        ? styles.correctFeedback
                        : styles.incorrectFeedback,
                    ]}
                  >
                    <Text style={styles.feedbackText}>{feedback.reply}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Diagnosis Section */}
      {phase === "diagnosis" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Diagnosis</Text>
          <Text style={styles.sectionSubtitle}>
            Based on the test results, what is your diagnosis?
          </Text>

          {caseData.diagnosis_info.map((diagnosis, index) => {
            const isSelected = selectedDiagnoses.includes(diagnosis.name);
            const feedback = diagnosisFeedback[diagnosis.name];

            return (
              <View key={index} style={styles.optionContainer}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    isSelected &&
                      (feedback?.isCorrect
                        ? styles.correctOption
                        : styles.incorrectOption),
                  ]}
                  onPress={() => selectDiagnosis(diagnosis)}
                  disabled={isSelected}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.selectedOptionText,
                    ]}
                  >
                    {diagnosis.name}
                  </Text>
                  {isSelected && (
                    <Text style={styles.statusIcon}>
                      {feedback?.isCorrect ? "✓" : "✗"}
                    </Text>
                  )}
                </TouchableOpacity>

                {isSelected && feedback && (
                  <View
                    style={[
                      styles.feedbackContainer,
                      feedback.isCorrect
                        ? styles.correctFeedback
                        : styles.incorrectFeedback,
                    ]}
                  >
                    <Text style={styles.feedbackText}>{feedback.reply}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 100,
    color: "#666",
  },
  errorText: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 100,
    color: "#dc3545",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#007aff",
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 16,
    color: "#333",
  },
  patientCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  symptomsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 8,
  },
  symptomsText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#6c757d",
  },
  phaseIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 16,
  },
  phaseStep: {
    backgroundColor: "#e9ecef",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activePhase: {
    backgroundColor: "#007aff",
  },
  phaseText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6c757d",
  },
  activePhaseText: {
    color: "#fff",
  },
  phaseLine: {
    width: 40,
    height: 2,
    backgroundColor: "#e9ecef",
    marginHorizontal: 8,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: "#6c757d",
    marginBottom: 20,
  },
  optionContainer: {
    marginBottom: 16,
  },
  optionButton: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e9ecef",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  correctOption: {
    borderColor: "#28a745",
    backgroundColor: "#f8fff9",
  },
  incorrectOption: {
    borderColor: "#dc3545",
    backgroundColor: "#fff8f8",
  },
  optionText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
    fontWeight: "500",
  },
  selectedOptionText: {
    fontWeight: "600",
  },
  statusIcon: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 12,
  },
  feedbackContainer: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  correctFeedback: {
    backgroundColor: "#f8fff9",
    borderLeftColor: "#28a745",
  },
  incorrectFeedback: {
    backgroundColor: "#fff8f8",
    borderLeftColor: "#dc3545",
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#495057",
  },
});
