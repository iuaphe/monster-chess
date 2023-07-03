<script lang="ts">
	import { Color } from './game';
	import { scale } from 'svelte/transition';

	export let winner: Color | undefined;
</script>

{#if winner === Color.WHITE}
	<div class="overlay white" transition:scale>WHITE WINS!</div>
{:else if winner === Color.BLACK}
	<div class="overlay black" transition:scale>BLACK WINS!</div>
{/if}

<style>
	.overlay {
		position: absolute;
		top: 0px;
		left: 0px;
		transform-origin: center;
		transform: translate(calc(50vw - 50%), calc(50vh - 50%));
		font-size: 5em;
		padding: 20px;
		border-radius: 10px;
	}

	.white {
		color: black;
		background-color: white;
	}

	.black {
		color: white;
		background-color: black;
	}
</style>
