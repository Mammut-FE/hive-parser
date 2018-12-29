import { Antlr4 } from '../typings';
import { Node } from '../nodes';

export interface IParseSelect {
    _parseSelectStmt(ctx: Antlr4.ISelectContext): Node;

    _parseCteSelectStmt(ctx: Antlr4.ICteSelectContext): Node;

    _parseCteSelectItem(ctx: Antlr4.ICteSelectItemContext): Node;

    _parseCteSelectCols(ctx: Antlr4.ICteSelectColsContext): Node;

    _parseFullSelectStmt(ctx: Antlr4.IFullSelectContext): Node;

    _parseFullSelectItem(ctx: Antlr4.IFullSelectItemContext): Node;

    _parseSubSelectStmt(ctx: Antlr4.ISubSelectContext): Node;

    _parseIntoClause(ctx: Antlr4.IContext): Node;

    _parseWhereClause(ctx: Antlr4.IContext): Node;

    _parseGroupByClause(ctx: Antlr4.IContext): Node;

    _parseHavingClause(ctx: Antlr4.IContext): Node;

    _parseQualifyClause(ctx: Antlr4.IContext): Node;

    _parseOrderByClause(ctx: Antlr4.IContext): Node;

    _parseSelectOptions(ctx: Antlr4.IContext): Node;

    _parseSelectList(ctx: Antlr4.ISelectListContext): Node;

    _parseSelectListItem(ctx: Antlr4.ISelectListItemContext): Node;

    _parseSelectListAlias(ctx: Antlr4.ISelectListAlias): Node;

    _parseFromClause(ctx: Antlr4.IFromClauseContext): Node;

    _parseFromTableClause(ctx: Antlr4.IFromTableClauseContext): Node;

    _parseFromTableNameClause(ctx: Antlr4.IFromTableNameClauseContext): Node;

    _parseTableName(ctx: Antlr4.ITableNameContext): Node;

    _parseFromSubselectClause(ctx: Antlr4.IFromSubselectClauseContext): Node;

    _parseFromTableValuesClause(ctx: Antlr4.IFromTableValuesClauseContext): Node;

    _parseFromJoinClause(ctx: Antlr4.IFromJoinClauseContext[]): Node[];

    _parseFromJoinTypeClause(ctx: Antlr4.IFromJoinTypeClauseContext): Node;

    // _parseSelectListAsterisk(ctx: Antlr4.ISelectListAsterisk): Node;
}
