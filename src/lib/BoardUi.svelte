<script lang="ts">
	import { onMount } from 'svelte';
	import {
		pieceTypes,
		type Board,
		Color,
		GameState,
		Turn,
		Piece,
		Vector,
		type CandidateDoubleMove
	} from './game';
	import { base } from '$app/paths';

	export let currentTurn: Turn;
	export let currentGameState: GameState;

	export let board: Board;

	export let interactive: boolean;

	export let perspective: Color;

	const transformTileY = (y: number): number => {
		return perspective === Color.WHITE ? y : 7 - y;
	};

	export let onMove: (move: [Vector, Vector]) => void;

	let canvas: HTMLCanvasElement;

	onMount(() => {
		const BOARD_SIZE = window.innerHeight * 1.5;
		const TILE_SIZE = BOARD_SIZE / 8;

		const generateImage = (id: string, color: Color) => {
			const image = new Image();
			image.src = `${base}/images/${color === Color.WHITE ? 'w' : 'b'}${id}.png`;
			return image;
		};

		const whitePieceImages: Record<string, HTMLImageElement> = Object.assign(
			{},
			...pieceTypes.map((type) => ({
				[type.id]: generateImage(type.id, Color.WHITE)
			}))
		);

		const blackPieceImages: Record<string, HTMLImageElement> = Object.assign(
			{},
			...pieceTypes.map((type) => ({
				[type.id]: generateImage(type.id, Color.BLACK)
			}))
		);

		const getImage = (piece: Piece) => {
			return (piece.color === Color.WHITE ? whitePieceImages : blackPieceImages)[piece.type.id];
		};

		canvas.width = BOARD_SIZE;
		canvas.height = BOARD_SIZE;
		const ctx = canvas.getContext('2d')!;
		ctx.fillStyle = '#b58863';
		ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
		ctx.fillStyle = '#f0d9b5';
		for (let x = 0; x < 8; x++) {
			for (let y = x % 2; y < 8; y += 2) {
				ctx.fillRect(x * TILE_SIZE, transformTileY(y) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
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

		const visualizeMoves = (
			halfMoves: Vector[],
			fullMoves: Vector[],
			halfTakes: Vector[],
			fullTakes: Vector[]
		) => {
			halfMoves.forEach((move) => {
				drawCircle(
					move.x,
					transformTileY(move.y),
					TILE_SIZE / 5,
					(move.x + move.y) % 2 == 1 ? '#6e533c' : '#92846e'
				);
				drawCircle(
					move.x,
					transformTileY(move.y),
					TILE_SIZE / 10,
					(move.x + move.y) % 2 == 1 ? '#b58863' : '#f0d9b5'
				);
			});
			fullMoves.forEach((move) => {
				drawCircle(
					move.x,
					transformTileY(move.y),
					TILE_SIZE / 5,
					(move.x + move.y) % 2 == 1 ? '#6e533c' : '#92846e'
				);
			});
			halfTakes.forEach((move) => {
				ctx.fillStyle = (move.x + move.y) % 2 == 1 ? '#6e533c' : '#92846e';
				ctx.fillRect(move.x * TILE_SIZE, transformTileY(move.y) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
				ctx.fillStyle = (move.x + move.y) % 2 == 1 ? '#b58863' : '#f0d9b5';
				ctx.fillRect(
					move.x * TILE_SIZE + TILE_SIZE / 15,
					transformTileY(move.y) * TILE_SIZE + TILE_SIZE / 15,
					TILE_SIZE - (2 * TILE_SIZE) / 15,
					TILE_SIZE - (2 * TILE_SIZE) / 15
				);
			});
			fullTakes.forEach((move) => {
				ctx.fillStyle = (move.x + move.y) % 2 == 1 ? '#6e533c' : '#92846e';
				ctx.fillRect(move.x * TILE_SIZE, transformTileY(move.y) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
			});
		};

		let selectedPiece: Piece | undefined = undefined;

		let singleMoves: Vector[] = [];
		let doubleMoves: CandidateDoubleMove[] = [];

		let halfMoves: Vector[] = [];
		let fullMoves: Vector[] = [];
		let halfTakes: Vector[] = [];
		let fullTakes: Vector[] = [];

		const update = () => {
			requestAnimationFrame(update);

			ctx.fillStyle = '#b58863';
			ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
			ctx.fillStyle = '#f0d9b5';
			for (let x = 0; x < 8; x++) {
				for (let y = x % 2; y < 8; y += 2) {
					ctx.fillRect(x * TILE_SIZE, transformTileY(y) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
				}
			}

			if (selectedPiece !== undefined) {
				visualizeMoves(halfMoves!, fullMoves!, halfTakes!, fullTakes!);
			}

			board.pieces.forEach((piece) => {
				if (piece !== selectedPiece)
					ctx.drawImage(
						getImage(piece),
						piece.position.x * TILE_SIZE,
						transformTileY(piece.position.y) * TILE_SIZE,
						TILE_SIZE,
						TILE_SIZE
					);
			});

			if (selectedPiece !== undefined) {
				ctx.drawImage(
					getImage(selectedPiece),
					mousePosition.x - TILE_SIZE / 2,
					mousePosition.y - TILE_SIZE / 2,
					TILE_SIZE,
					TILE_SIZE
				);
			}
		};

		update();

		const mousePosition = new Vector(0, 0);

		const partitionMoves = (moves: Vector[]): [Vector[], Vector[]] => {
			const moveMoves: Vector[] = [];
			const takes: Vector[] = [];
			moves.forEach((move) => {
				if (board.pieces.some((piece) => piece.position.equals(move))) {
					takes.push(move);
				} else {
					moveMoves.push(move);
				}
			});
			return [moveMoves, takes];
		};

		const onMouseDown = (pos: [number, number]) => {
			if (currentGameState === GameState.PLAYING && interactive) {
				const tile = new Vector(
					Math.floor((pos[0] * (canvas.width / canvas.clientWidth)) / TILE_SIZE),
					transformTileY(Math.floor((pos[1] * (canvas.height / canvas.clientHeight)) / TILE_SIZE))
				);
				const piece = board.pieceAt(tile);
				if (
					piece !== undefined &&
					((piece.color === Color.WHITE &&
						(currentTurn === Turn.WHITE_FIRST || currentTurn === Turn.WHITE_SECOND)) ||
						(piece.color === Color.BLACK && currentTurn === Turn.BLACK)) &&
					perspective === piece.color
				) {
					selectedPiece = piece;
					if (currentTurn === Turn.WHITE_SECOND || currentTurn === Turn.BLACK) {
						singleMoves = piece
							.moves(board)
							.filter((move) =>
								board
									.copyWithMove(piece.position, move)
									.legalState(
										currentTurn === Turn.WHITE_FIRST || currentTurn === Turn.WHITE_SECOND
											? Color.WHITE
											: Color.BLACK
									)
							);
						doubleMoves = [];
						[fullMoves, fullTakes] = partitionMoves(singleMoves);
						[halfMoves, halfTakes] = [[], []];
					} else {
						singleMoves = piece.moves(board);
						doubleMoves = piece
							.doubleMoves(board, singleMoves, true)
							.filter((move) =>
								board
									.copyWithMove(piece.position, move.finalPosition)
									.legalState(
										currentTurn === Turn.WHITE_FIRST || currentTurn === Turn.WHITE_SECOND
											? Color.WHITE
											: Color.BLACK
									)
							);
						[halfMoves, halfTakes] = partitionMoves(singleMoves);
						[fullMoves, fullTakes] = partitionMoves(doubleMoves.map((m) => m.finalPosition));
					}
				}
			}
		};

		canvas.addEventListener('mousedown', (e) => onMouseDown([e.offsetX, e.offsetY]));
		canvas.addEventListener('touchstart', (e) =>
			onMouseDown([e.touches[0].clientX, e.touches[0].clientY])
		);

		const onMouseUp = (pos: [number, number]) => {
			if (selectedPiece !== undefined) {
				const tile = new Vector(
					Math.floor((pos[0] * (canvas.width / canvas.clientWidth)) / TILE_SIZE),
					transformTileY(Math.floor((pos[1] * (canvas.height / canvas.clientHeight)) / TILE_SIZE))
				);
				if (currentTurn === Turn.WHITE_SECOND || currentTurn === Turn.BLACK) {
					const singleMove = singleMoves.find((move) => move.equals(tile));
					if (singleMove !== undefined) {
						onMove([selectedPiece.position.copy(), singleMove.copy()]);
					}
				} else {
					const singleMove = singleMoves.find((move) => move.equals(tile));
					const doubleMove = doubleMoves.find((move) => move.finalPosition.equals(tile));
					if (singleMove !== undefined) {
						onMove([selectedPiece.position.copy(), singleMove.copy()]);
					} else if (doubleMove !== undefined) {
						if (doubleMove.takes !== undefined) {
							onMove([selectedPiece.position.copy(), doubleMove.takes.copy()]);
							onMove([doubleMove.takes.copy(), doubleMove.finalPosition.copy()]);
						} else {
							onMove([selectedPiece.position.copy(), doubleMove.singleMove.copy()]);
							onMove([doubleMove.singleMove.copy(), doubleMove.finalPosition.copy()]);
						}
					}
				}
				selectedPiece = undefined;
			}
		};

		canvas.addEventListener('mouseup', (e) => onMouseUp([e.offsetX, e.offsetY]));
		canvas.addEventListener('touchend', (e) => {
			onMouseUp([e.changedTouches[0].clientX, e.changedTouches[0].clientY]);
		});

		canvas.addEventListener('contextmenu', (event) => event.preventDefault());

		const onMouseMove = (pos: [number, number]) => {
			mousePosition.x = pos[0] * (canvas.width / canvas.clientWidth);
			mousePosition.y = pos[1] * (canvas.height / canvas.clientHeight);
		};

		document.addEventListener('mousemove', (event) => onMouseMove([event.offsetX, event.offsetY]));
		document.addEventListener('touchmove', (event) =>
			onMouseMove([event.touches[0].clientX, event.touches[0].clientY])
		);
	});
</script>

<canvas bind:this={canvas} />
