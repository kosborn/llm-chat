<script lang="ts">
	import type { ToolInvocation } from '../../../app.d.ts';
	import ToolResultCard from '../ToolResultCard.svelte';

	interface Props {
		toolInvocation: ToolInvocation;
		onTechnicalView?: () => void;
	}

	let { toolInvocation, onTechnicalView }: Props = $props();

	let data = $derived(
		toolInvocation.result?.data?.data || toolInvocation.result?.data || toolInvocation.result
	);
</script>

<ToolResultCard
	{toolInvocation}
	{onTechnicalView}
	title="IP Geolocation for {data.ip}"
	emoji="🌍"
	variant="purple"
>
	<div class="space-y-4">
		<!-- Header with IP and main location info -->
		<div
			class="rounded-lg border border-purple-100 bg-gradient-to-r from-purple-50 to-blue-50 p-3 dark:border-purple-800 dark:from-purple-900/20 dark:to-blue-900/20"
		>
			<div class="mb-2 flex items-center justify-between">
				<h3 class="text-base font-bold text-purple-900 dark:text-purple-100">🌐 {data.ip}</h3>
				{#if data.queries_remaining}
					<span
						class="rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-700 dark:bg-purple-800 dark:text-purple-300"
					>
						{data.queries_remaining} left
					</span>
				{/if}
			</div>

			{#if data.location}
				<div class="flex flex-wrap items-center gap-1 text-xs">
					{#if data.location.city !== 'Unknown'}
						<span class="rounded-full bg-white px-2 py-1 dark:bg-gray-800">
							🏙️ {data.location.city}
						</span>
					{/if}
					{#if data.location.state}
						<span class="rounded-full bg-white px-2 py-1 dark:bg-gray-800">
							🗺️ {data.location.state}
						</span>
					{/if}
					<span class="rounded-full bg-white px-2 py-1 dark:bg-gray-800">
						🏳️ {data.location.country}
					</span>
					{#if data.location.timezone}
						<span class="rounded-full bg-white px-2 py-1 dark:bg-gray-800">
							🕐 {data.location.timezone}
						</span>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Network Details -->
		{#if data.network}
			<div
				class="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20"
			>
				<h4 class="mb-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
					🌐 Network Information
				</h4>
				<div class="grid grid-cols-1 gap-x-12 gap-y-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
					{#if data.network.isp}
						<div class="flex items-center gap-3">
							<span class="w-12 font-medium text-blue-600 dark:text-blue-400">ISP:</span>
							<span class="font-semibold">{data.network.isp}</span>
						</div>
					{/if}
					{#if data.network.organization}
						<div class="flex items-center gap-3">
							<span class="w-12 font-medium text-blue-600 dark:text-blue-400">Org:</span>
							<span class="font-semibold">{data.network.organization}</span>
						</div>
					{/if}
					{#if data.network.connection_type}
						<div class="flex items-center gap-3">
							<span class="w-12 font-medium text-blue-600 dark:text-blue-400">Type:</span>
							<span class="capitalize">{data.network.connection_type}</span>
						</div>
					{/if}
					{#if data.network.domain}
						<div class="flex items-center gap-3">
							<span class="w-16 font-medium text-blue-600 dark:text-blue-400">Domain:</span>
							<span class="font-mono">{data.network.domain}</span>
						</div>
					{/if}
					{#if data.network.autonomous_system_number}
						<div class="flex items-center gap-3">
							<span class="w-12 font-medium text-blue-600 dark:text-blue-400">ASN:</span>
							<a
								href="https://search.arin.net/rdap/?searchFilter=asn&query={data.network
									.autonomous_system_number}"
								target="_blank"
								rel="noopener noreferrer"
								class="font-mono text-blue-600 hover:underline dark:text-blue-400"
							>
								{data.network.autonomous_system_number}
							</a>
						</div>
					{/if}
					{#if data.network.autonomous_system_organization}
						<div class="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
							<span class="w-16 font-medium text-blue-600 dark:text-blue-400">AS Org:</span>
							<span class="text-xs">{data.network.autonomous_system_organization}</span>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Security & Additional Info -->
		{#if data.security && (data.security.is_anonymous || data.security.is_anonymous_vpn || data.security.is_hosting_provider || data.security.is_public_proxy || data.security.is_residential_proxy || data.security.is_tor_exit_node || data.security.user_type)}
			<div
				class="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
			>
				<h4 class="mb-2 text-xs font-semibold text-red-700 dark:text-red-300">🔒 Security Flags</h4>
				<div class="flex flex-wrap gap-1 text-xs">
					{#if data.security.is_anonymous}
						<span
							class="rounded bg-red-100 px-2 py-1 text-red-700 dark:bg-red-900/40 dark:text-red-300"
							>⚠️ Anonymous</span
						>
					{/if}
					{#if data.security.is_anonymous_vpn}
						<span
							class="rounded bg-red-100 px-2 py-1 text-red-700 dark:bg-red-900/40 dark:text-red-300"
							>🔐 VPN</span
						>
					{/if}
					{#if data.security.is_hosting_provider}
						<span
							class="rounded bg-yellow-100 px-2 py-1 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
							>🏗️ Hosting</span
						>
					{/if}
					{#if data.security.is_public_proxy}
						<span
							class="rounded bg-red-100 px-2 py-1 text-red-700 dark:bg-red-900/40 dark:text-red-300"
							>🔄 Proxy</span
						>
					{/if}
					{#if data.security.is_residential_proxy}
						<span
							class="rounded bg-orange-100 px-2 py-1 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
							>🏠 Residential</span
						>
					{/if}
					{#if data.security.is_tor_exit_node}
						<span
							class="rounded bg-red-100 px-2 py-1 text-red-700 dark:bg-red-900/40 dark:text-red-300"
							>🧅 Tor</span
						>
					{/if}
				</div>
				{#if data.security.user_type}
					<div class="mt-2 text-xs">
						<span class="text-red-600 dark:text-red-400">Type: </span>
						<span class="font-semibold capitalize">{data.security.user_type}</span>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Mobile Info -->
		{#if data.mobile}
			<div
				class="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20"
			>
				<h4 class="mb-2 text-xs font-semibold text-green-700 dark:text-green-300">
					📱 Mobile Network
				</h4>
				<div class="flex gap-6 text-xs">
					<div class="flex gap-2">
						<span class="text-green-600 dark:text-green-400">MCC:</span>
						<span class="font-mono font-bold">{data.mobile.country_code}</span>
					</div>
					<div class="flex gap-2">
						<span class="text-green-600 dark:text-green-400">MNC:</span>
						<span class="font-mono font-bold">{data.mobile.network_code}</span>
					</div>
				</div>
			</div>
		{/if}

		<!-- Footer -->
		<div
			class="rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800"
		>
			<div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
				<span>Updated: {new Date(data.timestamp).toLocaleString()}</span>
				{#if data.queries_remaining}
					<span>⚡ {data.queries_remaining} remaining</span>
				{/if}
			</div>
		</div>
	</div>
</ToolResultCard>
