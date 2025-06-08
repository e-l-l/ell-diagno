var express = require("express");
const { casePrompt } = require("../utils/prompts");
var router = express.Router();
const { openai } = require("@ai-sdk/openai");
const { generateObject } = require("ai");
const { supabaseAdmin } = require("../config/supabase");
const { caseSchema } = require("../utils/schema");

/* GET cases listing. */
router.get("/", async function (req, res, next) {
  try {
    const { data: cases, error } = await supabaseAdmin
      .from("cases")
      .select("*");

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch cases",
        details: error.message,
      });
    }

    res.json({
      success: true,
      cases: cases || [],
    });
  } catch (error) {
    console.error("Error fetching cases:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch cases",
      details: error.message,
    });
  }
});

/* POST generate case using AI */
router.post("/generate", async function (req, res, next) {
  try {
    const prompt = req.body.prompt || casePrompt;

    const { object } = await generateObject({
      model: openai("o3-mini"),
      schema: caseSchema,
      prompt: prompt,
    });

    // Save the generated case to Supabase
    const { data: savedCase, error: saveError } = await supabaseAdmin
      .from("cases")
      .insert([object])
      .select()
      .single();

    if (saveError) {
      console.error("Error saving case to Supabase:", saveError);
      return res.status(500).json({
        success: false,
        error: "Failed to save generated case",
        details: saveError.message,
      });
    }

    res.json({
      success: true,
      case: savedCase,
      message: "Case generated and saved successfully",
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

router.get("/unused", async function (req, res, next) {
  try {
    // First, get all cases with their case_actions
    const { data: cases, error } = await supabaseAdmin.from("cases").select(
      `
        *,
        case_actions (
          is_correct
        )
      `
    );

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch cases",
        details: error.message,
      });
    }

    // Filter cases that have less than 2 correct case_actions
    const filteredCases = cases.filter((caseItem) => {
      const correctActionsCount = caseItem.case_actions.filter(
        (action) => action.is_correct === true
      ).length;
      return correctActionsCount < 2;
    });

    res.json({
      success: true,
      cases: filteredCases || [],
    });
  } catch (error) {
    console.error("Error fetching cases:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch cases",
      details: error.message,
    });
  }
});
module.exports = router;
