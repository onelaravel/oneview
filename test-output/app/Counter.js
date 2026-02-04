export function Test($$$DATA$$$ = {}, systemData = {}) {
    const {App, View, __base__, __layout__, __page__, __component__, __template__, __context__, __partial__, __system__, __env = {}, __helper = {}} = systemData;
    const __VIEW_PATH__ = 'test';
    const __VIEW_ID__ = $$$DATA$$$.__SSR_VIEW_ID__ || App.View.generateViewId();
    const __VIEW_TYPE__ = 'view';
    const cpparts = __VIEW_PATH__.split('.');
    cpparts.pop();  // Remove view name
    const __VIEW_NAMESPACE__ = cpparts.length > 0 ? cpparts.join('.') + '.' : '';
        const __UPDATE_DATA_TRAIT__ = {};
    const __VARIABLE_LIST__ = [];
    const set$count = __STATE__.__.register('count');
    let count = null;
    const setCount = (state) => {
        count = state;
        set$count(state);
    };
    __STATE__.__.setters.setCount = setCount;
    __STATE__.__.setters.count = setCount;
    const update$count = (value) => {
        if(__STATE__.__.canUpdateStateByKey){
            updateStateByKey('count', value);
            count = value;
        }
    };

    self.setup('test', {}, {
        superView: null,
        hasSuperView: false,
        viewType: 'view',
        sections: {},
        wrapperConfig: { enable: false, tag: null, subscribe: true, attributes: {} },
        hasAwaitData: false,
        hasFetchData: false,
        subscribe: true,
        fetch: null,
        data: $$$DATA$$$,
        viewId: __VIEW_ID__,
        path: __VIEW_PATH__,
        usesVars: false,
        hasSections: false,
        hasSectionPreload: false,
        hasPrerender: false,
        renderLongSections: [],
        renderSections: [],
        prerenderSections: [],
        scripts: [],
        styles: [],
        resources: [],
        commitConstructorData: function() {
            // Then update states from data
            update$count(0);
            // Finally lock state updates
            lockUpdateRealState();
        },
        updateVariableData: function(data) {
            // Update all variables first
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    // Call updateVariableItemData directly from config
                    if (typeof this.config.updateVariableItemData === 'function') {
                        this.config.updateVariableItemData.call(this, key, data[key]);
                    }
                }
            }
            // Then update states from data
            update$count(0);
            // Finally lock state updates
            lockUpdateRealState();
        },
        updateVariableItemData: function(key, value) {
            this.data[key] = value;
            if (typeof __UPDATE_DATA_TRAIT__[key] === "function") {
                __UPDATE_DATA_TRAIT__[key](value);
            }
        },
        prerender: function() {
    return null;
},
        render: function() {
                
    let __outputRenderedContent__ = '';
            try {
                __outputRenderedContent__ = `

<div class="counter">
<h3>Count: ${this.__reactive(`rc-${App.View.escString(__VIEW_ID__)}-1`, ['count'], (__rc__) => count, {type: 'output', escapeHTML: true})}</h3>
<button ${this.__addEventConfig("click", [(event) => setCount(count + 1)])}>Increment</button>
<button ${this.__addEventConfig("click", [(event) => setCount(count - 1)])}>Decrement</button>
</div>`;
            } catch(e) {
                __outputRenderedContent__ = this.__showError(e.message);
                console.warn(e);
            }
            return __outputRenderedContent__;
            }
    });
    return self;
        }