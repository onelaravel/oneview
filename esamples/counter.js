import { View } from 'onelaraveljs'; // cái này chỉ là mẫu, ở project path sẽ khác
import { app } from 'onelaraveljs'; // cái này chỉ là mẫu, ở project path sẽ khác
class CounterView extends View {
    constructor(App, systemData) {
        super("counter", "view");
        this.__ctrl__.setApp(App);
    }

    __setup__(data, systemData) {
        const { __base__, __layout__, __page__, __component__, __template__, __context__, __partial__, __system__, __env = {}, __helper = {} } = systemData;
        const App = app.make("App");
        const Helper = app.make("Helper");
        const __VIEW_PATH__ = 'counter';
        const __VIEW_ID__ = data.__SSR_VIEW_ID__ || App.Helper.generateViewId();
        const __VIEW_TYPE__ = 'view';
        const cpparts = __VIEW_PATH__.split('.');
        cpparts.pop();  // Remove view name
        const __VIEW_NAMESPACE__ = cpparts.length > 0 ? cpparts.join('.') + '.' : '';
        const __STATE__ = this.__ctrl__.states;
        const useState = (value) => __STATE__.__useState(value);
        const updateRealState = (state) => __STATE__.__.updateRealState(state);
        const lockUpdateRealState = () => __STATE__.__.lockUpdateRealState();
        const updateStateByKey = (key, state) => __STATE__.__.updateStateByKey(key, state);

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
            if (__STATE__.__.canUpdateStateByKey) {
                updateStateByKey('count', value);
                count = value;
            }
        };
        this.__ctrl__.setUserDefined({
            data: {},
            increment() {
                setCount(count + 1);
            },
            decrement() {
                setCount(count - 1);
            },
            reset() {
                setCount(0);
            }
        });
        this.__ctrl__.setup({
            superView: null,
            hasSuperView: false,
            viewType: 'view',
            sections: {},
            wrapperConfig: { enable: false, tag: null, subscribe: true, attributes: {} },
            __props__: ["__WRAPPER_ELEMENT__", "createHtml", "__REFS__", "parseRefs"],
            __WRAPPER_ELEMENT__: __WRAPPER_ELEMENT__,
            refs: __REFS__,
            parseRefs: parseRefs,
            createHtml: createHtml,
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
            styles: [{ "type": "code", "content": ".counter-component{text-align: center;margin: 20px 0;}.btn-group{margin-top: 10px;}.btn{margin: 0 5px;}" }],
            resources: [],
            commitConstructorData: function () {
                // Then update states from data
                update$count(0);
                // Finally lock state updates
                lockUpdateRealState();
            },
            updateVariableData: function (data) {
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
<div class="counter-component">
    <h4>Count: <span id="counter-value">${this.__reactive(`rc-${App.View.escString(__VIEW_ID__)}-61`, ['count'], (__rc__) => count, { type: 'output', escapeHTML: true })}</span></h4>
    <div class="btn-group">
        <button class="btn btn-primary" ${this.__addEventConfig("click", [{ "handler": "decrement", "params": [] }])}>-</button>
        <button class="btn btn-primary" ${this.__addEventConfig("click", [{ "handler": "increment", "params": [] }])}>+</button>
        <button class="btn btn-primary" ${this.__addEventConfig("click", [{ "handler": "reset", "params": [] }])}>Reset</button>
    </div>
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

export function Counter(data, systemData) {
    const App = app.make("App");
    const view = new CounterView(App, systemData);
    view.__setup__(data, systemData);
    return view;
}