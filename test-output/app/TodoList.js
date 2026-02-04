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
<input type="text" v-model="$newTodo" placeholder="Add new todo..."/>
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
    return self;
        }