/**
 * Simple token estimation utility without external dependencies
 * Provides rough token counts for chat messages
 */

/**
 * Estimate token count for text using character-based approximation
 * This is a rough estimation: 1 token ≈ 4 characters for English text
 */
export function countTokens(text: string): number {
	if (!text || typeof text !== 'string') {
		return 0;
	}

	// Remove extra whitespace and normalize
	const normalizedText = text.trim().replace(/\s+/g, ' ');

	// Basic estimation: 4 characters per token
	const basicTokens = Math.ceil(normalizedText.length / 4);

	// Account for words (minimum 1 token per word for very short text)
	const wordCount = normalizedText.split(/\s+/).length;

	// Return the higher of the two estimates
	return Math.max(basicTokens, Math.ceil(wordCount * 0.75));
}

/**
 * Format token count for display
 */
export function formatTokenCount(count: number): string {
	if (count === 0) return '0 tokens';
	if (count === 1) return '1 token';
	if (count < 1000) return `${count} tokens`;
	if (count < 1000000) return `${(count / 1000).toFixed(1)}K tokens`;
	return `${(count / 1000000).toFixed(1)}M tokens`;
}

/**
 * Get token count color class based on usage
 */
export function getTokenCountColor(count: number, maxTokens = 4096): string {
	const percentage = count / maxTokens;

	if (percentage < 0.5) return 'text-green-600 dark:text-green-400';
	if (percentage < 0.75) return 'text-yellow-600 dark:text-yellow-400';
	if (percentage < 0.9) return 'text-orange-600 dark:text-orange-400';
	return 'text-red-600 dark:text-red-400';
}
