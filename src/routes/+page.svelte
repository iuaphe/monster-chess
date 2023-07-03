<script lang="ts">
	import { onMount } from 'svelte';

	import {
		Piece,
		Vector,
		knight,
		king,
		pawn,
		queen,
		Color,
		rook,
		bishop,
		Board,
		hasCheckmate,
		Turn,
		GameState
	} from '../lib/game';
	import '../lib/styles/global.css';
	import WinnerOverlay from '$lib/WinnerOverlay.svelte';
	import { Connection, ConnectionStatus, ConnectionType } from '$lib/connect';
	import BoardUi from '$lib/BoardUi.svelte';

	let currentTurn = Turn.WHITE_FIRST;
	let currentGameState = GameState.PLAYING;

	$: r = [0.4, 0.2, 0][currentTurn];

	let connection: Connection;
	let status: ConnectionStatus = ConnectionStatus.CONNECTING;

	const base = 'https://acou12.github.io/monster-chess';
	let room: string;

	const range = (from: number, to: number): number[] => {
		return [...Array(to - from).keys()].map((x) => x + from);
	};

	const checkCheckmate = (board: Board) => {
		if (
			hasCheckmate(
				board,
				currentTurn === Turn.WHITE_FIRST || currentTurn === Turn.WHITE_SECOND
					? Color.WHITE
					: Color.BLACK
			)
		) {
			currentGameState = GameState.ENDED;
		}
	};

	let playingColor: Color;

	const board = new Board([
		...range(0, 8).map((x) => new Piece(pawn, Color.BLACK, new Vector(x, 1))),
		...[rook, knight, bishop, queen, king, bishop, knight, rook].map(
			(type, x) => new Piece(type, Color.BLACK, new Vector(x, 0))
		),

		...range(2, 6).map((x) => new Piece(pawn, Color.WHITE, new Vector(x, 6))),
		new Piece(king, Color.WHITE, new Vector(4, 7)),
		new Piece(rook, Color.WHITE, new Vector(5, 7))
	]);

	onMount(async () => {
		room = window.location.hash;

		if (room === '') {
			room = Math.floor(Math.random() * 1000000).toString(16);
		} else {
			room = room.slice(1);
		}

		connection = new Connection(
			await import('peerjs'),
			room,
			() => {
				status = connection.status;
				playingColor = connection.type === ConnectionType.CLIENT ? Color.BLACK : Color.WHITE;
				console.log(playingColor);
			},
			handleMove
		);

		connection.init();

		document.addEventListener('keydown', (e) => {
			if (e.key === 'ArrowLeft' && lookback < previousBoards.length) {
				lookback += 1;
			} else if (e.key === 'ArrowRight' && lookback > 0) {
				lookback -= 1;
			}
		});
	});

	let previousBoards: Board[] = [];
	let lookback = 0;
	$: viewingBoard = lookback == 0 ? board : previousBoards[previousBoards.length - lookback];

	const onUIMove = (move: [Vector, Vector], numMoves: number) => {
		handleMove(move, (currentTurn + numMoves) % 3);
		connection.sendMove(move, currentTurn);
	};

	const handleMove = (move: [Vector, Vector], newTurn: Turn) => {
		previousBoards = [...previousBoards, board.copy()];
		board.move(...move);
		currentTurn = newTurn;
		checkCheckmate(board);
	};
</script>

<WinnerOverlay
	winner={currentGameState === GameState.ENDED
		? currentTurn === Turn.WHITE_FIRST || currentTurn === Turn.WHITE_SECOND
			? Color.BLACK
			: Color.WHITE
		: undefined}
/>

{#if status === ConnectionStatus.CONNECTING}
	<div class="status">Connecting...</div>
{:else if status === ConnectionStatus.WAITING}
	<div class="status">
		Waiting for opponent... Send them this link: <a href="{base}#{room}">{`${base}#${room}`}</a>
	</div>
{:else if status === ConnectionStatus.CONNECTED}
	<BoardUi
		{currentTurn}
		{currentGameState}
		board={viewingBoard}
		onMove={onUIMove}
		interactive={lookback == 0}
		perspective={playingColor}
	/>
{/if}
<div class="toolbar">
	<div class="turn-indicator">
		<svg viewBox="0 0 1 1">
			<circle cx="0.5" cy="0.5" r="0.4" fill="black" />
			<circle cx="0.5" cy="0.5" {r} fill="white" />
		</svg>
	</div>
</div>
