import type { Request, Response } from "express";
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  InitializeResult,
  ToolsListResult,
  ToolCallParams,
  ToolCallResult,
  McpToolDefinition,
} from "./types.js";
import { ErrorCodes } from "./types.js";
import { validateToolInput } from "../validation/schemas.js";
import { toolLogger, logEvents } from "../utils/logger.js";
import { responseCache, CacheTTL, ResponseCache } from "../utils/cache.js";

// Tool registry
type ToolHandler = (args: Record<string, unknown>) => Promise<ToolCallResult>;

interface RegisteredTool {
  definition: McpToolDefinition;
  handler: ToolHandler;
  cacheTtl?: number; // Optional TTL for caching this tool's results
}

const toolRegistry = new Map<string, RegisteredTool>();

// Map tool names to their cache TTLs
const TOOL_CACHE_CONFIG: Record<string, number> = {
  // OpenFDA tools - cache external API responses
  drug_lookup: CacheTTL.DRUG_LOOKUP,
  adverse_events: CacheTTL.ADVERSE_EVENTS,
  drug_recalls: CacheTTL.DRUG_RECALLS,
  drug_labels: CacheTTL.DRUG_LABELS,
  // Drug interactions - our static data
  check_drug_interactions: CacheTTL.DRUG_INTERACTIONS,
  get_drug_interaction_details: CacheTTL.DRUG_INTERACTIONS,
  // Clinical trials
  search_clinical_trials: CacheTTL.CLINICAL_TRIALS,
  get_clinical_trial_details: CacheTTL.TRIAL_DETAILS,
  get_trial_results_summary: CacheTTL.CLINICAL_TRIALS,
  // Guidelines
  search_guidelines: CacheTTL.GUIDELINES,
  guideline_summary: CacheTTL.GUIDELINES,
  // Pricing
  medicare_drug_pricing: CacheTTL.MEDICARE_PRICING,
  procedure_pricing: CacheTTL.PROCEDURE_PRICING,
};

export function registerTool(
  definition: McpToolDefinition,
  handler: ToolHandler
): void {
  toolRegistry.set(definition.name, {
    definition,
    handler,
    cacheTtl: TOOL_CACHE_CONFIG[definition.name],
  });
}

// Server info
const SERVER_INFO = {
  name: "Healthcare API MCP",
  version: "1.0.0",
  protocolVersion: "2024-11-05",
};

// MCP method handlers
async function handleInitialize(): Promise<InitializeResult> {
  return {
    protocolVersion: SERVER_INFO.protocolVersion,
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: SERVER_INFO.name,
      version: SERVER_INFO.version,
      protocolVersion: SERVER_INFO.protocolVersion,
    },
  };
}

async function handleToolsList(): Promise<ToolsListResult> {
  const tools = Array.from(toolRegistry.values()).map((t) => t.definition);
  return { tools };
}

async function handleToolsCall(
  params: ToolCallParams,
  requestId?: string
): Promise<ToolCallResult> {
  const reqId = requestId || "unknown";
  const tool = toolRegistry.get(params.name);

  if (!tool) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${params.name}` }],
      isError: true,
    };
  }

  // Validate input using Zod schemas
  const validation = validateToolInput(params.name, params.arguments ?? {});

  if (!validation.success) {
    logEvents.validationError(reqId, params.name, validation.error);
    return {
      content: [
        {
          type: "text",
          text: `Invalid input for ${params.name}: ${validation.error}`,
        },
      ],
      isError: true,
    };
  }

  const validatedArgs = validation.data as Record<string, unknown>;
  logEvents.toolCall(reqId, params.name, validatedArgs);
  const startTime = Date.now();

  try {
    // Check cache first if this tool supports caching
    if (tool.cacheTtl) {
      const cacheKey = ResponseCache.generateKey(params.name, validatedArgs);
      const cached = responseCache.get<ToolCallResult>(cacheKey);

      if (cached) {
        const durationMs = Date.now() - startTime;
        toolLogger.debug(
          { requestId: reqId, toolName: params.name, cached: true, durationMs },
          "tool result from cache"
        );
        return cached;
      }
    }

    // Execute handler
    const result = await tool.handler(validatedArgs);
    const durationMs = Date.now() - startTime;

    // Cache successful results
    if (tool.cacheTtl && !result.isError) {
      const cacheKey = ResponseCache.generateKey(params.name, validatedArgs);
      responseCache.set(cacheKey, result, tool.cacheTtl);
    }

    logEvents.toolSuccess(reqId, params.name, durationMs);
    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    logEvents.toolError(reqId, params.name, message, durationMs);

    return {
      content: [{ type: "text", text: `Tool error: ${message}` }],
      isError: true,
    };
  }
}

// JSON-RPC response helpers
function successResponse(id: string | number, result: unknown): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function errorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message, data },
  };
}

// Main request handler
export async function handleMcpRequest(
  req: Request,
  res: Response
): Promise<void> {
  const body = req.body as JsonRpcRequest;
  const requestId = (req as Request & { requestId?: string }).requestId;

  // Validate JSON-RPC structure
  if (!body || body.jsonrpc !== "2.0" || !body.method) {
    res.json(
      errorResponse(body?.id ?? null, ErrorCodes.InvalidRequest, "Invalid JSON-RPC request")
    );
    return;
  }

  const { id, method, params } = body;

  try {
    let result: unknown;

    switch (method) {
      case "initialize":
        result = await handleInitialize();
        break;

      case "initialized":
        // Acknowledgment, no response needed but we return empty result
        result = {};
        break;

      case "tools/list":
        result = await handleToolsList();
        break;

      case "tools/call":
        if (!params || typeof params !== "object" || !("name" in params)) {
          res.json(errorResponse(id, ErrorCodes.InvalidParams, "Missing tool name"));
          return;
        }
        result = await handleToolsCall(
          {
            name: String((params as Record<string, unknown>).name),
            arguments: (params as Record<string, unknown>).arguments as
              | Record<string, unknown>
              | undefined,
          },
          requestId
        );
        break;

      default:
        res.json(errorResponse(id, ErrorCodes.MethodNotFound, `Unknown method: ${method}`));
        return;
    }

    res.json(successResponse(id, result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    toolLogger.error({ requestId, error: message }, "MCP request failed");
    res.json(errorResponse(id, ErrorCodes.InternalError, message));
  }
}

// Legacy endpoint handlers
export async function handleLegacyToolsList(_req: Request, res: Response): Promise<void> {
  const tools = Array.from(toolRegistry.values()).map((t) => t.definition);
  res.json({ tools });
}

export async function handleLegacyToolCall(req: Request, res: Response): Promise<void> {
  const { name, arguments: args } = req.body as {
    name: string;
    arguments?: Record<string, unknown>;
  };
  const requestId = (req as Request & { requestId?: string }).requestId;

  if (!name) {
    res.status(400).json({ error: "Missing tool name" });
    return;
  }

  const result = await handleToolsCall({ name, arguments: args }, requestId);
  res.json(result);
}

// Export cache stats for monitoring
export function getCacheStats() {
  return responseCache.getStats();
}
