<script lang="ts">
	import { pieceTypes, getDoubleMoves, Piece, Vector, knight, king } from '../lib/game';
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;

	onMount(() => {
		const BOARD_SIZE = 1000;
		const TILE_SIZE = BOARD_SIZE / 8;

		const imageFromId = (id: string) => {
			const image = new Image();
			image.src = `/images/w${id}.png`;
			return image;
		};

		const pieceImages: Record<string, HTMLImageElement> = Object.assign(
			{},
			...pieceTypes.map((type) => ({
				[type.id]: imageFromId(type.id)
			}))
		);

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

		let pieceIndex = 0;
		const thePiece = new Piece(pieceTypes[pieceIndex], new Vector(0, 0));
		const pieces: Piece[] = [thePiece];

		let selectedPiece: Piece | undefined = undefined;

		let lastMove: [Vector, Vector] | undefined = undefined;

		const update = () => {
			requestAnimationFrame(update);

			ctx.fillStyle = '#b58863';
			ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
			ctx.fillStyle = '#f0d9b5';
			for (let x = 0; x < 8; x++) {
				for (let y = x % 2; y < 8; y += 2) {
					ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
				}
			}

			// if (lastMove !== undefined) {
			// 	lastMove.map((move) => {
			// 		ctx.fillStyle = (move.x + move.y) % 2 == 0 ? '#cdd26a' : '#aaa23a';
			// 		ctx.fillRect(move.x * TILE_SIZE, move.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
			// 	});
			// }
			pieces.forEach((piece) => {
				if (piece !== selectedPiece)
					ctx.drawImage(
						pieceImages[piece.type.id],
						piece.position.x * TILE_SIZE,
						piece.position.y * TILE_SIZE,
						TILE_SIZE,
						TILE_SIZE
					);
			});
			if (selectedPiece !== undefined) {
				const doubleMoves = getDoubleMoves(selectedPiece.type, selectedPiece.position);
				visMoves(doubleMoves.single, doubleMoves.double);
				ctx.drawImage(
					pieceImages[selectedPiece.type.id],
					mousePosition.x - TILE_SIZE / 2,
					mousePosition.y - TILE_SIZE / 2,
					TILE_SIZE,
					TILE_SIZE
				);
			}
		};

		update();

		const mousePosition = new Vector(0, 0);

		canvas.addEventListener('mousedown', (event) => {
			const tile = new Vector(
				Math.floor(event.offsetX / TILE_SIZE),
				Math.floor(event.offsetY / TILE_SIZE)
			);
			const piece = pieces.find((piece) => piece.position.equals(tile));
			if (piece !== undefined) {
				selectedPiece = piece;
			}
		});

		canvas.addEventListener('mouseup', (event) => {
			if (selectedPiece !== undefined) {
				const tile = new Vector(
					Math.floor(event.offsetX / TILE_SIZE),
					Math.floor(event.offsetY / TILE_SIZE)
				);
				const dMoves = getDoubleMoves(selectedPiece.type, selectedPiece.position);
				if (
					!tile.equals(selectedPiece.position) &&
					(dMoves.single.some((m) => m.equals(tile)) || dMoves.double.some((m) => m.equals(tile)))
				) {
					lastMove = [selectedPiece.position, tile];
					selectedPiece.position = tile;
				}
				selectedPiece = undefined;
			}
		});

		document.addEventListener('mousemove', (event) => {
			mousePosition.x = event.offsetX;
			mousePosition.y = event.offsetY;
		});

		document.addEventListener('keydown', (event) => {
			if (event.key === 'ArrowLeft') {
				pieceIndex--;
				if (pieceIndex < 0) pieceIndex += pieceTypes.length;
				thePiece.type = pieceTypes[pieceIndex];
			} else if (event.key === 'ArrowRight') {
				pieceIndex++;
				pieceIndex %= pieceTypes.length;
				thePiece.type = pieceTypes[pieceIndex];
			}
		});
	});
</script>

<canvas bind:this={canvas} />
