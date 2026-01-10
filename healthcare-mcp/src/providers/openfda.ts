// OpenFDA Provider - Drug information, adverse events, recalls, and labels
import { fetchJson, buildQueryString } from "../utils/http.js";
import type { ToolCallResult, McpToolDefinition } from "../mcp/types.js";

const OPENFDA_BASE = "https://api.fda.gov";

// Response types
interface OpenFdaResponse<T> {
  meta?: {
    results?: {
      total: number;
      skip: number;
      limit: number;
    };
  };
  results?: T[];
  error?: {
    code: string;
    message: string;
  };
}

interface DrugResult {
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
    product_ndc?: string[];
    route?: string[];
    substance_name?: string[];
    product_type?: string[];
  };
  products?: Array<{
    brand_name?: string;
    dosage_form?: string;
    route?: string;
    marketing_status?: string;
    active_ingredients?: Array<{
      name: string;
      strength: string;
    }>;
  }>;
}

interface AdverseEventResult {
  safetyreportid: string;
  receivedate: string;
  serious: string;
  seriousnessdeath?: string;
  seriousnesshospitalization?: string;
  patient?: {
    patientonsetage?: string;
    patientsex?: string;
    reaction?: Array<{ reactionmeddrapt: string }>;
    drug?: Array<{
      medicinalproduct?: string;
      drugindication?: string;
      drugcharacterization?: string;
    }>;
  };
}

interface RecallResult {
  recall_number: string;
  reason_for_recall: string;
  status: string;
  product_description: string;
  recalling_firm: string;
  recall_initiation_date: string;
  classification: string;
  openfda?: {
    brand_name?: string[];
  };
}

interface DrugLabelResult {
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
  };
  purpose?: string[];
  indications_and_usage?: string[];
  warnings?: string[];
  dosage_and_administration?: string[];
  adverse_reactions?: string[];
  drug_interactions?: string[];
  contraindications?: string[];
}

// Tool definitions
export const drugLookupTool: McpToolDefinition = {
  name: "drug_lookup",
  description: "Search for drug information by name, NDC code, or active ingredient. Returns brand names, generic names, manufacturers, and product details.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Drug name, NDC code, or active ingredient to search for",
      },
      search_type: {
        type: "string",
        enum: ["name", "ndc", "ingredient"],
        description: "Type of search: 'name' for brand/generic name, 'ndc' for NDC code, 'ingredient' for active ingredient",
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default: 5, max: 20)",
      },
    },
    required: ["query"],
  },
};

export const adverseEventsTool: McpToolDefinition = {
  name: "adverse_events",
  description: "Search FDA Adverse Event Reporting System (FAERS) for drug safety reports. Find reported side effects and adverse reactions.",
  inputSchema: {
    type: "object",
    properties: {
      drug_name: {
        type: "string",
        description: "Name of the drug to search adverse events for",
      },
      reaction: {
        type: "string",
        description: "Specific reaction/side effect to filter by (optional)",
      },
      serious_only: {
        type: "boolean",
        description: "Only return serious adverse events (default: false)",
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default: 10, max: 50)",
      },
    },
    required: ["drug_name"],
  },
};

export const drugRecallsTool: McpToolDefinition = {
  name: "drug_recalls",
  description: "Search FDA drug recall database. Find recalls by drug name, reason, or recalling firm.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Drug name, recall reason, or firm name to search",
      },
      status: {
        type: "string",
        enum: ["ongoing", "completed", "terminated"],
        description: "Filter by recall status (optional)",
      },
      classification: {
        type: "string",
        enum: ["Class I", "Class II", "Class III"],
        description: "Filter by classification (Class I = most serious)",
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default: 10, max: 50)",
      },
    },
    required: ["query"],
  },
};

export const drugLabelsTool: McpToolDefinition = {
  name: "drug_labels",
  description: "Get drug labeling and prescribing information including indications, warnings, dosage, interactions, and contraindications.",
  inputSchema: {
    type: "object",
    properties: {
      drug_name: {
        type: "string",
        description: "Name of the drug to get labeling for",
      },
      sections: {
        type: "array",
        items: { type: "string" },
        description: "Specific label sections to return: 'indications', 'warnings', 'dosage', 'interactions', 'contraindications', 'adverse_reactions'",
      },
    },
    required: ["drug_name"],
  },
};

// Tool handlers
export async function drugLookupHandler(
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const query = String(args.query);
  const searchType = (args.search_type as string) || "name";
  const limit = Math.min(Number(args.limit) || 5, 20);

  let searchField: string;
  switch (searchType) {
    case "ndc":
      searchField = "openfda.product_ndc";
      break;
    case "ingredient":
      searchField = "openfda.substance_name";
      break;
    default:
      searchField = "openfda.brand_name+openfda.generic_name";
  }

  const searchQuery = searchType === "name" 
    ? `(openfda.brand_name:"${query}" OR openfda.generic_name:"${query}")`
    : `${searchField}:"${query}"`;

  const url = `${OPENFDA_BASE}/drug/drugsfda.json${buildQueryString({
    search: searchQuery,
    limit,
  })}`;

  try {
    const response = await fetchJson<OpenFdaResponse<DrugResult>>(url);

    if (!response.ok || response.data.error) {
      return {
        content: [{
          type: "text",
          text: `No results found for "${query}". The drug may not be in the FDA database or try a different search term.`,
        }],
      };
    }

    const results = response.data.results || [];
    if (results.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No results found for "${query}".`,
        }],
      };
    }

    const formatted = results.map((drug, idx) => {
      const openfda = drug.openfda || {};
      const products = drug.products || [];
      
      let text = `## ${idx + 1}. ${openfda.brand_name?.[0] || "Unknown"}\n`;
      text += `**Generic Name:** ${openfda.generic_name?.join(", ") || "N/A"}\n`;
      text += `**Manufacturer:** ${openfda.manufacturer_name?.join(", ") || "N/A"}\n`;
      text += `**NDC:** ${openfda.product_ndc?.slice(0, 3).join(", ") || "N/A"}\n`;
      text += `**Route:** ${openfda.route?.join(", ") || "N/A"}\n`;
      text += `**Product Type:** ${openfda.product_type?.join(", ") || "N/A"}\n`;

      if (products.length > 0) {
        text += `**Dosage Forms:**\n`;
        products.slice(0, 3).forEach((p) => {
          text += `  - ${p.dosage_form || "N/A"} (${p.marketing_status || "N/A"})\n`;
          if (p.active_ingredients) {
            p.active_ingredients.forEach((ai) => {
              text += `    • ${ai.name}: ${ai.strength}\n`;
            });
          }
        });
      }

      return text;
    });

    return {
      content: [{
        type: "text",
        text: `# Drug Search Results for "${query}"\n\nFound ${response.data.meta?.results?.total || results.length} results:\n\n${formatted.join("\n---\n\n")}`,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error searching drugs: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}

export async function adverseEventsHandler(
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const drugName = String(args.drug_name);
  const reaction = args.reaction ? String(args.reaction) : undefined;
  const seriousOnly = Boolean(args.serious_only);
  const limit = Math.min(Number(args.limit) || 10, 50);

  let searchQuery = `patient.drug.medicinalproduct:"${drugName}"`;
  if (reaction) {
    searchQuery += `+AND+patient.reaction.reactionmeddrapt:"${reaction}"`;
  }
  if (seriousOnly) {
    searchQuery += "+AND+serious:1";
  }

  const url = `${OPENFDA_BASE}/drug/event.json${buildQueryString({
    search: searchQuery,
    limit,
  })}`;

  try {
    const response = await fetchJson<OpenFdaResponse<AdverseEventResult>>(url);

    if (!response.ok || response.data.error) {
      return {
        content: [{
          type: "text",
          text: `No adverse events found for "${drugName}". Try a different drug name or spelling.`,
        }],
      };
    }

    const results = response.data.results || [];
    const total = response.data.meta?.results?.total || results.length;

    const formatted = results.map((event, idx) => {
      const patient = event.patient || {};
      const reactions = patient.reaction?.map((r) => r.reactionmeddrapt).join(", ") || "N/A";
      const drugs = patient.drug?.map((d) => d.medicinalproduct).filter(Boolean).join(", ") || "N/A";

      let text = `### Report ${idx + 1} (${event.safetyreportid})\n`;
      text += `**Date:** ${event.receivedate}\n`;
      text += `**Serious:** ${event.serious === "1" ? "Yes" : "No"}`;
      if (event.seriousnessdeath === "1") text += " (Death)";
      if (event.seriousnesshospitalization === "1") text += " (Hospitalization)";
      text += "\n";
      text += `**Patient Age:** ${patient.patientonsetage || "N/A"}\n`;
      text += `**Patient Sex:** ${patient.patientsex === "1" ? "Male" : patient.patientsex === "2" ? "Female" : "N/A"}\n`;
      text += `**Reactions:** ${reactions}\n`;
      text += `**Drugs Involved:** ${drugs}\n`;

      return text;
    });

    return {
      content: [{
        type: "text",
        text: `# Adverse Events for "${drugName}"\n\nTotal reports found: ${total}\n${seriousOnly ? "(Showing serious events only)\n" : ""}\n${formatted.join("\n")}`,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error searching adverse events: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}

export async function drugRecallsHandler(
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const query = String(args.query);
  const status = args.status as string | undefined;
  const classification = args.classification as string | undefined;
  const limit = Math.min(Number(args.limit) || 10, 50);

  let searchQuery = `"${query}"`;
  if (status) {
    searchQuery += `+AND+status:"${status}"`;
  }
  if (classification) {
    searchQuery += `+AND+classification:"${classification}"`;
  }

  const url = `${OPENFDA_BASE}/drug/enforcement.json${buildQueryString({
    search: searchQuery,
    limit,
  })}`;

  try {
    const response = await fetchJson<OpenFdaResponse<RecallResult>>(url);

    if (!response.ok || response.data.error) {
      return {
        content: [{
          type: "text",
          text: `No recalls found for "${query}".`,
        }],
      };
    }

    const results = response.data.results || [];
    const total = response.data.meta?.results?.total || results.length;

    const formatted = results.map((recall, idx) => {
      let text = `### ${idx + 1}. ${recall.recall_number}\n`;
      text += `**Status:** ${recall.status}\n`;
      text += `**Classification:** ${recall.classification}\n`;
      text += `**Date:** ${recall.recall_initiation_date}\n`;
      text += `**Firm:** ${recall.recalling_firm}\n`;
      text += `**Product:** ${recall.product_description.slice(0, 200)}${recall.product_description.length > 200 ? "..." : ""}\n`;
      text += `**Reason:** ${recall.reason_for_recall}\n`;

      return text;
    });

    return {
      content: [{
        type: "text",
        text: `# Drug Recalls for "${query}"\n\nTotal recalls found: ${total}\n\n${formatted.join("\n---\n\n")}`,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error searching recalls: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}

export async function drugLabelsHandler(
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const drugName = String(args.drug_name);
  const sections = (args.sections as string[]) || [
    "indications",
    "warnings",
    "dosage",
    "interactions",
    "contraindications",
  ];

  // Use wildcard search for better matching
  const searchTerm = drugName.toUpperCase();
  const url = `${OPENFDA_BASE}/drug/label.json?search=openfda.brand_name:${encodeURIComponent(searchTerm)}+openfda.generic_name:${encodeURIComponent(searchTerm)}&limit=1`;

  try {
    const response = await fetchJson<OpenFdaResponse<DrugLabelResult>>(url);

    if (!response.ok || response.data.error || !response.data.results?.length) {
      return {
        content: [{
          type: "text",
          text: `No labeling information found for "${drugName}".`,
        }],
      };
    }

    const label = response.data.results[0];
    const openfda = label.openfda || {};

    let text = `# Drug Label: ${openfda.brand_name?.[0] || drugName}\n`;
    text += `**Generic:** ${openfda.generic_name?.join(", ") || "N/A"}\n`;
    text += `**Manufacturer:** ${openfda.manufacturer_name?.join(", ") || "N/A"}\n\n`;

    const sectionMap: Record<string, [string, string[] | undefined]> = {
      indications: ["Indications and Usage", label.indications_and_usage],
      warnings: ["Warnings", label.warnings],
      dosage: ["Dosage and Administration", label.dosage_and_administration],
      interactions: ["Drug Interactions", label.drug_interactions],
      contraindications: ["Contraindications", label.contraindications],
      adverse_reactions: ["Adverse Reactions", label.adverse_reactions],
    };

    for (const section of sections) {
      const [title, content] = sectionMap[section] || [];
      if (title && content) {
        const contentText = content.join("\n").slice(0, 1500);
        text += `## ${title}\n${contentText}${content.join("\n").length > 1500 ? "..." : ""}\n\n`;
      }
    }

    return {
      content: [{
        type: "text",
        text,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error fetching drug label: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}
