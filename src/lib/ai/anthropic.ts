// =========================================
// Anthropic Claude API Client
// =========================================

import Anthropic from '@anthropic-ai/sdk';

/**
 * Anthropic client instance
 * Uses ANTHROPIC_API_KEY from environment
 */
export const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Simple message helper for Claude
 */
export async function generateMessage(
    prompt: string,
    model = 'claude-sonnet-4-20250514',
    maxTokens = 4096
): Promise<string> {
    const message = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = message.content.find(block => block.type === 'text');
    return textBlock?.type === 'text' ? textBlock.text : '';
}

/**
 * Streaming message helper
 */
export async function* streamMessage(
    prompt: string,
    model = 'claude-sonnet-4-20250514',
    maxTokens = 4096
): AsyncGenerator<string> {
    const stream = anthropic.messages.stream({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
    });

    for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            yield event.delta.text;
        }
    }
}
