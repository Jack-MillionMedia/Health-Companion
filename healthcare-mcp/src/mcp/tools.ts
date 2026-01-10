// Tool registration - connects all providers to MCP handler
import { registerTool } from "./handler.js";
import { toolLogger } from "../utils/logger.js";

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

  toolLogger.info({ count: 13 }, "registered healthcare tools");
  toolLogger.info("  📦 OpenFDA: drug_lookup, adverse_events, drug_recalls, drug_labels");
  toolLogger.info("  💊 Drug Interactions: check_drug_interactions, get_drug_interaction_details");
  toolLogger.info("  🔬 Clinical Trials: search_clinical_trials, get_clinical_trial_details, get_trial_results_summary");
  toolLogger.info("  📋 Guidelines & Pricing: search_guidelines, guideline_summary, medicare_drug_pricing, procedure_pricing");
}
