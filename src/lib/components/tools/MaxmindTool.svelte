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
		<!-- Location Information -->
		{#if data.location}
			<div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
				<h4 class="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">📍 Location</h4>
				<div class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
					{#if data.location.city !== 'Unknown'}
						<div>🏙️ City: <strong>{data.location.city}</strong></div>
					{/if}
					{#if data.location.state}
						<div>🗺️ State: <strong>{data.location.state} ({data.location.state_code})</strong></div>
					{/if}
					<div>
						🏳️ Country: <strong>{data.location.country} ({data.location.country_code})</strong>
					</div>
					<div>🌎 Continent: <strong>{data.location.continent}</strong></div>
					{#if data.location.coordinates}
						<div class="sm:col-span-2">
							📍 Coordinates: <strong>{data.location.coordinates}</strong>
						</div>
					{/if}
					{#if data.location.postal_code}
						<div>📮 Postal: <strong>{data.location.postal_code}</strong></div>
					{/if}
					{#if data.location.timezone}
						<div>🕐 Timezone: <strong>{data.location.timezone}</strong></div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Network Information -->
		{#if data.network}
			<div class="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
				<h4 class="mb-2 text-sm font-semibold text-blue-700 dark:text-blue-300">🌐 Network</h4>
				<div class="grid grid-cols-1 gap-2 text-sm">
					{#if data.network.isp}
						<div>🏢 ISP: <strong>{data.network.isp}</strong></div>
					{/if}
					{#if data.network.organization}
						<div>🏛️ Organization: <strong>{data.network.organization}</strong></div>
					{/if}
					{#if data.network.connection_type}
						<div>📡 Connection: <strong>{data.network.connection_type}</strong></div>
					{/if}
					{#if data.network.domain}
						<div>🌐 Domain: <strong>{data.network.domain}</strong></div>
					{/if}
					{#if data.network.autonomous_system_number}
						<div>🔢 ASN: <strong>{data.network.autonomous_system_number}</strong></div>
					{/if}
					{#if data.network.autonomous_system_organization}
						<div class="text-xs text-gray-600 dark:text-gray-400">
							AS Org: {data.network.autonomous_system_organization}
						</div>
					{/if}
					{#if data.network.network}
						<div class="text-xs text-gray-600 dark:text-gray-400">
							Network: {data.network.network}
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Security Information -->
		{#if data.security && (data.security.is_anonymous || data.security.is_anonymous_vpn || data.security.is_hosting_provider || data.security.is_public_proxy || data.security.is_residential_proxy || data.security.is_tor_exit_node || data.security.user_type)}
			<div class="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
				<h4 class="mb-2 text-sm font-semibold text-red-700 dark:text-red-300">
					🔒 Security Traits
				</h4>
				<div class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
					{#if data.security.is_anonymous}
						<div class="text-red-600 dark:text-red-400">⚠️ Anonymous network</div>
					{/if}
					{#if data.security.is_anonymous_vpn}
						<div class="text-red-600 dark:text-red-400">🔐 Anonymous VPN</div>
					{/if}
					{#if data.security.is_hosting_provider}
						<div class="text-yellow-600 dark:text-yellow-400">🏗️ Hosting provider</div>
					{/if}
					{#if data.security.is_public_proxy}
						<div class="text-red-600 dark:text-red-400">🔄 Public proxy</div>
					{/if}
					{#if data.security.is_residential_proxy}
						<div class="text-orange-600 dark:text-orange-400">🏠 Residential proxy</div>
					{/if}
					{#if data.security.is_tor_exit_node}
						<div class="text-red-600 dark:text-red-400">🧅 Tor exit node</div>
					{/if}
					{#if data.security.user_type}
						<div>👤 User type: <strong>{data.security.user_type}</strong></div>
					{/if}
					{#if data.security.static_ip_score !== undefined}
						<div>📊 Static IP score: <strong>{data.security.static_ip_score}</strong></div>
					{/if}
					{#if data.security.user_count !== undefined}
						<div>👥 User count: <strong>{data.security.user_count}</strong></div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Mobile Information -->
		{#if data.mobile}
			<div class="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
				<h4 class="mb-2 text-sm font-semibold text-green-700 dark:text-green-300">📱 Mobile</h4>
				<div class="grid grid-cols-2 gap-2 text-sm">
					<div>🌐 MCC: <strong>{data.mobile.country_code}</strong></div>
					<div>📡 MNC: <strong>{data.mobile.network_code}</strong></div>
				</div>
			</div>
		{/if}

		<!-- Confidence Scores -->
		{#if data.confidence && (data.confidence.city || data.confidence.country || data.confidence.postal || data.confidence.subdivision)}
			<div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
				<h4 class="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">📊 Confidence</h4>
				<div class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
					{#if data.confidence.city}
						<div>🏙️ City: <strong>{data.confidence.city}%</strong></div>
					{/if}
					{#if data.confidence.country}
						<div>🏳️ Country: <strong>{data.confidence.country}%</strong></div>
					{/if}
					{#if data.confidence.postal}
						<div>📮 Postal: <strong>{data.confidence.postal}%</strong></div>
					{/if}
					{#if data.confidence.subdivision}
						<div>🗺️ State: <strong>{data.confidence.subdivision}%</strong></div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Footer Information -->
		<div
			class="flex items-center justify-between border-t border-gray-200 pt-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400"
		>
			<span>Updated: {new Date(data.timestamp).toLocaleString()}</span>
			{#if data.queries_remaining}
				<span>Queries remaining: {data.queries_remaining}</span>
			{/if}
		</div>
	</div>
</ToolResultCard>
