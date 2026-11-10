/**
 * mSearch UI Layer
 * DOM-based search UI with autocomplete.
 *
 * Server renders each suggestion as full HTML via pdoTools chunks
 * (see SearchController::suggest). The client just inserts that HTML and
 * handles selection / keyboard navigation.
 *
 * Each form carries a `data-form-id` attribute — the formId is the only
 * service-level value JS sends to the API. tpl, limit and ctx are stored
 * server-side in the session under that formId.
 *
 * Depends on: msearch.headless.js
 */
var MSearchUI = {
    instances: new Map(),

    create(element, options) {
        options = options || {};
        var id = element.id || 'msearch-' + this.instances.size;
        if (!element.id) element.id = id;

        var instance = new MSearchUIInstance(element, options);
        this.instances.set(id, instance);
        return instance;
    },

    get(id) {
        return this.instances.get(id) || null;
    },

    destroy(id) {
        var instance = this.instances.get(id);
        if (instance) {
            instance.destroy();
            this.instances.delete(id);
        }
    }
};

function MSearchUIInstance(element, options) {
    this.el = element;

    // Конфиг headless-слоя берём только когда msearch инициализирован: тогда
    // в msearch.config собран итог (defaults < msearchConfig < msearch.init()).
    // До init config ещё пуст ({}), поэтому откатываемся к исходному
    // window.msearchConfig, уже присутствующему на странице. Отсюда — серверный
    // порог mse_suggest_min_query_length, проброшенный сниппетом.
    var globalConfig = (window.msearch && window.msearch.initialized && window.msearch.config)
        || window.msearchConfig
        || {};

    this.options = Object.assign(
        {
            inputSelector: '.mse-input',
            resultsSelector: '.mse-results',
            autocomplete: true,
            minQueryLength: 2,
            debounceDelay: 300,
            connectorUrl: '',
            formId: '',
        },
        // Серверный порог идёт НИЖЕ явных options и data-min-query-length,
        // чтобы те могли его переопределить.
        globalConfig.minQueryLength !== undefined
            ? { minQueryLength: MSearchUIInstance.intOption(globalConfig.minQueryLength, 2, 1) }
            : {},
        options
    );

    if (element.dataset.connectorUrl) this.options.connectorUrl = element.dataset.connectorUrl;
    if (element.dataset.formId) this.options.formId = element.dataset.formId;
    if (element.dataset.autocomplete !== undefined) {
        this.options.autocomplete = element.dataset.autocomplete === 'true';
    }
    if (element.dataset.minQueryLength) {
        this.options.minQueryLength = MSearchUIInstance.intOption(element.dataset.minQueryLength, this.options.minQueryLength, 1);
    }
    if (element.dataset.debounceDelay !== undefined) {
        this.options.debounceDelay = MSearchUIInstance.intOption(element.dataset.debounceDelay, this.options.debounceDelay, 0);
    }

    this.input = element.querySelector(this.options.inputSelector);
    this.dropdown = null;
    this.debounceTimer = null;
    this.selectedIndex = -1;
    this.suggestions = [];
    this.requestSeq = 0;

    if (this.input && this.options.autocomplete) {
        this.bindEvents();
    }
}

// parseInt с нижней границей. Нечисловое или меньше min значение
// откатывается к fallback. min=1 для порога (0 бессмыслен, query.length<NaN
// всегда ложно), min=0 для задержки (0 = без debounce).
MSearchUIInstance.intOption = function (value, fallback, min) {
    var n = parseInt(value, 10);
    return Number.isFinite(n) && n >= min ? n : fallback;
};

MSearchUIInstance.prototype.bindEvents = function () {
    var self = this;

    this.dropdown = document.createElement('ul');
    this.dropdown.className = 'mse-autocomplete';
    this.el.appendChild(this.dropdown);

    this.input.addEventListener('input', function () {
        clearTimeout(self.debounceTimer);
        var query = self.input.value.trim();

        // Длина в code points (как mb_strlen на сервере), иначе эмодзи
        // и суррогатные пары считались бы за два символа (UTF-16).
        if (Array.from(query).length < self.options.minQueryLength) {
            self.hideSuggestions();
            return;
        }

        self.debounceTimer = setTimeout(function () {
            self.fetchSuggestions(query);
        }, self.options.debounceDelay);
    });

    this.input.addEventListener('keydown', function (e) {
        if (!self.dropdown || !self.dropdown.classList.contains('active')) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                self.selectedIndex = Math.min(self.selectedIndex + 1, self.suggestions.length - 1);
                self.updateSelection();
                break;
            case 'ArrowUp':
                e.preventDefault();
                self.selectedIndex = Math.max(self.selectedIndex - 1, 0);
                self.updateSelection();
                break;
            case 'Enter':
                if (self.selectedIndex >= 0 && self.suggestions[self.selectedIndex]) {
                    e.preventDefault();
                    self.hideSuggestions();
                    window.location.href = self.suggestions[self.selectedIndex].url;
                }
                break;
            case 'Escape':
                self.hideSuggestions();
                break;
        }
    });

    this._outsideClickHandler = function (e) {
        if (!self.el.contains(e.target)) {
            self.hideSuggestions();
        }
    };
    document.addEventListener('click', this._outsideClickHandler);
};

MSearchUIInstance.prototype.fetchSuggestions = function (query) {
    var self = this;
    var seq = ++self.requestSeq;

    var options = {};
    if (this.options.formId) options.form = this.options.formId;

    window.msearch.suggest(query, options).then(function (result) {
        // Race guard: drop responses superseded by a newer request
        if (seq !== self.requestSeq) return;

        self.suggestions = result.items || [];
        self.selectedIndex = -1;
        self.renderSuggestions();
    }).catch(function () {
        if (seq !== self.requestSeq) return;
        self.hideSuggestions();
    });
};

MSearchUIInstance.prototype.renderSuggestions = function () {
    if (!this.suggestions.length) {
        this.hideSuggestions();
        return;
    }

    var self = this;

    this.dropdown.innerHTML = this.suggestions.map(function (item, index) {
        var html = item.html || '';
        return '<li class="mse-autocomplete-item" data-index="' + index + '" data-type="' + (item.type || '') + '">' + html + '</li>';
    }).join('');

    this.dropdown.querySelectorAll('.mse-autocomplete-item').forEach(function (li) {
        li.addEventListener('click', function (e) {
            var index = parseInt(li.dataset.index, 10);
            var suggestion = self.suggestions[index];
            if (!suggestion) return;
            e.preventDefault();
            self.hideSuggestions();
            window.location.href = suggestion.url;
        });
    });

    this.dropdown.classList.add('active');
};

MSearchUIInstance.prototype.updateSelection = function () {
    var self = this;
    this.dropdown.querySelectorAll('.mse-autocomplete-item').forEach(function (item, i) {
        item.classList.toggle('active', i === self.selectedIndex);
    });
};

MSearchUIInstance.prototype.hideSuggestions = function () {
    if (this.dropdown) {
        this.dropdown.classList.remove('active');
        this.dropdown.innerHTML = '';
    }
    this.suggestions = [];
    this.selectedIndex = -1;
};

MSearchUIInstance.prototype.destroy = function () {
    clearTimeout(this.debounceTimer);
    if (this.dropdown && this.dropdown.parentNode) {
        this.dropdown.parentNode.removeChild(this.dropdown);
    }
    if (this._outsideClickHandler) {
        document.removeEventListener('click', this._outsideClickHandler);
    }
};

window.MSearchUI = MSearchUI;
