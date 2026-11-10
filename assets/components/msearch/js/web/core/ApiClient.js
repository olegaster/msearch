/**
 * mSearch API Client
 * Low-level HTTP client for mSearch API
 */
class MSearchApiClient {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || '/assets/components/msearch/api.php';
    }

    async request(method, endpoint, data = null) {
        const url = new URL(this.baseUrl, window.location.origin);
        url.searchParams.set('route', endpoint);

        const options = {
            method,
            headers: { 'Accept': 'application/json' },
            credentials: 'same-origin',
        };

        if (method === 'GET' && data) {
            Object.entries(data).forEach(([key, value]) => {
                if (value != null) url.searchParams.set(key, String(value));
            });
        } else if (data) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url.toString(), options);
        const result = await response.json();

        if (!result.success) {
            const error = new Error(result.message || 'Request failed');
            error.code = response.status;
            error.response = result;
            throw error;
        }

        return result;
    }

    async get(endpoint, params = {}) {
        return this.request('GET', endpoint, params);
    }

    async post(endpoint, data = {}) {
        return this.request('POST', endpoint, data);
    }
}

window.MSearchApiClient = MSearchApiClient;
