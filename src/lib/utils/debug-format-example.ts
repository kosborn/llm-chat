// Example test file to demonstrate enhanced debug JSON formatting

export interface ExampleRawStreamData {
	chunk: string;
}

// Example of raw stream data with encoded JSON like what the debug interface receives
export const exampleRawStreamData: ExampleRawStreamData = {
	chunk: `e:{"finishReason":"stop","usage":{"promptTokens":688,"completionTokens":10},"isContinued":false}
d:{"finishReason":"stop","usage":{"promptTokens":688,"completionTokens":10}}
`
};

// Another example with more complex nested data
export const complexExampleData: ExampleRawStreamData = {
	chunk: `e:{"type":"text","value":"Hello world","metadata":{"timestamp":"2024-01-01T00:00:00Z"}}
d:{"status":"complete","tokens":{"input":100,"output":25},"model":"gpt-4"}
0:{"delta":"some text content"}
2:{"toolCallId":"abc123","toolName":"search","args":{"query":"test"}}
3:{"toolCallId":"abc123","result":{"status":"success","data":["item1","item2"]}}
`
};

// Example with malformed JSON (should gracefully handle failures)
export const malformedExampleData: ExampleRawStreamData = {
	chunk: `e:{"finishReason":"stop","usage":{"promptTokens":688,"completionTokens":10},"isContinued":false}
d:{"finishReason":"stop","usage":{promptTokens":688,"completionTokens":10}}
invalid_line_without_json
standalone_json:{"valid":"json","here":true}
`
};

// Helper function to simulate what the debug interface formatData function does
export function simulateFormatData(data: any): string {
	if (typeof data === 'string') {
		return data;
	}

	// Special handling for raw stream data with encoded JSON
	if (data && typeof data === 'object' && data.chunk && typeof data.chunk === 'string') {
		const chunk = data.chunk;

		// Split by lines to handle each encoded JSON separately
		const lines = chunk.split('\n');
		const processedLines = lines.map((line: string) => {
			if (!line.trim()) return line;

			// Look for patterns like e:{...} or d:{...} followed by JSON
			const streamPattern = /^([ed]):(.+)$/;
			const match = line.match(streamPattern);

			if (match) {
				const [, prefix, jsonStr] = match;
				try {
					const parsed = JSON.parse(jsonStr);
					const prettyJson = JSON.stringify(parsed, null, 2);
					return `${prefix}:\n${prettyJson
						.split('\n')
						.map((jsonLine) => '  ' + jsonLine)
						.join('\n')}`;
				} catch {
					const jsonMatch = jsonStr.match(/\{.*\}/);
					if (jsonMatch) {
						try {
							const parsed = JSON.parse(jsonMatch[0]);
							const prettyJson = JSON.stringify(parsed, null, 2);
							return `${prefix}: ${prettyJson}`;
						} catch {
							return line;
						}
					}
					return line;
				}
			}

			// Handle standalone JSON objects
			const jsonMatch = line.match(/\{.*\}/);
			if (jsonMatch) {
				try {
					const parsed = JSON.parse(jsonMatch[0]);
					const prettyJson = JSON.stringify(parsed, null, 2);
					return line.replace(jsonMatch[0], prettyJson);
				} catch {
					return line;
				}
			}

			return line;
		});

		const prettyChunk = processedLines.join('\n');

		return JSON.stringify(
			{
				...data,
				chunk: prettyChunk
			},
			null,
			2
		);
	}

	return JSON.stringify(data, null, 2);
}

// Test function to demonstrate the formatting
export function demonstrateFormatting(): void {
	console.log('=== Basic Example ===');
	console.log(simulateFormatData(exampleRawStreamData));

	console.log('\n=== Complex Example ===');
	console.log(simulateFormatData(complexExampleData));

	console.log('\n=== Malformed Example ===');
	console.log(simulateFormatData(malformedExampleData));
}
