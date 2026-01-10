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

// Tool registry
type ToolHandler = (args: Record<string, unknown>) => Promise<ToolCallResult>;

interface RegisteredTool {
  definition: McpToolDefinition;
  handler: ToolHandler;
}

const toolRegistry = new Map<string, RegisteredTool>();

export function registerTool(
  definition: McpToolDefinition,
  handler: ToolHandler
): void {
  toolRegistry.set(definition.name, { definition, handler });
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

async function handleToolsCall(params: ToolCallParams): Promise<ToolCallResult> {
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
    console.warn(`Validation failed for ${params.name}:`, validation.error);
    return {
      content: [{
        type: "text",
        text: `Invalid input for ${params.name}: ${validation.error}`,
      }],
      isError: true,
    };
  }

  try {
    // Pass validated and transformed data to handler
    return await tool.handler(validation.data as Record<string, unknown>);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Tool execution error (${params.name}):`, message);
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

  // Validate JSON-RPC structure
  if (!body || body.jsonrpc !== "2.0" || !body.method) {
    res.json(errorResponse(body?.id ?? null, ErrorCodes.InvalidRequest, "Invalid JSON-RPC request"));
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
        result = await handleToolsCall({
          name: String((params as Record<string, unknown>).name),
          arguments: (params as Record<string, unknown>).arguments as Record<string, unknown> | undefined,
        });
        break;

      default:
        res.json(errorResponse(id, ErrorCodes.MethodNotFound, `Unknown method: ${method}`));
        return;
    }

    res.json(successResponse(id, result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    res.json(errorResponse(id, ErrorCodes.InternalError, message));
  }
}

// Legacy endpoint handlers
export async function handleLegacyToolsList(_req: Request, res: Response): Promise<void> {
  const tools = Array.from(toolRegistry.values()).map((t) => t.definition);
  res.json({ tools });
}

export async function handleLegacyToolCall(req: Request, res: Response): Promise<void> {
  const { name, arguments: args } = req.body as { name: string; arguments?: Record<string, unknown> };
  
  if (!name) {
    res.status(400).json({ error: "Missing tool name" });
    return;
  }

  const result = await handleToolsCall({ name, arguments: args });
  res.json(result);
}
