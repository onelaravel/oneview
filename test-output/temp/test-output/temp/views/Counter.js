import { Application, View, ViewController, app } from 'oneview';


const __VIEW_PATH__ = 'web.Counter';
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



class CounterViewController extends ViewController {
    constructor(view) {
        super(view, __VIEW_PATH__, __VIEW_TYPE__);
    }
}

class CounterView extends View {
    constructor(App, systemData) {
        super(__VIEW_PATH__, __VIEW_TYPE__, CounterViewController);
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
        let temp;
        let 100;
        __UPDATE_DATA_TRAIT__.temp = value => temp = value;
        __UPDATE_DATA_TRAIT__.100 = value => 100 = value;
        const __VARIABLE_LIST__ = ["temp", "100"];
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


        this.__ctrl__.setUserDefinedConfig({
            increment() {
                this.setCount(this.count + 1);
            },
            decrement() {
                this.setCount(this.count - 1);
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
    }
}

// Export factory function
export function Counter(__data__ = {}, systemData = {}) {
    const App = app.make("App");
    const view = new CounterView(App, systemData);
    view.$__setup__(__data__, systemData);
    return view;
}
export default Counter;