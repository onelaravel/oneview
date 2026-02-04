@useState($isOpen, false)
<div class="demo3-component" @click(toggle())>
    Status: {{ $isOpen ? 'Open' : 'Closed' }}
</div>