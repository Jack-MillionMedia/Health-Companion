// Tool registration - connects all providers to MCP handler
import { registerTool } from "./handler.js";

// OpenFDA tools
import {
  drugLookupTool,
  adverseEventsTool,
  drugRecallsTool,
  drugLabelsTool,
  drugLookupHandler,
  adverseEventsHandler,
  drugRecallsHandler,
  drugLabelsHandler,
} from "../providers/openfda.js";

// Clinical Guidelines tools
import {
  searchGuidelinesTool,
  guidelineSummaryTool,
  searchGuidelinesHandler,
  guidelineSummaryHandler,
} from "../providers/guidelines.js";

// CMS Pricing tools
import {
  medicareDrugPricingTool,
  procedurePricingTool,
  medicareDrugPricingHandler,
  procedurePricingHandler,
} from "../providers/cms-pricing.js";

// Drug Interactions tools
import {
  checkDrugInteractionsTool,
  getDrugInteractionDetailsTool,
  checkDrugInteractionsHandler,
  getDrugInteractionDetailsHandler,
} from "../providers/drug-interactions.js";

// Clinical Trials tools
import {
  searchClinicalTrialsTool,
  getClinicalTrialDetailsTool,
  getTrialResultsSummaryTool,
  searchClinicalTrialsHandler,
  getClinicalTrialDetailsHandler,
  getTrialResultsSummaryHandler,
} from "../providers/clinical-trials.js";

export function registerAllTools(): void {
  // OpenFDA Provider
  registerTool(drugLookupTool, drugLookupHandler);
  registerTool(adverseEventsTool, adverseEventsHandler);
  registerTool(drugRecallsTool, drugRecallsHandler);
  registerTool(drugLabelsTool, drugLabelsHandler);

  // Drug Interactions Provider
  registerTool(checkDrugInteractionsTool, checkDrugInteractionsHandler);
  registerTool(getDrugInteractionDetailsTool, getDrugInteractionDetailsHandler);

  // Clinical Trials Provider
  registerTool(searchClinicalTrialsTool, searchClinicalTrialsHandler);
  registerTool(getClinicalTrialDetailsTool, getClinicalTrialDetailsHandler);
  registerTool(getTrialResultsSummaryTool, getTrialResultsSummaryHandler);

  // Clinical Guidelines Provider
  registerTool(searchGuidelinesTool, searchGuidelinesHandler);
  registerTool(guidelineSummaryTool, guidelineSummaryHandler);

  // CMS Pricing Provider
  registerTool(medicareDrugPricingTool, medicareDrugPricingHandler);
  registerTool(procedurePricingTool, procedurePricingHandler);

  console.log("✓ Registered 13 healthcare tools:");
  console.log("  📦 OpenFDA:");
  console.log("     - drug_lookup, adverse_events, drug_recalls, drug_labels");
  console.log("  💊 Drug Interactions:");
  console.log("     - check_drug_interactions, get_drug_interaction_details");
  console.log("  🔬 Clinical Trials:");
  console.log("     - search_clinical_trials, get_clinical_trial_details, get_trial_results_summary");
  console.log("  📋 Guidelines & Pricing:");
  console.log("     - search_guidelines, guideline_summary, medicare_drug_pricing, procedure_pricing");
}
