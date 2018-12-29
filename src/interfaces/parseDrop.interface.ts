import { Antlr4 } from '../typings';
import { Drop } from '../nodes';

export interface IParseDrop {
    _parseDropStmt(ctx: Antlr4.IDropStmtContext): Drop;
}


