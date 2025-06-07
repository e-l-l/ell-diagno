const { z } = require("zod");

const optionSchema = z.object({
  name: z.string().describe("Test or diagnosis option name"),
  isCorrect: z.boolean().describe("Whether this option is correct or wrong"),
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

module.exports = {
  caseSchema,
};
