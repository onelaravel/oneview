export function Test($$$DATA$$$ = {}, systemData = {}) {
    const {App, View, __base__, __layout__, __page__, __component__, __template__, __context__, __partial__, __system__, __env = {}, __helper = {}} = systemData;
    const __VIEW_PATH__ = 'test';
    const __VIEW_ID__ = $$$DATA$$$.__SSR_VIEW_ID__ || App.View.generateViewId();
    const __VIEW_TYPE__ = 'view';
    const cpparts = __VIEW_PATH__.split('.');
    cpparts.pop();  // Remove view name
    const __VIEW_NAMESPACE__ = cpparts.length > 0 ? cpparts.join('.') + '.' : '';
        const __UPDATE_DATA_TRAIT__ = {};
    const API_URL = '/api';
    const __VARIABLE_LIST__ = [];
    const set$isOpen = __STATE__.__.register('isOpen');
    let isOpen = null;
    const setIsOpen = (state) => {
        isOpen = state;
        set$isOpen(state);
    };
    __STATE__.__.setters.setIsOpen = setIsOpen;
    __STATE__.__.setters.isOpen = setIsOpen;
    const update$isOpen = (value) => {
        if(__STATE__.__.canUpdateStateByKey){
            updateStateByKey('isOpen', value);
            isOpen = value;
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
            update$isOpen(false);
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
            update$isOpen(false);
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


<div class="demo" ${this.__addEventConfig("click", [(event) => setIsOpen(!isOpen)])}>
<h2>${this.__reactive(`rc-${App.View.escString(__VIEW_ID__)}-1`, ['isOpen'], (__rc__) => isOpen ? 'Open' : 'Closed', {type: 'output', escapeHTML: true})}</h2>
<p v-if="$isOpen">
This is demo content
</p>
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