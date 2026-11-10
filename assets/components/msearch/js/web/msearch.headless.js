/**
 * mSearch Headless Entry Point
 * Provides window.msearch API without any UI
 * Depends on: ApiClient.js, SearchAPI.js, hooks.js
 */
(function () {
    'use strict';

    var msearch = {
        config: {},
        client: null,
        api: null,
        hooks: null,
        initialized: false,

        async init(config) {
            config = config || {};

            // Merge: defaults < window.msearchConfig < config param
            this.config = Object.assign(
                {
                    apiUrl: '/assets/components/msearch/api.php',
                    ctx: '',
                    autoInit: true,
                },
                window.msearchConfig || {},
                config
            );

            // Create client and API instances
            this.client = new MSearchApiClient({ baseUrl: this.config.apiUrl });
            this.api = new MSearchAPI(this.client);
            this.hooks = window.msearchHooks || null;
            this.initialized = true;

            // Dispatch ready event
            document.dispatchEvent(new CustomEvent('msearch:ready', {
                detail: { msearch: this }
            }));

            return this;
        },

        async search(query, options) {
            if (!this.initialized) await this.init();

            options = Object.assign({}, options);
            if (this.config.ctx && !options.ctx) {
                options.ctx = this.config.ctx;
            }

            var context = { query: query, options: options, cancelled: false, result: null };

            // Run beforeSearch hooks
            if (this.hooks && this.hooks.has('beforeSearch')) {
                await this.hooks.run('beforeSearch', context);
                if (context.cancelled) return context.result;
            }

            try {
                context.result = await this.api.search(context.query, context.options);
            } catch (error) {
                if (this.hooks && this.hooks.has('onError')) {
                    context.error = error;
                    await this.hooks.run('onError', context);
                }
                throw error;
            }

            // Run afterSearch hooks
            if (this.hooks && this.hooks.has('afterSearch')) {
                await this.hooks.run('afterSearch', context);
            }

            return context.result;
        },

        async suggest(query, options) {
            if (!this.initialized) await this.init();

            options = Object.assign({}, options);
            if (this.config.ctx && !options.ctx) {
                options.ctx = this.config.ctx;
            }

            var context = { query: query, options: options, cancelled: false, result: null };

            // Run beforeSuggest hooks
            if (this.hooks && this.hooks.has('beforeSuggest')) {
                await this.hooks.run('beforeSuggest', context);
                if (context.cancelled) return context.result;
            }

            try {
                context.result = await this.api.suggest(context.query, context.options);
            } catch (error) {
                if (this.hooks && this.hooks.has('onError')) {
                    context.error = error;
                    await this.hooks.run('onError', context);
                }
                throw error;
            }

            // Run afterSuggest hooks
            if (this.hooks && this.hooks.has('afterSuggest')) {
                await this.hooks.run('afterSuggest', context);
            }

            return context.result;
        },

        destroy() {
            this.client = null;
            this.api = null;
            this.hooks = null;
            this.initialized = false;
        }
    };

    window.msearch = msearch;

    // Auto-init if config present
    // init() is async — store promise so consumers can await it
    function autoInit() {
        if (window.msearchConfig && window.msearchConfig.autoInit !== false) {
            msearch._initPromise = msearch.init();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }
})();
