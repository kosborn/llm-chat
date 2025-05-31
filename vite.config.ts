import { svelteTesting } from '@testing-library/svelte/vite';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
// import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit()
		// SvelteKitPWA({
		// 	strategies: 'injectManifest',
		// 	srcDir: 'src',
		// 	filename: 'sw.ts',
		// 	scope: '/',
		// 	base: '/',
		// 	manifest: {
		// 		name: 'AI Tool Chat',
		// 		short_name: 'AI Chat',
		// 		description: 'Chat with AI using powerful tools - works offline',
		// 		theme_color: '#1e40af',
		// 		background_color: '#ffffff',
		// 		display: 'standalone',
		// 		orientation: 'portrait',
		// 		start_url: '/',
		// 		scope: '/',
		// 		lang: 'en',
		// 		categories: ['productivity', 'utilities', 'business'],
		// 		icons: [
		// 			{
		// 				src: '/icon-192.png',
		// 				sizes: '192x192',
		// 				type: 'image/png',
		// 				purpose: 'any maskable'
		// 			},
		// 			{
		// 				src: '/icon-512.png',
		// 				sizes: '512x512',
		// 				type: 'image/png',
		// 				purpose: 'any maskable'
		// 			}
		// 		],
		// 		screenshots: [
		// 			{
		// 				src: '/icon-512.png',
		// 				sizes: '512x512',
		// 				type: 'image/png',
		// 				form_factor: 'narrow'
		// 			}
		// 		],
		// 		prefer_related_applications: false,
		// 		shortcuts: [
		// 			{
		// 				name: 'New Chat',
		// 				short_name: 'New Chat',
		// 				description: 'Start a new conversation with AI',
		// 				url: '/?action=new-chat',
		// 				icons: [
		// 					{
		// 						src: '/icon-192.png',
		// 						sizes: '192x192'
		// 					}
		// 				]
		// 			}
		// 		],
		// 		edge_side_panel: {
		// 			preferred_width: 400
		// 		}
		// 	},
		// 	kit: {
		// 		adapterFallback: 'index.html'
		// 	},
		// 	devOptions: {
		// 		enabled: true,
		// 		type: 'module'
		// 	}
		// })
	],
	test: {
		workspace: [
			{
				extends: './vite.config.ts',
				plugins: [svelteTesting()],
				test: {
					name: 'client',
					environment: 'jsdom',
					clearMocks: true,
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
