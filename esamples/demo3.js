import { View } from 'onelaraveljs'; // cái này chỉ là mẫu, ở project path sẽ khác
import { app } from 'onelaraveljs'; // cái này chỉ là mẫu, ở project path sẽ khác
// tên class phải bao gồm context và folder + tên file (camel case) + view. ví dụ file tại resources/one/app/web/views/pages/demo3.one thì class sẽ là WebPagesDemo3View
class Demo3View extends View {
    constructor(App, systemData) {
        // chú ý đây là path đầy dủ dạng context.folder.file ví dụ web.pages.demo3
        super("demo3", "view");
        this.__ctrl__.setApp(App);
    }

    __setup__(__data__, systemData) {
        const { __base__, __layout__, __page__, __component__, __template__, __context__, __partial__, __system__, __env = {}, __helper = {} } = systemData;
        const App = app.make("App");
        const Helper = app.make("Helper");
        const __VIEW_PATH__ = 'demo3'; // chú ý đây là path đầy dủ dạng context.folder.file ví dụ web.pages.demo3
        const __VIEW_ID__ = __data__.__SSR_VIEW_ID__ || App.Helper.generateViewId();
        const __VIEW_TYPE__ = 'view';
        const cpparts = __VIEW_PATH__.split('.');
        cpparts.pop();  // Remove view name
        const __VIEW_NAMESPACE__ = cpparts.length > 0 ? cpparts.join('.') + '.' : '';

        const __STATE__ = this.__ctrl__.states; // state theo kiểu v2

        const useState = (value) => __STATE__.__useState(value);
        const updateRealState = (state) => __STATE__.__.updateRealState(state);
        const lockUpdateRealState = () => __STATE__.__.lockUpdateRealState();
        const updateStateByKey = (key, state) => __STATE__.__.updateStateByKey(key, state);

        const __UPDATE_DATA_TRAIT__ = {};
        const __VARIABLE_LIST__ = [];

        // phần này giống v1
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

        // phần này mới
        this.__ctrl__.setUserDefined({ // object được export default ở script setup
        toggle() {
            setIsOpen(!isOpen);
            console.log(`component ${__VIEW_PATH__}`, this);
            console.log(`toggled to ${isOpen ? 'Open' : 'Closed'}`);
        }
    });
        // config mới loại bõ  phần không dùng
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
            data: __data__ || {},
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
                // Then update states from data
                update$isOpen(false);
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
                update$isOpen(false);
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
<div class="demo3-component" ${this.__addEventConfig("click", [(event) => setIsOpen(! isOpen)])}>
Status: ${this.__reactive(`rc-${App.View.escString(__VIEW_ID__)}-67`, ['isOpen'], (__rc__) => isOpen ? 'Open' : 'Closed', {type: 'output', escapeHTML: true})}
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
// cũng gần giống tên class ở trên nhưng không có view ở cuối
export function Demo3(__data__, systemData) {
    const App = app.make("App");
    const view = new Demo3View(App, systemData);
    view.__setup__(__data__, systemData);
    return view;
}