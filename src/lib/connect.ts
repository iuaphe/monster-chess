import { Vector } from './game';
import type * as peerjsType from 'peerjs';

export enum ConnectionStatus {
	CONNECTING,
	WAITING,
	CONNECTED,
	DISCONNECTED
}

export enum ConnectionType {
	HOST,
	CLIENT
}

const prefix = 'aydenmc-monster-chess-';

export class Connection {
	peer: peerjsType.Peer;
	connection: peerjsType.DataConnection | undefined = undefined;
	status: ConnectionStatus = ConnectionStatus.CONNECTING;
	// whether this connection is connecting to or hosting the peer-to-peer instance
	type: ConnectionType = ConnectionType.HOST;

	setStatus(newStatus: ConnectionStatus) {
		this.status = newStatus;
		this.onStatusChange();
	}

	handleData(connection: Connection, data: any) {
		const { x1, y1, x2, y2, newTurn } = data as {
			x1: number;
			y1: number;
			x2: number;
			y2: number;
			newTurn: number;
		};
		const move = [new Vector(x1, y1), new Vector(x2, y2)] as [Vector, Vector];
		connection.onMove(move, newTurn);
	}

	constructor(
		private peerjs: typeof import('peerjs'),
		private room: string,
		private onStatusChange: () => void,
		private onMove: (move: [Vector, Vector], newTurn: number) => void
	) {
		this.peer = new peerjs.Peer();
	}

	init() {
		const peerjsRoom = `${prefix}${this.room}`;
		this.onStatusChange();

		this.peer.once('open', () => {
			this.connection = this.peer.connect(peerjsRoom);
			this.connection.once('open', () => {
				this.type = ConnectionType.CLIENT;
				this.setStatus(ConnectionStatus.CONNECTED);
			});
			this.connection.on('data', (data) => this.handleData(this, data));
		});
		this.peer.once('error', (err) => {
			console.log(err.message);
			// the room doesn't exist, so let's create it!
			this.peer = new this.peerjs.Peer(peerjsRoom);
			this.peer.once('open', () => {
				this.setStatus(ConnectionStatus.WAITING);
			});
			this.peer.on('connection', (connection) => {
				this.connection = connection;
				this.type = ConnectionType.HOST;
				this.setStatus(ConnectionStatus.CONNECTED);
				this.connection.on('data', (data) => {
					console.log(data);
					this.handleData(this, data);
				});
			});
		});
	}

	sendMove(move: [Vector, Vector], newTurn: number) {
		const [first, second] = move;
		const data = {
			x1: first.x,
			y1: first.y,
			x2: second.x,
			y2: second.y,
			newTurn
		};
		console.log(`sending ${JSON.stringify(data)}...`);
		this.connection!.send(data);
	}
}
