<script lang="ts">
	import { bishop, doubleMoves, king, knight, pawn, queen, rook, Vector } from '../lib/game';
	import { onMount } from 'svelte';
	import kingSrc from '../lib/images/wk.png';

	let canvas: HTMLCanvasElement;

	onMount(() => {
		const BOARD_SIZE = 1000;
		const TILE_SIZE = BOARD_SIZE / 8;

		const kingImg = new Image();
		kingImg.src = kingSrc;

		canvas.width = BOARD_SIZE;
		canvas.height = BOARD_SIZE;
		const ctx = canvas.getContext('2d')!;
		ctx.fillStyle = '#b58863';
		ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
		ctx.fillStyle = '#f0d9b5';
		for (let x = 0; x < 8; x++) {
			for (let y = x % 2; y < 8; y += 2) {
				ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
			}
		}

		const drawCircle = (x: number, y: number, r: number, fill: string) => {
			ctx.fillStyle = fill;
			ctx.beginPath();
			ctx.ellipse(
				x * TILE_SIZE + TILE_SIZE / 2,
				y * TILE_SIZE + TILE_SIZE / 2,
				r,
				r,
				0,
				0,
				2 * Math.PI
			);
			ctx.fill();
		};

		const visMoves = (single: Vector[], double: Vector[]) => {
			single.forEach((move) => {
				drawCircle(
					move.x,
					move.y,
					TILE_SIZE / 5,
					(move.x + move.y) % 2 == 1 ? '#6e533c' : '#92846e'
				);
				drawCircle(
					move.x,
					move.y,
					TILE_SIZE / 10,
					(move.x + move.y) % 2 == 1 ? '#b58863' : '#f0d9b5'
				);
			});
			double.forEach((move) => {
				drawCircle(
					move.x,
					move.y,
					TILE_SIZE / 5,
					(move.x + move.y) % 2 == 1 ? '#6e533c' : '#92846e'
				);
			});
		};

		const chosenTemplate = rook;
		const { single, double } = doubleMoves(chosenTemplate, new Vector(3, 4));
		visMoves(single, double);
		console.log(single.length + double.length);
		ctx.drawImage(
			(() => {
				const img = new Image();
				img.src = `/images/w${chosenTemplate.id}.png`;
				return img;
			})(),
			3 * TILE_SIZE + 0 + 0,
			4 * TILE_SIZE,
			TILE_SIZE,
			TILE_SIZE
		);
	});
</script>

<h1>MONSTER CHESS (AWESOME)</h1>

<canvas bind:this={canvas} />
