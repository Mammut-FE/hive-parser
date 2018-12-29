import { Antlr4 } from '../typings';
import { Node } from '../nodes';

export interface IParseExpr {
    _parseExprStmt(ctx: Antlr4.IContext): Node;
}


