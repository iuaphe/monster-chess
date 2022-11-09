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
	abstract moves(from: Vector): Vector[];
	takes: (from: Vector) => Vector[] = this.moves;
}

export const inBounds = (v: Vector) => 0 <= v.x && v.x < 8 && 0 <= v.y && v.y < 8;

const repeat = (from: Vector, dx: number, dy: number, maxN: number) => {
	const result: Vector[] = [];
	let v = from.add(dx, dy);
	let n = 0;
	do {
		result.push(v);
		v = v.add(dx, dy);
		n++;
	} while (inBounds(v) && n < maxN);
	return result;
};

export const uniqueVectors = (vs: Vector[]) => {
	const result: Vector[] = [];
	for (const v of vs) {
		if (!result.some((other) => other.x === v.x && other.y === v.y)) result.push(v);
	}
	return result;
};

const repeatSymmetric = (from: Vector, dx: number, dy: number, maxN: number) => {
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
		result = result.concat(repeat(from, ...dr, maxN));
	});
	// todo: take out the redundant combinations so we don't have to uniqueify
	// e.g., (0, 1) == (-0, 1)
	return uniqueVectors(result);
};

export const doubleMoves = (p: PieceType, from: Vector): { single: Vector[]; double: Vector[] } => {
	const moves = p.moves(from);
	const doubleMoves = uniqueVectors(moves.flatMap(p.moves));
	let doubleMovesWithoutSingle = [];
	for (const move of doubleMoves)
		if (!moves.some((v) => move.equals(v))) doubleMovesWithoutSingle.push(move);
	return {
		single: moves,
		double: doubleMovesWithoutSingle.filter((m) => !m.equals(from))
	};
};

class King extends PieceType {
	id = 'k';
	moves(from: Vector) {
		return repeatSymmetric(from, 1, 1, 1).concat(repeatSymmetric(from, 1, 0, 1));
	}
}
export const king = new King();

class Rook extends PieceType {
	id = 'r';
	moves(from: Vector) {
		return repeatSymmetric(from, 1, 0, Infinity);
	}
}
export const rook = new Rook();

class Knight extends PieceType {
	id = 'n';
	moves(from: Vector) {
		return repeatSymmetric(from, 2, 1, 1);
	}
}
export const knight = new Knight();

class Bishop extends PieceType {
	id = 'b';
	moves(from: Vector) {
		return repeatSymmetric(from, 1, 1, Infinity);
	}
}
export const bishop = new Bishop();

class Queen extends PieceType {
	id = 'q';
	moves(from: Vector) {
		return bishop.moves(from).concat(rook.moves(from));
	}
}
export const queen = new Queen();

class Pawn extends PieceType {
	id = 'p';
	moves(from: Vector) {
		return [from.add(0, -1), ...(from.y == 6 ? [from.add(0, -2)] : [])];
	}
}
export const pawn = new Pawn();

export class Piece {
	constructor(public type: PieceType, public x: number, public y: number) {}
}

export const pieceTypes = [King, Rook].map((it) => new it());
