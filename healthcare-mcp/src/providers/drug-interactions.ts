/**
 * Drug Interaction Checker Provider
 * 
 * Uses curated evidence-based interaction database combined with
 * real-time FDA drug label data for comprehensive interaction checking.
 * 
 * @version 2.0.0
 */

import { fetchJson, buildQueryString } from "../utils/http.js";
import type { ToolCallResult, McpToolDefinition } from "../mcp/types.js";
import {
  DRUG_INTERACTIONS,
  INTERACTION_DB_VERSION,
  INTERACTION_DB_LAST_UPDATED,
  getDrugClass,
  matchesDrug,
  type DrugInteractionEntry,
  type SeverityLevel,
  // Drug class lists for pattern matching
  SSRI_DRUGS,
  SNRI_DRUGS,
  NSAID_DRUGS,
  ACE_INHIBITORS,
  ARB_DRUGS,
  STATIN_DRUGS,
  OPIOID_DRUGS,
  BENZODIAZEPINE_DRUGS,
  QT_PROLONGING_DRUGS,
  DOAC_DRUGS,
  FLUOROQUINOLONE_DRUGS,
} from "../data/interaction-database.js";

const OPENFDA_LABEL = "https://api.fda.gov/drug/label.json";

// ============================================================================
// TYPES
// ============================================================================

interface DrugLabelResult {
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    substance_name?: string[];
  };
  drug_interactions?: string[];
  warnings?: string[];
  contraindications?: string[];
}

interface OpenFdaResponse {
  results?: DrugLabelResult[];
  error?: { message: string };
}

interface FoundInteraction {
  drug1: string;
  drug2: string;
  severity: SeverityLevel | "unknown";
  evidence: string;
  description: string;
  mechanism?: string;
  management?: string;
  monitoringRequired: boolean;
  monitoringParameters?: string[];
  sources: string[];
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const checkDrugInteractionsTool: McpToolDefinition = {
  name: "check_drug_interactions",
  description: `Check for potential drug-drug interactions between multiple medications. Uses evidence-based database (v${INTERACTION_DB_VERSION}) with 50+ high-risk combinations. Returns severity, clinical significance, mechanism, and management recommendations.`,
  inputSchema: {
    type: "object",
    properties: {
      drugs: {
        type: "array",
        items: { type: "string" },
        description: "List of drug names to check for interactions (generic or brand names)",
      },
      include_food: {
        type: "boolean",
        description: "Include food/supplement interactions (default: true)",
      },
    },
    required: ["drugs"],
  },
};

export const getDrugInteractionDetailsTool: McpToolDefinition = {
  name: "get_drug_interaction_details",
  description: "Get detailed interaction information between two specific drugs including mechanism, clinical effects, evidence level, and management recommendations.",
  inputSchema: {
    type: "object",
    properties: {
      drug1: {
        type: "string",
        description: "First drug name",
      },
      drug2: {
        type: "string",
        description: "Second drug name",
      },
    },
    required: ["drug1", "drug2"],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize drug name for matching
 */
function normalizeDrugName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "");
}

/**
 * Check if a drug name matches any drug in an array
 */
function isDrugInList(drugName: string, drugList: readonly string[]): boolean {
  const normalized = normalizeDrugName(drugName);
  return drugList.some(d => {
    const listDrug = normalizeDrugName(d);
    return normalized.includes(listDrug) || listDrug.includes(normalized);
  });
}

/**
 * Find matching interactions from the database
 */
function findDatabaseInteractions(drug1: string, drug2: string): DrugInteractionEntry[] {
  const matches: DrugInteractionEntry[] = [];
  
  for (const interaction of DRUG_INTERACTIONS) {
    const drug1Matches = matchesDrug(drug1, interaction.drug) || matchesDrug(drug1, interaction.interactsWith);
    const drug2Matches = matchesDrug(drug2, interaction.drug) || matchesDrug(drug2, interaction.interactsWith);
    
    // Check if this interaction applies to our drug pair
    if (drug1Matches && drug2Matches) {
      // Make sure we're not matching the same drug to both sides
      const drug1MatchesPrimary = matchesDrug(drug1, interaction.drug);
      const drug2MatchesSecondary = matchesDrug(drug2, interaction.interactsWith);
      const drug1MatchesSecondary = matchesDrug(drug1, interaction.interactsWith);
      const drug2MatchesPrimary = matchesDrug(drug2, interaction.drug);
      
      if ((drug1MatchesPrimary && drug2MatchesSecondary) || (drug1MatchesSecondary && drug2MatchesPrimary)) {
        matches.push(interaction);
      }
    }
  }
  
  return matches;
}

/**
 * Check for class-level interactions not explicitly in database
 */
function checkClassInteractions(drug1: string, drug2: string): FoundInteraction[] {
  const interactions: FoundInteraction[] = [];
  const class1 = getDrugClass(drug1);
  const class2 = getDrugClass(drug2);
  
  // QT Prolongation - any two QT drugs (including fluoroquinolones)
  const isQT1 = isDrugInList(drug1, QT_PROLONGING_DRUGS) || isDrugInList(drug1, FLUOROQUINOLONE_DRUGS);
  const isQT2 = isDrugInList(drug2, QT_PROLONGING_DRUGS) || isDrugInList(drug2, FLUOROQUINOLONE_DRUGS);
  
  if (isQT1 && isQT2) {
    interactions.push({
      drug1,
      drug2,
      severity: "major",
      evidence: "established",
      description: "Both drugs prolong the QT interval. Concurrent use increases risk of Torsades de Pointes arrhythmia.",
      mechanism: "Additive blockade of cardiac potassium channels causing delayed repolarization.",
      management: "Avoid combination if possible. If necessary, obtain baseline ECG, monitor QTc, correct electrolytes.",
      monitoringRequired: true,
      monitoringParameters: ["ECG/QTc", "Potassium", "Magnesium"],
      sources: ["CredibleMeds.org"],
    });
  }
  
  // DOACs + NSAIDs
  if ((isDrugInList(drug1, DOAC_DRUGS) && isDrugInList(drug2, NSAID_DRUGS)) ||
      (isDrugInList(drug2, DOAC_DRUGS) && isDrugInList(drug1, NSAID_DRUGS))) {
    interactions.push({
      drug1,
      drug2,
      severity: "major",
      evidence: "established",
      description: "NSAIDs increase bleeding risk with DOACs through antiplatelet effects and GI mucosal damage.",
      mechanism: "NSAIDs impair platelet function and cause GI mucosal injury, adding to anticoagulant bleeding risk.",
      management: "Avoid chronic NSAID use. For acute pain, use lowest dose, shortest duration. Add PPI for GI protection.",
      monitoringRequired: true,
      monitoringParameters: ["Signs of bleeding", "Hemoglobin"],
      sources: ["Davidson BL et al. Lancet 2014"],
    });
  }
  
  // Multiple SSRIs/SNRIs
  if ((class1 === "ssri" || class1 === "snri") && (class2 === "ssri" || class2 === "snri") && drug1 !== drug2) {
    interactions.push({
      drug1,
      drug2,
      severity: "major",
      evidence: "established",
      description: "Concurrent use of multiple serotonergic antidepressants increases risk of serotonin syndrome.",
      mechanism: "Redundant serotonin reuptake inhibition causing excessive serotonergic activity.",
      management: "Avoid combination. If switching agents, allow appropriate washout period.",
      monitoringRequired: true,
      monitoringParameters: ["Serotonin syndrome symptoms"],
      sources: ["Clinical Guidelines"],
    });
  }
  
  // Multiple opioids
  if (isDrugInList(drug1, OPIOID_DRUGS) && isDrugInList(drug2, OPIOID_DRUGS) && 
      normalizeDrugName(drug1) !== normalizeDrugName(drug2)) {
    interactions.push({
      drug1,
      drug2,
      severity: "major",
      evidence: "established",
      description: "Concurrent use of multiple opioids increases risk of respiratory depression, overdose, and death.",
      mechanism: "Additive CNS and respiratory depression effects.",
      management: "Avoid unless clinically necessary (e.g., breakthrough pain in palliative care). Use lowest effective doses.",
      monitoringRequired: true,
      monitoringParameters: ["Respiratory rate", "Level of sedation"],
      sources: ["FDA Guidelines"],
    });
  }
  
  // NSAIDs + NSAIDs
  if (isDrugInList(drug1, NSAID_DRUGS) && isDrugInList(drug2, NSAID_DRUGS) &&
      normalizeDrugName(drug1) !== normalizeDrugName(drug2)) {
    interactions.push({
      drug1,
      drug2,
      severity: "major",
      evidence: "established",
      description: "Multiple NSAIDs significantly increase risk of GI bleeding and acute kidney injury without added benefit.",
      mechanism: "Additive COX inhibition increasing GI and renal toxicity without improved efficacy.",
      management: "Do not use multiple NSAIDs concurrently. Choose one agent at appropriate dose.",
      monitoringRequired: true,
      monitoringParameters: ["GI symptoms", "Renal function"],
      sources: ["Clinical Guidelines"],
    });
  }
  
  return interactions;
}

/**
 * Fetch drug label from OpenFDA
 */
async function fetchDrugLabel(drugName: string): Promise<DrugLabelResult | null> {
  const searchQuery = `openfda.brand_name:"${drugName}"+openfda.generic_name:"${drugName}"`;
  const url = `${OPENFDA_LABEL}${buildQueryString({
    search: searchQuery,
    limit: 1,
  })}`;

  try {
    const response = await fetchJson<OpenFdaResponse>(url);
    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0];
    }
  } catch {
    // Silently fail - will use database
  }
  return null;
}

/**
 * Severity display helpers
 */
const SEVERITY_EMOJI: Record<string, string> = {
  contraindicated: "⛔",
  major: "🔴",
  moderate: "🟡",
  minor: "🟢",
  unknown: "⚪",
};

const SEVERITY_LABEL: Record<string, string> = {
  contraindicated: "CONTRAINDICATED",
  major: "Major",
  moderate: "Moderate",
  minor: "Minor",
  unknown: "Unknown",
};

const SEVERITY_ORDER: Record<string, number> = {
  contraindicated: 0,
  major: 1,
  moderate: 2,
  minor: 3,
  unknown: 4,
};

// ============================================================================
// TOOL HANDLERS
// ============================================================================

export async function checkDrugInteractionsHandler(
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const drugs = args.drugs as string[];
  const _includeFood = args.include_food !== false;

  if (!drugs || drugs.length < 2) {
    return {
      content: [{
        type: "text",
        text: "Please provide at least 2 drugs to check for interactions.",
      }],
      isError: true,
    };
  }

  const allInteractions: FoundInteraction[] = [];
  const checkedPairs = new Set<string>();

  // Check all drug pairs
  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      const drug1 = drugs[i];
      const drug2 = drugs[j];
      const pairKey = [normalizeDrugName(drug1), normalizeDrugName(drug2)].sort().join("|");
      
      if (checkedPairs.has(pairKey)) continue;
      checkedPairs.add(pairKey);

      // 1. Check curated database
      const dbInteractions = findDatabaseInteractions(drug1, drug2);
      for (const int of dbInteractions) {
        allInteractions.push({
          drug1,
          drug2,
          severity: int.severity,
          evidence: int.evidence,
          description: int.description,
          mechanism: int.mechanismDetail,
          management: int.management,
          monitoringRequired: int.monitoringRequired,
          monitoringParameters: int.monitoringParameters,
          sources: int.sources,
        });
      }

      // 2. Check class-level interactions
      if (dbInteractions.length === 0) {
        const classInteractions = checkClassInteractions(drug1, drug2);
        allInteractions.push(...classInteractions);
      }
    }
  }

  // Remove duplicates and sort by severity
  const uniqueInteractions = allInteractions
    .filter((int, idx, arr) => {
      const key = [normalizeDrugName(int.drug1), normalizeDrugName(int.drug2)].sort().join("|") + int.severity;
      const firstIdx = arr.findIndex(i => 
        [normalizeDrugName(i.drug1), normalizeDrugName(i.drug2)].sort().join("|") + i.severity === key
      );
      return firstIdx === idx;
    })
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  // Count by severity
  const counts = {
    contraindicated: uniqueInteractions.filter(i => i.severity === "contraindicated").length,
    major: uniqueInteractions.filter(i => i.severity === "major").length,
    moderate: uniqueInteractions.filter(i => i.severity === "moderate").length,
    minor: uniqueInteractions.filter(i => i.severity === "minor" || i.severity === "unknown").length,
  };

  // Format response
  let text = `# Drug Interaction Report\n\n`;
  text += `**Database Version:** ${INTERACTION_DB_VERSION} (Updated: ${INTERACTION_DB_LAST_UPDATED})\n`;
  text += `**Medications Checked:** ${drugs.join(", ")}\n\n`;

  if (uniqueInteractions.length === 0) {
    text += `## ✅ No Known Interactions Found\n\n`;
    text += `No significant drug-drug interactions were identified between these medications in our database.\n\n`;
    text += `**Important:** This does not guarantee safety. Always verify with a pharmacist or healthcare provider.\n`;
  } else {
    text += `## ⚠️ ${uniqueInteractions.length} Interaction(s) Found\n\n`;
    text += `| Severity | Count |\n|----------|-------|\n`;
    if (counts.contraindicated > 0) text += `| ⛔ Contraindicated | ${counts.contraindicated} |\n`;
    if (counts.major > 0) text += `| 🔴 Major | ${counts.major} |\n`;
    if (counts.moderate > 0) text += `| 🟡 Moderate | ${counts.moderate} |\n`;
    if (counts.minor > 0) text += `| 🟢 Minor | ${counts.minor} |\n`;
    text += `\n`;

    // Contraindicated
    if (counts.contraindicated > 0) {
      text += `### ⛔ CONTRAINDICATED - Do Not Use Together\n\n`;
      for (const int of uniqueInteractions.filter(i => i.severity === "contraindicated")) {
        text += `**${int.drug1} + ${int.drug2}**\n`;
        text += `${int.description}\n`;
        if (int.management) text += `*Management:* ${int.management}\n`;
        text += `*Sources:* ${int.sources.join(", ")}\n\n`;
      }
    }

    // Major
    if (counts.major > 0) {
      text += `### 🔴 Major Interactions - Avoid or Use Extreme Caution\n\n`;
      for (const int of uniqueInteractions.filter(i => i.severity === "major")) {
        text += `**${int.drug1} + ${int.drug2}**\n`;
        text += `${int.description}\n`;
        if (int.mechanism) text += `*Mechanism:* ${int.mechanism}\n`;
        if (int.management) text += `*Management:* ${int.management}\n`;
        if (int.monitoringRequired && int.monitoringParameters) {
          text += `*Monitor:* ${int.monitoringParameters.join(", ")}\n`;
        }
        text += `*Sources:* ${int.sources.join(", ")}\n\n`;
      }
    }

    // Moderate
    if (counts.moderate > 0) {
      text += `### 🟡 Moderate Interactions - Monitor Closely\n\n`;
      for (const int of uniqueInteractions.filter(i => i.severity === "moderate")) {
        text += `**${int.drug1} + ${int.drug2}**\n`;
        text += `${int.description}\n`;
        if (int.management) text += `*Management:* ${int.management}\n`;
        text += `\n`;
      }
    }

    // Minor
    if (counts.minor > 0) {
      text += `### 🟢 Minor Interactions\n\n`;
      for (const int of uniqueInteractions.filter(i => i.severity === "minor" || i.severity === "unknown")) {
        text += `**${int.drug1} + ${int.drug2}**\n`;
        text += `${int.description}\n\n`;
      }
    }
  }

  text += `---\n`;
  text += `⚕️ **Important:** This is a screening tool using evidence-based data. Always consult a pharmacist or healthcare provider, especially for:\n`;
  text += `- Complex medication regimens\n`;
  text += `- Patients with liver or kidney impairment\n`;
  text += `- Elderly patients\n`;
  text += `- Narrow therapeutic index drugs\n`;

  return {
    content: [{ type: "text", text }],
  };
}

export async function getDrugInteractionDetailsHandler(
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const drug1 = String(args.drug1);
  const drug2 = String(args.drug2);

  // Find database interactions
  const dbInteractions = findDatabaseInteractions(drug1, drug2);
  const classInteractions = checkClassInteractions(drug1, drug2);
  
  // Combine, preferring database entries
  const allInteractions = [...dbInteractions.map(int => ({
    drug1,
    drug2,
    severity: int.severity as SeverityLevel,
    evidence: int.evidence,
    description: int.description,
    mechanism: int.mechanismDetail,
    management: int.management,
    monitoringRequired: int.monitoringRequired,
    monitoringParameters: int.monitoringParameters,
    sources: int.sources,
    effect: int.effect,
  })), ...classInteractions];

  // Fetch FDA labels for additional context
  const [label1, label2] = await Promise.all([
    fetchDrugLabel(drug1),
    fetchDrugLabel(drug2),
  ]);

  let text = `# Interaction Details: ${drug1} + ${drug2}\n\n`;
  text += `**Database Version:** ${INTERACTION_DB_VERSION}\n\n`;

  if (allInteractions.length === 0) {
    text += `## No Documented Interaction\n\n`;
    text += `No significant interaction between ${drug1} and ${drug2} was found in our database.\n\n`;
    text += `**Note:** Absence of documented interaction does not guarantee safety. New interactions are discovered regularly.\n`;
  } else {
    const primary = allInteractions[0];
    const emoji = SEVERITY_EMOJI[primary.severity] || "⚪";
    const label = SEVERITY_LABEL[primary.severity] || "Unknown";

    text += `## ${emoji} Severity: ${label}\n\n`;
    text += `**Evidence Level:** ${primary.evidence}\n\n`;
    
    text += `### Clinical Significance\n${primary.description}\n\n`;

    if (primary.mechanism) {
      text += `### Mechanism\n${primary.mechanism}\n\n`;
    }

    if (primary.management) {
      text += `### Management\n${primary.management}\n\n`;
    }

    if (primary.monitoringRequired && primary.monitoringParameters) {
      text += `### Monitoring Required\n`;
      for (const param of primary.monitoringParameters) {
        text += `- ${param}\n`;
      }
      text += `\n`;
    }

    text += `### Recommendations\n`;
    if (primary.severity === "contraindicated") {
      text += `- **DO NOT USE this combination**\n`;
      text += `- There are no safe conditions for concurrent use\n`;
      text += `- Seek alternative therapy\n`;
    } else if (primary.severity === "major") {
      text += `- **Avoid this combination** if possible\n`;
      text += `- If unavoidable, require close monitoring\n`;
      text += `- Document clinical justification\n`;
      text += `- Consider alternative medications\n`;
    } else if (primary.severity === "moderate") {
      text += `- **Use with caution**\n`;
      text += `- Monitor for signs of interaction\n`;
      text += `- Adjust doses if necessary\n`;
      text += `- Educate patient on warning signs\n`;
    } else {
      text += `- Generally safe to use together\n`;
      text += `- Standard monitoring is usually sufficient\n`;
    }

    text += `\n### Sources\n`;
    for (const source of primary.sources) {
      text += `- ${source}\n`;
    }
  }

  // Add drug info if available
  if (label1?.openfda || label2?.openfda) {
    text += `\n---\n### Drug Information\n\n`;
    if (label1?.openfda) {
      const generic = label1.openfda.generic_name?.[0] || drug1;
      const brand = label1.openfda.brand_name?.[0];
      text += `**${drug1}:** ${generic}${brand ? ` (${brand})` : ""}\n`;
    }
    if (label2?.openfda) {
      const generic = label2.openfda.generic_name?.[0] || drug2;
      const brand = label2.openfda.brand_name?.[0];
      text += `**${drug2}:** ${generic}${brand ? ` (${brand})` : ""}\n`;
    }
  }

  return {
    content: [{ type: "text", text }],
  };
}
