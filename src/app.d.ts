// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	// PWA and Service Worker types
	interface Navigator {
		serviceWorker: ServiceWorkerContainer;
	}

	interface Window {
		workbox?: {
			addEventListener: (event: string, callback: (event: MessageEvent) => void) => void;
			messageSkipWaiting: () => void;
		};
	}

	// Network status types
	interface NetworkInformation {
		downlink?: number;
		effectiveType?: string;
		onchange?: () => void;
		rtt?: number;
		saveData?: boolean;
		type?: string;
	}

	interface Navigator {
		connection?: NetworkInformation;
		mozConnection?: NetworkInformation;
		webkitConnection?: NetworkInformation;
	}
}

export interface ApiUsageMetadata {
	model?: string;
	provider?: string;
	promptTokens?: number;
	completionTokens?: number;
	totalTokens?: number;
	cost?: {
		inputCost?: number;
		outputCost?: number;
		totalCost?: number;
		currency?: string;
	};
	requestId?: string;
	responseTime?: number;
	timestamp: number;
	mode?: 'server' | 'client';
}

export interface ToolInvocation {
	toolCallId: string;
	toolName: string;
	args: Record<string, unknown>;
	result?: {
		success: boolean;
		data?: unknown;
		error?: string;
		metadata?: {
			executionTime?: number;
			timestamp: string;
			toolName: string;
		};
	};
	state?: 'result' | 'running';
}

export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant' | 'system' | 'tool';
	content: string;
	timestamp: number;
	toolInvocations?: ToolInvocation[];
	apiMetadata?: ApiUsageMetadata;
}

export interface Chat {
	id: string;
	title: string;
	messages: ChatMessage[];
	createdAt: number;
	updatedAt: number;
	archived?: boolean;
	provider?: import('$lib/providers').ProviderId;
	model?: string;
}

export interface CustomTool {
	name: string;
	description: string;
	parameters: Record<string, unknown>;
	execute: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

export interface ChatStore {
	chats: Chat[];
	archivedChats: Chat[];
	currentChatId: string | null;
}
