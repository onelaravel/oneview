import { Application, View, ViewController, app } from 'oneview';


const __VIEW_PATH__ = 'web.Demo';
const __VIEW_NAMESPACE__ = 'web.';
const __VIEW_TYPE__ = 'view';
const __VIEW_CONFIG__ = {
    hasSuperView: false,
    viewType: 'view',
    sections: {},
    wrapperConfig: { enable: false, tag: null, subscribe: true, attributes: {} },
    hasAwaitData: false,
    hasFetchData: false,
    usesVars: false,
    hasSections: false,
    hasSectionPreload: false,
    hasPrerender: false,
    renderLongSections: [],
    renderSections: [],
    prerenderSections: []
};



class DemoViewController extends ViewController {
    constructor(view) {
        super(view, __VIEW_PATH__, __VIEW_TYPE__);
    }
}

class DemoView extends View {
    constructor(App, systemData) {
        super(__VIEW_PATH__, __VIEW_TYPE__, DemoViewController);
        this.__ctrl__.setApp(App);
    }

    $__setup__(__data__, systemData) {
        const App = this.__ctrl__.App;
        const __STATE__ = this.__ctrl__.states;
        const {__base__, __layout__, __page__, __component__, __template__, __context__, __partial__, __system__, __env = {}, __helper = {}} = systemData;
        const __VIEW_ID__ = __data__.__SSR_VIEW_ID__ || App.View.generateViewId();

        const useState = (value) => {
            return __STATE__.__useState(value);
        };
        const updateRealState = (state) => {
            __STATE__.__.updateRealState(state);
        };

        const lockUpdateRealState = () => {
            __STATE__.__.lockUpdateRealState();
        };
        const updateStateByKey = (key, state) => {
            __STATE__.__.updateStateByKey(key, state);
        };

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


        this.__ctrl__.setUserDefinedConfig({
            toggle() {
                this.setIsOpen(!this.isOpen);
            },

            init() {
                console.log('Demo view initialized');
            }
        });

        this.__ctrl__.setup({
            superView: null,
            subscribe: true,
            fetch: null,
            data: __data__,
            viewId: __VIEW_ID__,
            path: __VIEW_PATH__,
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
    }
}

// Export factory function
export function Demo(__data__ = {}, systemData = {}) {
    const App = app.make("App");
    const view = new DemoView(App, systemData);
    view.$__setup__(__data__, systemData);
    return view;
}
export default Demo;