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
		<div class="rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 p-3 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-100 dark:border-purple-800">
			<div class="flex items-center justify-between mb-2">
				<h3 class="text-base font-bold text-purple-900 dark:text-purple-100">🌐 {data.ip}</h3>
				{#if data.queries_remaining}
					<span class="text-xs bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
						{data.queries_remaining} left
					</span>
				{/if}
			</div>
			
			{#if data.location}
				<div class="flex flex-wrap items-center gap-1 text-xs">
					{#if data.location.city !== 'Unknown'}
						<span class="bg-white dark:bg-gray-800 px-2 py-1 rounded-full">
							🏙️ {data.location.city}
						</span>
					{/if}
					{#if data.location.state}
						<span class="bg-white dark:bg-gray-800 px-2 py-1 rounded-full">
							🗺️ {data.location.state}
						</span>
					{/if}
					<span class="bg-white dark:bg-gray-800 px-2 py-1 rounded-full">
						🏳️ {data.location.country}
					</span>
					{#if data.location.timezone}
						<span class="bg-white dark:bg-gray-800 px-2 py-1 rounded-full">
							🕐 {data.location.timezone}
						</span>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Location & Network Details -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
			{#if data.location}
				<div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
					<h4 class="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
						📍 Location
					</h4>
					<div class="space-y-1 text-xs">
						{#if data.location.country_code}
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">Country:</span>
								<span class="font-mono">{data.location.country_code}</span>
							</div>
						{/if}
						{#if data.location.state_code}
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">State:</span>
								<span class="font-mono">{data.location.state_code}</span>
							</div>
						{/if}
						{#if data.location.postal_code}
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">Postal:</span>
								<span class="font-mono">{data.location.postal_code}</span>
							</div>
						{/if}
						{#if data.location.coordinates}
							<div class="flex justify-between">
								<span class="text-gray-600 dark:text-gray-400">Coords:</span>
								<span class="font-mono text-xs">{data.location.coordinates}</span>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			{#if data.network}
				<div class="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
					<h4 class="mb-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
						🌐 Network
					</h4>
					<div class="space-y-1 text-xs">
						{#if data.network.isp}
							<div class="flex justify-between">
								<span class="text-blue-600 dark:text-blue-400">ISP:</span>
								<span class="font-semibold truncate ml-2">{data.network.isp}</span>
							</div>
						{/if}
						{#if data.network.organization}
							<div class="flex justify-between">
								<span class="text-blue-600 dark:text-blue-400">Org:</span>
								<span class="font-semibold truncate ml-2">{data.network.organization}</span>
							</div>
						{/if}
						{#if data.network.connection_type}
							<div class="flex justify-between">
								<span class="text-blue-600 dark:text-blue-400">Type:</span>
								<span class="capitalize">{data.network.connection_type}</span>
							</div>
						{/if}
						{#if data.network.autonomous_system_number}
							<div class="flex justify-between">
								<span class="text-blue-600 dark:text-blue-400">ASN:</span>
								<span class="font-mono">{data.network.autonomous_system_number}</span>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Security & Additional Info -->
		{#if data.security && (data.security.is_anonymous || data.security.is_anonymous_vpn || data.security.is_hosting_provider || data.security.is_public_proxy || data.security.is_residential_proxy || data.security.is_tor_exit_node || data.security.user_type)}
			<div class="rounded-lg bg-red-50 p-3 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
				<h4 class="mb-2 text-xs font-semibold text-red-700 dark:text-red-300">
					🔒 Security Flags
				</h4>
				<div class="flex flex-wrap gap-1 text-xs">
					{#if data.security.is_anonymous}
						<span class="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-1 rounded">⚠️ Anonymous</span>
					{/if}
					{#if data.security.is_anonymous_vpn}
						<span class="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-1 rounded">🔐 VPN</span>
					{/if}
					{#if data.security.is_hosting_provider}
						<span class="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded">🏗️ Hosting</span>
					{/if}
					{#if data.security.is_public_proxy}
						<span class="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-1 rounded">🔄 Proxy</span>
					{/if}
					{#if data.security.is_residential_proxy}
						<span class="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2 py-1 rounded">🏠 Residential</span>
					{/if}
					{#if data.security.is_tor_exit_node}
						<span class="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-1 rounded">🧅 Tor</span>
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

		<!-- Mobile & Confidence Info -->
		{#if data.mobile || (data.confidence && (data.confidence.city || data.confidence.country || data.confidence.postal || data.confidence.subdivision))}
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
				{#if data.mobile}
					<div class="rounded-lg bg-green-50 p-3 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
						<h4 class="mb-2 text-xs font-semibold text-green-700 dark:text-green-300">
							📱 Mobile
						</h4>
						<div class="flex gap-3 text-xs">
							<div class="text-center">
								<div class="font-mono font-bold">{data.mobile.country_code}</div>
								<div class="text-gray-600 dark:text-gray-400">MCC</div>
							</div>
							<div class="text-center">
								<div class="font-mono font-bold">{data.mobile.network_code}</div>
								<div class="text-gray-600 dark:text-gray-400">MNC</div>
							</div>
						</div>
					</div>
				{/if}

				{#if data.confidence && (data.confidence.city || data.confidence.country || data.confidence.postal || data.confidence.subdivision)}
					<div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
						<h4 class="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
							📊 Confidence
						</h4>
						<div class="grid grid-cols-2 gap-2 text-xs">
							{#if data.confidence.city}
								<div class="text-center">
									<div class="font-bold text-blue-600 dark:text-blue-400">{data.confidence.city}%</div>
									<div class="text-gray-600 dark:text-gray-400">City</div>
								</div>
							{/if}
							{#if data.confidence.country}
								<div class="text-center">
									<div class="font-bold text-green-600 dark:text-green-400">{data.confidence.country}%</div>
									<div class="text-gray-600 dark:text-gray-400">Country</div>
								</div>
							{/if}
							{#if data.confidence.postal}
								<div class="text-center">
									<div class="font-bold text-purple-600 dark:text-purple-400">{data.confidence.postal}%</div>
									<div class="text-gray-600 dark:text-gray-400">Postal</div>
								</div>
							{/if}
							{#if data.confidence.subdivision}
								<div class="text-center">
									<div class="font-bold text-orange-600 dark:text-orange-400">{data.confidence.subdivision}%</div>
									<div class="text-gray-600 dark:text-gray-400">State</div>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Footer -->
		<div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
			<div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
				<span>Updated: {new Date(data.timestamp).toLocaleString()}</span>
				{#if data.queries_remaining}
					<span>⚡ {data.queries_remaining} remaining</span>
				{/if}
			</div>
		</div>
	</div>
</ToolResultCard>