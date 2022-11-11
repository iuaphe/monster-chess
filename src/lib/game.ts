export class Vector {
	constructor(public x: number, public y: number) {}
	add(x: number, y: number) {
		return new Vector(this.x + x, this.y + y);
	}
	addVec(other: Vector) {
		return this.add(other.x, other.y);
	}
	equals(other: Vector) {
		return this.x === other.x && this.y === other.y;
	}
}

abstract class PieceType {
	abstract id: string;
	abstract moves(from: Vector, board: Piece[], color: Color): Vector[];
}

export enum Color {
	WHITE,
	BLACK
}

export const inBounds = (v: Vector) => 0 <= v.x && v.x < 8 && 0 <= v.y && v.y < 8;

const repeat = (
	from: Vector,
	dx: number,
	dy: number,
	maxN: number,
	board: Piece[],
	color: Color,
	includesTakes: boolean
) => {
	const result: Vector[] = [];
	let v = from.add(dx, dy);
	let n = 0;
	while (inBounds(v) && n < maxN) {
		const onPiece = board.find((piece) => piece.position.equals(v));
		if (onPiece !== undefined) {
			if (includesTakes && onPiece.color != color) {
				result.push(v);
			}
			break;
		}
		result.push(v);
		v = v.add(dx, dy);
		n++;
	}
	return result;
};

export const uniqueVectors = (vs: Vector[]) => {
	const result: Vector[] = [];
	for (const v of vs) {
		if (!result.some((other) => other.x === v.x && other.y === v.y)) result.push(v);
	}
	return result;
};

const repeatSymmetric = (
	from: Vector,
	dx: number,
	dy: number,
	maxN: number,
	board: Piece[],
	color: Color,
	includesTakes: boolean
) => {
	let result: Vector[] = [];
	const combinations: [number, number][] = [
		[dx, dy],
		[dx, -dy],
		[-dx, dy],
		[-dx, -dy],
		[dy, dx],
		[dy, -dx],
		[-dy, dx],
		[-dy, -dx]
	];
	combinations.forEach((dr) => {
		result = result.concat(repeat(from, ...dr, maxN, board, color, includesTakes));
	});
	// todo: take out the redundant combinations so we don't have to uniqueify
	// e.g., (0, 1) == (-0, 1)
	return uniqueVectors(result);
};

export const getDoubleMoves = (
	piece: Piece,
	board: Piece[]
): { single: Vector[]; double: Vector[] } => {
	const moves = piece.type.moves(piece.position, board, piece.color);
	const doubleMoves = uniqueVectors(
		moves.flatMap((move) => piece.type.moves(move, board, piece.color))
	);
	let doubleMovesWithoutSingle = [];
	for (const move of doubleMoves)
		if (!moves.some((v) => move.equals(v))) doubleMovesWithoutSingle.push(move);
	return {
		single: moves,
		double: doubleMovesWithoutSingle.filter((m) => !m.equals(piece.position))
	};
};

class King extends PieceType {
	id = 'k';
	moves(from: Vector, board: Piece[], color: Color) {
		return repeatSymmetric(from, 1, 1, 1, board, color, true).concat(
			repeatSymmetric(from, 1, 0, 1, board, color, true)
		);
	}
}
export const king = new King();

class Rook extends PieceType {
	id = 'r';
	moves(from: Vector, board: Piece[], color: Color) {
		return repeatSymmetric(from, 1, 0, Infinity, board, color, true);
	}
}
export const rook = new Rook();

class Knightrider extends PieceType {
	id = 'n';
	moves(from: Vector, board: Piece[], color: Color) {
		return repeatSymmetric(from, 2, 1, Infinity, board, color, true);
	}
}
export const knightrider = new Knightrider();

class Knight extends PieceType {
	id = 'n';
	moves(from: Vector, board: Piece[], color: Color) {
		return repeatSymmetric(from, 2, 1, 1, board, color, true);
	}
}
export const knight = new Knight();

class Bishop extends PieceType {
	id = 'b';
	moves(from: Vector, board: Piece[], color: Color) {
		return repeatSymmetric(from, 1, 1, Infinity, board, color, true);
	}
}
export const bishop = new Bishop();

class Queen extends PieceType {
	id = 'q';
	moves(from: Vector, board: Piece[], color: Color) {
		return bishop.moves(from, board, color).concat(rook.moves(from, board, color));
	}
}
export const queen = new Queen();

const takes = (moves: Vector[], board: Piece[], color: Color): Vector[] =>
	moves.filter((move) =>
		board.some((piece) => piece.position.equals(move) && piece.color != color)
	);

class Pawn extends PieceType {
	id = 'p';
	moves(from: Vector, board: Piece[], color: Color) {
		return repeat(
			from,
			0,
			color === Color.WHITE ? -1 : 1,
			from.y === (color === Color.WHITE ? 6 : 1) ? 2 : 1,
			board,
			color,
			false
		).concat(
			takes(
				color === Color.WHITE
					? [from.add(-1, -1), from.add(1, -1)]
					: [from.add(-1, 1), from.add(1, 1)],
				board,
				color
			)
		);
	}
}
export const pawn = new Pawn();

export class Piece {
	constructor(public type: PieceType, public color: Color, public position: Vector) {}
}

export const pieceTypes = [king, rook, knight, queen, bishop, pawn];
