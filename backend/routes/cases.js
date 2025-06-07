var express = require("express");
var router = express.Router();
const { openai } = require("@ai-sdk/openai");
const { generateObject } = require("ai");
const { z } = require("zod");

// Define the schema for the case object to match your database structure
const optionSchema = z.object({
  name: z.string().describe("Test or diagnosis option name"),
  isCorrect: z
    .boolean()
    .describe(
      "Whether this option is correct (should be false for multiple choice)"
    ),
  reply: z.string().describe("Reply message if user selects this option"),
});

const caseSchema = z.object({
  symptoms: z.string().describe("Patient symptoms as text"),
  patient: z.string().describe("Patient name"),
  test_info: z
    .array(optionSchema)
    .length(4)
    .describe("Array of 4 test options for the case"),
  diagnosis_info: z
    .array(optionSchema)
    .length(4)
    .describe("Array of 4 diagnosis options for the case"),
});

/* GET cases listing. */
router.get("/", function (req, res, next) {
  res.send("cases");
});

/* POST generate case using AI */
router.post("/generate", async function (req, res, next) {
  try {
    // You can customize this prompt based on your needs
    const prompt =
      req.body.prompt ||
      "Generate a realistic medical case with patient symptoms, test results, and diagnosis information.";

    const { object } = await generateObject({
      model: openai("o3-mini"),
      schema: caseSchema,
      prompt: prompt,
    });

    res.json({
      success: true,
      case: object,
    });
  } catch (error) {
    console.error("Error generating case:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate case",
      details: error.message,
    });
  }
});

module.exports = router;
