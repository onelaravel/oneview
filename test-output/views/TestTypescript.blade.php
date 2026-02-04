@useState($test, 'hello')
@let($count, 0)

<div>
    <p>{{ $test }}</p>
    <p>Count: {{ $count }}</p>
    <button @click($setTest('world'))>Change</button>
</div>