// Basic service worker for AI Tool Chat
const CACHE_NAME = 'ai-tool-chat-v1';

// Install event - cache basic assets
self.addEventListener('install', (event) => {
	console.log('Service Worker: Installing');
	self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
	console.log('Service Worker: Activating');
	event.waitUntil(
		caches
			.keys()
			.then((cacheNames) => {
				return Promise.all(
					cacheNames.map((cacheName) => {
						if (cacheName !== CACHE_NAME) {
							console.log('Service Worker: Deleting old cache', cacheName);
							return caches.delete(cacheName);
						}
					})
				);
			})
			.then(() => {
				return self.clients.claim();
			})
	);
});

// Fetch event - basic network-first strategy
self.addEventListener('fetch', (event) => {
	// Only handle GET requests
	if (event.request.method !== 'GET') {
		return;
	}

	// Skip API calls and other dynamic content
	if (event.request.url.includes('/api/')) {
		return;
	}

	event.respondWith(
		fetch(event.request)
			.then((response) => {
				// If the network request succeeds, return it
				return response;
			})
			.catch(() => {
				// If network fails, try to serve from cache
				return caches.match(event.request);
			})
	);
});
