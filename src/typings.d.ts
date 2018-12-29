import { RuleType, TokenType } from './types';

declare namespace Antlr4 {
    interface ICommonToken {
        column: number;
        line: number;
        start: number;
        stop: number;
        type: TokenType;
        text: string;
    }

    interface IContext {
        children: Array<IContext | ITerminalNode>;
        parentCtx: IContext | null;
        ruleIndex: RuleType;
        start: ICommonToken;
        stop: ICommonToken;
        getText: () => string;
    }

    interface ISelectContext extends IContext {
        cte_select_stmt(): ICteSelectContext;

        fullselect_stmt(): IFullSelectContext;
    }

    interface ICteSelectContext extends IContext {
        T_WITH(): ITerminalNode;

        cte_select_stmt_item(): ICteSelectItemContext[];
    }

    interface ICteSelectItemContext extends IContext {
        ident(): IIdentContext;

        cte_select_cols(): ICteSelectColsContext;

        T_AS(): ITerminalNode;

        T_OPEN_P(): ITerminalNode;

        T_CLOSE_P(): ITerminalNode;

        fullselect_stmt(): IFullSelectContext;
    }

    interface ICteSelectColsContext extends IContext {}

    interface IFullSelectContext extends IContext {
        fullselect_set_clause(): IFullSelectSetContext;

        fullselect_stmt_item(): IFullSelectItemContext;
    }

    interface IFullSelectSetContext extends IContext {}

    interface IFullSelectItemContext extends IContext {
        T_CLOSE_P(): ITerminalNode;

        T_OPEN_P(): ITerminalNode;

        fullselect_stmt(): IFullSelectContext;

        subselect_stmt(): ISubSelectContext;
    }

    interface ISubSelectContext extends IContext {
        T_SEL(): ITerminalNode;

        T_SELECT(): ITerminalNode;

        from_clause(): IFromClauseContext;

        group_by_clause(): IContext;

        having_clause(): IContext;

        into_clause(): IContext;

        order_by_clause(): IContext;

        qualify_clause(): IContext;

        select_list(): ISelectListContext;

        select_options(): IContext;

        where_clause(): IContext;
    }

    interface ISelectListContext extends IContext {
        select_list_set(): IContext;

        select_list_limit(): IContext;

        select_list_item(): ISelectListItemContext[];
    }

    interface ISelectListItemContext extends IContext {
        ident(): IIdentContext;

        T_EQUAL(): ITerminalNode;

        expr(): IContext;

        select_list_alias(): ISelectListAlias;

        select_list_asterisk(): ISelectListAsterisk;
    }

    interface ISelectListAlias extends IContext {
        T_AS(): ITerminalNode;

        ident(): IIdentContext;
    }

    interface ISelectListAsterisk extends IContext {
        L_ID(): IContext;
    }

    interface IFromClauseContext extends IContext {
        from_join_clause(): IFromJoinClauseContext[];

        from_table_clause(): IFromTableClauseContext;

        T_FROM(): ITerminalNode;
    }

    interface IFromTableClauseContext extends IContext {
        from_table_name_clause(): IFromTableNameClauseContext;

        from_subselect_clause(): IFromTableClauseContext;

        from_table_values_clause(): IFromTableValuesClauseContext;
    }

    interface IFromTableNameClauseContext extends IContext {
        table_name(): ITableNameContext;

        from_alias_clause(): IFromAliasClauseContext;
    }

    interface ITableNameContext extends IContext {
        ident(): IIdentContext;
    }

    interface IFromSubselectClauseContext extends IContext {
        T_OPEN_P(): ITerminalNode;

        select_stmt(): ISelectContext;

        T_CLOSE_P(): ITerminalNode;

        from_alias_clause(): IFromAliasClauseContext;
    }

    interface IFromTableValuesClauseContext extends IContext {

    }

    interface IFromJoinClauseContext extends IContext {
        T_COMMA(): ITerminalNode;

        from_table_clause(): IFromTableClauseContext;

        from_join_type_clause(): IFromJoinTypeClauseContext;

        T_ON(): ITerminalNode;

        bool_expr(): IContext;
    }

    interface IFromJoinTypeClauseContext extends IContext {}


    interface IFromAliasClauseContext extends IContext {
        ident(): IIdentContext;

        T_AS(): ITerminalNode;
    }

    interface ITerminalNode extends Object {
        symbol: ICommonToken;

        getText(): string;
    }

    interface IUseContext extends IContext {
        T_USE(): ITerminalNode;

        expr(): IExprContext;
    }

    interface IExprContext extends IContext {

    }

    interface IIdentContext extends IContext {
        L_ID(): ITerminalNode[];

        non_reserved_words(): IContext;
    }

    interface INonReservedWordsContext extends IContext {

    }

    interface IDropStmtContext extends IContext {
        T_DROP(): ITerminalNode;

        T_TABLE(): ITerminalNode;

        T_IF(): ITerminalNode;

        T_EXISTS(): ITerminalNode;

        T_DATABASE(): ITerminalNode;

        T_SCHEMA(): ITerminalNode;

        table_name(): ITableNameContext;

        expr(): IExprContext;
    }
}
