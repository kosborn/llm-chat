import { z } from 'zod';
import { BaseTool, type ToolConfig } from '../types.js';

const maxmindConfig: ToolConfig = {
	name: 'maxmind',
	description:
		'Get detailed IP geolocation and network information using MaxMind GeoIP Insights API',
	category: 'network',
	version: '1.0.0',
	author: 'System',
	tags: ['ip', 'geolocation', 'network', 'security', 'location'],
	enabled: true
};

const maxmindParameters = z.object({
	ip: z.string().describe('The IP address to lookup (IPv4 or IPv6)')
});

async function executeMaxmind(params: Record<string, unknown>) {
	const { ip } = maxmindParameters.parse(params);

	// MaxMind API requires an API key in the format "account:password" for basic authentication
	const apiKey = process.env.MAXMIND_API_KEY;
	if (!apiKey) {
		throw new Error('MAXMIND_API_KEY environment variable is required (format: account:password)');
	}

	// Validate IP address format
	const ipv4Regex =
		/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
	const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

	if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
		throw new Error('Invalid IP address format');
	}

	try {
		const response = await fetch(`https://geoip.maxmind.com/geoip/v2.1/insights/${ip}`, {
			method: 'GET',
			headers: {
				// Using the API key directly as it should already be in the format "account:password"
				Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}`,
				Accept: 'application/json'
			}
		});

		if (!response.ok) {
			if (response.status === 401) {
				throw new Error(
					'Invalid MaxMind API key or insufficient permissions (API key should be in format: account:password)'
				);
			} else if (response.status === 402) {
				throw new Error('Insufficient funds or permission required');
			} else if (response.status === 404) {
				throw new Error('IP address not found in database');
			} else {
				throw new Error(`MaxMind API error: ${response.status} ${response.statusText}`);
			}
		}

		const data = await response.json();

		// Extract English names and format the response
		const formatNames = (names: Record<string, string> | undefined) => {
			return names?.en || 'Unknown';
		};

		const formatLocation = (lat: number, lon: number, accuracy: number) => {
			return `${lat.toFixed(4)}, ${lon.toFixed(4)} (±${accuracy}km)`;
		};

		return {
			ip: data.traits?.ip_address || ip,
			location: {
				city: formatNames(data.city?.names),
				state: data.subdivisions?.[0] ? formatNames(data.subdivisions[0].names) : undefined,
				state_code: data.subdivisions?.[0]?.iso_code,
				country: formatNames(data.country?.names),
				country_code: data.country?.iso_code,
				continent: formatNames(data.continent?.names),
				coordinates:
					data.location?.latitude && data.location?.longitude
						? formatLocation(
								data.location.latitude,
								data.location.longitude,
								data.location.accuracy_radius || 0
							)
						: undefined,
				postal_code: data.postal?.code,
				timezone: data.location?.time_zone
			},
			network: {
				isp: data.traits?.isp,
				organization: data.traits?.organization,
				autonomous_system_number: data.traits?.autonomous_system_number,
				autonomous_system_organization: data.traits?.autonomous_system_organization,
				connection_type: data.traits?.connection_type,
				domain: data.traits?.domain,
				network: data.traits?.network
			},
			security: {
				is_anonymous: data.traits?.is_anonymous || false,
				is_anonymous_vpn: data.traits?.is_anonymous_vpn || false,
				is_hosting_provider: data.traits?.is_hosting_provider || false,
				is_public_proxy: data.traits?.is_public_proxy || false,
				is_residential_proxy: data.traits?.is_residential_proxy || false,
				is_tor_exit_node: data.traits?.is_tor_exit_node || false,
				user_type: data.traits?.user_type,
				static_ip_score: data.traits?.static_ip_score,
				user_count: data.traits?.user_count
			},
			mobile: data.traits?.mobile_country_code
				? {
						country_code: data.traits.mobile_country_code,
						network_code: data.traits.mobile_network_code
					}
				: undefined,
			confidence: {
				city: data.city?.confidence,
				country: data.country?.confidence,
				postal: data.postal?.confidence,
				subdivision: data.subdivisions?.[0]?.confidence
			},
			queries_remaining: data.maxmind?.queries_remaining,
			timestamp: new Date().toISOString()
		};
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error('Failed to lookup IP address with MaxMind API');
	}
}

export const maxmindTool = new BaseTool(maxmindConfig, maxmindParameters, executeMaxmind);
