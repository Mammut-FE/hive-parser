import { Antlr4 } from '../typings';
import { Identifier, Use } from '../nodes';

export interface IParseUse {
    _parseUse(ctx: Antlr4.IUseContext): Use;

    _parseUseExpr(ctx: Antlr4.IExprContext): Identifier;
}
