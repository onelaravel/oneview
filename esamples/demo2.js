import { View } from 'onelaraveljs';
import { app } from 'onelaraveljs';

const __VIEW_PATH__ = 'web.pages.demo2';
const __VIEW_NAMESPACE__ = 'web.pages.';
const __VIEW_TYPE__ = 'view';

class WebPagesDemo2View extends View {
    constructor(App, systemData) {
        super(__VIEW_PATH__, __VIEW_TYPE__);
        this.__ctrl__.setApp(App);
    }

    __setup__(__data__, systemData) {
        const { __base__, __layout__, __page__, __component__, __template__, 
                __context__, __partial__, __system__, __env = {}, __helper = {} } = systemData;
        const App = this.App;
        const Helper = App.Helper;
        const __VIEW_ID__ = this.__ctrl__.__SSR_VIEW_ID__ || App.Helper.generateViewId();

        
        const __STATE__ = this.__ctrl__.states;
        
        const useState = (value) => __STATE__.__useState(value);
        const updateRealState = (state) => __STATE__.__.updateRealState(state);
        const lockUpdateRealState = () => __STATE__.__.lockUpdateRealState();
        const updateStateByKey = (key, state) => __STATE__.__.updateStateByKey(key, state);

        const __UPDATE_DATA_TRAIT__ = {};
        const __VARIABLE_LIST__ = [];

        // State registration
        const set$isOpen = __STATE__.__.register('isOpen');
        let isOpen = null;
        
        const setIsOpen = (state) => {
            isOpen = state;
            set$isOpen(state);
        };
        
        __STATE__.__.setters.setIsOpen = setIsOpen;
        __STATE__.__.setters.isOpen = setIsOpen;
        
        const update$isOpen = (value) => {
            if (__STATE__.__.canUpdateStateByKey) {
                updateStateByKey('isOpen', value);
                isOpen = value;
            }
        };

        // Set user defined methods from <script setup>
        this.__ctrl__.setUserDefined({
            init(){},
            mounted(){}
        });

        // Setup view configuration
        this.__ctrl__.setup({
            superView: null,
            hasSuperView: false,
            viewType: 'view',
            sections: {},
            wrapperConfig: { enable: false, tag: null, subscribe: true, attributes: {} },
            hasAwaitData: false,
            hasFetchData: false,
            subscribe: true,
            fetch: null,
            data: __data__,
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
            
            commitConstructorData: function () {
                update$isOpen(false);
                lockUpdateRealState();
            },
            
            updateVariableData: function (data) {
                for (const key in data) {
                    if (data.hasOwnProperty(key)) {
                        if (typeof this.config.updateVariableItemData === 'function') {
                            this.config.updateVariableItemData.call(this, key, data[key]);
                        }
                    }
                }
                update$isOpen(false);
                lockUpdateRealState();
            },
            
            updateVariableItemData: function (key, value) {
                this.data[key] = value;
                if (typeof __UPDATE_DATA_TRAIT__[key] === "function") {
                    __UPDATE_DATA_TRAIT__[key](value);
                }
            },
            
            prerender: function () {
                return null;
            },
            
            render: function () {
                let __outputRenderedContent__ = '';
                try {
                    __outputRenderedContent__ = `
<div class="demo2-component" ${this.__addEventConfig("click", [(event) => setIsOpen(!isOpen)])}>
Status: ${this.__reactive(`rc-${App.Helper.escString(__VIEW_ID__)}-67`, ['isOpen'], (__rc__) => isOpen ? 'Open' : 'Closed', {type: 'output', escapeHTML: true})}
</div>`;
                } catch (e) {
                    __outputRenderedContent__ = this.__showError(e.message);
                    console.warn(e);
                }
                return __outputRenderedContent__;
            }
        });
    }
}

// Export factory function
export function WebPagesDemo2(data, systemData) {
    const App = app.make("App");
    const view = new WebPagesDemo2View(App, systemData);
    view.__setup__(data, systemData);
    return view;
}