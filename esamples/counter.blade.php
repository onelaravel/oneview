@const([$count, $setCount] = useState(0))
<div class="counter-component">
    <h4>Count: <span id="counter-value">{{ $count }}</span></h4>
    <div class="btn-group">
        <button class="btn btn-primary" @click(decrement())>-</button>
        <button class="btn btn-primary" @click(increment())>+</button>
        <button class="btn btn-primary" @click(reset())>Reset</button>
    </div>
</div>