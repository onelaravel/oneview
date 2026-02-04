@useState($todos, [])
@useState($newTodo, '')

<div class="todo-list">
    <h2>Todo List</h2>
    <input 
        type="text" 
        @bind($newTodo)
        placeholder="Add new todo..."
    />
    <button @click(addTodo())>Add</button>
    
    <ul>
        @foreach($todos as $index => $todo)
        <li>
            {{ $todo }}
            <button @click(removeTodo($index))>Remove</button>
        </li>
        @endforeach
    </ul>
</div>