import { marked } from 'marked';

// Configure marked with safe defaults
marked.setOptions({
	breaks: true,
	gfm: true
});

// Custom renderer for better styling
const renderer = new marked.Renderer();

// Override link rendering to add target="_blank" for external links
renderer.link = ({ href, title, tokens }) => {
	const text = tokens.map((token) => token.raw).join('');
	const isExternal = href?.startsWith('http') || href?.startsWith('//');
	const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
	const titleAttr = title ? ` title="${title}"` : '';
	return `<a href="${href}"${titleAttr}${target} class="text-blue-600 dark:text-blue-400 hover:underline">${text}</a>`;
};

// Override code rendering for better styling
renderer.code = ({ text, lang }) => {
	const language = lang || '';
	return `<pre class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto my-4"><code class="language-${language} text-sm">${text}</code></pre>`;
};

// Override inline code rendering
renderer.codespan = ({ text }) => {
	return `<code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono">${text}</code>`;
};

// Override blockquote rendering
renderer.blockquote = ({ tokens }) => {
	const quote = tokens.map((token) => token.raw).join('');
	return `<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic text-gray-700 dark:text-gray-300">${quote}</blockquote>`;
};

// Override table rendering
renderer.table = ({ header, rows }) => {
	return `<div class="overflow-x-auto my-4"><table class="min-w-full border border-gray-300 dark:border-gray-600">${header}${rows}</table></div>`;
};

renderer.tablerow = ({ text }) => {
	return `<tr class="border-b border-gray-300 dark:border-gray-600">${text}</tr>`;
};

renderer.tablecell = ({ text, header, align }) => {
	const tag = header ? 'th' : 'td';
	const className = header
		? 'px-4 py-2 bg-gray-50 dark:bg-gray-700 font-semibold text-left'
		: 'px-4 py-2';
	const alignClass = align ? ` text-${align}` : '';
	return `<${tag} class="${className}${alignClass}">${text}</${tag}>`;
};

marked.use({ renderer });

export function renderMarkdown(text: string): string {
	try {
		return marked.parse(text) as string;
	} catch (error) {
		console.error('Error rendering markdown:', error);
		// Return the original text as a fallback
		return text.replace(/\n/g, '<br>');
	}
}

export function stripMarkdown(text: string): string {
	// Simple markdown stripping for plain text display
	return text
		.replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1') // Bold and italic
		.replace(/`([^`]+)`/g, '$1') // Inline code
		.replace(/#{1,6}\s+(.+)/g, '$1') // Headers
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
		.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // Images
		.trim();
}
