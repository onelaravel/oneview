import { Application, View, ViewController, app } from 'oneview';


const __VIEW_PATH__ = 'web.TodoList';
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



class TodolistViewController extends ViewController {
    constructor(view) {
        super(view, __VIEW_PATH__, __VIEW_TYPE__);
    }
}

class TodolistView extends View {
    constructor(App, systemData) {
        super(__VIEW_PATH__, __VIEW_TYPE__, TodolistViewController);
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
        const __VARIABLE_LIST__ = [];
        const set$todos = __STATE__.__.register('todos');
        let todos = null;
        const setTodos = (state) => {
            todos = state;
            set$todos(state);
        };
        __STATE__.__.setters.setTodos = setTodos;
        __STATE__.__.setters.todos = setTodos;
        const update$todos = (value) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('todos', value);
                todos = value;
            }
        };
        const set$newTodo = __STATE__.__.register('newTodo');
        let newTodo = null;
        const setNewTodo = (state) => {
            newTodo = state;
            set$newTodo(state);
        };
        __STATE__.__.setters.setNewTodo = setNewTodo;
        __STATE__.__.setters.newTodo = setNewTodo;
        const update$newTodo = (value) => {
            if(__STATE__.__.canUpdateStateByKey){
                updateStateByKey('newTodo', value);
                newTodo = value;
            }
        };


        this.__ctrl__.setUserDefinedConfig({
            addTodo() {
                if (this.newTodo.trim()) {
                    this.setTodos([...this.todos, this.newTodo]);
                    this.setNewTodo('');
                }
            },

            removeTodo(index) {
                const updated = this.todos.filter((_, i) => i !== index);
                this.setTodos(updated);
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
                update$todos([]);
                update$newTodo('');
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
                update$todos([]);
                update$newTodo('');
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




            <div class="todo-list">
            <h2>Todo List</h2>
            <input type="text" data-binding="newTodo" data-view-id="${__VIEW_ID__}" placeholder="Add new todo..."/>
            <button ${this.__addEventConfig("click", [{"handler":"addTodo","params":[]}])}>Add</button>

            <ul>
            ${this.__watch(`${__VIEW_ID__}-watch-1`, ['todos'], () => this.__foreach(todos, (todo, index, __loopIndex, __loop) => `
            <li>
            ${App.View.escString(todo)}
            <button ${this.__addEventConfig("click", [{"handler":"removeTodo","params":[() => index]}])}>Remove</button>
            </li>
            `))}
            </ul>
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
export function Todolist(__data__ = {}, systemData = {}) {
    const App = app.make("App");
    const view = new TodolistView(App, systemData);
    view.$__setup__(__data__, systemData);
    return view;
}
export default Todolist;