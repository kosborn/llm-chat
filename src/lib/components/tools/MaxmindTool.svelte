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
	<div class="space-y-6">
		<!-- Header with IP and main location info -->
		<div class="rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 p-4 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-100 dark:border-purple-800">
			<div class="flex items-center justify-between mb-3">
				<h3 class="text-lg font-bold text-purple-900 dark:text-purple-100">🌐 {data.ip}</h3>
				{#if data.queries_remaining}
					<span class="text-xs bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
						{data.queries_remaining} queries left
					</span>
				{/if}
			</div>
			
			{#if data.location}
				<div class="flex flex-wrap items-center gap-2 text-sm">
					{#if data.location.city !== 'Unknown'}
						<span class="bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm">
							🏙️ {data.location.city}
						</span>
					{/if}
					{#if data.location.state}
						<span class="bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm">
							🗺️ {data.location.state}
						</span>
					{/if}
					<span class="bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm">
						🏳️ {data.location.country}
					</span>
					{#if data.location.timezone}
						<span class="bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm">
							🕐 {data.location.timezone}
						</span>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Location Details -->
		{#if data.location}
			<div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
				<h4 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
					📍 Location Details
				</h4>
				<div class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
					<div class="space-y-2">
						{#if data.location.country_code}
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">Country Code:</span>
								<span class="font-mono font-semibold">{data.location.country_code}</span>
							</div>
						{/if}
						{#if data.location.state_code}
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">State Code:</span>
								<span class="font-mono font-semibold">{data.location.state_code}</span>
							</div>
						{/if}
						{#if data.location.postal_code}
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">Postal Code:</span>
								<span class="font-mono font-semibold">{data.location.postal_code}</span>
							</div>
						{/if}
					</div>
					<div class="space-y-2">
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Continent:</span>
							<span class="font-semibold">{data.location.continent}</span>
						</div>
						{#if data.location.coordinates}
							<div class="sm:col-span-2">
								<span class="text-gray-600 dark:text-gray-400">Coordinates:</span>
								<div class="font-mono text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded mt-1">
									{data.location.coordinates}
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Network Information -->
		{#if data.network}
			<div class="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
				<h4 class="mb-3 text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center">
					🌐 Network Information
				</h4>
				<div class="space-y-3">
					{#if data.network.isp || data.network.organization}
						<div class="bg-white dark:bg-blue-900/30 rounded-lg p-3">
							{#if data.network.isp}
								<div class="flex justify-between items-center mb-2">
									<span class="text-blue-600 dark:text-blue-400 font-medium">🏢 Internet Service Provider</span>
									<span class="font-semibold">{data.network.isp}</span>
								</div>
							{/if}
							{#if data.network.organization}
								<div class="flex justify-between items-center">
									<span class="text-blue-600 dark:text-blue-400 font-medium">🏛️ Organization</span>
									<span class="font-semibold">{data.network.organization}</span>
								</div>
							{/if}
						</div>
					{/if}
					
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
						{#if data.network.connection_type}
							<div class="bg-white dark:bg-blue-900/30 rounded-lg p-3">
								<div class="text-blue-600 dark:text-blue-400 font-medium mb-1">📡 Connection Type</div>
								<div class="font-semibold capitalize">{data.network.connection_type}</div>
							</div>
						{/if}
						{#if data.network.domain}
							<div class="bg-white dark:bg-blue-900/30 rounded-lg p-3">
								<div class="text-blue-600 dark:text-blue-400 font-medium mb-1">🌐 Domain</div>
								<div class="font-mono text-xs">{data.network.domain}</div>
							</div>
						{/if}
						{#if data.network.autonomous_system_number}
							<div class="bg-white dark:bg-blue-900/30 rounded-lg p-3">
								<div class="text-blue-600 dark:text-blue-400 font-medium mb-1">🔢 ASN</div>
								<div class="font-mono">{data.network.autonomous_system_number}</div>
							</div>
						{/if}
						{#if data.network.network}
							<div class="bg-white dark:bg-blue-900/30 rounded-lg p-3">
								<div class="text-blue-600 dark:text-blue-400 font-medium mb-1">🔗 Network</div>
								<div class="font-mono text-xs">{data.network.network}</div>
							</div>
						{/if}
					</div>
					
					{#if data.network.autonomous_system_organization}
						<div class="bg-white dark:bg-blue-900/30 rounded-lg p-3">
							<div class="text-blue-600 dark:text-blue-400 font-medium mb-1">🏢 AS Organization</div>
							<div class="text-xs text-gray-600 dark:text-gray-400">
								{data.network.autonomous_system_organization}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Security Information -->
		{#if data.security && (data.security.is_anonymous || data.security.is_anonymous_vpn || data.security.is_hosting_provider || data.security.is_public_proxy || data.security.is_residential_proxy || data.security.is_tor_exit_node || data.security.user_type)}
			<div class="rounded-lg bg-red-50 p-4 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
				<h4 class="mb-3 text-sm font-semibold text-red-700 dark:text-red-300 flex items-center">
					🔒 Security Analysis
				</h4>
				
				<!-- Security Flags -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
					{#if data.security.is_anonymous}
						<div class="bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-lg p-3">
							<div class="flex items-center text-red-700 dark:text-red-300">
								<span class="text-lg mr-2">⚠️</span>
								<span class="font-semibold">Anonymous Network</span>
							</div>
							<div class="text-xs text-red-600 dark:text-red-400 mt-1">This IP is from an anonymous network</div>
						</div>
					{/if}
					{#if data.security.is_anonymous_vpn}
						<div class="bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-lg p-3">
							<div class="flex items-center text-red-700 dark:text-red-300">
								<span class="text-lg mr-2">🔐</span>
								<span class="font-semibold">Anonymous VPN</span>
							</div>
							<div class="text-xs text-red-600 dark:text-red-400 mt-1">Traffic routed through VPN</div>
						</div>
					{/if}
					{#if data.security.is_hosting_provider}
						<div class="bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3">
							<div class="flex items-center text-yellow-700 dark:text-yellow-300">
								<span class="text-lg mr-2">🏗️</span>
								<span class="font-semibold">Hosting Provider</span>
							</div>
							<div class="text-xs text-yellow-600 dark:text-yellow-400 mt-1">IP belongs to a hosting service</div>
						</div>
					{/if}
					{#if data.security.is_public_proxy}
						<div class="bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-lg p-3">
							<div class="flex items-center text-red-700 dark:text-red-300">
								<span class="text-lg mr-2">🔄</span>
								<span class="font-semibold">Public Proxy</span>
							</div>
							<div class="text-xs text-red-600 dark:text-red-400 mt-1">Traffic routed through public proxy</div>
						</div>
					{/if}
					{#if data.security.is_residential_proxy}
						<div class="bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700 rounded-lg p-3">
							<div class="flex items-center text-orange-700 dark:text-orange-300">
								<span class="text-lg mr-2">🏠</span>
								<span class="font-semibold">Residential Proxy</span>
							</div>
							<div class="text-xs text-orange-600 dark:text-orange-400 mt-1">Using residential IP for proxy</div>
						</div>
					{/if}
					{#if data.security.is_tor_exit_node}
						<div class="bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-lg p-3">
							<div class="flex items-center text-red-700 dark:text-red-300">
								<span class="text-lg mr-2">🧅</span>
								<span class="font-semibold">Tor Exit Node</span>
							</div>
							<div class="text-xs text-red-600 dark:text-red-400 mt-1">Traffic exiting through Tor network</div>
						</div>
					{/if}
				</div>
				
				<!-- Additional Security Info -->
				{#if data.security.user_type || data.security.static_ip_score !== undefined || data.security.user_count !== undefined}
					<div class="bg-white dark:bg-red-900/30 rounded-lg p-3 space-y-2">
						{#if data.security.user_type}
							<div class="flex justify-between items-center">
								<span class="text-red-600 dark:text-red-400 font-medium">👤 User Type</span>
								<span class="font-semibold capitalize">{data.security.user_type}</span>
							</div>
						{/if}
						{#if data.security.static_ip_score !== undefined}
							<div class="flex justify-between items-center">
								<span class="text-red-600 dark:text-red-400 font-medium">📊 Static IP Score</span>
								<span class="font-mono">{data.security.static_ip_score}</span>
							</div>
						{/if}
						{#if data.security.user_count !== undefined}
							<div class="flex justify-between items-center">
								<span class="text-red-600 dark:text-red-400 font-medium">👥 User Count</span>
								<span class="font-mono">{data.security.user_count}</span>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Mobile Information -->
		{#if data.mobile}
			<div class="rounded-lg bg-green-50 p-4 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
				<h4 class="mb-3 text-sm font-semibold text-green-700 dark:text-green-300 flex items-center">
					📱 Mobile Network
				</h4>
				<div class="grid grid-cols-2 gap-3">
					<div class="bg-white dark:bg-green-900/30 rounded-lg p-3 text-center">
						<div class="text-green-600 dark:text-green-400 font-medium mb-1">🌐 MCC</div>
						<div class="font-mono font-bold text-lg">{data.mobile.country_code}</div>
						<div class="text-xs text-gray-600 dark:text-gray-400">Mobile Country Code</div>
					</div>
					<div class="bg-white dark:bg-green-900/30 rounded-lg p-3 text-center">
						<div class="text-green-600 dark:text-green-400 font-medium mb-1">📡 MNC</div>
						<div class="font-mono font-bold text-lg">{data.mobile.network_code}</div>
						<div class="text-xs text-gray-600 dark:text-gray-400">Mobile Network Code</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Confidence Scores -->
		{#if data.confidence && (data.confidence.city || data.confidence.country || data.confidence.postal || data.confidence.subdivision)}
			<div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
				<h4 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
					📊 Accuracy Confidence
				</h4>
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{#if data.confidence.city}
						<div class="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
							<div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.confidence.city}%</div>
							<div class="text-xs text-gray-600 dark:text-gray-400 mt-1">🏙️ City</div>
						</div>
					{/if}
					{#if data.confidence.country}
						<div class="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
							<div class="text-2xl font-bold text-green-600 dark:text-green-400">{data.confidence.country}%</div>
							<div class="text-xs text-gray-600 dark:text-gray-400 mt-1">🏳️ Country</div>
						</div>
					{/if}
					{#if data.confidence.postal}
						<div class="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
							<div class="text-2xl font-bold text-purple-600 dark:text-purple-400">{data.confidence.postal}%</div>
							<div class="text-xs text-gray-600 dark:text-gray-400 mt-1">📮 Postal</div>
						</div>
					{/if}
					{#if data.confidence.subdivision}
						<div class="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
							<div class="text-2xl font-bold text-orange-600 dark:text-orange-400">{data.confidence.subdivision}%</div>
							<div class="text-xs text-gray-600 dark:text-gray-400 mt-1">🗺️ State</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Footer Information -->
		<div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
			<div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
				<div class="flex items-center space-x-2">
					<span class="text-gray-400">🕐</span>
					<span>Updated: {new Date(data.timestamp).toLocaleString()}</span>
				</div>
				{#if data.queries_remaining}
					<div class="flex items-center space-x-2">
						<span class="text-gray-400">⚡</span>
						<span>Queries remaining: {data.queries_remaining}</span>
					</div>
				{/if}
			</div>
		</div>
	</div>
</ToolResultCard>
