/**
 * mSearch Full Entry Point
 * Auto-initializes UI on [data-msearch-form] elements
 * Loads after: ApiClient.js, SearchAPI.js, hooks.js, msearch.headless.js, SearchUI.js
 */
(function () {
    'use strict';

    function initUI() {
        document.querySelectorAll('[data-msearch-form]').forEach(function (el) {
            MSearchUI.create(el);
        });

        document.dispatchEvent(new CustomEvent('msearch:ui:ready', {
            detail: { instances: MSearchUI.instances }
        }));
    }

    if (window.msearch && window.msearch.initialized) {
        initUI();
    } else {
        document.addEventListener('msearch:ready', initUI);
    }
})();
