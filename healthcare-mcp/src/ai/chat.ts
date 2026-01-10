// AI Chat Integration with OpenAI GPT-5-nano
import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";

// Tool definitions for OpenAI function calling
const HEALTHCARE_TOOLS: ChatCompletionTool[] = [
  // OpenFDA Tools
  {
    type: "function",
    function: {
      name: "drug_lookup",
      description: "Search for drug information by name, NDC code, or active ingredient. Returns brand names, generic names, manufacturers, and product details.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Drug name, NDC code, or active ingredient to search for" },
          search_type: { type: "string", enum: ["name", "ndc", "ingredient"], description: "Type of search" },
          limit: { type: "number", description: "Maximum results (default: 5)" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "adverse_events",
      description: "Search FDA FAERS database for reported adverse events in patients taking a drug. NOTE: These are REPORTED events, not proven side effects.",
      parameters: {
        type: "object",
        properties: {
          drug_name: { type: "string", description: "Name of the drug" },
          reaction: { type: "string", description: "Specific reaction to filter by" },
          serious_only: { type: "boolean", description: "Only return serious events" },
          limit: { type: "number", description: "Maximum results (default: 10)" }
        },
        required: ["drug_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "drug_recalls",
      description: "Search FDA drug recall database for safety recalls.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Drug name, recall reason, or firm name" },
          status: { type: "string", enum: ["ongoing", "completed", "terminated"] },
          classification: { type: "string", enum: ["Class I", "Class II", "Class III"] },
          limit: { type: "number", description: "Maximum results (default: 10)" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "drug_labels",
      description: "Get OFFICIAL drug labeling and prescribing information including indications, warnings, dosage, known side effects, and interactions. Use this FIRST for side effect questions.",
      parameters: {
        type: "object",
        properties: {
          drug_name: { type: "string", description: "Name of the drug" },
          sections: { 
            type: "array", 
            items: { type: "string" },
            description: "Sections to return: indications, warnings, dosage, interactions, contraindications, adverse_reactions"
          }
        },
        required: ["drug_name"]
      }
    }
  },
  // Drug Interaction Tools
  {
    type: "function",
    function: {
      name: "check_drug_interactions",
      description: "Check for potential drug-drug interactions between multiple medications. Returns severity (major/moderate/minor), clinical significance, and management recommendations. ESSENTIAL for medication safety.",
      parameters: {
        type: "object",
        properties: {
          drugs: { 
            type: "array", 
            items: { type: "string" },
            description: "List of drug names to check (at least 2)" 
          },
          include_food: { type: "boolean", description: "Include food/supplement interactions (default: true)" }
        },
        required: ["drugs"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_drug_interaction_details",
      description: "Get detailed interaction information between two specific drugs including mechanism, clinical effects, and management.",
      parameters: {
        type: "object",
        properties: {
          drug1: { type: "string", description: "First drug name" },
          drug2: { type: "string", description: "Second drug name" }
        },
        required: ["drug1", "drug2"]
      }
    }
  },
  // Clinical Trials Tools
  {
    type: "function",
    function: {
      name: "search_clinical_trials",
      description: "Search ClinicalTrials.gov for clinical trials by condition, drug, or intervention. Returns trial details including phase, status, enrollment, and findings. Use for evidence-based recommendations.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Condition, drug name, or treatment to search" },
          status: { type: "string", enum: ["recruiting", "completed", "active", "all"], description: "Trial status filter" },
          phase: { type: "string", enum: ["1", "2", "3", "4", "all"], description: "Trial phase filter" },
          has_results: { type: "boolean", description: "Only show trials with posted results" },
          limit: { type: "number", description: "Maximum results (default: 10)" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_clinical_trial_details",
      description: "Get comprehensive details about a specific clinical trial including design, outcomes, results, and adverse events. Use NCT ID from search results.",
      parameters: {
        type: "object",
        properties: {
          nct_id: { type: "string", description: "ClinicalTrials.gov NCT ID (e.g., NCT04564899)" }
        },
        required: ["nct_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_trial_results_summary",
      description: "Get aggregated summary of clinical trial results for a drug or condition. Shows evidence level and key findings across multiple completed trials.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Drug or condition to summarize trial results for" },
          limit: { type: "number", description: "Number of trials to include (default: 10)" }
        },
        required: ["query"]
      }
    }
  },
  // Guidelines Tools
  {
    type: "function",
    function: {
      name: "search_guidelines",
      description: "Search PubMed for clinical practice guidelines on medical conditions or treatments.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Medical condition or treatment to search" },
          specialty: { type: "string", description: "Medical specialty filter (e.g., cardiology, oncology)" },
          years: { type: "number", description: "Limit to last N years (default: 5)" },
          limit: { type: "number", description: "Maximum results (default: 10)" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "guideline_summary",
      description: "Get detailed summary and abstract of a clinical guideline by PubMed ID.",
      parameters: {
        type: "object",
        properties: {
          pmid: { type: "string", description: "PubMed ID of the guideline" }
        },
        required: ["pmid"]
      }
    }
  },
  // Pricing Tools
  {
    type: "function",
    function: {
      name: "procedure_pricing",
      description: "Look up Medicare procedure costs by HCPCS/CPT code.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "HCPCS or CPT code (e.g., 99213)" },
          description: { type: "string", description: "Procedure description to search" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "medicare_drug_pricing",
      description: "Look up Medicare Part D drug spending and pricing data.",
      parameters: {
        type: "object",
        properties: {
          drug_name: { type: "string", description: "Drug name to search" },
          limit: { type: "number", description: "Maximum results (default: 10)" }
        },
        required: ["drug_name"]
      }
    }
  }
];

const SYSTEM_PROMPT = `You are an elite healthcare information assistant powered by real-time FDA, ClinicalTrials.gov, PubMed, and Medicare data. You provide evidence-based, clinically accurate information.

## AVAILABLE TOOLS (13 total)

### Drug Information (OpenFDA)
- **drug_lookup**: Search drug info (brand/generic names, manufacturers)
- **drug_labels**: Get OFFICIAL prescribing info (warnings, dosage, side effects, interactions)
- **adverse_events**: Search FDA FAERS database (reported events - correlation, not causation)
- **drug_recalls**: Search FDA recalls

### Drug Interactions (Critical Safety)
- **check_drug_interactions**: Check multiple drugs for interactions - severity, warnings, management
- **get_drug_interaction_details**: Detailed interaction info between two specific drugs

### Clinical Trials (ClinicalTrials.gov)
- **search_clinical_trials**: Find trials by condition/drug - phase, status, enrollment
- **get_clinical_trial_details**: Full trial info including results if available
- **get_trial_results_summary**: Aggregate evidence from completed trials

### Guidelines & Pricing
- **search_guidelines**: Find clinical practice guidelines (PubMed)
- **guideline_summary**: Get full guideline abstracts
- **procedure_pricing**: Medicare costs by CPT code
- **medicare_drug_pricing**: Part D drug spending

## DECISION FRAMEWORK

### For Side Effects Questions:
1. FIRST: Call \`drug_labels\` for OFFICIAL known side effects
2. THEN: Call \`adverse_events\` for reported events (supplementary)
3. CLEARLY DISTINGUISH:
   - ✅ **Known side effects** (from labels - proven, listed by manufacturer)
   - ⚠️ **Reported events** (from FAERS - correlation only, not proven causation)

### For Drug Interaction Questions:
1. ALWAYS use \`check_drug_interactions\` when user mentions multiple drugs
2. Highlight severity: 🔴 Major (avoid), 🟡 Moderate (monitor), 🟢 Minor
3. Provide management recommendations

### For Treatment/Efficacy Questions:
1. Call \`search_clinical_trials\` with has_results=true for evidence
2. Call \`get_trial_results_summary\` for aggregated evidence
3. Call \`search_guidelines\` for current recommendations
4. Cite evidence levels and trial sizes

### For "Is X safe?" Questions:
1. Check drug_labels for contraindications/warnings
2. Check check_drug_interactions if other meds mentioned
3. Search clinical trials for safety data
4. Always recommend consulting a healthcare provider

## RESPONSE QUALITY RULES

1. **Always use tools** - Never make up drug information
2. **Cite sources**: "According to FDA labeling...", "A Phase 3 trial (NCT...) showed..."
3. **Quantify when possible**: "In trials with N=5,000 patients...", "Reported in 2-5% of patients"
4. **Be balanced**: Present benefits AND risks
5. **Clinical trials context**: When discussing treatments, reference relevant trial evidence
6. **Interaction awareness**: Always consider if user might be on other medications

## FORMATTING
- Use markdown headers and bullet points
- Include relevant statistics and confidence intervals when available
- Link to ClinicalTrials.gov for trial details
- Add severity indicators (🔴🟡🟢) for interactions

## DISCLAIMER
End significant responses with: "⚕️ This is educational information only. Always consult a healthcare professional before making medical decisions."`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ToolExecutor {
  (name: string, args: Record<string, unknown>): Promise<string>;
}

export class HealthcareChat {
  private openai: OpenAI;
  private conversationHistory: ChatCompletionMessageParam[] = [];
  private toolExecutor: ToolExecutor;

  constructor(apiKey: string, toolExecutor: ToolExecutor) {
    this.openai = new OpenAI({ apiKey });
    this.toolExecutor = toolExecutor;
    this.conversationHistory = [
      { role: "system", content: SYSTEM_PROMPT }
    ];
  }

  async chat(userMessage: string): Promise<string> {
    // Add user message to history
    this.conversationHistory.push({ role: "user", content: userMessage });

    try {
      // Call OpenAI with tools
      let response = await this.openai.chat.completions.create({
        model: "gpt-5-nano-2025-08-07",
        messages: this.conversationHistory,
        tools: HEALTHCARE_TOOLS,
        tool_choice: "auto",
        max_completion_tokens: 8192,
      });

      let message = response.choices[0].message;

      // Handle tool calls (may need multiple rounds)
      while (message.tool_calls && message.tool_calls.length > 0) {
        // Add assistant message with tool calls
        this.conversationHistory.push(message);

        // Execute each tool call
        for (const toolCall of message.tool_calls) {
          // Type assertion for function tool calls
          const funcCall = toolCall as { id: string; type: "function"; function: { name: string; arguments: string } };
          const toolName = funcCall.function.name;
          const toolArgs = JSON.parse(funcCall.function.arguments);

          console.log(`🔧 Calling tool: ${toolName}`, toolArgs);

          try {
            const result = await this.toolExecutor(toolName, toolArgs);
            
            // Add tool result to conversation
            this.conversationHistory.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: result,
            });
          } catch (error) {
            this.conversationHistory.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: `Error: ${error instanceof Error ? error.message : "Tool execution failed"}`,
            });
          }
        }

        // Get next response
        response = await this.openai.chat.completions.create({
          model: "gpt-5-nano-2025-08-07",
          messages: this.conversationHistory,
          tools: HEALTHCARE_TOOLS,
          tool_choice: "auto",
          max_completion_tokens: 8192,
        });

        message = response.choices[0].message;
      }

      // Extract final response
      const assistantResponse = message.content || "I apologize, but I couldn't generate a response.";
      
      // Add to history
      this.conversationHistory.push({ role: "assistant", content: assistantResponse });

      return assistantResponse;
    } catch (error) {
      console.error("Chat error:", error);
      return `Sorry, I encountered an error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  clearHistory(): void {
    this.conversationHistory = [
      { role: "system", content: SYSTEM_PROMPT }
    ];
  }

  getHistory(): ChatMessage[] {
    return this.conversationHistory
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: typeof m.content === "string" ? m.content : "",
      }));
  }
}
