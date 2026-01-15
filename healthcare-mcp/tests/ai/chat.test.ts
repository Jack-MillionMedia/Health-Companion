import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthcareChat } from '../../src/ai/chat';
import { OpenAI } from 'openai';

// Mock OpenAI
vi.mock('openai', () => {
    return {
        OpenAI: vi.fn().mockImplementation(function () {
            return {
                chat: {
                    completions: {
                        create: vi.fn(),
                    },
                },
            };
        }),
    };
});

// Mock environment variables
process.env.OPENAI_MAX_TOKENS = '1000';

describe('HealthcareChat', () => {
    let chat: HealthcareChat;
    let mockExecutor: any;
    let mockOpenAI: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockExecutor = vi.fn();
        // Re-instantiate to get fresh mock
        chat = new HealthcareChat('test-key', mockExecutor);
        // Access the mocked instance (private property hack for testing)
        mockOpenAI = (chat as any).openai;
    });

    it('should execute tools in parallel', async () => {
        // Setup mock executor with delay
        mockExecutor.mockImplementation(async (name: string) => {
            await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
            return `Result for ${name}`;
        });

        // Mock OpenAI response 1: Call 2 tools
        const toolCalls = [
            { id: 'call_1', type: 'function', function: { name: 'tool1', arguments: '{}' } },
            { id: 'call_2', type: 'function', function: { name: 'tool2', arguments: '{}' } }
        ];

        mockOpenAI.chat.completions.create
            .mockResolvedValueOnce({
                choices: [{ message: { content: null, tool_calls: toolCalls } }],
            })
            .mockResolvedValueOnce({
                choices: [{ message: { content: 'Final Answer' } }],
            });

        const start = Date.now();
        await chat.chat('test user message');
        const duration = Date.now() - start;

        // Should be around 100ms + overhead, definitely less than 200ms (sequential would be 200ms+)
        // We give some buffer for test runner overhead
        expect(duration).toBeLessThan(190);
        expect(mockExecutor).toHaveBeenCalledTimes(2);
    });

    it('should handle tool errors gracefully', async () => {
        mockExecutor.mockImplementation(async (name: string) => {
            if (name === 'fail_tool') throw new Error('Tool failed');
            return 'Success';
        });

        const toolCalls = [
            { id: 'call_1', type: 'function', function: { name: 'fail_tool', arguments: '{}' } },
            { id: 'call_2', type: 'function', function: { name: 'ok_tool', arguments: '{}' } }
        ];

        mockOpenAI.chat.completions.create
            .mockResolvedValueOnce({
                choices: [{ message: { content: null, tool_calls: toolCalls } }],
            })
            .mockResolvedValueOnce({
                choices: [{ message: { content: 'Final Answer' } }],
            });

        await chat.chat('test message');

        // Verify the error was caught and passed to the history
        const history = (chat as any).conversationHistory;
        const toolOutputs = history.filter((msg: any) => msg.role === 'tool');

        expect(toolOutputs).toHaveLength(2);
        expect(toolOutputs.find((m: any) => m.tool_call_id === 'call_1').content).toContain('Error: Tool failed');
        expect(toolOutputs.find((m: any) => m.tool_call_id === 'call_2').content).toBe('Success');
    });

    it('should stream responses correctly', async () => {
        // Mock OpenAI response for stream
        // 1. Tool call response (not streamed usually in the library flow we mocked, 
        // but let's assume we handle the tool call first then stream the final answer)

        const toolCalls = [
            { id: 'call_1', type: 'function', function: { name: 'tool1', arguments: '{}' } }
        ];

        // First call returns tool calls (non-streaming in our implementation for tool planning)
        mockOpenAI.chat.completions.create
            .mockResolvedValueOnce({
                choices: [{ message: { content: null, tool_calls: toolCalls } }],
            })
            // Second call: Returns non-tool response to exit the loop
            .mockResolvedValueOnce({
                choices: [{ message: { content: 'Ready to stream' } }],
            });

        mockExecutor.mockResolvedValue('Tool Result');

        // Third call: Streams the final answer
        const stream = (async function* () {
            yield { choices: [{ delta: { content: 'Hello' } }] };
            yield { choices: [{ delta: { content: ' World' } }] };
        })();
        // Add async iterator symbol
        (stream as any)[Symbol.asyncIterator] = function () { return this; };

        mockOpenAI.chat.completions.create
            .mockReturnValueOnce(stream);

        const chunks = [];
        for await (const chunk of chat.chatStream('test')) {
            chunks.push(chunk);
        }

        // Check for "Fetching data" message yielded during tool phase
        expect(chunks.some(c => c.includes('Fetching data'))).toBe(true);
        expect(chunks).toContain('Hello');
        expect(chunks).toContain(' World');
    });
});
