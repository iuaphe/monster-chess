export class Vector {
	constructor(public x: number, public y: number) {}
	add(x: number, y: number) {
		return new Vector(this.x + x, this.y + y);
	}
	addVec(other: Vector) {
		return this.add(other.x, other.y);
	}
	set(other: Vector): void {
		this.x = other.x;
		this.y = other.y;
	}
	copy() {
		return new Vector(this.x, this.y);
	}
	equals(other: Vector) {
		return this.x === other.x && this.y === other.y;
	}
}

export class Board {
	constructor(public pieces: Piece[]) {}

	pieceAt(v: Vector): Piece | undefined {
		return this.pieces.find((piece) => piece.position.equals(v));
	}

	removePiece(piece: Piece) {
		const index = this.pieces.indexOf(piece);
		if (index === -1) throw new Error('removePiece run on missing piece.');
		else this.pieces.splice(index, 1);
	}

	move(from: Vector, to: Vector) {
		const capturingPiece = this.pieceAt(to);
		if (capturingPiece !== undefined) {
			this.removePiece(capturingPiece);
		}
		this.pieceAt(from)!.position.set(to);
	}

	copy(): Board {
		return new Board(this.pieces.map((piece) => piece.copy()));
	}

	copyWithMove(from: Vector, to: Vector) {
		const board = this.copy();
		board.move(from, to);
		return board;
	}
}

export abstract class PieceType {
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

export type CandidateDoubleMove = {
	finalPosition: Vector;
	takes?: Vector;
};

export class Piece {
	constructor(public type: PieceType, public color: Color, public position: Vector) {}
	moves(board: Board) {
		return this.type.moves(this.position, board.pieces, this.color);
	}
	doubleMoves(board: Board, singleMoves: Vector[]) {
		const candidateDoubleMoves = singleMoves.flatMap((singleMove) => {
			const takes = board.pieceAt(singleMove)?.position;
			const newBoard = board.copyWithMove(this.position, singleMove);
			console.log(singleMove);
			const newPiece = newBoard.pieceAt(singleMove)!;
			return newPiece.moves(newBoard).map(
				(secondMove) =>
					({
						finalPosition: secondMove,
						takes
					} as CandidateDoubleMove)
			);
		});
		const uniqueCandidates: CandidateDoubleMove[] = [];
		candidateDoubleMoves.forEach((cdm) => {
			// lol
			if (
				!uniqueCandidates.some(
					(otherCdm) =>
						cdm.finalPosition.equals(otherCdm.finalPosition) &&
						((cdm.takes === undefined && otherCdm.takes === undefined) ||
							(cdm.takes !== undefined &&
								otherCdm.takes !== undefined &&
								cdm.takes.equals(otherCdm.takes)))
				)
			) {
				uniqueCandidates.push(cdm);
			}
		});
		const uniqueFinalPositions: Vector[] = [];
		const correspondingCandidates: CandidateDoubleMove[][] = [];
		for (const candidate of uniqueCandidates) {
			const matchingFinal = uniqueFinalPositions.find((fp) => fp.equals(candidate.finalPosition));
			if (matchingFinal === undefined) {
				uniqueFinalPositions.push(candidate.finalPosition);
				correspondingCandidates.push([candidate]);
			} else {
				correspondingCandidates[uniqueFinalPositions.indexOf(matchingFinal)].push(candidate);
			}
		}
		return correspondingCandidates
			.filter((cc) => cc.filter((c) => c.takes !== undefined).length <= 1)
			.flat()
			.filter((dm) => !singleMoves.some((sm) => sm.equals(dm.finalPosition)))
			.filter((dm) => !dm.finalPosition.equals(this.position));
	}
	copy(): Piece {
		return new Piece(this.type, this.color, this.position.copy());
	}
}

// const uniqueBy = <T, U extends { equals: (t: U) => boolean }>(ts: T[], getKey: (t: T) => U) => {
// 	const uniques: { t: T; key: U }[] = [];
// 	ts.forEach((t) => {
// 		const key = getKey(t);
// 		if (!uniques.some((obj) => obj.key.equals(key))) {
// 			uniques.push({
// 				t,
// 				key
// 			});
// 		}
// 	});
// 	return uniques.map((obj) => obj.t);
// };

export const pieceTypes = [king, rook, knight, queen, bishop, pawn];
