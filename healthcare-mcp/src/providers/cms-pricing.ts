// CMS Pricing Provider - Medicare drug and procedure pricing
import { fetchJson, buildQueryString } from "../utils/http.js";
import type { ToolCallResult, McpToolDefinition } from "../mcp/types.js";

// CMS Data API base URL for Medicare Part D data
const CMS_DRUG_API = "https://data.cms.gov/data-api/v1/dataset";

// Response types
interface CmsApiResponse<T> {
  data: T[];
  meta?: {
    total_count: number;
  };
}

interface PartDDrugRecord {
  Brnd_Name?: string;
  Gnrc_Name?: string;
  Mftr_Name?: string;
  Tot_Spndng?: string;
  Tot_Dsg_Unts?: string;
  Tot_Clms?: string;
  Tot_Benes?: string;
  Avg_Spnd_Per_Dsg_Unt_Wghtd?: string;
  Avg_Spnd_Per_Clm?: string;
  Avg_Spnd_Per_Bene?: string;
  Outlier_Flag?: string;
  Chg_Avg_Spnd_Per_Dsg_Unt?: string;
}

interface PhysicianFeeRecord {
  HCPCS_Cd?: string;
  HCPCS_Desc?: string;
  Status_Cd?: string;
  Non_Fac_PE_RVUs?: string;
  Fac_PE_RVUs?: string;
  Work_RVUs?: string;
  MP_RVUs?: string;
  Non_Fac_Total?: string;
  Fac_Total?: string;
  PCTC_Ind?: string;
  Global_Days?: string;
}

// Tool definitions
export const medicareDrugPricingTool: McpToolDefinition = {
  name: "medicare_drug_pricing",
  description: "Look up Medicare Part D drug spending and pricing data. Shows total spending, claims, beneficiaries, and average costs per dose.",
  inputSchema: {
    type: "object",
    properties: {
      drug_name: {
        type: "string",
        description: "Brand or generic drug name to search for",
      },
      manufacturer: {
        type: "string",
        description: "Filter by manufacturer name (optional)",
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default: 10, max: 25)",
      },
    },
    required: ["drug_name"],
  },
};

export const procedurePricingTool: McpToolDefinition = {
  name: "procedure_pricing",
  description: "Look up Medicare procedure costs by HCPCS/CPT code or procedure description. Returns relative value units (RVUs) and fee schedule amounts.",
  inputSchema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "HCPCS or CPT code (e.g., '99213', '27447')",
      },
      description: {
        type: "string",
        description: "Procedure description to search for (alternative to code)",
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default: 10, max: 25)",
      },
    },
  },
};

// Helper to format currency
function formatCurrency(value: string | undefined): string {
  if (!value) return "N/A";
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

// Helper to format large numbers
function formatNumber(value: string | undefined): string {
  if (!value) return "N/A";
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return new Intl.NumberFormat("en-US").format(num);
}

// Tool handlers
export async function medicareDrugPricingHandler(
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const drugName = String(args.drug_name);
  const limit = Math.min(Number(args.limit) || 10, 25);

  // Medicare Part D Spending dataset ID (2022 data)
  const datasetId = "edf7a775-1f01-58c7-b7ab-e3191acf5c43";
  
  const url = `${CMS_DRUG_API}/${datasetId}/data${buildQueryString({
    "keyword": drugName,
    "size": limit,
  })}`;

  try {
    const response = await fetchJson<PartDDrugRecord[]>(url);

    // CMS API returns array directly
    const results = Array.isArray(response.data) ? response.data : [];

    if (results.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No Medicare Part D pricing data found for "${drugName}". Try a different spelling or check if it's a Part D covered drug.`,
        }],
      };
    }

    return formatDrugResults(drugName, results);
  } catch (error) {
    // If CMS API fails, provide helpful message
    return {
      content: [{
        type: "text",
        text: `# Medicare Part D Pricing: "${drugName}"\n\n⚠️ Unable to fetch live CMS data. The CMS Data API may be temporarily unavailable.\n\n**Alternative Resources:**\n- [Medicare Part D Drug Spending Dashboard](https://data.cms.gov/summary-statistics-on-use-and-payments/medicare-medicaid-spending-by-drug/medicare-part-d-spending-by-drug)\n- [Medicare Plan Finder](https://www.medicare.gov/plan-compare)\n- [GoodRx](https://www.goodrx.com/) for retail pricing\n\n*Error: ${error instanceof Error ? error.message : String(error)}*`,
      }],
    };
  }
}

function formatDrugResults(drugName: string, results: PartDDrugRecord[]): ToolCallResult {
  const formatted = results.map((drug, idx) => {
    let text = `### ${idx + 1}. ${drug.Brnd_Name || "Unknown"}\n`;
    text += `**Generic Name:** ${drug.Gnrc_Name || "N/A"}\n`;
    text += `**Manufacturer:** ${drug.Mftr_Name || "N/A"}\n`;
    text += `**Total Medicare Spending:** ${formatCurrency(drug.Tot_Spndng)}\n`;
    text += `**Total Claims:** ${formatNumber(drug.Tot_Clms)}\n`;
    text += `**Total Beneficiaries:** ${formatNumber(drug.Tot_Benes)}\n`;
    text += `**Avg Cost Per Dose:** ${formatCurrency(drug.Avg_Spnd_Per_Dsg_Unt_Wghtd)}\n`;
    text += `**Avg Cost Per Claim:** ${formatCurrency(drug.Avg_Spnd_Per_Clm)}\n`;
    text += `**Avg Cost Per Beneficiary:** ${formatCurrency(drug.Avg_Spnd_Per_Bene)}\n`;
    
    if (drug.Chg_Avg_Spnd_Per_Dsg_Unt) {
      const change = parseFloat(drug.Chg_Avg_Spnd_Per_Dsg_Unt);
      if (!isNaN(change)) {
        const changeStr = change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
        text += `**YoY Price Change:** ${changeStr}\n`;
      }
    }
    
    if (drug.Outlier_Flag === "Y") {
      text += `⚠️ *Flagged as pricing outlier*\n`;
    }

    return text;
  });

  return {
    content: [{
      type: "text",
      text: `# Medicare Part D Drug Pricing: "${drugName}"\n\nFound ${results.length} result(s):\n\n${formatted.join("\n---\n\n")}\n\n---\n*Data from CMS Medicare Part D Spending by Drug dataset*`,
    }],
  };
}

// Common E&M codes with 2024 RVU data for reference
const COMMON_CODES: Record<string, PhysicianFeeRecord> = {
  "99213": {
    HCPCS_Cd: "99213",
    HCPCS_Desc: "Office/outpatient visit, established patient, low complexity",
    Status_Cd: "A",
    Work_RVUs: "1.30",
    Non_Fac_PE_RVUs: "1.57",
    Fac_PE_RVUs: "0.70",
    MP_RVUs: "0.10",
    Non_Fac_Total: "2.97",
    Fac_Total: "2.10",
    Global_Days: "XXX",
  },
  "99214": {
    HCPCS_Cd: "99214",
    HCPCS_Desc: "Office/outpatient visit, established patient, moderate complexity",
    Status_Cd: "A",
    Work_RVUs: "1.92",
    Non_Fac_PE_RVUs: "2.02",
    Fac_PE_RVUs: "1.01",
    MP_RVUs: "0.14",
    Non_Fac_Total: "4.08",
    Fac_Total: "3.07",
    Global_Days: "XXX",
  },
  "99215": {
    HCPCS_Cd: "99215",
    HCPCS_Desc: "Office/outpatient visit, established patient, high complexity",
    Status_Cd: "A",
    Work_RVUs: "2.80",
    Non_Fac_PE_RVUs: "2.55",
    Fac_PE_RVUs: "1.41",
    MP_RVUs: "0.21",
    Non_Fac_Total: "5.56",
    Fac_Total: "4.42",
    Global_Days: "XXX",
  },
  "99203": {
    HCPCS_Cd: "99203",
    HCPCS_Desc: "Office/outpatient visit, new patient, low complexity",
    Status_Cd: "A",
    Work_RVUs: "1.60",
    Non_Fac_PE_RVUs: "1.89",
    Fac_PE_RVUs: "0.87",
    MP_RVUs: "0.12",
    Non_Fac_Total: "3.61",
    Fac_Total: "2.59",
    Global_Days: "XXX",
  },
  "99204": {
    HCPCS_Cd: "99204",
    HCPCS_Desc: "Office/outpatient visit, new patient, moderate complexity",
    Status_Cd: "A",
    Work_RVUs: "2.60",
    Non_Fac_PE_RVUs: "2.56",
    Fac_PE_RVUs: "1.30",
    MP_RVUs: "0.19",
    Non_Fac_Total: "5.35",
    Fac_Total: "4.09",
    Global_Days: "XXX",
  },
  "99205": {
    HCPCS_Cd: "99205",
    HCPCS_Desc: "Office/outpatient visit, new patient, high complexity",
    Status_Cd: "A",
    Work_RVUs: "3.50",
    Non_Fac_PE_RVUs: "3.19",
    Fac_PE_RVUs: "1.74",
    MP_RVUs: "0.26",
    Non_Fac_Total: "6.95",
    Fac_Total: "5.50",
    Global_Days: "XXX",
  },
  "99385": {
    HCPCS_Cd: "99385",
    HCPCS_Desc: "Initial comprehensive preventive visit, 18-39 years",
    Status_Cd: "A",
    Work_RVUs: "1.50",
    Non_Fac_PE_RVUs: "1.92",
    Fac_PE_RVUs: "0.88",
    MP_RVUs: "0.10",
    Non_Fac_Total: "3.52",
    Fac_Total: "2.48",
    Global_Days: "XXX",
  },
  "99395": {
    HCPCS_Cd: "99395",
    HCPCS_Desc: "Periodic preventive visit, established patient, 18-39 years",
    Status_Cd: "A",
    Work_RVUs: "1.30",
    Non_Fac_PE_RVUs: "1.76",
    Fac_PE_RVUs: "0.72",
    MP_RVUs: "0.09",
    Non_Fac_Total: "3.15",
    Fac_Total: "2.11",
    Global_Days: "XXX",
  },
};

export async function procedurePricingHandler(
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const code = args.code as string | undefined;
  const description = args.description as string | undefined;

  if (!code && !description) {
    return {
      content: [{
        type: "text",
        text: "Please provide either a HCPCS/CPT code or a procedure description to search.",
      }],
      isError: true,
    };
  }

  // 2024 Medicare conversion factor
  const conversionFactor = 32.74;

  // Check if we have the code in our reference data
  if (code) {
    const upperCode = code.toUpperCase();
    const proc = COMMON_CODES[upperCode];
    
    if (proc) {
      const workRvu = parseFloat(proc.Work_RVUs || "0");
      const nonFacPeRvu = parseFloat(proc.Non_Fac_PE_RVUs || "0");
      const facPeRvu = parseFloat(proc.Fac_PE_RVUs || "0");
      const mpRvu = parseFloat(proc.MP_RVUs || "0");
      const nonFacTotal = parseFloat(proc.Non_Fac_Total || "0");
      const facTotal = parseFloat(proc.Fac_Total || "0");
      
      const nonFacPayment = nonFacTotal * conversionFactor;
      const facPayment = facTotal * conversionFactor;

      let text = `# Medicare Procedure Pricing: ${proc.HCPCS_Cd}\n\n`;
      text += `**Code:** ${proc.HCPCS_Cd}\n`;
      text += `**Description:** ${proc.HCPCS_Desc}\n`;
      text += `**Status:** ${proc.Status_Cd} (Active)\n`;
      text += `**Global Period:** ${proc.Global_Days}\n\n`;
      
      text += `## Relative Value Units (RVUs)\n\n`;
      text += `| Component | RVUs |\n`;
      text += `|-----------|------|\n`;
      text += `| Work | ${workRvu.toFixed(2)} |\n`;
      text += `| Non-Facility PE | ${nonFacPeRvu.toFixed(2)} |\n`;
      text += `| Facility PE | ${facPeRvu.toFixed(2)} |\n`;
      text += `| Malpractice | ${mpRvu.toFixed(2)} |\n`;
      text += `| **Total (Non-Facility)** | **${nonFacTotal.toFixed(2)}** |\n`;
      text += `| **Total (Facility)** | **${facTotal.toFixed(2)}** |\n\n`;
      
      text += `## Estimated Medicare Payment\n\n`;
      text += `| Setting | Payment |\n`;
      text += `|---------|--------|\n`;
      text += `| Non-Facility (Office) | ${formatCurrency(nonFacPayment.toString())} |\n`;
      text += `| Facility (Hospital) | ${formatCurrency(facPayment.toString())} |\n\n`;
      
      text += `---\n*2024 National RVU data. Conversion factor: $${conversionFactor}. Actual payments vary by geographic locality.*`;

      return { content: [{ type: "text", text }] };
    }
  }

  // For codes not in our reference data or description searches, provide guidance
  const searchTerm = code || description;
  const availableCodes = Object.keys(COMMON_CODES).join(", ");

  let text = `# Medicare Procedure Pricing: "${searchTerm}"\n\n`;
  
  if (code) {
    text += `Code **${code}** is not in the quick reference database.\n\n`;
  } else {
    text += `Searching by description: "${description}"\n\n`;
  }
  
  text += `## Available Quick Reference Codes\n\n`;
  text += `The following common E&M codes are available for instant lookup:\n`;
  text += `${availableCodes}\n\n`;
  
  text += `## Resources for Other Codes\n\n`;
  text += `For codes not in the quick reference, use these official CMS resources:\n\n`;
  text += `- **[CMS Physician Fee Schedule Search](https://www.cms.gov/medicare/payment/fee-schedules/physician/search)** - Official lookup tool\n`;
  text += `- **[Medicare Coverage Database](https://www.cms.gov/medicare-coverage-database)** - Coverage policies\n`;
  text += `- **[HCPCS Code Lookup](https://www.cms.gov/medicare/coding-billing/healthcare-common-procedure-system)** - Code descriptions\n\n`;
  
  text += `## 2024 Conversion Factor\n\n`;
  text += `The current Medicare conversion factor is **$${conversionFactor}**.\n`;
  text += `Payment = Total RVUs × Conversion Factor × Geographic Adjustment\n`;

  return { content: [{ type: "text", text }] };
}
