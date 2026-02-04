@useState($isOpen, false)
@const($API_URL = '/api')

<div class="demo" @click($setIsOpen(!$isOpen))>
    <h2>{{ $isOpen ? 'Open' : 'Closed' }}</h2>
    <p v-if="$isOpen">
        This is demo content
    </p>
</div>