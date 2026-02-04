@useState($count, 0)
@let($temp, 100)

<div class="counter">
    <h3>Count: {{ $count }}</h3>
    <button @click($setCount($count + 1))>Increment</button>
    <button @click($setCount($count - 1))>Decrement</button>
</div>