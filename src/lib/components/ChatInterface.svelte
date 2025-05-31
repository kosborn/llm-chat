<script lang="ts">
	import { onMount } from 'svelte';
	import { nanoid } from 'nanoid';
	import { parseDataStreamPart } from 'ai';
	import type { ChatMessage, ToolInvocation } from '../../app.d.ts';
	import { chatStore } from '$lib/stores/chat-store.svelte.js';
	import { debugStore } from '$lib/stores/debug-store.svelte.js';
	import { apiKeyStore } from '$lib/stores/api-key-store.svelte.js';
	import { networkStore } from '$lib/stores/network-store.svelte.js';
	import { offlineQueueStore } from '$lib/stores/offline-queue-store.svelte.js';
	import { clientChatService } from '$lib/services/client-chat.js';
	import ChatSidebar from './ChatSidebar.svelte';
	import ChatMessageComponent from './ChatMessage.svelte';
	import ChatInput from './ChatInput.svelte';
	import DebugInterface from './DebugInterface.svelte';
	import ApiKeyConfig from './ApiKeyConfig.svelte';
	import PWAStatus from './PWAStatus.svelte';
	import PWAInstallPrompt from './PWAInstallPrompt.svelte';
	import StatusBar from './StatusBar.svelte';

	let isStreaming = $state(false);
	let streamingMessageId = $state<string | null>(null);
	let autoRenamingChatId = $state<string | null>(null);
	let messagesContainer: HTMLDivElement | undefined = $state();
	let showApiConfig = $state(false);
	let showPwaPrompt = $state(false);
	let serverAvailable = $state<boolean | null>(null);

	onMount(async () => {
		await chatStore.init();

		// Register service worker
		if ('serviceWorker' in navigator) {
			try {
				await navigator.serviceWorker.register('/service-worker.js');
				console.log('Service Worker registered');
			} catch (error) {
				console.error('Service Worker registration failed:', error);
			}
		}

		// Check server availability
		try {
			const response = await fetch('/api/chat', {
				method: 'HEAD'
			});
			serverAvailable = response.ok;
		} catch {
			serverAvailable = false;
		}

		// Don't automatically show API config modal - let user click the button when needed

		// Listen for network events to process offline queue
		window.addEventListener('network-online', () => {
			if (apiKeyStore.isConfigured) {
				offlineQueueStore.processQueue();
			}
		});
	});

	async function handleNewChat() {
		try {
			await chatStore.createChat();
		} catch (error) {
			console.error('Failed to create new chat:', error);
		}
	}

	async function handleSelectChat(event: CustomEvent<{ chatId: string }>) {
		await chatStore.selectChat(event.detail.chatId);
	}

	async function handleDeleteChat(event: CustomEvent<{ chatId: string }>) {
		try {
			await chatStore.deleteChat(event.detail.chatId);
		} catch (error) {
			console.error('Failed to delete chat:', error);
		}
	}

	async function handleRenameChat(event: CustomEvent<{ chatId: string; title: string }>) {
		try {
			await chatStore.updateChatTitle(event.detail.chatId, event.detail.title);
		} catch (error) {
			console.error('Failed to rename chat:', error);
		}
	}

	async function handleRegenerateTitle(event: CustomEvent<{ chatId: string }>) {
		try {
			autoRenamingChatId = event.detail.chatId;
			await chatStore.autoRenameChat(event.detail.chatId, true);
		} catch (error) {
			console.error('Failed to regenerate title:', error);
		} finally {
			autoRenamingChatId = null;
		}
	}

	async function handleSubmitMessage(event: CustomEvent<{ message: string }>) {
		const messageText = event.detail.message;

		if (!chatStore.currentChatId) {
			await chatStore.createChat();
		}

		if (!chatStore.currentChatId) {
			console.error('No chat available');
			return;
		}

		try {
			// Add user message
			const userMessage: ChatMessage = {
				id: nanoid(),
				role: 'user',
				content: messageText,
				timestamp: Date.now()
			};

			await chatStore.addMessage(userMessage);

			// Check if we can send messages
			if (!clientChatService.canSendMessages()) {
				// Queue message for later if offline but API key is configured
				if (!networkStore.isOnline && apiKeyStore.isConfigured) {
					offlineQueueStore.addToQueue(chatStore.currentChatId, userMessage);

					// Add queued message indicator
					const queuedMessage: ChatMessage = {
						id: nanoid(),
						role: 'assistant',
						content: "📤 Message queued for sending when you're back online.",
						timestamp: Date.now()
					};
					await chatStore.addMessage(queuedMessage);
				} else {
					// Add status message for other cases (no API key, etc.)
					const statusMessage: ChatMessage = {
						id: nanoid(),
						role: 'assistant',
						content: clientChatService.getStatusMessage(),
						timestamp: Date.now()
					};
					await chatStore.addMessage(statusMessage);
				}
				return;
			}

			// Start streaming assistant response
			isStreaming = true;
			const assistantMessageId = nanoid();
			streamingMessageId = assistantMessageId;

			const assistantMessage: ChatMessage = {
				id: assistantMessageId,
				role: 'assistant',
				content: '',
				timestamp: Date.now(),
				toolInvocations: []
			};

			await chatStore.addMessage(assistantMessage);

			// Prepare messages for client-side API
			const messages = chatStore.currentChat?.messages || [];

			// Use client-side chat service
			const response = await clientChatService.sendMessage(messages);

			if (!response.success) {
				throw new Error(response.error || 'Failed to send message');
			}

			if (!response.stream) {
				throw new Error('No response stream');
			}

			const reader = response.stream.getReader();
			let accumulatedContent = '';
			const accumulatedToolInvocations: Array<{
				toolCallId: string;
				toolName: string;
				args: Record<string, unknown>;
				result?: unknown;
				state: 'call' | 'result';
			}> = [];
			let buffer = '';

			// Store API metadata from response
			let apiMetadata = response.apiMetadata;
			let finalUsage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } =
				{};

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = new TextDecoder().decode(value);
					buffer += chunk;

					const lines = buffer.split('\n');
					buffer = lines.pop() || '';

					for (const line of lines) {
						if (line.trim() === '') continue;

						try {
							const part = parseDataStreamPart(line);

							if (part.type === 'text') {
								accumulatedContent += part.value;
							} else if (part.type === 'tool_call') {
								const toolCall = {
									toolCallId: part.value.toolCallId,
									toolName: part.value.toolName,
									args: part.value.args,
									state: 'call' as const
								};
								accumulatedToolInvocations.push(toolCall);
							} else if (part.type === 'tool_result') {
								const toolIndex = accumulatedToolInvocations.findIndex(
									(tool) => tool.toolCallId === part.value.toolCallId
								);
								if (toolIndex !== -1) {
									accumulatedToolInvocations[toolIndex] = {
										...accumulatedToolInvocations[toolIndex],
										result: part.value.result,
										state: 'result'
									};
									debugStore.logToolResult(part.value, {
										chatId: chatStore.currentChatId,
										messageId: assistantMessageId
									});
								}
							} else if (part.type === 'finish') {
								// Extract usage information from finish event
								if (part.value && typeof part.value === 'object' && 'usage' in part.value) {
									const usage = (
										part.value as {
											usage?: {
												promptTokens?: number;
												completionTokens?: number;
												totalTokens?: number;
											};
										}
									).usage;
									if (usage) {
										finalUsage = {
											promptTokens: usage.promptTokens,
											completionTokens: usage.completionTokens,
											totalTokens: usage.totalTokens
										};
									}
								}
							}
						} catch {
							// Fallback to manual parsing for custom format
							try {
								const colonIndex = line.indexOf(':');
								if (colonIndex === -1) continue;

								const type = line.substring(0, colonIndex);
								const data = line.substring(colonIndex + 1);

								const parsedData = { type, data: JSON.parse(data) };
								debugStore.logParsedData(parsedData, {
									chatId: chatStore.currentChatId,
									messageId: assistantMessageId
								});

								if (type === '0') {
									// Text delta
									const textDelta = JSON.parse(data);
									accumulatedContent += textDelta;
								} else if (type === '2') {
									// Tool call
									const toolCall = JSON.parse(data);
									const toolCallData = {
										toolCallId: toolCall.toolCallId,
										toolName: toolCall.toolName,
										args: toolCall.args as Record<string, unknown>,
										state: 'call' as const
									};
									accumulatedToolInvocations.push(toolCallData);
									debugStore.logToolCall(toolCall, {
										chatId: chatStore.currentChatId,
										messageId: assistantMessageId
									});
								} else if (type === '3') {
									// Tool result
									const toolResult = JSON.parse(data);
									const toolIndex = accumulatedToolInvocations.findIndex(
										(tool) => tool.toolCallId === toolResult.toolCallId
									);
									if (toolIndex !== -1) {
										accumulatedToolInvocations[toolIndex] = {
											...accumulatedToolInvocations[toolIndex],
											result: toolResult.result,
											state: 'result' as const
										};
										debugStore.logToolResult(toolResult, {
											chatId: chatStore.currentChatId,
											messageId: assistantMessageId
										});
									}
								} else if (type === 'e') {
									// Finish event - may contain usage information
									try {
										const finishData = JSON.parse(data);
										if (finishData.usage) {
											finalUsage = {
												promptTokens: finishData.usage.promptTokens,
												completionTokens: finishData.usage.completionTokens,
												totalTokens: finishData.usage.totalTokens
											};
										}
									} catch {
										// Ignore parsing errors for finish events
									}
								}
								// Types 'f', 'd' are other metadata events
							} catch (parseError) {
								console.warn('Failed to parse data stream line:', line, parseError);
								debugStore.logError(parseError, {
									chatId: chatStore.currentChatId,
									messageId: assistantMessageId
								});
							}
						}

						// Update the message
						const messageUpdate = {
							content: accumulatedContent,
							toolInvocations: accumulatedToolInvocations as ToolInvocation[]
						};
						debugStore.logMessageUpdate(messageUpdate, {
							chatId: chatStore.currentChatId,
							messageId: assistantMessageId
						});
						await chatStore.updateMessage(assistantMessageId, messageUpdate);
					}
				}
			} finally {
				reader.releaseLock();

				// Add API metadata to the message after streaming is complete
				if (apiMetadata || Object.keys(finalUsage).length > 0) {
					console.log('[DEBUG] Processing API metadata:', { apiMetadata, finalUsage });

					// Import cost calculator dynamically to avoid circular dependencies
					const { calculateCost } = await import('$lib/utils/cost-calculator.js');

					// Update metadata with usage information and calculate costs
					if (apiMetadata) {
						apiMetadata = {
							...apiMetadata,
							promptTokens: finalUsage.promptTokens,
							completionTokens: finalUsage.completionTokens,
							totalTokens: finalUsage.totalTokens
						};

						// Calculate cost if we have usage information
						if (finalUsage.totalTokens && apiMetadata.provider && apiMetadata.model) {
							const cost = calculateCost(
								apiMetadata.provider,
								apiMetadata.model,
								finalUsage.promptTokens || 0,
								finalUsage.completionTokens || 0
							);
							if (cost) {
								apiMetadata.cost = cost;
							}
						}

						// Log updated metadata to debug store
						debugStore.logApiMetadata(
							{
								model: apiMetadata.model,
								provider: apiMetadata.provider,
								promptTokens: apiMetadata.promptTokens,
								completionTokens: apiMetadata.completionTokens,
								totalTokens: apiMetadata.totalTokens,
								cost: apiMetadata.cost,
								responseTime: apiMetadata.responseTime
							},
							{
								chatId: chatStore.currentChatId,
								messageId: assistantMessageId
							}
						);

						await chatStore.updateMessage(assistantMessageId, {
							apiMetadata
						});
					}
				}
			}
		} catch (error) {
			console.error('Failed to send message:', error);
			debugStore.logError(error, {
				chatId: chatStore.currentChatId
			});

			// Add error message
			const errorMessage: ChatMessage = {
				id: nanoid(),
				role: 'assistant',
				content: 'Sorry, I encountered an error while processing your message. Please try again.',
				timestamp: Date.now()
			};

			if (chatStore.currentChatId) {
				await chatStore.addMessage(errorMessage);
			}
		} finally {
			isStreaming = false;
			streamingMessageId = null;

			// Auto-rename chat after first assistant response or if title is malformed
			if (chatStore.currentChatId && chatStore.currentChat) {
				const chat = chatStore.currentChat;
				const shouldRename =
					chat.messages.length === 2 ||
					chat.title.toLowerCase().includes('here is') ||
					chat.title.toLowerCase().includes("here's") ||
					chat.title.toLowerCase().includes('descriptive title') ||
					chat.title.toLowerCase().includes('chat...') ||
					chat.title.length > 60;

				if (shouldRename) {
					autoRenamingChatId = chatStore.currentChatId;
					// Small delay to ensure the message is fully saved
					setTimeout(async () => {
						if (chatStore.currentChatId) {
							try {
								await chatStore.autoRenameChat(chatStore.currentChatId);
							} finally {
								autoRenamingChatId = null;
							}
						}
					}, 500);
				}
			}
		}
	}

	// Auto-scroll to bottom when new messages arrive
	$effect(() => {
		if (messagesContainer && chatStore.currentChat?.messages) {
			setTimeout(() => {
				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
			}, 100);
		}
	});
</script>

<div class="flex h-full bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
	<!-- Sidebar -->
	<ChatSidebar
		chats={chatStore.chats}
		currentChatId={chatStore.currentChatId}
		isLoading={chatStore.isLoading}
		{autoRenamingChatId}
		on:newChat={handleNewChat}
		on:selectChat={handleSelectChat}
		on:deleteChat={handleDeleteChat}
		on:renameChat={handleRenameChat}
		on:regenerateTitle={handleRegenerateTitle}
	/>

	<!-- Main Chat Area -->
	<div class="flex flex-1 flex-col">
		<!-- Status Bar -->
		<StatusBar />

		<!-- PWA Status bar -->
		<div class="border-b border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
			<PWAStatus onConfigureApi={() => (showApiConfig = true)} />
		</div>
		{#if chatStore.error}
			<div
				class="m-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/30"
			>
				<div class="flex items-center gap-2">
					<span class="text-red-500">⚠️</span>
					<span class="font-medium text-red-800 dark:text-red-200">Error</span>
				</div>
				<p class="mt-1 text-red-700 dark:text-red-300">{chatStore.error}</p>
				<button
					class="mt-2 rounded bg-red-100 px-3 py-1 text-sm text-red-800 hover:bg-red-200 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700"
					onclick={() => chatStore.clearError()}
				>
					Dismiss
				</button>
			</div>
		{/if}

		{#if !chatStore.currentChat}
			<!-- Welcome Screen -->
			<div class="flex flex-1 items-center justify-center p-8">
				<div class="max-w-2xl text-center">
					<h1
						class="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-4xl font-bold text-transparent"
					>
						AI Tool Chat
					</h1>
					<p class="mb-8 text-xl text-gray-600 dark:text-gray-400">
						Chat with AI and use powerful tools to enhance your conversations
					</p>

					<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
						<div
							class="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-700 dark:bg-blue-900/30"
						>
							<div class="mb-2 text-2xl">🌤️</div>
							<h3 class="mb-2 font-semibold">Weather Tool</h3>
							<p class="text-sm text-gray-600 dark:text-gray-400">
								Get current weather information for any location
							</p>
						</div>

						<div
							class="rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-700 dark:bg-green-900/30"
						>
							<div class="mb-2 text-2xl">🧮</div>
							<h3 class="mb-2 font-semibold">Calculator</h3>
							<p class="text-sm text-gray-600 dark:text-gray-400">
								Perform mathematical calculations and computations
							</p>
						</div>

						<div
							class="rounded-lg border border-purple-200 bg-purple-50 p-6 dark:border-purple-700 dark:bg-purple-900/30"
						>
							<div class="mb-2 text-2xl">🕐</div>
							<h3 class="mb-2 font-semibold">Time Tool</h3>
							<p class="text-sm text-gray-600 dark:text-gray-400">
								Get current time for any timezone
							</p>
						</div>

						<div
							class="rounded-lg border border-orange-200 bg-orange-50 p-6 dark:border-orange-700 dark:bg-orange-900/30"
						>
							<div class="mb-2 text-2xl">🎲</div>
							<h3 class="mb-2 font-semibold">Random Tool</h3>
							<p class="text-sm text-gray-600 dark:text-gray-400">
								Generate random numbers or pick from choices
							</p>
						</div>
					</div>

					<div class="space-y-4">
						<button
							onclick={handleNewChat}
							disabled={chatStore.isLoading}
							class="rounded-lg bg-blue-600 px-8 py-4 text-lg
								   font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed
								   disabled:bg-gray-400"
						>
							Start Your First Chat
						</button>

						{#if serverAvailable === null}
							<div
								class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/30"
							>
								<div class="flex items-center gap-2">
									<div
										class="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
									></div>
									<span class="text-sm text-blue-800 dark:text-blue-200">
										Checking server availability...
									</span>
								</div>
							</div>
						{:else if serverAvailable}
							<div
								class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-700 dark:bg-green-900/30"
							>
								<div class="mb-2 flex items-center gap-2">
									<span class="text-green-600 dark:text-green-400">🚀</span>
									<span class="font-medium text-green-800 dark:text-green-200"
										>Server AI Available</span
									>
								</div>
								<p class="text-sm text-green-700 dark:text-green-300">
									You can start chatting immediately! The server has AI capabilities built-in.
								</p>
							</div>
						{:else if !apiKeyStore.isConfigured && serverAvailable === false}
							<div
								class="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/30"
							>
								<div class="mb-2 flex items-center gap-2">
									<span class="text-yellow-600 dark:text-yellow-400">⚠️</span>
									<span class="font-medium text-yellow-800 dark:text-yellow-200"
										>API Key Required</span
									>
								</div>
								<p class="mb-3 text-sm text-yellow-700 dark:text-yellow-300">
									Server AI is unavailable. Configure your own API key to chat with AI. Your key is
									stored locally and never sent to our servers.
								</p>
								<button
									onclick={() => (showApiConfig = true)}
									class="rounded bg-yellow-600 px-4 py-2 text-sm text-white hover:bg-yellow-700"
								>
									Configure API Key
								</button>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<!-- Chat Header -->
			<div class="border-b border-gray-200 p-4 dark:border-gray-700">
				<h2 class="truncate text-lg font-semibold">{chatStore.currentChat.title}</h2>
				<p class="text-sm text-gray-500 dark:text-gray-400">
					{chatStore.currentChat.messages.length} messages
				</p>
			</div>

			<!-- Messages -->
			<div bind:this={messagesContainer} class="flex-1 space-y-4 overflow-y-auto p-4">
				{#if chatStore.currentChat.messages.length === 0}
					<div class="py-12 text-center text-gray-500 dark:text-gray-400">
						<div class="mb-4 text-4xl">💬</div>
						<p>Start a conversation by typing a message below.</p>
						<p class="mt-2 text-sm">
							You can ask questions, request calculations, check the weather, and more!
						</p>
					</div>
				{:else}
					{#each chatStore.currentChat.messages as message (message.id)}
						<ChatMessageComponent
							{message}
							isStreaming={isStreaming && streamingMessageId === message.id}
						/>
					{/each}
				{/if}
			</div>

			<!-- Input -->
			<ChatInput
				disabled={isStreaming}
				placeholder={isStreaming ? 'AI is thinking...' : 'Type a message...'}
				on:submit={handleSubmitMessage}
			/>
		{/if}
	</div>
</div>

<!-- API Configuration Modal -->
{#if showApiConfig}
	<ApiKeyConfig isOpen={showApiConfig} onClose={() => (showApiConfig = false)} />
{/if}

<!-- PWA Install Prompt -->
{#if showPwaPrompt}
	<PWAInstallPrompt isOpen={showPwaPrompt} onClose={() => (showPwaPrompt = false)} />
{/if}

<!-- Debug Interface -->
<DebugInterface />
