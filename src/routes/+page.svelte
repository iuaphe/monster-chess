<script lang="ts">
	import {
		pieceTypes,
		Piece,
		Vector,
		knight,
		king,
		pawn,
		queen,
		Color,
		rook,
		bishop,
		PieceType,
		Board,
		type CandidateDoubleMove as DoubleMove
	} from '../lib/game';
	import { onMount } from 'svelte';
	import '../lib/styles/global.css';
	import { base } from '$app/paths';

	// todo: split this file up. it's getting to be a bit much.

	let canvas: HTMLCanvasElement;

	enum TurnState {
		WHITE_FIRST,
		WHITE_SECOND,
		BLACK
	}

	let turnState = TurnState.WHITE_FIRST;

	const nextTurnState = () => {
		turnState++;
		turnState %= 3;
	};

	$: r = [0.4, 0.2, 0][turnState];

	onMount(() => {
		const BOARD_SIZE = window.innerHeight;
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

		const visualizeMoves = (
			halfMoves: Vector[],
			fullMoves: Vector[],
			halfTakes: Vector[],
			fullTakes: Vector[]
		) => {
			halfMoves.forEach((move) => {
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
			fullMoves.forEach((move) => {
				drawCircle(
					move.x,
					move.y,
					TILE_SIZE / 5,
					(move.x + move.y) % 2 == 1 ? '#6e533c' : '#92846e'
				);
			});
			halfTakes.forEach((move) => {
				ctx.fillStyle = (move.x + move.y) % 2 == 1 ? '#6e533c' : '#92846e';
				ctx.fillRect(move.x * TILE_SIZE, move.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
				ctx.fillStyle = (move.x + move.y) % 2 == 1 ? '#b58863' : '#f0d9b5';
				ctx.fillRect(
					move.x * TILE_SIZE + TILE_SIZE / 15,
					move.y * TILE_SIZE + TILE_SIZE / 15,
					TILE_SIZE - (2 * TILE_SIZE) / 15,
					TILE_SIZE - (2 * TILE_SIZE) / 15
				);
			});
			fullTakes.forEach((move) => {
				ctx.fillStyle = (move.x + move.y) % 2 == 1 ? '#6e533c' : '#92846e';
				ctx.fillRect(move.x * TILE_SIZE, move.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
			});
		};

		const range = (from: number, to: number): number[] => {
			return [...Array(to - from).keys()].map((x) => x + from);
		};

		let board = new Board([
			...range(0, 8).map((x) => new Piece(pawn, Color.BLACK, new Vector(x, 1))),
			...[rook, knight, bishop, queen, king, bishop, knight, rook].map(
				(type, x) => new Piece(type, Color.BLACK, new Vector(x, 0))
			),

			...range(2, 6).map((x) => new Piece(pawn, Color.WHITE, new Vector(x, 6))),
			new Piece(king, Color.WHITE, new Vector(4, 7))
		]);

		type GameState = {
			turnState: TurnState;
			board: Board;
		};

		let currentGameState = 0;
		let previousGameStates: GameState[] = [
			{
				turnState,
				board: board.copy()
			}
		];

		const pushBoardState = () => {
			if (currentGameState < previousGameStates.length - 1) {
				previousGameStates.splice(0, currentGameState + 1);
			}
			previousGameStates.push({
				turnState,
				board: board.copy()
			});
			currentGameState++;
		};

		let selectedPiece: Piece | undefined = undefined;

		let singleMoves: Vector[] = [];
		let doubleMoves: DoubleMove[] = [];

		let checkPosition: Vector | undefined = undefined;

		let halfMoves: Vector[] = [];
		let fullMoves: Vector[] = [];
		let halfTakes: Vector[] = [];
		let fullTakes: Vector[] = [];
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
			if (selectedPiece !== undefined) {
				visualizeMoves(halfMoves!, fullMoves!, halfTakes!, fullTakes!);
			}
			board.pieces.forEach((piece) => {
				if (piece !== selectedPiece)
					ctx.drawImage(
						getImage(piece),
						piece.position.x * TILE_SIZE,
						piece.position.y * TILE_SIZE,
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
			const moveMoves: Vector[] = []; // todo: less lame name
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
			if (event.button === 0) {
				const tile = new Vector(
					Math.floor(event.offsetX / TILE_SIZE),
					Math.floor(event.offsetY / TILE_SIZE)
				);
				const piece = board.pieceAt(tile);
				if (
					piece !== undefined &&
					((piece.color === Color.WHITE &&
						(turnState === TurnState.WHITE_FIRST || turnState === TurnState.WHITE_SECOND)) ||
						(piece.color === Color.BLACK && turnState === TurnState.BLACK))
				) {
					selectedPiece = piece;
					if (turnState === TurnState.WHITE_SECOND || turnState === TurnState.BLACK) {
						singleMoves = piece
							.moves(board)
							.filter((move) =>
								board
									.copyWithMove(piece.position, move)
									.legalState(
										turnState === TurnState.WHITE_FIRST || turnState === TurnState.WHITE_SECOND
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
							.doubleMoves(board, singleMoves)
							.filter((move) =>
								board
									.copyWithMove(piece.position, move.finalPosition)
									.legalState(
										turnState === TurnState.WHITE_FIRST || turnState === TurnState.WHITE_SECOND
											? Color.WHITE
											: Color.BLACK
									)
							);
						[halfMoves, halfTakes] = partitionMoves(singleMoves);
						[fullMoves, fullTakes] = partitionMoves(doubleMoves.map((m) => m.finalPosition));
					}
				} else if (boardMode === BoardMode.EDIT) {
					board.pieces.push(new Piece(pieceTypes[selectedEditPiece], selectedColor, tile));
				}
			} else if (event.button === 2) {
				selectedPiece = undefined;
			}
		});

		// implies statements
		// const x: number | undefined;
		// const y: number | undefined;
		// x === undefined <-> y === undefined

		canvas.addEventListener('mouseup', (event) => {
			if (selectedPiece !== undefined) {
				let moved = false;
				const tile = new Vector(
					Math.floor(event.offsetX / TILE_SIZE),
					Math.floor(event.offsetY / TILE_SIZE)
				);
				if (turnState === TurnState.WHITE_SECOND || turnState === TurnState.BLACK) {
					const singleMove = singleMoves.find((move) => move.equals(tile));
					if (singleMove !== undefined) {
						board.move(selectedPiece.position, singleMove);
						turnState++;
						pushBoardState();
					}
				} else {
					const singleMove = singleMoves.find((move) => move.equals(tile));
					const doubleMove = doubleMoves.find((move) => move.finalPosition.equals(tile));
					if (singleMove !== undefined) {
						board.move(selectedPiece.position, singleMove);
						turnState++;
						pushBoardState();
					} else if (doubleMove !== undefined) {
						if (doubleMove.takes !== undefined) {
							board.move(selectedPiece.position, doubleMove.takes);
							board.move(doubleMove.takes, doubleMove.finalPosition);
						} else {
							board.move(selectedPiece.position, doubleMove.finalPosition);
						}
						turnState += 2;
						pushBoardState();
					}
				}
				turnState %= 3;
				selectedPiece = undefined;
			}
		});

		canvas.addEventListener('contextmenu', (event) => event.preventDefault());

		document.addEventListener('mousemove', (event) => {
			mousePosition.x = event.offsetX;
			mousePosition.y = event.offsetY;
		});

		document.addEventListener('keydown', (event) => {
			if (event.key === 'ArrowLeft') {
				if (currentGameState > 0) {
					currentGameState--;
					board = previousGameStates[currentGameState].board.copy();
					turnState = previousGameStates[currentGameState].turnState;
				}
			} else if (event.key === 'ArrowRight') {
				if (currentGameState < previousGameStates.length - 1) {
					currentGameState++;
					board = previousGameStates[currentGameState].board.copy();
					turnState = previousGameStates[currentGameState].turnState;
				}
			}
		});
	});

	enum BoardMode {
		ANALYSIS,
		EDIT
	}

	let boardMode = BoardMode.ANALYSIS;
	let selectedEditPiece: number = 0;
	let selectedColor: Color = Color.WHITE;

	const toggleColor = () => {
		selectedColor++;
		selectedColor %= 2;
	};

	const toggleMode = () => {
		boardMode++;
		boardMode %= 2;
	};
</script>

<canvas bind:this={canvas} />
{#if boardMode === BoardMode.EDIT}
	<div class="toolbar">
		<img
			src="{base}/images/edit.svg"
			alt="A pencil."
			on:mousedown={toggleMode}
			on:keydown={toggleMode}
		/>
		<img
			src="{base}/images/palette.svg"
			alt="A color palette."
			on:mousedown={toggleColor}
			on:keydown={toggleColor}
		/>
		{#each pieceTypes as pt, i}
			<img
				src={`${base}/images/${selectedColor === Color.WHITE ? 'w' : 'b'}${pt.id}.png`}
				alt=""
				class:selected={i === selectedEditPiece}
				on:mousedown={() => {
					selectedEditPiece = i;
				}}
				on:keydown={() => {
					selectedEditPiece = i;
				}}
			/>
		{/each}
	</div>
{:else}
	<div class="toolbar">
		<img
			src="{base}/images/search.svg"
			alt="A magnifying glass."
			on:mousedown={toggleMode}
			on:keydown={toggleMode}
		/>
		<div class="turn-indicator" on:click={nextTurnState} on:keydown={nextTurnState}>
			<svg viewBox="0 0 1 1">
				<circle cx="0.5" cy="0.5" r="0.4" fill="black" />
				<circle cx="0.5" cy="0.5" {r} fill="white" />
			</svg>
		</div>
	</div>
{/if}
