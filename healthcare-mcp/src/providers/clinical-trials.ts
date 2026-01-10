// Clinical Trials Provider - ClinicalTrials.gov API
// Provides real-world trial data for treatment context and recommendations

import { fetchJson, buildQueryString } from "../utils/http.js";
import type { ToolCallResult, McpToolDefinition } from "../mcp/types.js";

// ClinicalTrials.gov API v2
const CT_API_BASE = "https://clinicaltrials.gov/api/v2";

// Response types
interface CTStudy {
  protocolSection: {
    identificationModule: {
      nctId: string;
      briefTitle: string;
      officialTitle?: string;
      organization?: {
        fullName: string;
      };
    };
    statusModule: {
      overallStatus: string;
      startDateStruct?: { date: string };
      completionDateStruct?: { date: string };
      studyFirstPostDateStruct?: { date: string };
    };
    descriptionModule?: {
      briefSummary?: string;
      detailedDescription?: string;
    };
    conditionsModule?: {
      conditions?: string[];
      keywords?: string[];
    };
    designModule?: {
      studyType: string;
      phases?: string[];
      designInfo?: {
        allocation?: string;
        interventionModel?: string;
        primaryPurpose?: string;
        maskingInfo?: {
          masking?: string;
        };
      };
      enrollmentInfo?: {
        count?: number;
        type?: string;
      };
    };
    armsInterventionsModule?: {
      interventions?: Array<{
        type: string;
        name: string;
        description?: string;
      }>;
    };
    outcomesModule?: {
      primaryOutcomes?: Array<{
        measure: string;
        description?: string;
        timeFrame?: string;
      }>;
      secondaryOutcomes?: Array<{
        measure: string;
        description?: string;
      }>;
    };
    eligibilityModule?: {
      eligibilityCriteria?: string;
      sex?: string;
      minimumAge?: string;
      maximumAge?: string;
      healthyVolunteers?: string;
    };
    contactsLocationsModule?: {
      locations?: Array<{
        facility?: string;
        city?: string;
        state?: string;
        country?: string;
      }>;
    };
  };
  resultsSection?: {
    participantFlowModule?: {
      groups?: Array<{
        id: string;
        title: string;
        description?: string;
      }>;
    };
    baselineCharacteristicsModule?: {
      groups?: Array<{
        id: string;
        title: string;
      }>;
      measures?: Array<{
        title: string;
        classes?: Array<{
          categories?: Array<{
            measurements?: Array<{
              groupId: string;
              value?: string;
            }>;
          }>;
        }>;
      }>;
    };
    outcomeMeasuresModule?: {
      outcomeMeasures?: Array<{
        type: string;
        title: string;
        description?: string;
        groups?: Array<{
          id: string;
          title: string;
        }>;
        classes?: Array<{
          categories?: Array<{
            measurements?: Array<{
              groupId: string;
              value?: string;
              lowerLimit?: string;
              upperLimit?: string;
            }>;
          }>;
        }>;
        analyses?: Array<{
          groupIds?: string[];
          pValue?: string;
          statisticalMethod?: string;
        }>;
      }>;
    };
    adverseEventsModule?: {
      frequencyThreshold?: string;
      eventGroups?: Array<{
        id: string;
        title: string;
        seriousNumAffected?: number;
        seriousNumAtRisk?: number;
        otherNumAffected?: number;
        otherNumAtRisk?: number;
      }>;
    };
  };
}

interface CTSearchResponse {
  studies?: CTStudy[];
  totalCount?: number;
  nextPageToken?: string;
}

// Tool definitions
export const searchClinicalTrialsTool: McpToolDefinition = {
  name: "search_clinical_trials",
  description: "Search ClinicalTrials.gov for clinical trials by condition, drug, or intervention. Returns trial details including phase, status, enrollment, and key findings. Essential for evidence-based treatment recommendations.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search term - condition name (e.g., 'type 2 diabetes'), drug name (e.g., 'semaglutide'), or treatment (e.g., 'immunotherapy lung cancer')",
      },
      status: {
        type: "string",
        enum: ["recruiting", "completed", "active", "all"],
        description: "Trial status filter (default: all)",
      },
      phase: {
        type: "string",
        enum: ["1", "2", "3", "4", "all"],
        description: "Trial phase filter (default: all)",
      },
      has_results: {
        type: "boolean",
        description: "Only show trials with posted results (default: false)",
      },
      limit: {
        type: "number",
        description: "Maximum results (default: 10, max: 25)",
      },
    },
    required: ["query"],
  },
};

export const getClinicalTrialDetailsTool: McpToolDefinition = {
  name: "get_clinical_trial_details",
  description: "Get comprehensive details about a specific clinical trial by NCT ID, including design, outcomes, results (if available), and adverse events.",
  inputSchema: {
    type: "object",
    properties: {
      nct_id: {
        type: "string",
        description: "ClinicalTrials.gov ID (e.g., 'NCT04564899')",
      },
    },
    required: ["nct_id"],
  },
};

export const getTrialResultsSummaryTool: McpToolDefinition = {
  name: "get_trial_results_summary",
  description: "Get a summary of clinical trial results and outcomes for a condition or drug. Aggregates data from completed trials to provide evidence-based context.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Drug name or condition to summarize trial results for",
      },
      limit: {
        type: "number",
        description: "Number of trials to include (default: 10)",
      },
    },
    required: ["query"],
  },
};

// Helper: Format phase display
function formatPhase(phases?: string[]): string {
  if (!phases || phases.length === 0) return "N/A";
  return phases.map(p => p.replace("PHASE", "Phase ")).join(", ");
}

// Helper: Format status
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    "RECRUITING": "🟢 Recruiting",
    "ACTIVE_NOT_RECRUITING": "🟡 Active, not recruiting",
    "COMPLETED": "✅ Completed",
    "TERMINATED": "🔴 Terminated",
    "WITHDRAWN": "⚪ Withdrawn",
    "SUSPENDED": "🟠 Suspended",
    "NOT_YET_RECRUITING": "🔵 Not yet recruiting",
    "ENROLLING_BY_INVITATION": "🟣 Enrolling by invitation",
  };
  return statusMap[status] || status;
}

// Tool handlers
export async function searchClinicalTrialsHandler(
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const query = String(args.query);
  const status = args.status as string || "all";
  const phase = args.phase as string || "all";
  const hasResults = Boolean(args.has_results);
  const limit = Math.min(Number(args.limit) || 10, 25);

  // Build URL with proper encoding for ClinicalTrials.gov API v2
  const urlParams = new URLSearchParams();
  urlParams.set("query.term", query);
  urlParams.set("pageSize", String(limit));
  urlParams.set("format", "json");

  // Add status filter
  if (status !== "all") {
    const statusMap: Record<string, string> = {
      "recruiting": "RECRUITING",
      "completed": "COMPLETED",
      "active": "ACTIVE_NOT_RECRUITING",
    };
    urlParams.set("filter.overallStatus", statusMap[status] || status.toUpperCase());
  }

  // Add phase filter
  if (phase !== "all") {
    urlParams.set("filter.advanced", `SEARCH[Study/DesignModule/PhaseList/Phase]PHASE${phase}`);
  }

  // For results filter, we search completed trials
  if (hasResults) {
    urlParams.set("filter.overallStatus", "COMPLETED");
  }

  const url = `${CT_API_BASE}/studies?${urlParams.toString()}`;

  try {
    const response = await fetchJson<CTSearchResponse>(url);
    const studies = response.data.studies || [];
    const totalCount = response.data.totalCount || studies.length;

    if (studies.length === 0) {
      return {
        content: [{
          type: "text",
          text: `# Clinical Trials Search: "${query}"\n\nNo clinical trials found matching your criteria. Try:\n- Broadening your search terms\n- Removing status/phase filters\n- Using different keywords`,
        }],
      };
    }

    let text = `# Clinical Trials: "${query}"\n\n`;
    text += `**Found:** ${totalCount} trials (showing ${studies.length})\n`;
    if (status !== "all") text += `**Status:** ${status}\n`;
    if (phase !== "all") text += `**Phase:** ${phase}\n`;
    text += `\n---\n\n`;

    for (const study of studies) {
      const proto = study.protocolSection;
      const id = proto.identificationModule;
      const statusMod = proto.statusModule;
      const design = proto.designModule;
      const conditions = proto.conditionsModule;
      const interventions = proto.armsInterventionsModule?.interventions;

      text += `## ${id.briefTitle}\n\n`;
      text += `**NCT ID:** [${id.nctId}](https://clinicaltrials.gov/study/${id.nctId})\n`;
      text += `**Status:** ${formatStatus(statusMod.overallStatus)}\n`;
      text += `**Phase:** ${formatPhase(design?.phases)}\n`;
      text += `**Sponsor:** ${id.organization?.fullName || "N/A"}\n`;
      
      if (design?.enrollmentInfo?.count) {
        text += `**Enrollment:** ${design.enrollmentInfo.count.toLocaleString()} participants\n`;
      }
      
      if (conditions?.conditions) {
        text += `**Conditions:** ${conditions.conditions.slice(0, 3).join(", ")}\n`;
      }
      
      if (interventions && interventions.length > 0) {
        const intNames = interventions.slice(0, 3).map(i => `${i.name} (${i.type})`).join(", ");
        text += `**Interventions:** ${intNames}\n`;
      }

      // Brief summary (truncated)
      if (proto.descriptionModule?.briefSummary) {
        const summary = proto.descriptionModule.briefSummary.slice(0, 300);
        text += `\n> ${summary}${proto.descriptionModule.briefSummary.length > 300 ? "..." : ""}\n`;
      }

      // Check if has results
      if (study.resultsSection) {
        text += `\n📊 **Results Available** - Use \`get_clinical_trial_details\` for outcome data\n`;
      }

      text += `\n---\n\n`;
    }

    text += `*Data from [ClinicalTrials.gov](https://clinicaltrials.gov)*\n`;

    return {
      content: [{ type: "text", text }],
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error searching clinical trials: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}

export async function getClinicalTrialDetailsHandler(
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const nctId = String(args.nct_id).toUpperCase();

  if (!nctId.startsWith("NCT")) {
    return {
      content: [{
        type: "text",
        text: "Invalid NCT ID. Format should be 'NCT' followed by 8 digits (e.g., NCT04564899)",
      }],
      isError: true,
    };
  }

  const url = `${CT_API_BASE}/studies/${nctId}?format=json`;

  try {
    const response = await fetchJson<CTStudy>(url);
    const study = response.data;
    const proto = study.protocolSection;
    const results = study.resultsSection;

    const id = proto.identificationModule;
    const statusMod = proto.statusModule;
    const design = proto.designModule;
    const desc = proto.descriptionModule;
    const conditions = proto.conditionsModule;
    const interventions = proto.armsInterventionsModule?.interventions;
    const outcomes = proto.outcomesModule;
    const eligibility = proto.eligibilityModule;
    const locations = proto.contactsLocationsModule?.locations;

    let text = `# ${id.briefTitle}\n\n`;
    text += `**NCT ID:** [${id.nctId}](https://clinicaltrials.gov/study/${id.nctId})\n`;
    
    if (id.officialTitle && id.officialTitle !== id.briefTitle) {
      text += `**Official Title:** ${id.officialTitle}\n`;
    }

    text += `\n## Study Overview\n\n`;
    text += `| Attribute | Value |\n|-----------|-------|\n`;
    text += `| Status | ${formatStatus(statusMod.overallStatus)} |\n`;
    text += `| Phase | ${formatPhase(design?.phases)} |\n`;
    text += `| Study Type | ${design?.studyType || "N/A"} |\n`;
    text += `| Sponsor | ${id.organization?.fullName || "N/A"} |\n`;
    
    if (design?.enrollmentInfo?.count) {
      text += `| Enrollment | ${design.enrollmentInfo.count.toLocaleString()} (${design.enrollmentInfo.type || "Actual"}) |\n`;
    }
    
    if (statusMod.startDateStruct?.date) {
      text += `| Start Date | ${statusMod.startDateStruct.date} |\n`;
    }
    if (statusMod.completionDateStruct?.date) {
      text += `| Completion Date | ${statusMod.completionDateStruct.date} |\n`;
    }

    // Study Design
    if (design?.designInfo) {
      text += `\n## Study Design\n\n`;
      if (design.designInfo.allocation) text += `- **Allocation:** ${design.designInfo.allocation}\n`;
      if (design.designInfo.interventionModel) text += `- **Model:** ${design.designInfo.interventionModel}\n`;
      if (design.designInfo.primaryPurpose) text += `- **Purpose:** ${design.designInfo.primaryPurpose}\n`;
      if (design.designInfo.maskingInfo?.masking) text += `- **Masking:** ${design.designInfo.maskingInfo.masking}\n`;
    }

    // Conditions
    if (conditions?.conditions && conditions.conditions.length > 0) {
      text += `\n## Conditions\n\n`;
      text += conditions.conditions.map(c => `- ${c}`).join("\n") + "\n";
    }

    // Interventions
    if (interventions && interventions.length > 0) {
      text += `\n## Interventions\n\n`;
      for (const int of interventions) {
        text += `### ${int.name} (${int.type})\n`;
        if (int.description) {
          text += `${int.description.slice(0, 500)}${int.description.length > 500 ? "..." : ""}\n`;
        }
        text += "\n";
      }
    }

    // Primary Outcomes
    if (outcomes?.primaryOutcomes && outcomes.primaryOutcomes.length > 0) {
      text += `## Primary Outcomes\n\n`;
      for (const outcome of outcomes.primaryOutcomes.slice(0, 5)) {
        text += `- **${outcome.measure}**`;
        if (outcome.timeFrame) text += ` (${outcome.timeFrame})`;
        text += "\n";
        if (outcome.description) {
          text += `  ${outcome.description.slice(0, 200)}\n`;
        }
      }
      text += "\n";
    }

    // Results Section (if available)
    if (results) {
      text += `## 📊 Results\n\n`;
      
      // Outcome measures
      if (results.outcomeMeasuresModule?.outcomeMeasures) {
        const primaryOutcomes = results.outcomeMeasuresModule.outcomeMeasures.filter(o => o.type === "PRIMARY");
        
        if (primaryOutcomes.length > 0) {
          text += `### Primary Outcome Results\n\n`;
          
          for (const outcome of primaryOutcomes.slice(0, 3)) {
            text += `**${outcome.title}**\n`;
            if (outcome.description) {
              text += `${outcome.description.slice(0, 200)}...\n`;
            }
            
            // Show group results
            if (outcome.groups && outcome.classes) {
              const groupMap = new Map(outcome.groups.map(g => [g.id, g.title]));
              
              for (const cls of outcome.classes.slice(0, 1)) {
                for (const cat of cls.categories || []) {
                  for (const meas of cat.measurements || []) {
                    const groupName = groupMap.get(meas.groupId) || meas.groupId;
                    if (meas.value) {
                      text += `- ${groupName}: ${meas.value}`;
                      if (meas.lowerLimit && meas.upperLimit) {
                        text += ` (95% CI: ${meas.lowerLimit}-${meas.upperLimit})`;
                      }
                      text += "\n";
                    }
                  }
                }
              }
            }
            
            // Show p-value if available
            if (outcome.analyses) {
              for (const analysis of outcome.analyses) {
                if (analysis.pValue) {
                  text += `- **P-value:** ${analysis.pValue}`;
                  if (analysis.statisticalMethod) {
                    text += ` (${analysis.statisticalMethod})`;
                  }
                  text += "\n";
                }
              }
            }
            text += "\n";
          }
        }
      }

      // Adverse Events Summary
      if (results.adverseEventsModule?.eventGroups) {
        text += `### Adverse Events Summary\n\n`;
        text += `| Group | Serious AEs | Other AEs |\n|-------|------------|----------|\n`;
        
        for (const group of results.adverseEventsModule.eventGroups.slice(0, 4)) {
          const seriousRate = group.seriousNumAtRisk 
            ? `${group.seriousNumAffected}/${group.seriousNumAtRisk} (${((group.seriousNumAffected || 0) / group.seriousNumAtRisk * 100).toFixed(1)}%)`
            : "N/A";
          const otherRate = group.otherNumAtRisk
            ? `${group.otherNumAffected}/${group.otherNumAtRisk} (${((group.otherNumAffected || 0) / group.otherNumAtRisk * 100).toFixed(1)}%)`
            : "N/A";
          text += `| ${group.title} | ${seriousRate} | ${otherRate} |\n`;
        }
        text += "\n";
      }
    }

    // Eligibility
    if (eligibility) {
      text += `## Eligibility\n\n`;
      if (eligibility.sex) text += `- **Sex:** ${eligibility.sex}\n`;
      if (eligibility.minimumAge) text += `- **Min Age:** ${eligibility.minimumAge}\n`;
      if (eligibility.maximumAge) text += `- **Max Age:** ${eligibility.maximumAge}\n`;
      if (eligibility.healthyVolunteers) text += `- **Healthy Volunteers:** ${eligibility.healthyVolunteers}\n`;
      text += "\n";
    }

    // Locations (summary)
    if (locations && locations.length > 0) {
      const countries = [...new Set(locations.map(l => l.country).filter(Boolean))];
      text += `## Locations\n\n`;
      text += `**${locations.length} sites** in ${countries.length} ${countries.length === 1 ? "country" : "countries"}: ${countries.slice(0, 5).join(", ")}${countries.length > 5 ? "..." : ""}\n`;
    }

    text += `\n---\n*Full details: [ClinicalTrials.gov/${id.nctId}](https://clinicaltrials.gov/study/${id.nctId})*\n`;

    return {
      content: [{ type: "text", text }],
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error fetching trial details: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}

export async function getTrialResultsSummaryHandler(
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const query = String(args.query);
  const limit = Math.min(Number(args.limit) || 10, 20);

  // Search for completed trials with results
  const urlParams = new URLSearchParams();
  urlParams.set("query.term", query);
  urlParams.set("filter.overallStatus", "COMPLETED");
  urlParams.set("pageSize", String(limit));
  urlParams.set("format", "json");

  const url = `${CT_API_BASE}/studies?${urlParams.toString()}`;

  try {
    const response = await fetchJson<CTSearchResponse>(url);
    const studies = response.data.studies || [];

    if (studies.length === 0) {
      return {
        content: [{
          type: "text",
          text: `# Clinical Trial Results Summary: "${query}"\n\nNo completed trials with results found. Try:\n- Different search terms\n- Checking for ongoing trials with \`search_clinical_trials\``,
        }],
      };
    }

    let text = `# Clinical Trial Evidence Summary: "${query}"\n\n`;
    text += `**Completed Trials with Results:** ${studies.length}\n\n`;

    // Aggregate statistics
    let totalEnrollment = 0;
    const phases: string[] = [];
    const sponsors = new Set<string>();

    for (const study of studies) {
      const enrollment = study.protocolSection.designModule?.enrollmentInfo?.count || 0;
      totalEnrollment += enrollment;
      
      const phase = study.protocolSection.designModule?.phases;
      if (phase) phases.push(...phase);
      
      const sponsor = study.protocolSection.identificationModule.organization?.fullName;
      if (sponsor) sponsors.add(sponsor);
    }

    text += `## Evidence Overview\n\n`;
    text += `| Metric | Value |\n|--------|-------|\n`;
    text += `| Total Participants | ${totalEnrollment.toLocaleString()} |\n`;
    text += `| Unique Sponsors | ${sponsors.size} |\n`;
    
    const phaseCount = phases.reduce((acc, p) => {
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    text += `| Phase Distribution | ${Object.entries(phaseCount).map(([k, v]) => `${k.replace("PHASE", "Ph")}: ${v}`).join(", ")} |\n`;
    text += "\n";

    // Key trials
    text += `## Key Completed Trials\n\n`;

    for (const study of studies.slice(0, 5)) {
      const proto = study.protocolSection;
      const results = study.resultsSection;
      const id = proto.identificationModule;
      const enrollment = proto.designModule?.enrollmentInfo?.count || 0;

      text += `### ${id.briefTitle}\n`;
      text += `**NCT:** ${id.nctId} | **Phase:** ${formatPhase(proto.designModule?.phases)} | **N=${enrollment.toLocaleString()}**\n\n`;

      // Show key results if available
      if (results?.outcomeMeasuresModule?.outcomeMeasures) {
        const primary = results.outcomeMeasuresModule.outcomeMeasures.find(o => o.type === "PRIMARY");
        if (primary) {
          text += `**Primary Outcome:** ${primary.title}\n`;
          
          // Try to show a key result
          if (primary.analyses) {
            for (const analysis of primary.analyses.slice(0, 1)) {
              if (analysis.pValue) {
                text += `**Result:** p=${analysis.pValue}`;
                if (analysis.statisticalMethod) text += ` (${analysis.statisticalMethod})`;
                text += "\n";
              }
            }
          }
        }
      }

      text += "\n";
    }

    text += `---\n`;
    text += `## Clinical Implications\n\n`;
    text += `Based on ${studies.length} completed trials with ${totalEnrollment.toLocaleString()} total participants, `;
    text += `there is ${studies.length >= 5 ? "substantial" : studies.length >= 2 ? "moderate" : "limited"} clinical evidence available for "${query}".\n\n`;
    text += `⚕️ **Note:** This summary aggregates trial data. Individual patient decisions should consider specific trial results, patient characteristics, and current guidelines.\n`;
    text += `\n*Data from [ClinicalTrials.gov](https://clinicaltrials.gov)*\n`;

    return {
      content: [{ type: "text", text }],
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error summarizing trial results: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}
