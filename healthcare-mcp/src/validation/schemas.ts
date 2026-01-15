// Zod validation schemas for all 13 healthcare tools
// Provides strict input validation with clear error messages
import { z } from "zod";

// ============================================================================
// SHARED VALIDATORS
// ============================================================================

// Sanitize string input - trim and limit length
const sanitizedString = (maxLength = 500) =>
  z
    .string()
    .trim()
    .min(1, "Input cannot be empty")
    .max(maxLength, `Input too long (max ${maxLength} characters)`);

// Positive integer with bounds
const limitParam = (defaultVal: number, maxVal: number) =>
  z
    .number()
    .int()
    .positive()
    .max(maxVal, `Maximum limit is ${maxVal}`)
    .default(defaultVal)
    .optional()
    .transform((val) => Math.min(val ?? defaultVal, maxVal));

// ============================================================================
// CHAT SCHEMA
// ============================================================================

export const chatMessageSchema = z.object({
  message: sanitizedString(10000).describe("User message"),
  sessionId: z.string().trim().max(100).optional().default("default"),
});
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

// ============================================================================
// OPENFDA TOOL SCHEMAS (4 tools)
// ============================================================================

export const drugLookupSchema = z.object({
  query: sanitizedString(200).describe("Drug name, NDC code, or active ingredient"),
  search_type: z
    .enum(["name", "ndc", "ingredient"])
    .default("name")
    .optional()
    .describe("Type of search"),
  limit: limitParam(5, 20),
});
export type DrugLookupInput = z.infer<typeof drugLookupSchema>;

export const adverseEventsSchema = z.object({
  drug_name: sanitizedString(200).describe("Name of the drug"),
  reaction: sanitizedString(200).optional().describe("Specific reaction to filter by"),
  serious_only: z.boolean().default(false).optional().describe("Only serious events"),
  limit: limitParam(10, 50),
});
export type AdverseEventsInput = z.infer<typeof adverseEventsSchema>;

export const drugRecallsSchema = z.object({
  query: sanitizedString(200).describe("Drug name, recall reason, or firm name"),
  status: z.enum(["ongoing", "completed", "terminated"]).optional(),
  classification: z.enum(["Class I", "Class II", "Class III"]).optional(),
  limit: limitParam(10, 50),
});
export type DrugRecallsInput = z.infer<typeof drugRecallsSchema>;

export const drugLabelsSchema = z.object({
  drug_name: sanitizedString(200).describe("Name of the drug"),
  sections: z
    .array(
      z.enum([
        "indications",
        "warnings",
        "dosage",
        "interactions",
        "contraindications",
        "adverse_reactions",
      ])
    )
    .optional()
    .default(["indications", "warnings", "dosage", "interactions", "contraindications"]),
});
export type DrugLabelsInput = z.infer<typeof drugLabelsSchema>;

// ============================================================================
// DRUG INTERACTION SCHEMAS (2 tools)
// ============================================================================

export const checkDrugInteractionsSchema = z.object({
  drugs: z
    .array(sanitizedString(100))
    .min(2, "At least 2 drugs required for interaction check")
    .max(10, "Maximum 10 drugs per check")
    .describe("List of drug names to check"),
  include_food: z.boolean().default(true).optional(),
});
export type CheckDrugInteractionsInput = z.infer<typeof checkDrugInteractionsSchema>;

export const getDrugInteractionDetailsSchema = z.object({
  drug1: sanitizedString(100).describe("First drug name"),
  drug2: sanitizedString(100).describe("Second drug name"),
});
export type GetDrugInteractionDetailsInput = z.infer<typeof getDrugInteractionDetailsSchema>;

// ============================================================================
// CLINICAL TRIALS SCHEMAS (3 tools)
// ============================================================================

export const searchClinicalTrialsSchema = z.object({
  query: sanitizedString(300).describe("Condition, drug, or treatment to search"),
  status: z.enum(["recruiting", "completed", "active", "all"]).default("all").optional(),
  phase: z.enum(["1", "2", "3", "4", "all"]).default("all").optional(),
  has_results: z.boolean().default(false).optional(),
  limit: limitParam(10, 25),
});
export type SearchClinicalTrialsInput = z.infer<typeof searchClinicalTrialsSchema>;

export const getClinicalTrialDetailsSchema = z.object({
  nct_id: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^NCT\d{8}$/, "Invalid NCT ID format. Expected: NCT followed by 8 digits (e.g., NCT04564899)")
    .describe("ClinicalTrials.gov NCT ID"),
});
export type GetClinicalTrialDetailsInput = z.infer<typeof getClinicalTrialDetailsSchema>;

export const getTrialResultsSummarySchema = z.object({
  query: sanitizedString(300).describe("Drug or condition to summarize"),
  limit: limitParam(10, 20),
});
export type GetTrialResultsSummaryInput = z.infer<typeof getTrialResultsSummarySchema>;

// ============================================================================
// GUIDELINES SCHEMAS (2 tools)
// ============================================================================

export const searchGuidelinesSchema = z.object({
  query: sanitizedString(300).describe("Medical condition or treatment"),
  specialty: sanitizedString(100).optional().describe("Medical specialty filter"),
  years: z.number().int().positive().max(20).default(5).optional(),
  limit: limitParam(10, 25),
});
export type SearchGuidelinesInput = z.infer<typeof searchGuidelinesSchema>;

export const guidelineSummarySchema = z.object({
  pmid: z
    .string()
    .trim()
    .regex(/^\d{1,10}$/, "Invalid PMID format. Expected: numeric ID (e.g., 12345678)")
    .describe("PubMed ID"),
});
export type GuidelineSummaryInput = z.infer<typeof guidelineSummarySchema>;

// ============================================================================
// CMS PRICING SCHEMAS (2 tools)
// ============================================================================

export const medicareDrugPricingSchema = z.object({
  drug_name: sanitizedString(200).describe("Brand or generic drug name"),
  manufacturer: sanitizedString(200).optional(),
  limit: limitParam(10, 25),
});
export type MedicareDrugPricingInput = z.infer<typeof medicareDrugPricingSchema>;

export const procedurePricingSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{5}$/, "Invalid HCPCS/CPT code format. Expected: 5 alphanumeric characters")
      .optional()
      .describe("HCPCS or CPT code"),
    description: sanitizedString(300).optional().describe("Procedure description"),
  })
  .refine((data) => data.code || data.description, {
    message: "Either code or description is required",
  });
export type ProcedurePricingInput = z.infer<typeof procedurePricingSchema>;

// ============================================================================
// SCHEMA REGISTRY - Maps tool names to their schemas
// ============================================================================

export const toolSchemas: Record<string, z.ZodType> = {
  // OpenFDA
  drug_lookup: drugLookupSchema,
  adverse_events: adverseEventsSchema,
  drug_recalls: drugRecallsSchema,
  drug_labels: drugLabelsSchema,
  // Drug Interactions
  check_drug_interactions: checkDrugInteractionsSchema,
  get_drug_interaction_details: getDrugInteractionDetailsSchema,
  // Clinical Trials
  search_clinical_trials: searchClinicalTrialsSchema,
  get_clinical_trial_details: getClinicalTrialDetailsSchema,
  get_trial_results_summary: getTrialResultsSummarySchema,
  // Guidelines
  search_guidelines: searchGuidelinesSchema,
  guideline_summary: guidelineSummarySchema,
  // CMS Pricing
  medicare_drug_pricing: medicareDrugPricingSchema,
  procedure_pricing: procedurePricingSchema,
};

// ============================================================================
// VALIDATION HELPER
// ============================================================================

export interface ValidationResult<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  error: string;
  details: Array<{ path: string; message: string }>;
}

export function validateToolInput<T>(
  toolName: string,
  input: unknown
): ValidationResult<T> | ValidationError {
  const schema = toolSchemas[toolName];

  if (!schema) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}`,
      details: [],
    };
  }

  const result = schema.safeParse(input);

  if (result.success) {
    return {
      success: true,
      data: result.data as T,
    };
  }

  // Format Zod errors into readable messages
  const details = result.error.issues.map((issue) => ({
    path: issue.path.join(".") || "input",
    message: issue.message,
  }));

  const errorMessage = details.map((d) => `${d.path}: ${d.message}`).join("; ");

  return {
    success: false,
    error: `Validation failed: ${errorMessage}`,
    details,
  };
}
