/**
 * mSearch Search API
 * High-level search API facade.
 *
 * Only `query`, `offset` and `ctx` are accepted from clients. Render-affecting
 * params (tpl, limit) are configured server-side via the mSearchForm snippet
 * and read from the session by `form` (formId). `ctx` is a plain column
 * filter and is safe to expose — primarily for headless integrations.
 */
class MSearchAPI {
    constructor(apiClient) {
        this.client = apiClient;
    }

    async search(query, options = {}) {
        const params = { query };
        if (options.offset != null) params.offset = options.offset;
        if (options.form) params.form = options.form;
        if (options.ctx) params.ctx = Array.isArray(options.ctx) ? options.ctx.join(',') : options.ctx;

        return this.client.get('/search', params);
    }

    async suggest(query, options = {}) {
        const params = { query };
        if (options.form) params.form = options.form;
        if (options.ctx) params.ctx = Array.isArray(options.ctx) ? options.ctx.join(',') : options.ctx;

        return this.client.get('/search/suggest', params);
    }
}

window.MSearchAPI = MSearchAPI;
