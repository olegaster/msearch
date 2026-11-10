/**
 * mSearch Hooks Module
 * Event system for extending search behavior
 */
var msearchHooks = {
    _hooks: {},

    add(name, fn, priority = 10) {
        if (!this._hooks[name]) {
            this._hooks[name] = [];
        }
        const entry = { fn, priority };
        this._hooks[name].push(entry);
        this._hooks[name].sort((a, b) => a.priority - b.priority);

        // Return unsubscribe function
        return () => this.remove(name, fn);
    },

    remove(name, fn) {
        if (!this._hooks[name]) return;
        this._hooks[name] = this._hooks[name].filter(entry => entry.fn !== fn);
    },

    clear(name) {
        if (name) {
            delete this._hooks[name];
        } else {
            this._hooks = {};
        }
    },

    async run(name, context) {
        if (!this._hooks[name]) return context;

        for (const entry of this._hooks[name]) {
            if (context && context.cancelled) break;
            await entry.fn(context);
        }

        return context;
    },

    has(name) {
        return !!(this._hooks[name] && this._hooks[name].length > 0);
    },

    count(name) {
        return this._hooks[name] ? this._hooks[name].length : 0;
    }
};

window.msearchHooks = msearchHooks;
