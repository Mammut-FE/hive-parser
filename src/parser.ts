import { CommonTokenStream, InputStream, ParserRuleContext } from 'antlr4';
import { HplsqlLexer, HplsqlParser } from 'antlr4-hive-javascript';
import { TerminalNode } from 'antlr4/tree/Tree';
import * as nodes from './nodes';
import { RuleType, TokenType } from './types';

import { Antlr4 } from './typings';
import ISelectListItemContext = Antlr4.ISelectListItemContext;

export interface IToken {
    offset: number;
    len: number;
    contentText: any;
}

export class Parser implements Parser {
    private token: IToken;
    private prevToken: IToken;

    private tree: any = null;
    private lastStr: string;
    private tokens: any;

    constructor() {}

    public consumeToken(ctx: Antlr4.IContext | Antlr4.ITerminalNode) {
        this.prevToken = this.token;
        this.token = this.createToken(ctx);
    }

    public createToken(ctx: Antlr4.IContext | Antlr4.ITerminalNode): IToken {
        if (ctx instanceof ParserRuleContext) {
            return {
                offset: (ctx as Antlr4.IContext).start.start,
                len: (ctx as Antlr4.IContext).stop.stop - (ctx as Antlr4.IContext).start.start + 1,
                contentText: ctx
            };
        } else if (ctx instanceof TerminalNode || ctx['symbol']) {
            const { symbol } = ctx as Antlr4.ITerminalNode;
            return {
                offset: symbol.start,
                len: symbol.stop - symbol.start + 1,
                contentText: ctx
            };
        } else {
            return {
                offset: -1,
                len: -1,
                contentText: null
            };
        }
    }

    public createNode(nodeType: nodes.NodeType): nodes.Node {
        return new nodes.Node(this.token.offset, this.token.len, nodeType);
    }

    public create<T>(constructor: any): T {
        return new constructor(this.token.offset, this.token.len);
    }

    public finish<T extends nodes.Node>(node: T): T {
        return node;
    }

    public parse(input: string): nodes.Program {
        if (input.trim() === '') {
            return null;
        }

        let textProvider = (offset: number, length: number) => {
            return input.substr(offset, length);
        };

        return this.internalParse(input, this._parseProgram, textProvider);
    }

    public internalParse<T extends nodes.Node>(
        input: string,
        parseFunc: () => T,
        textProvider?: nodes.ITextProvider
    ): T {
        this.setSource(input);

        this.token = this.createToken(this.tree);

        let node = parseFunc.bind(this)();
        if (node) {
            if (textProvider) {
                node.textProvider = textProvider;
            } else {
                node.textProvider = (offset: number, length: number) => {
                    return input.substr(offset, length);
                };
            }
        }

        return node;
    }

    public setSource(str) {
        if (!this.tree || this.lastStr !== str) {
            const chars = new InputStream(str);
            const lexer: any = new HplsqlLexer(chars);
            const tokenStream = new CommonTokenStream(lexer, 0);
            const parser = new HplsqlParser(tokenStream);

            (parser as any).removeErrorListeners();

            this.tree = parser.program();
            this.tokens = tokenStream.tokens;
        }

        this.lastStr = str;
    }

    public _parseProgram(): nodes.Program {
        try {
            let node = <nodes.Program>this.create(nodes.Program);
            node.setBlockNode(this._parseBlock(this.tree.children[0]));

            return this.finish(node);
        } catch (e) {
            return null;
        }
    }

    public _parseBlock(ctx: Antlr4.IContext): nodes.Node {
        this.consumeToken(ctx);

        let node = <nodes.Block>this.create(nodes.Block);

        this.token.contentText.children.forEach(ctx => {
            node.addChild(this._parseStmt(ctx.children[0]));
        });

        return node;
    }

    _parseStmt(ctx: Antlr4.IContext): nodes.Node {
        this.consumeToken(ctx);
        const token = this.token;
        let node: nodes.Node = null;

        switch (token.contentText.ruleIndex) {
            case RuleType.RULE_use_stmt:
                node = this._parseUse(ctx as Antlr4.IUseContext);
                break;
            case RuleType.RULE_select_stmt:
                node = this._parseSelectStmt(ctx as Antlr4.ISelectContext);
                break;
            case RuleType.RULE_expr_stmt:
                node = this._parseExprStmt(ctx);
                break;
            case RuleType.RULE_drop_stmt:
                node = this._parseDropStmt(ctx as Antlr4.IDropStmtContext);
                break;
            case RuleType.RULE_semicolon_stmt:
                node = this.createNode(nodes.NodeType.Semicolon);
                break;
            default:
                node = this.createNode(nodes.NodeType.OtherStmt);
        }

        return node;
    }

    /**_
     * 解析 select 语句
     * @param ctx
     * @private
     */
    public _parseSelectStmt(ctx: Antlr4.ISelectContext): nodes.Select {
        this.consumeToken(ctx);

        let node = <nodes.Select>this.create(nodes.Select);

        node.setCetSelectNode(this._parseCteSelectStmt(ctx.cte_select_stmt()));
        node.setFullSelectNode(this._parseFullSelectStmt(ctx.fullselect_stmt()));

        return node;
    }

    _parseCteSelectStmt(ctx: Antlr4.ICteSelectContext): nodes.CteSelect {
        if (ctx) {
            this.consumeToken(ctx);
            let node = <nodes.CteSelect>this.create(nodes.CteSelect);
            const children = ctx.children;

            node.addChild(this._parseKeyword(ctx.T_WITH()));

            for (let i = 1, len = children.length; i < len; i++) {
                let _ctx = children[i];
                if (_ctx instanceof TerminalNode) {
                    node.addChild(this._parseComma(_ctx));
                } else {
                    node.addCteSelectItem(this._parseCteSelectItem(_ctx as Antlr4.ICteSelectItemContext));
                }
            }

            return node;
        }

        return null;
    }

    _parseCteSelectItem(ctx: Antlr4.ICteSelectItemContext): nodes.CteSelectItem {
        this.consumeToken(ctx);
        const node = <nodes.CteSelectItem>this.create(nodes.CteSelectItem);

        node.setIdentifier(this._parseIdent(ctx.ident()));

        // hive unsupported
        // node.addChild(this._parseCteSelectCols(ctx.cte_select_cols()));

        node.addChild(this._parseKeyword(ctx.T_AS()));
        node.addChild(this._parseKeyword(ctx.T_OPEN_P()));
        node.setFullSelect(this._parseFullSelectStmt(ctx.fullselect_stmt()));
        node.addChild(this._parseKeyword(ctx.T_CLOSE_P()));

        return node;
    }

    _parseCteSelectCols(ctx: Antlr4.ICteSelectColsContext): nodes.Node {
        if (ctx) {
            this.consumeToken(ctx);
            return this.createNode(nodes.NodeType.Unsupported); // hive unsupported
        }

        return null;
    }

    _parseFullSelectStmt(ctx: Antlr4.IFullSelectContext): nodes.FullSelect {
        this.consumeToken(ctx);
        const node = <nodes.FullSelect>this.create(nodes.FullSelect);

        ctx.children.forEach(_ctx => {
            if ((_ctx as Antlr4.IContext).ruleIndex === RuleType.RULE_fullselect_stmt_item) {
                node.addFullSelectItem(this._parseFullSelectItem(_ctx as Antlr4.IFullSelectItemContext));
            } else {
                node.addChild(this._parseKeyword(_ctx as TerminalNode)); // union keyword
            }
        });

        return node;
    }

    _parseFullSelectItem(ctx: Antlr4.IFullSelectItemContext): nodes.FullSelectItem {
        this.consumeToken(ctx);
        const node = <nodes.FullSelectItem>this.create(nodes.FullSelectItem);

        if (ctx.children.length === 1) {
            // subselect_stmt
            node.setSubjectSelect(this._parseSubSelectStmt(ctx.subselect_stmt()));
        } else {
            // ( fullselect_stmt )
            node.addChild(this._parseKeyword(ctx.T_OPEN_P()));
            node.setFullSelect(this._parseFullSelectStmt(ctx.fullselect_stmt()));
            node.addChild(this._parseKeyword(ctx.T_CLOSE_P()));
        }

        return node;
    }

    _parseSubSelectStmt(ctx: Antlr4.ISubSelectContext): nodes.SubSelect {
        this.consumeToken(ctx);
        const node = <nodes.SubSelect>this.create(nodes.SubSelect);

        /**
         * hive unsupported sel keyword
         * node.addChild(this._parseKeyword(ctx.T_SELECT() || ctx.T_SEL()));
         */
        node.addChild(this._parseKeyword(ctx.T_SELECT()));

        node.setSelectList(this._parseSelectList(ctx.select_list()));

        // hive unsupported
        // node.addChild(this._parseIntoClause(ctx.into_clause()));

        node.setFromClause(this._parseFromClause(ctx.from_clause()));

        node.addChild(this._parseWhereClause(ctx.where_clause()));

        node.addChild(this._parseGroupByClause(ctx.group_by_clause()));

        node.addChild(this._parseHavingClause(ctx.having_clause()));

        node.addChild(this._parseQualifyClause(ctx.qualify_clause()));

        node.addChild(this._parseOrderByClause(ctx.order_by_clause()));

        node.addChild(this._parseSelectOptions(ctx.select_options()));

        return node;
    }

    _parseSelectList(ctx: Antlr4.ISelectListContext): nodes.SelectList {
        this.consumeToken(ctx);
        const node = <nodes.SelectList>this.create(nodes.SelectList);
        const children = ctx.children as Antlr4.IContext[];

        for (let i = 0, len = children.length; i < len; i++) {
            let _ctx = children[i];
            switch (_ctx.ruleIndex) {
                case RuleType.RULE_select_list_set:
                    node.addChild(this._parseKeyword(_ctx as TerminalNode));
                    break;
                case RuleType.RULE_select_list_limit:
                    node.addChild(this.createNode(nodes.NodeType.SelectListLimit));
                    break;
                case RuleType.RULE_select_list_item:
                    node.addSelectListItem(this._parseSelectListItem(_ctx as ISelectListItemContext));
                    break;
            }
        }

        return node;
    }

    _parseSelectListItem(ctx: Antlr4.ISelectListItemContext): nodes.SelectListItem {
        this.consumeToken(ctx);
        const node = <nodes.SelectListItem>this.create(nodes.SelectListItem);

        node.setIdentifier(this._parseIdent(ctx.ident()));
        node.addChild(this._parseKeyword(ctx.T_EQUAL()));
        node.setExpr(this._parseExprStmt(ctx.expr()));
        node.setSelectListAlias(this._parseSelectListAlias(ctx.select_list_alias()));
        node.setSelectListAsterisk(this._parseSelectAsterisk(ctx.select_list_asterisk()));

        return node;
    }

    _parseSelectListAlias(ctx: Antlr4.ISelectListAlias): nodes.SelectListAlias {
        if (ctx) {
            this.consumeToken(ctx);
            const node = <nodes.SelectListAlias>this.create(nodes.SelectListAlias);

            node.addChild(this._parseKeyword(ctx.T_AS())); // as keyword
            node.setIdentifier(this._parseIdent(ctx.ident()));

            return node;
        }

        return null;
    }

    _parseSelectAsterisk(ctx: Antlr4.ISelectListAsterisk): nodes.SelectListAsterisk {
        if (ctx) {
            const node = this.create<nodes.SelectListAsterisk>(nodes.SelectListAsterisk);
            if (ctx.children.length === 1) {
                node.addChild(this._parseKeyword((ctx.children as Antlr4.ITerminalNode[])[0]));
            } else {
                node.setIdentifier(this._parseIdent(ctx.children[0] as Antlr4.IIdentContext));
                node.addChild(this._parseKeyword((ctx.children as Antlr4.ITerminalNode[])[1]));
                node.addChild(this._parseKeyword((ctx.children as Antlr4.ITerminalNode[])[2]));
            }

            return node;
        }
        return null;
    }

    _parseIntoClause(ctx: Antlr4.IContext): nodes.Node {
        if (ctx) {
            this.consumeToken(ctx);
            return this.createNode(nodes.NodeType.IntoClause);
        }

        return null;
    }

    _parseFromClause(ctx: Antlr4.IFromClauseContext): nodes.FromClause {
        if (ctx) {
            this.consumeToken(ctx);
            const node = <nodes.FromClause>this.create(nodes.FromClause);

            node.addChild(this._parseKeyword(ctx.T_FROM())); // from keyword

            node.setFromTableClause(this._parseFromTableClause(ctx.from_table_clause()));

            node.addFromJoinClauseList(this._parseFromJoinClause(ctx.from_join_clause()));

            return node;
        }

        return null;
    }

    _parseFromTableClause(ctx: Antlr4.IFromTableClauseContext): nodes.FromTableClause {
        this.consumeToken(ctx);
        const node = <nodes.FromTableClause>this.create(nodes.FromTableClause);
        const _ctx = ctx.children[0] as Antlr4.IContext;

        switch (_ctx.ruleIndex) {
            case RuleType.RULE_from_table_name_clause:
                node.setFromTableNameClause(this._parseFromTableNameClause(_ctx as Antlr4.IFromTableNameClauseContext));
                break;
            case RuleType.RULE_from_subselect_clause:
                node.setFromSubjectSelectClause(this._parseFromSubselectClause(_ctx as Antlr4.IFromSubselectClauseContext));
                break;
            // hive unsupported
            // case RuleType.RULE_from_table_values_clause:
            //     node.addChild(this._parseFromTableValuesClause(_ctx));
            //     break;
        }

        return node;
    }

    _parseFromTableNameClause(ctx: Antlr4.IFromTableNameClauseContext): nodes.FromTableNameClause {
        this.consumeToken(ctx);
        const node = <nodes.FromTableNameClause>this.create(nodes.FromTableNameClause);

        node.setTableName(this._parseTableName(ctx.table_name()));
        node.setTableAlias(this._parseFromAliasClause(ctx.from_alias_clause()));

        return node;
    }

    _parseTableName(ctx: Antlr4.ITableNameContext): nodes.TableName {
        this.consumeToken(ctx);
        const node = <nodes.TableName>this.create(nodes.TableName);

        node.setIdentifier(this._parseIdent(ctx.ident()));

        return node;
    }

    _parseFromSubselectClause(ctx: Antlr4.IFromSubselectClauseContext): nodes.FromSubSelectClause {
        this.consumeToken(ctx);
        const node = <nodes.FromSubSelectClause>this.create(nodes.FromSubSelectClause);

        node.addChild(this._parseKeyword(ctx.T_OPEN_P()));
        node.setSelect(this._parseSelectStmt(ctx.select_stmt()));
        node.addChild(this._parseKeyword(ctx.T_CLOSE_P()));
        node.setFromAlias(this._parseFromAliasClause(ctx.from_alias_clause()));

        return node;
    }

    _parseFromTableValuesClause(ctx: Antlr4.IFromTableValuesClauseContext): nodes.Node {
        this.consumeToken(ctx);
        return this.createNode(nodes.NodeType.FromTableValuesClause);
    }

    _parseFromJoinClause(ctx: Antlr4.IFromJoinClauseContext[]): nodes.FromJoinClause[] {
        const result: nodes.FromJoinClause[] = [];

        if (ctx.length) {
            for (let _ctx of ctx) {
                this.consumeToken(_ctx);
                const node = <nodes.FromJoinClause>this.create(nodes.FromJoinClause);

                if (_ctx.children.length > 2) {
                    node.addChild(this._parseFromJoinTypeClause(_ctx.from_join_type_clause()));
                    node.setFromTableClause(this._parseFromTableClause(_ctx.from_table_clause()));
                    node.addChild(this._parseKeyword(_ctx.T_ON()));
                    node.addChild(this._parseBoolExpr(_ctx.bool_expr()));
                } else {
                    node.addChild(this._parseComma(_ctx.T_COMMA()));
                    node.setFromTableClause(this._parseFromTableClause(_ctx.from_table_clause()));
                }

                result.push(node);
            }
        }

        return result;
    }

    _parseFromJoinTypeClause(ctx: Antlr4.IFromJoinTypeClauseContext): nodes.Node {
        this.consumeToken(ctx);

        return this.createNode(nodes.NodeType.FromJoinTypeClause);
    }

    _parseFromAliasClause(ctx: Antlr4.IFromAliasClauseContext): nodes.FromAliasClause {
        if (ctx) {
            this.consumeToken(ctx);
            const node = <nodes.FromAliasClause>this.create(nodes.FromAliasClause);

            node.addChild(this._parseKeyword(ctx.T_AS()));
            node.setIdentifier(this._parseIdent(ctx.ident()));

            return node;
        }

        return null;
    }

    _parseWhereClause(ctx: Antlr4.IContext): nodes.Node {
        if (ctx) {
            this.consumeToken(ctx);
            return this.createNode(nodes.NodeType.WhereClause);
        }

        return null;
    }

    _parseGroupByClause(ctx: Antlr4.IContext): nodes.Node {
        if (ctx) {
            this.consumeToken(ctx);
            return this.createNode(nodes.NodeType.GroupClause);
        }

        return null;
    }

    _parseHavingClause(ctx: Antlr4.IContext): nodes.Node {
        if (ctx) {
            this.consumeToken(ctx);
            return this.createNode(nodes.NodeType.HavingClause);
        }

        return null;
    }

    _parseQualifyClause(ctx: Antlr4.IContext): nodes.Node {
        if (ctx) {
            this.consumeToken(ctx);
            return this.createNode(nodes.NodeType.QualifyClause);
        }

        return null;
    }

    _parseOrderByClause(ctx: Antlr4.IContext): nodes.Node {
        if (ctx) {
            this.consumeToken(ctx);
            return this.createNode(nodes.NodeType.OrderByClause);
        }

        return null;
    }

    _parseSelectOptions(ctx: Antlr4.IContext): nodes.Node {
        if (ctx) {
            this.consumeToken(ctx);
            return this.createNode(nodes.NodeType.SelectOptions);
        }

        return null;
    }

    _parseUse(ctx: Antlr4.IUseContext): nodes.Use {
        this.consumeToken(ctx);

        const node = <nodes.Use>this.create(nodes.Use);

        node.addChild(this._parseKeyword(ctx.T_USE())); // keyword use
        node.setIdentifier(this._parseUseExpr(ctx.expr())); // set databaseName

        return node;
    }

    _parseDropStmt(ctx: Antlr4.IDropStmtContext): nodes.Drop {
        this.consumeToken(ctx);

        const node = <nodes.Drop>this.create(nodes.Drop);
        node.addChild(this._parseKeyword(ctx.T_DROP()));

        if (ctx.T_TABLE()) {
            node.addChild(this._parseKeyword(ctx.T_TABLE()));
            node.setDropType('table');
        } else if (ctx.T_DATABASE()) {
            node.addChild(this._parseKeyword(ctx.T_DATABASE()));
            node.setDropType('database');
        } else {
            node.addChild(this._parseKeyword(ctx.T_SCHEMA()));
            node.setDropType('schema');
        }

        node.addChild(this._parseKeyword(ctx.T_IF()));
        node.addChild(this._parseKeyword(ctx.T_EXISTS()));

        if (node.dropType === 'table') {
            node.setTableName(this._parseTableName(ctx.table_name()));
        } else {
            node.setExpr(this._parseExprStmt(ctx.expr()));
        }

        return node;
    }

    _parseUseExpr(ctx: Antlr4.IExprContext): nodes.Identifier {
        this.consumeToken(ctx);

        const node = <nodes.Identifier>this.create(nodes.Identifier);
        node.isCustomProperty = true;

        return node;
    }

    _parseExprStmt(ctx: Antlr4.IContext): nodes.Expr {
        if (ctx) {
            this.consumeToken(ctx);
            return <nodes.Expr>this.create(nodes.Expr);
        }

        return null;
    }

    _parseBoolExpr(ctx: Antlr4.IContext): nodes.Node {
        if (ctx) {
            this.consumeToken(ctx);

            return this.createNode(nodes.NodeType.BoolExpr);
        }

        return null;
    }

    _parseIdent(ctx: Antlr4.IIdentContext | Antlr4.ITerminalNode): nodes.Identifier {
        if (ctx) {
            this.consumeToken(ctx);

            const node = <nodes.Identifier>this.create(nodes.Identifier);

            let [l, r] = ctx.getText().split('.');

            let column, line, start;
            if (ctx instanceof TerminalNode) {
                column = (ctx as Antlr4.ITerminalNode).symbol.column;
                line = (ctx as Antlr4.ITerminalNode).symbol.line;
                start = (ctx as Antlr4.ITerminalNode).symbol.start;
            } else {
                column = (ctx as Antlr4.IIdentContext).start.column;
                line = (ctx as Antlr4.IIdentContext).start.line;
                start = (ctx as Antlr4.IIdentContext).start.start;
            }

            const leftValueCtx: Antlr4.ITerminalNode = {
                symbol: {
                    column,
                    line,
                    start,
                    stop: start + l.length - 1,
                    type: TokenType.L_ID,
                    text: l
                },
                getText() {return l;}
            };
            node.setLeftValue(this._parseId(leftValueCtx));

            if (r !== undefined) {
                const dotCtx: Antlr4.ITerminalNode = {
                    symbol: {
                        column,
                        line,
                        start: start + l.length,
                        stop: start + l.length,
                        type: TokenType.T_DOT2,
                        text: l
                    },
                    getText() {return '.';}
                };
                node.setDot(this._parseDot(dotCtx));

                const rightValueCtx: Antlr4.ITerminalNode = {
                    symbol: {
                        column,
                        line,
                        start: start + l.length + 1,
                        stop: start + l.length + r.length,
                        type: TokenType.L_ID,
                        text: l
                    },
                    getText() {return r;}
                };
                node.setRightValue(this._parseId(rightValueCtx));
            }

            return node;
        }

        return null;
    }

    _parseId(ctx: Antlr4.ITerminalNode): nodes.Node {
        this.consumeToken(ctx);

        return this.createNode(nodes.NodeType.ID);
    }

    _parseDot(ctx: Antlr4.ITerminalNode): nodes.Node {
        this.consumeToken(ctx);

        return this.createNode(nodes.NodeType.Dot);
    }

    _parseKeyword(ctx: Antlr4.ITerminalNode): nodes.Keyword {
        if (ctx) {
            this.consumeToken(ctx);
            return <nodes.Keyword>this.create(nodes.Keyword);
        }

        return null;
    }

    _parseComma(ctx: TerminalNode): nodes.Node {
        this.consumeToken(ctx);

        return this.createNode(nodes.NodeType.Comma);
    }
}
