<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { nanoid } from 'nanoid';
	import { parseDataStreamPart } from 'ai';
	import type { ChatMessage, ToolInvocation } from '../../app.d.ts';
	import { chatStore } from '$lib/stores/chat-store.svelte.js';
	import { debugStore } from '$lib/stores/debug-store.svelte.js';
	import { providerStore } from '$lib/stores/provider-store.svelte.js';
	import { networkStore } from '$lib/stores/network-store.svelte.js';
	import { offlineQueueStore } from '$lib/stores/offline-queue-store.svelte.js';
	import { notificationStore } from '$lib/stores/notification-store.svelte.js';
	import { clientChatService } from '$lib/services/client-chat.js';
	import ChatSidebar from './ChatSidebar.svelte';
	import ArchivedChats from './ArchivedChats.svelte';
	import ChatMessageComponent from './ChatMessage.svelte';
	import ChatInput from './ChatInput.svelte';
	import DebugInterface from './DebugInterface.svelte';
	import ApiKeyConfig from './ApiKeyConfig.svelte';
	import StatusBar from './StatusBar.svelte';
	import ModelSelector from './ModelSelector.svelte';
	import { mobileStore } from '$lib/stores/mobile-store.svelte.js';

	import PWAInstallPrompt from './PWAInstallPrompt.svelte';

	let isStreaming = $state(false);
	let streamingMessageId = $state<string | null>(null);
	let autoRenamingChatId = $state<string | null>(null);
	let messagesContainer: HTMLDivElement | undefined = $state();
	let chatInputComponent: ChatInput | undefined = $state();
	let showApiConfig = $state(false);
	let showPwaPrompt = $state(false);
	let sidebarMode = $state<'chats' | 'archived'>('chats');
	let showMobileModelSelector = $state(false);

	let editingTitle = $state(false);
	let titleInput = $state('');

	// Track when title should flash after rename
	let titleFlashing = $derived(chatStore.titleFlashChatId === chatStore.currentChat?.id);

	// Per-chat provider and model selection - synced with providerStore
	let currentProvider = $state<import('$lib/providers').ProviderId>(providerStore.currentProvider);
	let currentModel = $state(providerStore.currentModel);

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

		// Don't automatically show API config modal - let user click the button when needed

		// Listen for network events to process offline queue
		window.addEventListener('network-online', () => {
			if (providerStore.isConfigured) {
				offlineQueueStore.processQueue();
			}
		});
	});

	async function handleNewChat() {
		try {
			// Check if the current chat is empty (no messages)
			const currentChat = chatStore.currentChat;
			if (currentChat && currentChat.messages.length === 0) {
				// If current chat is empty, just focus the input instead of creating a new chat
				chatInputComponent?.focus();
				return;
			}

			await chatStore.createChat();

			// Set provider and model on the new chat
			if (chatStore.currentChat) {
				const updatedChat = {
					...chatStore.currentChat,
					provider: currentProvider,
					model: currentModel
				};
				await chatStore.updateChat(updatedChat);
			}

			// Focus the input after creating a new chat
			setTimeout(() => {
				chatInputComponent?.focus();
			}, 100);
		} catch (error) {
			console.error('Failed to create new chat:', error);
		}
	}

	async function handleSelectChat(event: CustomEvent<{ chatId: string }>) {
		await chatStore.selectChat(event.detail.chatId);
	}

	// Sync provider and model when current chat changes
	$effect(() => {
		if (chatStore.currentChat) {
			currentProvider = chatStore.currentChat.provider || 'groq';
			currentModel = chatStore.currentChat.model || 'llama-3.3-70b-versatile';
		}
	});

	async function handleArchiveChat(event: CustomEvent<{ chatId: string }>) {
		try {
			await chatStore.archiveChat(event.detail.chatId);
		} catch (error) {
			console.error('Failed to archive chat:', error);
		}
	}

	async function handleUnarchiveChat(event: CustomEvent<{ chatId: string }>) {
		try {
			await chatStore.unarchiveChat(event.detail.chatId);
			// Switch back to main chats view after unarchiving
			sidebarMode = 'chats';
		} catch (error) {
			console.error('Failed to unarchive chat:', error);
		}
	}

	async function handleDeleteChat(event: CustomEvent<{ chatId: string }>) {
		try {
			await chatStore.deleteChat(event.detail.chatId);
		} catch (error) {
			console.error('Failed to delete chat:', error);
		}
	}

	async function handleSelectArchivedChat(event: CustomEvent<{ chatId: string }>) {
		try {
			// First unarchive the chat
			await chatStore.unarchiveChat(event.detail.chatId);
			// Then select it
			await chatStore.selectChat(event.detail.chatId);
			// Switch to main chats view
			sidebarMode = 'chats';
		} catch (error) {
			console.error('Failed to select archived chat:', error);
		}
	}

	async function handleRenameChat(event: CustomEvent<{ chatId: string; title: string }>) {
		try {
			await chatStore.updateChatTitle(event.detail.chatId, event.detail.title);
		} catch (error) {
			console.error('Failed to rename chat:', error);
		}
	}

	function startEditingTitle() {
		if (!chatStore.currentChat) return;
		editingTitle = true;
		titleInput = chatStore.currentChat.title;
	}

	async function saveTitle() {
		if (!chatStore.currentChat || !titleInput.trim()) {
			cancelTitleEdit();
			return;
		}

		try {
			await chatStore.updateChatTitle(chatStore.currentChat.id, titleInput.trim());
			editingTitle = false;
		} catch (error) {
			console.error('Failed to save title:', error);
		}
	}

	function cancelTitleEdit() {
		editingTitle = false;
		titleInput = '';
	}

	function handleTitleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			saveTitle();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelTitleEdit();
		}
	}

	async function handleRegenerateTitleFromHeader() {
		if (!chatStore.currentChat) return;

		// Check if we can send messages (handles both server and client-side requirements)
		if (!clientChatService.canSendMessages()) {
			showApiConfig = true;
			return;
		}

		try {
			autoRenamingChatId = chatStore.currentChat.id;
			await chatStore.autoRenameChat(chatStore.currentChat.id, true);
		} catch (error) {
			console.error('Failed to regenerate title:', error);
			if (error instanceof Error && error.message === 'API_KEY_MISSING') {
				showApiConfig = true;
			} else {
				notificationStore.error('Failed to regenerate title. Please try again.');
			}
		} finally {
			autoRenamingChatId = null;
		}
	}

	async function handleSubmitMessage(
		event: CustomEvent<{ message: string; provider: string; model: string }>
	) {
		const messageText = event.detail.message;
		const selectedProvider = event.detail.provider as import('$lib/providers').ProviderId;
		const selectedModel = event.detail.model;

		if (!chatStore.currentChatId) {
			await chatStore.createChat();
		}

		// Update current chat with selected provider and model
		if (chatStore.currentChat && chatStore.currentChatId) {
			const updatedChat = {
				...chatStore.currentChat,
				provider: selectedProvider,
				model: selectedModel
			};
			await chatStore.updateChat(updatedChat);

			// Update local state to match
			currentProvider = selectedProvider;
			currentModel = selectedModel;
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

			// Use client-side chat service with selected provider and model
			const response = await clientChatService.sendMessage(
				messages,
				selectedProvider,
				selectedModel
			);

			if (!response.success) {
				throw new Error(response.error || 'Failed to send message');
			}

			if (!response.stream) {
				throw new Error('No response stream');
			}

			const reader = response.stream.getReader();
			let accumulatedContent = '';
			const accumulatedToolInvocations: ToolInvocation[] = [];
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
								const toolCall: ToolInvocation = {
									toolCallId: part.value.toolCallId,
									toolName: part.value.toolName,
									args: part.value.args,
									state: 'running'
								};
								accumulatedToolInvocations.push(toolCall);
							} else if (part.type === 'tool_result') {
								const toolIndex = accumulatedToolInvocations.findIndex(
									(tool) => tool.toolCallId === part.value.toolCallId
								);
								if (toolIndex !== -1) {
									accumulatedToolInvocations[toolIndex] = {
										...accumulatedToolInvocations[toolIndex],
										result: {
											success: true,
											data: part.value.result,
											metadata: {
												executionTime: 0,
												timestamp: new Date().toISOString(),
												toolName: accumulatedToolInvocations[toolIndex].toolName
											}
										},
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
									const toolCallData: ToolInvocation = {
										toolCallId: toolCall.toolCallId,
										toolName: toolCall.toolName,
										args: toolCall.args as Record<string, unknown>,
										state: 'running'
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
											result: {
												success: true,
												data: toolResult.result,
												metadata: {
													executionTime: 0,
													timestamp: new Date().toISOString(),
													toolName: accumulatedToolInvocations[toolIndex].toolName
												}
											},
											state: 'result'
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
							toolInvocations: accumulatedToolInvocations
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

				// Log the final response
				if (accumulatedContent) {
					debugStore.logFinalResponse(accumulatedContent, {
						chatId: chatStore.currentChatId,
						messageId: assistantMessageId,
						wordCount: accumulatedContent.split(/\s+/).length,
						toolInvocations: accumulatedToolInvocations.length
					});
				}

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

<div class="flex h-full overflow-hidden bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
	<!-- Mobile Sidebar Overlay -->
	{#if mobileStore.sidebarVisible}
		<div
			class="bg-opacity-50 fixed inset-0 z-40 bg-black md:hidden"
			onclick={() => mobileStore.closeSidebar()}
			onkeydown={(e) => e.key === 'Escape' && mobileStore.closeSidebar()}
			role="button"
			tabindex="0"
			aria-label="Close sidebar"
			transition:fade={{ duration: 300 }}
		></div>
	{/if}

	<!-- Mobile Sidebar -->
	{#if mobileStore.sidebarVisible}
		<div
			class="fixed top-0 left-0 z-50 flex h-full w-80 flex-col border-r border-gray-200 bg-gray-50 md:hidden dark:border-gray-700 dark:bg-gray-900"
			transition:fly={{ x: -320, duration: 300 }}
		>
			<!-- Sidebar Navigation -->
			<div class="border-b border-gray-200 p-2 dark:border-gray-700">
				<div class="flex rounded-lg bg-gray-200 p-1 dark:bg-gray-800">
					<button
						onclick={() => (sidebarMode = 'chats')}
						class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors {sidebarMode ===
						'chats'
							? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
							: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}"
					>
						Chats ({chatStore.chats.length})
					</button>
					<button
						onclick={() => (sidebarMode = 'archived')}
						class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors {sidebarMode ===
						'archived'
							? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
							: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}"
					>
						Archived ({chatStore.archivedChats.length})
					</button>
				</div>
			</div>

			<!-- Sidebar Content -->
			<div class="flex-1 overflow-hidden">
				{#if sidebarMode === 'chats'}
					<ChatSidebar
						chats={chatStore.chats}
						currentChatId={chatStore.currentChatId}
						isLoading={chatStore.isLoading}
						{autoRenamingChatId}
						on:newChat={handleNewChat}
						on:selectChat={handleSelectChat}
						on:archiveChat={handleArchiveChat}
						on:renameChat={handleRenameChat}
						on:closeDesktopSidebar={() => mobileStore.closeDesktopSidebar()}
					/>
				{:else}
					<ArchivedChats
						archivedChats={chatStore.archivedChats}
						isLoading={chatStore.isLoading}
						on:unarchiveChat={handleUnarchiveChat}
						on:deleteChat={handleDeleteChat}
						on:selectChat={handleSelectArchivedChat}
					/>
				{/if}
			</div>

			<!-- Footer -->
			<div class="border-t border-gray-200 p-4 text-center dark:border-gray-700">
				<p class="text-xs text-gray-500 dark:text-gray-400">AI Tool Chat v1.0</p>
			</div>
		</div>
	{/if}

	<!-- Desktop Sidebar -->
	{#if mobileStore.desktopSidebarVisible}
		<div
			class="hidden w-80 flex-col border-r border-gray-200 bg-gray-50 md:flex dark:border-gray-700 dark:bg-gray-900"
		>
			<!-- Sidebar Navigation -->
			<div class="border-b border-gray-200 p-2 dark:border-gray-700">
				<div class="flex rounded-lg bg-gray-200 p-1 dark:bg-gray-800">
					<button
						onclick={() => (sidebarMode = 'chats')}
						class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors {sidebarMode ===
						'chats'
							? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
							: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}"
					>
						Chats ({chatStore.chats.length})
					</button>
					<button
						onclick={() => (sidebarMode = 'archived')}
						class="flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors {sidebarMode ===
						'archived'
							? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
							: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}"
					>
						Archived ({chatStore.archivedChats.length})
					</button>
				</div>
			</div>

			<!-- Sidebar Content -->
			<div class="flex-1 overflow-hidden">
				{#if sidebarMode === 'chats'}
					<ChatSidebar
						chats={chatStore.chats}
						currentChatId={chatStore.currentChatId}
						isLoading={chatStore.isLoading}
						{autoRenamingChatId}
						on:newChat={handleNewChat}
						on:selectChat={handleSelectChat}
						on:archiveChat={handleArchiveChat}
						on:renameChat={handleRenameChat}
						on:closeDesktopSidebar={() => mobileStore.closeDesktopSidebar()}
					/>
				{:else}
					<ArchivedChats
						archivedChats={chatStore.archivedChats}
						isLoading={chatStore.isLoading}
						on:unarchiveChat={handleUnarchiveChat}
						on:deleteChat={handleDeleteChat}
						on:selectChat={handleSelectArchivedChat}
					/>
				{/if}
			</div>

			<!-- Footer -->
			<div class="border-t border-gray-200 p-4 text-center dark:border-gray-700">
				<p class="text-xs text-gray-500 dark:text-gray-400">AI Tool Chat v1.0</p>
			</div>
		</div>
	{/if}

	<div class="relative flex min-w-0 flex-1 flex-col overflow-hidden">
		<!-- Desktop Sidebar Toggle Button (when sidebar is hidden) -->
		{#if !mobileStore.desktopSidebarVisible}
			<button
				class="fixed top-2 left-2 z-10 hidden rounded-md bg-white p-2 shadow-md hover:bg-gray-50 md:flex md:items-center md:gap-2 dark:bg-gray-800 dark:hover:bg-gray-700"
				onclick={() => mobileStore.openDesktopSidebar()}
				aria-label="Show sidebar"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"
					></path>
				</svg>
				<span class="text-sm">Show Sidebar</span>
			</button>
		{/if}
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
			<div
				class="flex flex-1 items-center justify-center p-8 {!mobileStore.desktopSidebarVisible
					? 'md:pt-16'
					: ''}"
			>
				<div class="max-w-2xl px-4 text-center md:px-0">
					<h1
						class="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-2xl font-bold text-transparent md:text-4xl"
					>
						AI Tool Chat
					</h1>
					<p class="mb-8 text-lg text-gray-600 md:text-xl dark:text-gray-400">
						Chat with AI and use powerful tools to get things done
					</p>

					<div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
						>
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
					</div>
				</div>
			</div>
		{:else}
			<!-- StatusBar with model selector -->
			<StatusBar
				provider={currentProvider}
				model={currentModel}
				onProviderChange={(provider) => {
					currentProvider = provider;
					providerStore.setProvider(provider);
				}}
				onModelChange={(model) => {
					currentModel = model;
					providerStore.setModel(model);
				}}
				disabled={isStreaming}
			/>

			<!-- Chat Header -->
			<div
				class="border-b border-gray-200 p-4 dark:border-gray-700 {!mobileStore.desktopSidebarVisible
					? 'md:pt-16'
					: ''}"
			>
				<div class="flex items-center justify-between">
					<div class="min-w-0 flex-1">
						{#if editingTitle}
							<input
								bind:value={titleInput}
								onkeydown={handleTitleKeydown}
								onblur={saveTitle}
								class="w-full max-w-md rounded border border-gray-300 bg-white px-2 py-1 text-base font-semibold focus:border-transparent focus:ring-2 focus:ring-blue-500 md:text-lg dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
								placeholder="Chat title"
							/>
						{:else}
							<div class="flex items-center gap-2">
								<h2
									class="truncate text-base font-semibold transition-all duration-300 ease-in-out md:text-lg {titleFlashing
										? 'bg-gradient-to-r from-blue-100 to-green-100 dark:from-blue-900/30 dark:to-green-900/30'
										: ''}"
									class:rounded-sm={titleFlashing}
								>
									{chatStore.currentChat.title}
								</h2>
								{#if autoRenamingChatId === chatStore.currentChat.id}
									<div
										class="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400"
										title="Auto-generating title..."
									>
										<svg class="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
											<circle
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												stroke-width="4"
												class="opacity-25"
											></circle>
											<path
												class="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										<span>Renaming...</span>
									</div>
								{:else}
									<div class="flex items-center gap-1">
										<button
											onclick={startEditingTitle}
											class="rounded p-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
											title="Edit title"
											aria-label="Edit title"
										>
											<svg
												width="14"
												height="14"
												viewBox="0 0 24 24"
												fill="none"
												xmlns="http://www.w3.org/2000/svg"
											>
												<path
													d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												/>
												<path
													d="M18.5 2.50023C18.8978 2.1024 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.1024 21.5 2.50023C21.8978 2.89805 22.1215 3.43762 22.1215 4.00023C22.1215 4.56284 21.8978 5.1024 21.5 5.50023L12 15.0002L8 16.0002L9 12.0002L18.5 2.50023Z"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												/>
											</svg>
										</button>

										{#if chatStore.currentChat.messages.length >= 2}
											<button
												onclick={handleRegenerateTitleFromHeader}
												class="rounded p-1 text-gray-400 transition-colors hover:text-blue-500 dark:hover:text-blue-400"
												title="Regenerate title with AI"
												aria-label="Regenerate title with AI"
											>
												<svg
													width="14"
													height="14"
													viewBox="0 0 24 24"
													fill="none"
													xmlns="http://www.w3.org/2000/svg"
												>
													<path
														d="M1 4V10H7"
														stroke="currentColor"
														stroke-width="2"
														stroke-linecap="round"
														stroke-linejoin="round"
													/>
													<path
														d="M23 20V14H17"
														stroke="currentColor"
														stroke-width="2"
														stroke-linecap="round"
														stroke-linejoin="round"
													/>
													<path
														d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15"
														stroke="currentColor"
														stroke-width="2"
														stroke-linecap="round"
														stroke-linejoin="round"
													/>
												</svg>
											</button>
										{/if}
									</div>
								{/if}
							</div>
						{/if}
						<div class="flex items-center gap-3">
							<p class="text-xs text-gray-500 md:text-sm dark:text-gray-400">
								{chatStore.currentChat.messages.length} messages
							</p>
							<div class="relative md:hidden">
								<button
									onclick={() => (showMobileModelSelector = !showMobileModelSelector)}
									class="flex shrink-0 items-center gap-1 px-1 py-0.5 text-xs transition-colors hover:text-blue-600 dark:hover:text-blue-400"
									title="Select AI model"
								>
									<span class="truncate text-gray-600 dark:text-gray-300">
										{providerStore.getProviderDisplayName(currentProvider)}
									</span>
									<span class="text-gray-400 dark:text-gray-500">·</span>
									<span class="truncate text-gray-800 dark:text-gray-200">
										{providerStore.getModelDisplayName(currentProvider, currentModel)}
									</span>
									<svg
										class="ml-1 h-3 w-3 shrink-0 transform transition-transform {showMobileModelSelector
											? 'rotate-180'
											: ''}"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19 9l-7 7-7-7"
										></path>
									</svg>
								</button>
								{#if showMobileModelSelector}
									<div
										class="absolute top-full right-0 z-10 mt-1 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-600 dark:bg-gray-800"
									>
										<ModelSelector
											provider={currentProvider}
											model={currentModel}
											onProviderChange={(newProvider) => {
												currentProvider = newProvider;
												providerStore.setProvider(newProvider);
											}}
											onModelChange={(newModel) => {
												currentModel = newModel;
												providerStore.setModel(newModel);
											}}
											disabled={isStreaming}
											compact={true}
										/>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Mobile Model Selector (Collapsible) -->

			<!-- Messages -->
			<div
				bind:this={messagesContainer}
				class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 {!mobileStore.desktopSidebarVisible
					? 'md:pt-16'
					: ''}"
			>
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
				bind:this={chatInputComponent}
				disabled={isStreaming}
				provider={currentProvider}
				model={currentModel}
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
