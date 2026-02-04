import { Application, View, ViewController, app } from 'oneview';


const __VIEW_PATH__ = 'web.TestTypescript';
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



class TesttypescriptViewController extends ViewController {
    constructor(view: View) {
        super(view, __VIEW_PATH__, __VIEW_TYPE__);
    }
}

class TesttypescriptView extends View {
    constructor(App: Application, systemData: any) {
        super(__VIEW_PATH__, __VIEW_TYPE__, TesttypescriptViewController);
        this.__ctrl__.setApp(App);
    }

    $__setup__(__data__, systemData) {
        const App = this.__ctrl__.App;
        const __STATE__ = this.__ctrl__.states;
        const {__base__, __layout__, __page__, __component__, __template__, __context__, __partial__, __system__, __env = {}, __helper = {}} = systemData;
        const __VIEW_ID__ = __data__.__SSR_VIEW_ID__ || App.View.generateViewId();

        const useState = (value: any) => {
            return __STATE__.__useState(value);
        };
        const updateRealState = (state: any) => {
            __STATE__.__.updateRealState(state);
        };

        const lockUpdateRealState = () => {
            __STATE__.__.lockUpdateRealState();
        };
        const updateStateByKey = (key: string, state: any) => {
            __STATE__.__.updateStateByKey(key, state);
        };

        const __UPDATE_DATA_TRAIT__ = {};
        let count;
        let 0;
        __UPDATE_DATA_TRAIT__.count = (value: any) => count = value;
        __UPDATE_DATA_TRAIT__.0 = (value: any) => 0 = value;
        const __VARIABLE_LIST__ = ["count", "0"];
        const set$test = __STATE__.__.register('test');
        let test = null;
        const setTest = (state) => {
            test = state;
            set$test(state);
        };
        __STATE__.__.setters.setTest = setTest;
        __STATE__.__.setters.test = setTest;
        const update$test = (value) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('test', value);
                test = value;
            }
        };


        this.__ctrl__.setUserDefinedConfig({
            setupLang: 'typescript',
            change() {
                this.setTest('changed');
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
                update$test('hello');
                // Finally lock state updates
                lockUpdateRealState();
            },
            updateVariableData: function(data: any) {
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
                update$test('hello');
                // Finally lock state updates
                lockUpdateRealState();
            },
            updateVariableItemData: function(key: string, value: any) {
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




            <div>
            <p>${this.__reactive(`rc-${App.View.escString(__VIEW_ID__)}-1`, ['test'], (__rc__) => test, {type: 'output', escapeHTML: true})}</p>
            <p>Count: ${App.View.escString(count)}</p>
            <button ${this.__addEventConfig("click", [(event) => setTest('world')])}>Change</button>
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
export function Testtypescript(__data__ = {}, systemData = {}) {
    const App: Application = app.make("App") as Application;
    const view = new TesttypescriptView(App, systemData);
    view.$__setup__(__data__, systemData);
    return view;
}
export default Testtypescript;