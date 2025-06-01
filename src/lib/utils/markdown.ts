import { marked } from 'marked';

// Configure marked with safe defaults
marked.setOptions({
	breaks: true,
	gfm: true,
	mangle: false
});

// Language mapping for better recognition
const languageMap: Record<string, string> = {
	js: 'javascript',
	ts: 'typescript',
	py: 'python',
	rb: 'ruby',
	sh: 'bash',
	shell: 'bash',
	zsh: 'bash',
	fish: 'bash',
	ps1: 'powershell',
	cmd: 'batch',
	cs: 'csharp',
	'c++': 'cpp',
	'c#': 'csharp',
	'f#': 'fsharp',
	yml: 'yaml',
	xml: 'markup',
	html: 'markup',
	svg: 'markup',
	vue: 'markup',
	svelte: 'markup',
	jsx: 'jsx',
	tsx: 'tsx'
};

function normalizeLanguage(lang: string): string {
	const normalized = lang.toLowerCase().trim();
	return languageMap[normalized] || normalized;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Prism: any = null;

async function loadPrism() {
	if (typeof window !== 'undefined' && !Prism) {
		try {
			const prismModule = await import('prismjs');
			Prism = prismModule.default;

			// Load common languages
			const languageImports = [
				'prismjs/components/prism-javascript',
				'prismjs/components/prism-typescript',
				'prismjs/components/prism-jsx',
				'prismjs/components/prism-tsx',
				'prismjs/components/prism-python',
				'prismjs/components/prism-java',
				'prismjs/components/prism-c',
				'prismjs/components/prism-cpp',
				'prismjs/components/prism-csharp',
				'prismjs/components/prism-php',
				'prismjs/components/prism-ruby',
				'prismjs/components/prism-go',
				'prismjs/components/prism-rust',
				'prismjs/components/prism-swift',
				'prismjs/components/prism-kotlin',
				'prismjs/components/prism-scala',
				'prismjs/components/prism-bash',
				'prismjs/components/prism-shell-session',
				'prismjs/components/prism-powershell',
				'prismjs/components/prism-sql',
				'prismjs/components/prism-json',
				'prismjs/components/prism-yaml',
				'prismjs/components/prism-xml-doc',
				'prismjs/components/prism-markup',
				'prismjs/components/prism-css',
				'prismjs/components/prism-scss',
				'prismjs/components/prism-less',
				'prismjs/components/prism-stylus',
				'prismjs/components/prism-markdown',
				'prismjs/components/prism-docker',
				'prismjs/components/prism-nginx',
				'prismjs/components/prism-git',
				'prismjs/components/prism-diff'
			];

			// Load language components with error handling
			await Promise.allSettled(
				languageImports.map((lang) => import(/* @vite-ignore */ lang).catch(() => {}))
			);
		} catch (error) {
			console.warn('Failed to load Prism.js:', error);
		}
	}
}

function highlightCode(code: string, language: string): string {
	try {
		if (!Prism) {
			return escapeHtml(code);
		}

		const normalizedLang = normalizeLanguage(language);

		// Check if the language is supported by Prism
		if (Prism.languages[normalizedLang]) {
			return Prism.highlight(code, Prism.languages[normalizedLang], normalizedLang);
		}

		// Fallback to plain text highlighting
		return Prism.util?.encode ? Prism.util.encode(code) : escapeHtml(code);
	} catch (error) {
		console.warn('Syntax highlighting failed for language:', language, error);
		return escapeHtml(code);
	}
}

function escapeHtml(text: string): string {
	return text.replace(
		/[&<>"']/g,
		(m) =>
			({
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;'
			})[m] || m
	);
}

// Custom renderer for better styling
const renderer = new marked.Renderer();

// Override link rendering to add target="_blank" for external links
renderer.link = ({ href, title, tokens }) => {
	const text = tokens.map((token) => token.raw).join('');
	const isExternal = href?.startsWith('http') || href?.startsWith('//');
	const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
	const titleAttr = title ? ` title="${title}"` : '';
	return `<a href="${href}"${titleAttr}${target} class="text-blue-600 dark:text-blue-400 hover:underline transition-colors">${text}</a>`;
};

// Override code rendering for syntax highlighting
renderer.code = ({ text, lang }) => {
	const language = lang || 'text';
	const normalizedLang = normalizeLanguage(language);
	const highlightedCode = highlightCode(text, language);

	return `<div class="code-block-wrapper my-4">
		<div class="code-block-header flex items-center justify-between bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-t-lg border-b border-gray-300 dark:border-gray-600">
			<span class="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">${language}</span>
			<button 
				class="copy-code-btn text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors px-2 py-1 rounded bg-gray-100 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
				onclick="copyToClipboard(this)"
				data-code="${escapeHtml(text)}"
				title="Copy code"
			>
				Copy
			</button>
		</div>
		<pre class="bg-gray-100 dark:bg-gray-800 rounded-b-lg p-4 overflow-x-auto border border-gray-300 dark:border-gray-600 border-t-0"><code class="language-${normalizedLang} text-sm block">${highlightedCode}</code></pre>
	</div>`;
};

// Override inline code rendering
renderer.codespan = ({ text }) => {
	return `<code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono text-pink-600 dark:text-pink-400 border border-gray-300 dark:border-gray-600">${text}</code>`;
};

// Override blockquote rendering
renderer.blockquote = ({ tokens }) => {
	const quote = tokens.map((token) => token.raw).join('');
	return `<blockquote class="border-l-4 border-blue-500 dark:border-blue-400 pl-4 my-4 italic text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 py-2 rounded-r">${quote}</blockquote>`;
};

// Override list rendering
renderer.list = ({ ordered, start, items }) => {
	const tag = ordered ? 'ol' : 'ul';
	const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';
	const className = ordered
		? 'list-decimal list-inside space-y-1 my-3 pl-4'
		: 'list-disc list-inside space-y-1 my-3 pl-4';

	return `<${tag}${startAttr} class="${className}">${items}</${tag}>`;
};

renderer.listitem = ({ text, task, checked }) => {
	if (task) {
		const checkboxState = checked ? 'checked' : '';
		const checkboxClass = checked
			? 'text-green-500 dark:text-green-400'
			: 'text-gray-400 dark:text-gray-500';
		return `<li class="flex items-start gap-2">
			<input type="checkbox" ${checkboxState} disabled class="${checkboxClass} mt-1">
			<span class="${checked ? 'line-through text-gray-500 dark:text-gray-400' : ''}">${text}</span>
		</li>`;
	}
	return `<li class="text-gray-700 dark:text-gray-300">${text}</li>`;
};

// Override table rendering
renderer.table = ({ header, rows }) => {
	return `<div class="overflow-x-auto my-4 rounded-lg border border-gray-300 dark:border-gray-600">
		<table class="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
			${header}
			<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
				${rows}
			</tbody>
		</table>
	</div>`;
};

renderer.tablerow = ({ text }) => {
	return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">${text}</tr>`;
};

renderer.tablecell = ({ text, header, align }) => {
	const tag = header ? 'th' : 'td';
	const baseClassName = header
		? 'px-4 py-3 bg-gray-50 dark:bg-gray-700 font-semibold text-gray-900 dark:text-gray-100'
		: 'px-4 py-3 text-gray-700 dark:text-gray-300';
	const alignClass = align ? ` text-${align}` : ' text-left';
	return `<${tag} class="${baseClassName}${alignClass}">${text}</${tag}>`;
};

// Override heading rendering
renderer.heading = ({ tokens, depth }) => {
	const text = tokens.map((token) => token.raw).join('');
	const sizes = {
		1: 'text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4 mt-6',
		2: 'text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 mt-5',
		3: 'text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 mt-4',
		4: 'text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 mt-3',
		5: 'text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 mt-2',
		6: 'text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 mt-2'
	};

	const className = sizes[depth as keyof typeof sizes] || sizes[6];
	return `<h${depth} class="${className}">${text}</h${depth}>`;
};

// Override paragraph rendering
renderer.paragraph = ({ tokens }) => {
	const text = tokens.map((token) => token.raw).join('');
	return `<p class="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">${text}</p>`;
};

// Override horizontal rule
renderer.hr = () => {
	return `<hr class="my-6 border-gray-300 dark:border-gray-600">`;
};

marked.use({ renderer });

export async function renderMarkdown(text: string): Promise<string> {
	try {
		// Load Prism.js on first use
		await loadPrism();

		const html = marked.parse(text) as string;

		// Add global copy function to window if not already present
		if (typeof window !== 'undefined' && !(window as any).copyToClipboard) {
			(window as any).copyToClipboard = (button: HTMLButtonElement) => {
				const code = button.getAttribute('data-code');
				if (code && navigator.clipboard) {
					navigator.clipboard
						.writeText(code)
						.then(() => {
							const originalText = button.textContent;
							button.textContent = 'Copied!';
							button.classList.add('text-green-600', 'dark:text-green-400');
							setTimeout(() => {
								button.textContent = originalText;
								button.classList.remove('text-green-600', 'dark:text-green-400');
							}, 2000);
						})
						.catch((err) => {
							console.error('Failed to copy code:', err);
						});
				}
			};
		}

		return html;
	} catch (error) {
		console.error('Error rendering markdown:', error);
		// Return the original text as a fallback with line breaks
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
		.replace(/^\s*[-+*]\s+/gm, '') // List items
		.replace(/^\s*\d+\.\s+/gm, '') // Numbered lists
		.replace(/^\s*>\s+/gm, '') // Blockquotes
		.trim();
}
