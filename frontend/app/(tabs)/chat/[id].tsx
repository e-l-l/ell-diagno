// app/(tabs)/chat.tsx
import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
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

interface ChatMessage {
  id: string;
  type: "doctor" | "user" | "options";
  content: string;
  timestamp: Date;
  options?: { name: string; type: "test" | "diagnosis" }[];
  isCorrect?: boolean;
}

export default function CaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const scrollViewRef = useRef<ScrollView>(null);

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  const [testAttempts, setTestAttempts] = useState<{ [key: string]: number }>(
    {}
  );
  const [diagnosisAttempts, setDiagnosisAttempts] = useState<{
    [key: string]: number;
  }>({});
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"tests" | "diagnosis">("tests");
  const [hasCorrectTest, setHasCorrectTest] = useState(false);
  const [score, setScore] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const [diagnosisScore, setDiagnosisScore] = useState(0);

  useEffect(() => {
    if (id) {
      loadCase();
    }
  }, [id]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const calculateScore = (
    attempts: { [key: string]: number },
    correctOptions: string[],
    type: "test" | "diagnosis"
  ) => {
    if (correctOptions.length === 0) return 0;

    const correctOption = correctOptions[0]; // Assuming one correct option per type
    const wrongAttempts = Object.entries(attempts)
      .filter(([option, _]) => option !== correctOption)
      .reduce((sum, [_, count]) => sum + count, 0);

    const maxPoints = 5;
    const penalty = wrongAttempts * 2;
    return Math.max(0, maxPoints - penalty);
  };

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

        // Initialize chat with welcome message and symptoms
        const initialMessages: ChatMessage[] = [
          {
            id: "welcome",
            type: "doctor",
            content: `Hello! I'm Dr. Smith, and I'll be supervising your case today. Let's examine this patient together.`,
            timestamp: new Date(),
          },
          {
            id: "patient-info",
            type: "doctor",
            content: `Patient: ${parsedCase.patient}\n\nPresenting symptoms: ${parsedCase.symptoms}\n\nWhat diagnostic test would you like to order first?`,
            timestamp: new Date(),
          },
        ];

        // Restore state from previous actions and rebuild chat history
        const testAttemptMap: { [key: string]: number } = {};
        const diagnosisAttemptMap: { [key: string]: number } = {};
        const selectedTestList: string[] = [];
        const selectedDiagnosisList: string[] = [];
        let hasCorrectTestSelected = false;
        let currentPhase: "tests" | "diagnosis" = "tests";

        const chatMessages = [...initialMessages];

        actions.forEach((action: any) => {
          if (action.type === "test") {
            testAttemptMap[action.value] =
              (testAttemptMap[action.value] || 0) + 1;
            if (!selectedTestList.includes(action.value)) {
              selectedTestList.push(action.value);

              // Add user message
              chatMessages.push({
                id: `user-test-${action.value}`,
                type: "user",
                content: `I'd like to order: ${action.value}`,
                timestamp: new Date(action.created_at),
              });

              // Add doctor response
              const testInfo = parsedCase.test_info.find(
                (t) => t.name === action.value
              );
              if (testInfo) {
                chatMessages.push({
                  id: `doctor-test-${action.value}`,
                  type: "doctor",
                  content: testInfo.reply,
                  timestamp: new Date(action.created_at),
                  isCorrect: testInfo.isCorrect,
                });

                if (testInfo.isCorrect) {
                  hasCorrectTestSelected = true;
                }
              }
            }
          } else if (action.type === "diagnosis") {
            diagnosisAttemptMap[action.value] =
              (diagnosisAttemptMap[action.value] || 0) + 1;
            if (!selectedDiagnosisList.includes(action.value)) {
              selectedDiagnosisList.push(action.value);

              // Add user message
              chatMessages.push({
                id: `user-diagnosis-${action.value}`,
                type: "user",
                content: `My diagnosis is: ${action.value}`,
                timestamp: new Date(action.created_at),
              });

              // Add doctor response
              const diagnosisInfo = parsedCase.diagnosis_info.find(
                (d) => d.name === action.value
              );
              if (diagnosisInfo) {
                chatMessages.push({
                  id: `doctor-diagnosis-${action.value}`,
                  type: "doctor",
                  content: diagnosisInfo.reply,
                  timestamp: new Date(action.created_at),
                  isCorrect: diagnosisInfo.isCorrect,
                });
              }
            }
          }
        });

        // Determine current phase and add appropriate options
        if (hasCorrectTestSelected && selectedDiagnosisList.length === 0) {
          currentPhase = "diagnosis";
          chatMessages.push({
            id: "diagnosis-transition",
            type: "doctor",
            content:
              "Great! Based on these test results, what is your diagnosis?",
            timestamp: new Date(),
          });
        }

        // Add current options if not completed
        const availableTests = parsedCase.test_info.filter(
          (t) => !selectedTestList.includes(t.name)
        );
        const availableDiagnoses = parsedCase.diagnosis_info.filter(
          (d) => !selectedDiagnosisList.includes(d.name)
        );
        const hasCorrectDiagnosis = selectedDiagnosisList.some(
          (diagName) =>
            parsedCase.diagnosis_info.find((d) => d.name === diagName)
              ?.isCorrect
        );

        if (!hasCorrectDiagnosis) {
          if (currentPhase === "tests" && availableTests.length > 0) {
            chatMessages.push({
              id: "test-options",
              type: "options",
              content: "Available tests:",
              timestamp: new Date(),
              options: availableTests.map((t) => ({
                name: t.name,
                type: "test" as const,
              })),
            });
          } else if (
            currentPhase === "diagnosis" &&
            availableDiagnoses.length > 0
          ) {
            chatMessages.push({
              id: "diagnosis-options",
              type: "options",
              content: "Possible diagnoses:",
              timestamp: new Date(),
              options: availableDiagnoses.map((d) => ({
                name: d.name,
                type: "diagnosis" as const,
              })),
            });
          }
        }

        setTestAttempts(testAttemptMap);
        setDiagnosisAttempts(diagnosisAttemptMap);
        setSelectedTests(selectedTestList);
        setSelectedDiagnoses(selectedDiagnosisList);
        setHasCorrectTest(hasCorrectTestSelected);
        setPhase(currentPhase);
        setMessages(chatMessages);

        // Calculate and set scores
        const correctTests = parsedCase.test_info
          .filter((t) => t.isCorrect)
          .map((t) => t.name);
        const correctDiagnoses = parsedCase.diagnosis_info
          .filter((d) => d.isCorrect)
          .map((d) => d.name);

        const currentTestScore = calculateScore(
          testAttemptMap,
          correctTests,
          "test"
        );
        const currentDiagnosisScore = calculateScore(
          diagnosisAttemptMap,
          correctDiagnoses,
          "diagnosis"
        );

        setTestScore(currentTestScore);
        setDiagnosisScore(currentDiagnosisScore);
        setScore(currentTestScore + currentDiagnosisScore);
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

  const updateScores = () => {
    if (!caseData) return;

    const correctTests = caseData.test_info
      .filter((t) => t.isCorrect)
      .map((t) => t.name);
    const correctDiagnoses = caseData.diagnosis_info
      .filter((d) => d.isCorrect)
      .map((d) => d.name);

    const currentTestScore = calculateScore(testAttempts, correctTests, "test");
    const currentDiagnosisScore = calculateScore(
      diagnosisAttempts,
      correctDiagnoses,
      "diagnosis"
    );

    setTestScore(currentTestScore);
    setDiagnosisScore(currentDiagnosisScore);
    setScore(currentTestScore + currentDiagnosisScore);
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
        setTestAttempts((prev) => {
          const newAttempts = { ...prev, [value]: attemptNumber };
          // Update scores after state is set
          setTimeout(() => {
            const correctTests =
              caseData?.test_info
                .filter((t) => t.isCorrect)
                .map((t) => t.name) || [];
            const newTestScore = calculateScore(
              newAttempts,
              correctTests,
              "test"
            );
            setTestScore(newTestScore);
            setScore(newTestScore + diagnosisScore);
          }, 0);
          return newAttempts;
        });
      } else {
        setDiagnosisAttempts((prev) => {
          const newAttempts = { ...prev, [value]: attemptNumber };
          // Update scores after state is set
          setTimeout(() => {
            const correctDiagnoses =
              caseData?.diagnosis_info
                .filter((d) => d.isCorrect)
                .map((d) => d.name) || [];
            const newDiagnosisScore = calculateScore(
              newAttempts,
              correctDiagnoses,
              "diagnosis"
            );
            setDiagnosisScore(newDiagnosisScore);
            setScore(testScore + newDiagnosisScore);
          }, 0);
          return newAttempts;
        });
      }
    } catch (error) {
      console.error("Error logging action:", error);
    }
  };

  const selectOption = async (
    optionName: string,
    type: "test" | "diagnosis"
  ) => {
    if (!caseData) return;

    if (type === "test" && selectedTests.includes(optionName)) return;
    if (type === "diagnosis" && selectedDiagnoses.includes(optionName)) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${type}-${Date.now()}`,
      type: "user",
      content:
        type === "test"
          ? `I'd like to order: ${optionName}`
          : `My diagnosis is: ${optionName}`,
      timestamp: new Date(),
    };

    setMessages((prev) =>
      prev.filter((m) => m.type !== "options").concat([userMessage])
    );

    // Find the option data
    const optionData =
      type === "test"
        ? caseData.test_info.find((t) => t.name === optionName)
        : caseData.diagnosis_info.find((d) => d.name === optionName);

    if (!optionData) return;

    await logAction(type, optionName, optionData.isCorrect);

    // Add doctor response after a brief delay
    setTimeout(() => {
      const doctorMessage: ChatMessage = {
        id: `doctor-${type}-${Date.now()}`,
        type: "doctor",
        content: optionData.reply,
        timestamp: new Date(),
        isCorrect: optionData.isCorrect,
      };

      setMessages((prev) => [...prev, doctorMessage]);

      // Update state
      if (type === "test") {
        setSelectedTests((prev) => [...prev, optionName]);
        if (optionData.isCorrect) {
          setHasCorrectTest(true);
          // Transition to diagnosis phase
          setTimeout(() => {
            const transitionMessage: ChatMessage = {
              id: `diagnosis-transition-${Date.now()}`,
              type: "doctor",
              content:
                "Great! Based on these test results, what is your diagnosis?",
              timestamp: new Date(),
            };

            const availableDiagnoses = caseData.diagnosis_info.filter(
              (d) => !selectedDiagnoses.includes(d.name)
            );
            const optionsMessage: ChatMessage = {
              id: `diagnosis-options-${Date.now()}`,
              type: "options",
              content: "Possible diagnoses:",
              timestamp: new Date(),
              options: availableDiagnoses.map((d) => ({
                name: d.name,
                type: "diagnosis" as const,
              })),
            };

            setMessages((prev) => [...prev, transitionMessage, optionsMessage]);
            setPhase("diagnosis");
          }, 1500);
        } else {
          // Show remaining test options
          setTimeout(() => {
            const availableTests = caseData.test_info.filter(
              (t) => !selectedTests.includes(t.name) && t.name !== optionName
            );
            if (availableTests.length > 0) {
              const optionsMessage: ChatMessage = {
                id: `test-options-${Date.now()}`,
                type: "options",
                content: "Try another test:",
                timestamp: new Date(),
                options: availableTests.map((t) => ({
                  name: t.name,
                  type: "test" as const,
                })),
              };
              setMessages((prev) => [...prev, optionsMessage]);
            }
          }, 1500);
        }
      } else {
        setSelectedDiagnoses((prev) => [...prev, optionName]);
        if (optionData.isCorrect) {
          // Case completed successfully
          setTimeout(() => {
            const finalScore = testScore + diagnosisScore;
            const completionMessage: ChatMessage = {
              id: `completion-${Date.now()}`,
              type: "doctor",
              content: `Excellent work! You've successfully diagnosed the patient. That's exactly right. Your clinical reasoning was spot on!\n\nFinal Score: ${finalScore}/10 points`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, completionMessage]);

            setTimeout(() => {
              Alert.alert(
                "Case Completed!",
                `Congratulations! You've successfully completed this medical case.\n\nYour final score: ${finalScore}/10 points`,
                [{ text: "OK", onPress: () => router.back() }]
              );
            }, 2000);
          }, 1500);
        } else {
          // Show remaining diagnosis options
          setTimeout(() => {
            const availableDiagnoses = caseData.diagnosis_info.filter(
              (d) =>
                !selectedDiagnoses.includes(d.name) && d.name !== optionName
            );
            if (availableDiagnoses.length > 0) {
              const optionsMessage: ChatMessage = {
                id: `diagnosis-options-${Date.now()}`,
                type: "options",
                content: "Try another diagnosis:",
                timestamp: new Date(),
                options: availableDiagnoses.map((d) => ({
                  name: d.name,
                  type: "diagnosis" as const,
                })),
              };
              setMessages((prev) => [...prev, optionsMessage]);
            }
          }, 1500);
        }
      }
    }, 1000);
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    if (message.type === "options") {
      return (
        <View key={message.id}>
          <View style={styles.divider} />
          <View style={styles.optionsContainer}>
            <Text style={styles.optionsTitle}>{message.content}</Text>
            {message.options?.map((option, optionIndex) => (
              <TouchableOpacity
                key={optionIndex}
                style={styles.optionButton}
                onPress={() => selectOption(option.name, option.type)}
              >
                <Text style={styles.optionButtonText}>{option.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    const isDoctor = message.type === "doctor";
    return (
      <View key={message.id}>
        {index > 0 && <View style={styles.divider} />}
        <View style={styles.messageContainer}>
          <View style={styles.messageHeader}>
            <Text style={styles.senderName}>
              {isDoctor ? "Dr. Smith" : "You"}
            </Text>
            <Text style={styles.timestamp}>
              {message.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <Text style={styles.messageText}>{message.content}</Text>
          {message.isCorrect !== undefined && (
            <View
              style={[
                styles.correctnessIndicator,
                message.isCorrect ? styles.correct : styles.incorrect,
              ]}
            >
              <Text style={styles.correctnessText}>
                {message.isCorrect ? "✓ Correct" : "✗ Incorrect"}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{caseData.patient}</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>Score: {score}/10</Text>
        </View>
      </View>

      {/* Chat Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message, index) => renderMessage(message, index))}
      </ScrollView>
    </KeyboardAvoidingView>
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
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 16,
    padding: 16,
    backgroundColor: "#1C91F2",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "500",
    color: "#fff",
  },
  scoreContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 16,
    marginVertical: 8,
  },
  messageContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  senderName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007aff",
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: "#333",
  },
  correctnessIndicator: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  correct: {
    backgroundColor: "#d4edda",
  },
  incorrect: {
    backgroundColor: "#f8d7da",
  },
  correctnessText: {
    fontSize: 12,
    fontWeight: "600",
  },
  optionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  optionButton: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#007aff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionButtonText: {
    fontSize: 16,
    color: "#007aff",
    fontWeight: "500",
    textAlign: "center",
  },
});
