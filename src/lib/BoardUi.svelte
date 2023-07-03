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

	export let onMove: (move: [Vector, Vector], numMoves: number) => void;

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

		canvas.addEventListener('mousedown', (event) => {
			if (currentGameState === GameState.PLAYING && interactive) {
				if (event.button === 0) {
					const tile = new Vector(
						Math.floor((event.offsetX * (canvas.width / canvas.clientWidth)) / TILE_SIZE),
						transformTileY(
							Math.floor((event.offsetY * (canvas.height / canvas.clientHeight)) / TILE_SIZE)
						)
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
				} else if (event.button === 2) {
					selectedPiece = undefined;
				}
			}
		});

		canvas.addEventListener('mouseup', (event) => {
			if (selectedPiece !== undefined) {
				const tile = new Vector(
					Math.floor((event.offsetX * (canvas.width / canvas.clientWidth)) / TILE_SIZE),
					transformTileY(
						Math.floor((event.offsetY * (canvas.height / canvas.clientHeight)) / TILE_SIZE)
					)
				);
				if (currentTurn === Turn.WHITE_SECOND || currentTurn === Turn.BLACK) {
					const singleMove = singleMoves.find((move) => move.equals(tile));
					if (singleMove !== undefined) {
						const move: [Vector, Vector] = [selectedPiece.position.copy(), singleMove.copy()];
						onMove(move, 1);
					}
				} else {
					const singleMove = singleMoves.find((move) => move.equals(tile));
					const doubleMove = doubleMoves.find((move) => move.finalPosition.equals(tile));
					if (singleMove !== undefined) {
						const move: [Vector, Vector] = [selectedPiece.position.copy(), singleMove.copy()];
						onMove(move, 1);
					} else if (doubleMove !== undefined) {
						if (doubleMove.takes !== undefined) {
							const firstMove: [Vector, Vector] = [
								selectedPiece.position.copy(),
								doubleMove.takes.copy()
							];
							onMove(firstMove, 1);

							const secondMove: [Vector, Vector] = [
								doubleMove.takes.copy(),
								doubleMove.finalPosition.copy()
							];
							onMove(secondMove, 1);
						} else {
							const move: [Vector, Vector] = [
								selectedPiece.position.copy(),
								doubleMove.finalPosition.copy()
							];
							onMove(move, 2);
						}
					}
				}
				selectedPiece = undefined;
			}
		});

		canvas.addEventListener('contextmenu', (event) => event.preventDefault());

		document.addEventListener('mousemove', (event) => {
			mousePosition.x = event.offsetX * (canvas.width / canvas.clientWidth);
			mousePosition.y = event.offsetY * (canvas.height / canvas.clientHeight);
		});
	});
</script>

<canvas bind:this={canvas} />
