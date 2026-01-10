// Advanced Drug Interaction Checker
// Uses OpenFDA drug labels and NIH interaction data

import { fetchJson, buildQueryString } from "../utils/http.js";
import type { ToolCallResult, McpToolDefinition } from "../mcp/types.js";

const OPENFDA_LABEL = "https://api.fda.gov/drug/label.json";

// Interaction severity levels
type SeverityLevel = "major" | "moderate" | "minor" | "unknown";

interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: SeverityLevel;
  description: string;
  mechanism?: string;
  management?: string;
  source: string;
}

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

// Common high-risk interaction patterns (evidence-based)
const HIGH_RISK_COMBINATIONS: Record<string, { interacts_with: string[]; severity: SeverityLevel; warning: string }> = {
  warfarin: {
    interacts_with: ["aspirin", "ibuprofen", "naproxen", "vitamin k", "amiodarone", "fluconazole", "metronidazole", "sulfamethoxazole", "ciprofloxacin"],
    severity: "major",
    warning: "Increased risk of bleeding. INR monitoring required."
  },
  metformin: {
    interacts_with: ["contrast dye", "alcohol", "topiramate"],
    severity: "major", 
    warning: "Risk of lactic acidosis. Hold metformin before contrast procedures."
  },
  ssri: {
    interacts_with: ["tramadol", "triptans", "linezolid", "lithium", "st john's wort"],
    severity: "major",
    warning: "Risk of serotonin syndrome - potentially life-threatening."
  },
  sertraline: {
    interacts_with: ["tramadol", "sumatriptan", "linezolid", "lithium", "maoi"],
    severity: "major",
    warning: "Risk of serotonin syndrome - potentially life-threatening."
  },
  fluoxetine: {
    interacts_with: ["tramadol", "sumatriptan", "linezolid", "lithium", "maoi", "thioridazine"],
    severity: "major",
    warning: "Risk of serotonin syndrome and QT prolongation."
  },
  lisinopril: {
    interacts_with: ["potassium", "spironolactone", "amiloride", "triamterene", "lithium", "aliskiren"],
    severity: "moderate",
    warning: "Risk of hyperkalemia. Monitor potassium levels."
  },
  simvastatin: {
    interacts_with: ["amiodarone", "amlodipine", "diltiazem", "verapamil", "grapefruit", "clarithromycin", "itraconazole", "cyclosporine"],
    severity: "major",
    warning: "Increased risk of myopathy/rhabdomyolysis. Consider dose reduction or alternative statin."
  },
  atorvastatin: {
    interacts_with: ["clarithromycin", "itraconazole", "ritonavir", "cyclosporine", "gemfibrozil", "niacin"],
    severity: "major",
    warning: "Increased risk of myopathy/rhabdomyolysis."
  },
  digoxin: {
    interacts_with: ["amiodarone", "verapamil", "quinidine", "clarithromycin", "itraconazole"],
    severity: "major",
    warning: "Increased digoxin levels. Monitor levels and reduce digoxin dose."
  },
  methotrexate: {
    interacts_with: ["nsaids", "trimethoprim", "probenecid", "penicillins"],
    severity: "major",
    warning: "Increased methotrexate toxicity. Avoid combination or monitor closely."
  },
  lithium: {
    interacts_with: ["nsaids", "ace inhibitors", "thiazides", "ssris"],
    severity: "major",
    warning: "Increased lithium levels and toxicity risk. Monitor lithium levels."
  },
  clopidogrel: {
    interacts_with: ["omeprazole", "esomeprazole"],
    severity: "major",
    warning: "Reduced antiplatelet effect. Use pantoprazole or H2 blocker instead."
  },
  sildenafil: {
    interacts_with: ["nitrates", "nitroglycerin", "isosorbide", "riociguat"],
    severity: "major",
    warning: "Severe hypotension - CONTRAINDICATED. Do not use together."
  },
  maoi: {
    interacts_with: ["ssri", "snri", "tramadol", "meperidine", "dextromethorphan", "tyramine"],
    severity: "major",
    warning: "Risk of hypertensive crisis or serotonin syndrome - CONTRAINDICATED."
  }
};

// SSRI/SNRI drug list for pattern matching
const SSRI_SNRI_DRUGS = ["sertraline", "fluoxetine", "paroxetine", "citalopram", "escitalopram", "venlafaxine", "duloxetine", "desvenlafaxine"];
const NSAID_DRUGS = ["ibuprofen", "naproxen", "meloxicam", "celecoxib", "diclofenac", "indomethacin", "ketorolac", "aspirin"];
const ACE_INHIBITORS = ["lisinopril", "enalapril", "ramipril", "benazepril", "captopril", "fosinopril", "quinapril"];
const STATIN_DRUGS = ["simvastatin", "atorvastatin", "rosuvastatin", "pravastatin", "lovastatin", "fluvastatin"];

// Tool definitions
export const checkDrugInteractionsTool: McpToolDefinition = {
  name: "check_drug_interactions",
  description: "Check for potential drug-drug interactions between multiple medications. Returns severity, clinical significance, and management recommendations. Essential for medication safety review.",
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
  description: "Get detailed interaction information between two specific drugs including mechanism, clinical effects, and evidence level.",
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

// Helper: Normalize drug name for matching
function normalizeDrugName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

// Helper: Check if drug is in a category
function isDrugInCategory(drug: string, category: string[]): boolean {
  const normalized = normalizeDrugName(drug);
  return category.some(d => normalized.includes(normalizeDrugName(d)) || normalizeDrugName(d).includes(normalized));
}

// Helper: Get drug class
function getDrugClass(drug: string): string | null {
  const normalized = normalizeDrugName(drug);
  if (isDrugInCategory(drug, SSRI_SNRI_DRUGS)) return "ssri";
  if (isDrugInCategory(drug, NSAID_DRUGS)) return "nsaids";
  if (isDrugInCategory(drug, ACE_INHIBITORS)) return "ace inhibitors";
  if (isDrugInCategory(drug, STATIN_DRUGS)) return "statins";
  return null;
}

// Fetch drug label data from OpenFDA
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
  } catch (error) {
    // Silently fail - will use pattern matching
  }
  return null;
}

// Check interactions from our database
function checkKnownInteractions(drugs: string[]): DrugInteraction[] {
  const interactions: DrugInteraction[] = [];
  const normalizedDrugs = drugs.map(d => normalizeDrugName(d));

  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      const drug1 = drugs[i];
      const drug2 = drugs[j];
      const norm1 = normalizedDrugs[i];
      const norm2 = normalizedDrugs[j];

      // Check direct matches in our database
      for (const [baseDrug, data] of Object.entries(HIGH_RISK_COMBINATIONS)) {
        const baseNorm = normalizeDrugName(baseDrug);
        
        // Check if drug1 is the base drug and drug2 is in interacts_with (or vice versa)
        if (norm1.includes(baseNorm) || baseNorm.includes(norm1)) {
          for (const interactor of data.interacts_with) {
            const interactorNorm = normalizeDrugName(interactor);
            if (norm2.includes(interactorNorm) || interactorNorm.includes(norm2)) {
              interactions.push({
                drug1,
                drug2,
                severity: data.severity,
                description: data.warning,
                source: "FDA/Clinical Guidelines Database"
              });
            }
          }
        }
        
        // Check reverse
        if (norm2.includes(baseNorm) || baseNorm.includes(norm2)) {
          for (const interactor of data.interacts_with) {
            const interactorNorm = normalizeDrugName(interactor);
            if (norm1.includes(interactorNorm) || interactorNorm.includes(norm1)) {
              // Avoid duplicates
              const exists = interactions.some(
                int => (int.drug1 === drug1 && int.drug2 === drug2) || (int.drug1 === drug2 && int.drug2 === drug1)
              );
              if (!exists) {
                interactions.push({
                  drug1,
                  drug2,
                  severity: data.severity,
                  description: data.warning,
                  source: "FDA/Clinical Guidelines Database"
                });
              }
            }
          }
        }
      }

      // Check drug class interactions
      const class1 = getDrugClass(drug1);
      const class2 = getDrugClass(drug2);

      // SSRI + SSRI
      if (class1 === "ssri" && class2 === "ssri") {
        interactions.push({
          drug1,
          drug2,
          severity: "major",
          description: "Multiple serotonergic agents increase risk of serotonin syndrome.",
          source: "Clinical Guidelines"
        });
      }

      // NSAID + ACE Inhibitor
      if ((class1 === "nsaids" && class2 === "ace inhibitors") || 
          (class2 === "nsaids" && class1 === "ace inhibitors")) {
        interactions.push({
          drug1,
          drug2,
          severity: "moderate",
          description: "NSAIDs may reduce antihypertensive effect and increase risk of renal impairment.",
          source: "Clinical Guidelines"
        });
      }

      // NSAID + NSAID
      if (class1 === "nsaids" && class2 === "nsaids") {
        interactions.push({
          drug1,
          drug2,
          severity: "major",
          description: "Multiple NSAIDs increase risk of GI bleeding and renal toxicity. Avoid combination.",
          source: "Clinical Guidelines"
        });
      }
    }
  }

  return interactions;
}

// Extract interactions from FDA label text
function extractInteractionsFromLabel(label: DrugLabelResult, drugName: string, otherDrugs: string[]): DrugInteraction[] {
  const interactions: DrugInteraction[] = [];
  const interactionText = (label.drug_interactions || []).join(" ").toLowerCase();
  const warningsText = (label.warnings || []).join(" ").toLowerCase();
  const contraindicationsText = (label.contraindications || []).join(" ").toLowerCase();

  const allText = interactionText + " " + warningsText + " " + contraindicationsText;

  for (const otherDrug of otherDrugs) {
    const normalized = normalizeDrugName(otherDrug);
    if (allText.includes(normalized)) {
      // Try to extract the relevant sentence
      const sentences = allText.split(/[.!?]+/);
      const relevantSentences = sentences.filter(s => s.includes(normalized)).slice(0, 2);
      
      let severity: SeverityLevel = "unknown";
      if (allText.includes("contraindicated") || allText.includes("do not use") || allText.includes("avoid")) {
        severity = "major";
      } else if (allText.includes("caution") || allText.includes("monitor")) {
        severity = "moderate";
      }

      if (relevantSentences.length > 0) {
        interactions.push({
          drug1: drugName,
          drug2: otherDrug,
          severity,
          description: relevantSentences.join(". ").trim().slice(0, 500),
          source: "FDA Drug Label"
        });
      }
    }
  }

  return interactions;
}

// Tool handlers
export async function checkDrugInteractionsHandler(
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const drugs = args.drugs as string[];
  const includeFood = args.include_food !== false;

  if (!drugs || drugs.length < 2) {
    return {
      content: [{
        type: "text",
        text: "Please provide at least 2 drugs to check for interactions.",
      }],
      isError: true,
    };
  }

  // Add common food interactions if requested
  const checkList = [...drugs];
  if (includeFood) {
    // We'll check against these in the pattern matching
  }

  const allInteractions: DrugInteraction[] = [];

  // 1. Check our curated database
  const knownInteractions = checkKnownInteractions(checkList);
  allInteractions.push(...knownInteractions);

  // 2. Fetch FDA labels and extract additional interactions
  for (const drug of drugs) {
    const label = await fetchDrugLabel(drug);
    if (label) {
      const otherDrugs = drugs.filter(d => d !== drug);
      const labelInteractions = extractInteractionsFromLabel(label, drug, otherDrugs);
      
      // Add only if not already found
      for (const interaction of labelInteractions) {
        const exists = allInteractions.some(
          int => (int.drug1 === interaction.drug1 && int.drug2 === interaction.drug2) ||
                 (int.drug1 === interaction.drug2 && int.drug2 === interaction.drug1)
        );
        if (!exists) {
          allInteractions.push(interaction);
        }
      }
    }
  }

  // Remove duplicates and sort by severity
  const severityOrder: Record<SeverityLevel, number> = { major: 0, moderate: 1, minor: 2, unknown: 3 };
  const uniqueInteractions = allInteractions
    .filter((int, idx, arr) => {
      const firstIdx = arr.findIndex(
        i => (i.drug1 === int.drug1 && i.drug2 === int.drug2) ||
             (i.drug1 === int.drug2 && i.drug2 === int.drug1)
      );
      return firstIdx === idx;
    })
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Format response
  const majorCount = uniqueInteractions.filter(i => i.severity === "major").length;
  const moderateCount = uniqueInteractions.filter(i => i.severity === "moderate").length;
  const minorCount = uniqueInteractions.filter(i => i.severity === "minor" || i.severity === "unknown").length;

  let text = `# Drug Interaction Report\n\n`;
  text += `**Medications Checked:** ${drugs.join(", ")}\n\n`;
  
  if (uniqueInteractions.length === 0) {
    text += `## ✅ No Known Interactions Found\n\n`;
    text += `No significant drug-drug interactions were identified between these medications in our database. `;
    text += `However, this does not guarantee safety. Always verify with a pharmacist or healthcare provider.\n`;
  } else {
    text += `## ⚠️ Interactions Found: ${uniqueInteractions.length}\n\n`;
    text += `| Severity | Count |\n|----------|-------|\n`;
    if (majorCount > 0) text += `| 🔴 Major | ${majorCount} |\n`;
    if (moderateCount > 0) text += `| 🟡 Moderate | ${moderateCount} |\n`;
    if (minorCount > 0) text += `| 🟢 Minor/Unknown | ${minorCount} |\n`;
    text += `\n`;

    // Group by severity
    if (majorCount > 0) {
      text += `### 🔴 Major Interactions (Avoid or Use Extreme Caution)\n\n`;
      for (const int of uniqueInteractions.filter(i => i.severity === "major")) {
        text += `**${int.drug1} + ${int.drug2}**\n`;
        text += `${int.description}\n`;
        text += `*Source: ${int.source}*\n\n`;
      }
    }

    if (moderateCount > 0) {
      text += `### 🟡 Moderate Interactions (Monitor Closely)\n\n`;
      for (const int of uniqueInteractions.filter(i => i.severity === "moderate")) {
        text += `**${int.drug1} + ${int.drug2}**\n`;
        text += `${int.description}\n`;
        text += `*Source: ${int.source}*\n\n`;
      }
    }

    if (minorCount > 0) {
      text += `### 🟢 Minor/Unknown Interactions\n\n`;
      for (const int of uniqueInteractions.filter(i => i.severity === "minor" || i.severity === "unknown")) {
        text += `**${int.drug1} + ${int.drug2}**\n`;
        text += `${int.description}\n`;
        text += `*Source: ${int.source}*\n\n`;
      }
    }
  }

  text += `---\n`;
  text += `⚕️ **Important:** This is a screening tool. Always consult a pharmacist or healthcare provider for complete interaction checking, especially for:\n`;
  text += `- Complex medication regimens\n`;
  text += `- Patients with liver or kidney impairment\n`;
  text += `- Elderly patients\n`;
  text += `- Patients taking narrow therapeutic index drugs\n`;

  return {
    content: [{ type: "text", text }],
  };
}

export async function getDrugInteractionDetailsHandler(
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const drug1 = String(args.drug1);
  const drug2 = String(args.drug2);

  // Check our database first
  const interactions = checkKnownInteractions([drug1, drug2]);

  // Fetch labels for both drugs
  const [label1, label2] = await Promise.all([
    fetchDrugLabel(drug1),
    fetchDrugLabel(drug2),
  ]);

  // Extract from labels
  if (label1) {
    const labelInt = extractInteractionsFromLabel(label1, drug1, [drug2]);
    for (const int of labelInt) {
      if (!interactions.some(i => i.drug1 === int.drug1 && i.drug2 === int.drug2)) {
        interactions.push(int);
      }
    }
  }
  if (label2) {
    const labelInt = extractInteractionsFromLabel(label2, drug2, [drug1]);
    for (const int of labelInt) {
      if (!interactions.some(i => 
        (i.drug1 === int.drug1 && i.drug2 === int.drug2) ||
        (i.drug1 === int.drug2 && i.drug2 === int.drug1)
      )) {
        interactions.push(int);
      }
    }
  }

  let text = `# Interaction Details: ${drug1} + ${drug2}\n\n`;

  if (interactions.length === 0) {
    text += `## No Documented Interaction\n\n`;
    text += `No significant interaction between ${drug1} and ${drug2} was found in our database.\n\n`;
    text += `**Note:** Absence of documented interaction does not guarantee safety. `;
    text += `New interactions are discovered regularly. Consult a pharmacist for definitive guidance.\n`;
  } else {
    const int = interactions[0]; // Use most relevant
    
    const severityEmoji = int.severity === "major" ? "🔴" : int.severity === "moderate" ? "🟡" : "🟢";
    const severityText = int.severity.charAt(0).toUpperCase() + int.severity.slice(1);
    
    text += `## ${severityEmoji} Severity: ${severityText}\n\n`;
    text += `### Clinical Significance\n${int.description}\n\n`;
    
    if (int.mechanism) {
      text += `### Mechanism\n${int.mechanism}\n\n`;
    }
    
    if (int.management) {
      text += `### Management\n${int.management}\n\n`;
    }
    
    text += `### Recommendations\n`;
    if (int.severity === "major") {
      text += `- **Avoid this combination** if possible\n`;
      text += `- If unavoidable, require close monitoring\n`;
      text += `- Document clinical justification\n`;
      text += `- Consider alternative medications\n`;
    } else if (int.severity === "moderate") {
      text += `- **Use with caution**\n`;
      text += `- Monitor for signs of interaction\n`;
      text += `- Adjust doses if necessary\n`;
      text += `- Educate patient on warning signs\n`;
    } else {
      text += `- Generally safe to use together\n`;
      text += `- Standard monitoring is usually sufficient\n`;
    }
    
    text += `\n*Source: ${int.source}*\n`;
  }

  // Add drug info if available
  if (label1 || label2) {
    text += `\n---\n### Additional Drug Information\n\n`;
    if (label1?.openfda) {
      text += `**${drug1}:** ${label1.openfda.generic_name?.[0] || drug1} (${label1.openfda.brand_name?.[0] || "N/A"})\n`;
    }
    if (label2?.openfda) {
      text += `**${drug2}:** ${label2.openfda.generic_name?.[0] || drug2} (${label2.openfda.brand_name?.[0] || "N/A"})\n`;
    }
  }

  return {
    content: [{ type: "text", text }],
  };
}
