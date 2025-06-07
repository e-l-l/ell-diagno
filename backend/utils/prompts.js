const casePrompt = `Generate a realistic medical case with a patient's symptoms, test results, and diagnosis information. One out of four tests or diagnoses should be correct. For each incorrect test or diagnosis option, provide a reason why it is incorrect and include a small clue pointing toward the correct option. For the test that is correct, present detailed test results. If a diagnosis is correct, commend the selection and offer a brief explanation of why it is accurate.
Have an entertaining and educating tone.

# Notes

- Ensure the case details and explanations are realistic and align with typical clinical reasoning.
- Keep the clues very very subtle to encourage critical thinking.
- Dont directly mention that it is a hint.`;

module.exports = {
  casePrompt,
};
