import { TerminalNode } from 'antlr4/tree/Tree';

export interface ITextProvider {
    (offset: number, length: number): string;
}

export interface IMarker {

}

export interface ITable {
    rawTable: string | Select;
    aliasName: string;
}

export interface ICol {
    name: string;
    aliasName: string;
    isAll: boolean;
}

export interface ICteTable {
    name: string;
    origin: FullSelect;
}

export enum NodeType {
    Program = 1,
    Block,
    Select,
    CteSelect,
    CteSelectItem,
    CteSelectCols,
    SelectSetClause,
    FullSelect,
    FullSelectItem,
    SubSelect,
    SelectList,
    SelectListLimit,
    SelectListItem,
    SelectListCol,
    SelectListAlias,
    SelectListAsterisk,
    IntoClause,
    FromClause,
    FromTableClause,
    FromTableNameClause,
    TableName,
    FromSubSelectClause,
    FromTableValuesClause,
    FromJoinClause,
    FromJoinTypeClause,
    FromAliasClause,
    WhereClause,
    GroupClause,
    HavingClause,
    QualifyClause,
    OrderByClause,
    SelectOptions,
    Use,
    Drop,
    Expr,
    BoolExpr,
    Identifier,
    ID,
    Dot,
    Semicolon,
    Comma,
    Keyword,
    Unsupported,
    OtherStmt,
    Other
}

export function getNodeAtOffset(node: Node, offset: number): Node | null {
    let candidate: Node | null = null;
    if (!node || offset < node.offset || offset > node.end) {
        return null;
    }

    node.accept((node) => {
        if (node.offset === -1 && node.length === -1) {
            return true;
        }
        if (node.offset <= offset && node.end >= offset) {
            if (!candidate) {
                candidate = node;
            } else if (node.length <= candidate.length) {
                candidate = node;
            }
            return true;
        }
        return false;
    });

    return candidate;
}

export function getPath(node: Node, offset: number): Node[] {
    let candidate = getNodeAtOffset(node, offset);
    let path: Node[] = [];

    while (candidate) {
        path.unshift(candidate);
        candidate = candidate.parent;
    }

    return path;
}

export class Node {
    public parent: Node | null;

    public offset: number;
    public length: number;
    public textProvider: ITextProvider | undefined; // only set the root node
    private options: { [key: string]: any };
    private children: Node[] | undefined;
    private issues: IMarker[] | undefined;
    private nodeType: NodeType | undefined;

    constructor(offset: number, len: number, nodeType?: NodeType) {
        this.parent = null;
        this.offset = offset;
        this.length = len;
        if (nodeType) {
            this.nodeType = nodeType;
        }
    }

    public get end() {return this.offset + this.length;};

    get type(): NodeType {
        return this.nodeType;
    }

    set type(type: NodeType) {
        this.nodeType = type;
    }

    public getTextProvider(): ITextProvider {
        let node: Node | null = this;
        while (node && !node.textProvider) {
            node = node.parent;
        }

        if (node) {
            return node.textProvider;
        }

        return () => {return 'unknown';};
    }

    public getText(): string {
        return this.getTextProvider()(this.offset, this.length);
    }

    public matches(str: string): boolean {
        return this.length === str.length && this.getTextProvider()(this.offset, this.length) === str;
    }

    public startsWith(str: string): boolean {
        return this.length >= str.length && this.getTextProvider()(this.offset, str.length) === str;
    }

    public endsWith(str: string): boolean {
        return this.length >= str.length && this.getTextProvider()(this.end - str.length, str.length) === str;
    }

    public accept(visitor: IVisitorFunction): void {
        if (visitor(this) && this.children) {
            for (let child of this.children) {
                child.accept(visitor);
            }
        }
    }

    public acceptVisitor(visitor: IVisitor): void {
        this.accept(visitor.visitNode.bind(visitor));
    }

    public adoptChildren(node: Node, index: number = -1): Node {
        if (node.parent && node.parent.children) {
            let idx = node.parent.children.indexOf(node);
            if (idx > 0) {
                node.parent.children.splice(idx, 1);
            }
        }

        node.parent = this;
        let children = this.children;
        if (!children) {
            children = this.children = [];
        }
        if (index !== -1) {
            children.splice(index, 0, node);
        } else {
            children.push(node);
        }
        return node;
    }

    public attachTo(parent: Node, index: number = -1): Node {
        if (parent) {
            parent.adoptChildren(this, index);
        }
        return this;
    }

    public setNode(field: keyof this, node: Node, index: number = -1): boolean {
        if (node) {
            node.attachTo(this, index);
            (<any>this)[field] = node;
            return true;
        }
        return false;
    }

    public addChild(node: Node): boolean {
        if (node) {
            if (!this.children) {
                this.children = [];
            }
            node.attachTo(this);
            this.updateOffsetAndLength(node);
            return true;
        } else {
            return false;
        }
    }

    public hasChildren(): boolean {
        return this.children && this.children.length > 0;
    }

    public getChildren(): Node[] {
        return this.children ? this.children.slice(0) : [];
    }

    public getChild(index: number): Node {
        if (this.children && index < this.children.length) {
            return this.children[index];
        }

        return null;
    }

    public addChildren(nodes: Node[]): void {
        for (let node of nodes) {
            this.addChild(node);
        }
    }

    public findFirstChildBeforeOffset(offset: number): Node {
        if (this.children) {
            let current: Node = null;
            for (let i = this.children.length - 1; i >= 0; i--) {
                current = this.children[i];
                if (current.offset <= offset) {
                    return current;
                }
            }
        }
        return null;
    }

    public findChildAtOffset(offset: number, goDeep: boolean): Node {
        let current: Node = this.findFirstChildBeforeOffset(offset);
        if (current && current.end >= offset) {
            if (goDeep) {
                return current.findChildAtOffset(offset, true) || current;
            }
            return current;
        }
        return null;
    }

    public encloses(candidate: Node): boolean {
        return this.offset <= candidate.offset && this.offset + length >= candidate.offset + candidate.length;
    }

    public getParent(): Node {
        let result = this.parent;
        while (result instanceof NodeList) {
            result = result.parent;
        }
        return result;
    }

    public findParent(type: NodeType): Node {
        let result: Node = this;
        while (result && result.type !== type) {
            result = result.parent;
        }
        return result;
    }

    public setData(key: string, value: string): void {
        if (!this.options) {
            this.options = {};
        }
        this.options[key] = value;
    }

    public getData(key: string): any {
        if (!this.options || !this.options.hasOwnProperty(key)) {
            return null;
        }
        return this.options[key];
    }

    private updateOffsetAndLength(node: Node) {
        if (node.offset < this.offset || this.offset === -1) {
            this.offset = node.offset;
        }
        let nodeEnd = node.end;
        if ((nodeEnd > this.end) || this.length === -1) {
            this.length = nodeEnd - this.offset;
        }
    }
}

export class NodeList extends Node {
    private _nodeList: void;

    constructor(parent: Node, index: number = -1) {
        super(-1, -1);
        this.attachTo(parent, index);
        this.offset = -1;
        this.length = -1;
    }
}

export class Identifier extends Node {
    public isCustomProperty = false;
    public leftValueNode: Node;
    public rightValueNode: Node;
    public dotNode: Node;

    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.Identifier;
    }

    public setLeftValue(node: Node): boolean {
        return this.setNode('leftValueNode', node);
    }

    public setRightValue(node: Node): boolean {
        return this.setNode('rightValueNode', node);
    }

    public setDot(node: Node): boolean {
        return this.setNode('dotNode', node);
    }
}

export class Other extends Node {
    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.Other;
    }
}

export class Program extends Node {
    public block: Block;

    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.Program;
    }

    public setBlockNode(node: Block): boolean {
        return this.setNode('block', node, 0);
    }

    public getBlockNode(): Block {
        return this.block;
    }
}

export class Block extends Node {
    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.Block;
    }
}

export class Use extends Node {
    public identifier: Identifier | undefined;

    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.Use;
    }

    public setIdentifier(node: Identifier): boolean {
        return this.setNode('identifier', node, 1);
    }

    public getIdentifier(): Identifier {
        return this.identifier;
    }

    public getUseDbName(): string {
        return this.identifier ? this.identifier.getText() : '';
    }
}

export class Select extends Node {
    public cteSelectNode: CteSelect | undefined;
    public fullSelectNode: FullSelect;

    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.Select;
    }

    public setCetSelectNode(node: CteSelect): boolean {
        return this.setNode('cteSelectNode', node, 0);
    }

    public setFullSelectNode(node: FullSelect): boolean {
        return this.setNode('fullSelectNode', node, 1);
    }

    public getCteTables(): ICteTable[] {
        return this.cteSelectNode ? this.cteSelectNode.getCteTables() : [];
    }
}

export class CteSelect extends Node {
    public cteSelectItems: CteSelectItem[] = [];

    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.CteSelect;
    }

    public addCteSelectItem(node: CteSelectItem) {
        this.cteSelectItems.push(node);
        this.addChild(node);
    }

    public getCteTables(): ICteTable[] {
        return this.cteSelectItems.reduce<ICteTable[]>((prev, curr) => {
            return prev.concat(curr.getCteTable());
        }, []);
    }
}

export class CteSelectItem extends Node {
    public identifier: Identifier;
    public fullSelect: FullSelect;

    // hive unsupported
    // public cteSelectCols: CteSelectCols | undefined;

    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.CteSelectItem;
    }

    public setIdentifier(node: Identifier): boolean {
        return this.setNode('identifier', node, 0);
    }

    public getIdentifier(): Identifier {
        return this.identifier;
    }

    // public setCteSelectCols(node: CteSelectCols): boolean {
    //     return this.setNode('cteSelectCols', node, 1);
    // }

    // public getCteSelectCols(): CteSelectCols {
    //     return this.cteSelectCols;
    // }

    public setFullSelect(node: FullSelect): boolean {
        return this.setNode('fullSelect', node, this.getChildren().length);
    }

    public getFullSelect(): FullSelect {
        return this.fullSelect;
    }

    public getCteTable(): ICteTable {
        return {
            name: this.identifier.getText(),
            origin: this.getFullSelect()
        };
    }
}

export class CteSelectCols extends Node {
    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.CteSelectCols;
    }
}

export class FullSelect extends Node {
    public fullSelectItems: FullSelectItem[] = [];

    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.FullSelect;
    }

    public addFullSelectItem(node: FullSelectItem) {
        this.fullSelectItems.push(node);
        this.addChild(node);
    }

    public getFullSelectItems(): FullSelectItem[] {
        return this.fullSelectItems;
    }

    public getSelectLists(): SelectList[] {
        return this.fullSelectItems.reduce<SelectList[]>((prev, curr) => {
            return prev.concat(curr.getSelectLists());
        }, []);
    }

    public getFromClauses(): FromClause[] {
        return this.fullSelectItems.reduce<FromClause[]>((prev, curr) => {
            return prev.concat(curr.getFromClauses());
        }, []);
    }

    public getSelectCols(): ICol[] {
        const selectLists = this.getSelectLists();

        return selectLists.reduce<ICol[]>((prev, curr) => {
            return prev.concat(curr.getSelectCols());
        }, []);
    }

    public getFromTables(): ITable[] {
        const fromClauses = this.getFromClauses();

        return fromClauses.reduce<ITable[]>((prev, curr) => {
            return prev.concat(curr.getFromTables());
        }, []);
    }


    public get hasUnion(): boolean {
        return this.fullSelectItems.length > 1;
    }
}

export class FullSelectItem extends Node {
    public subjectSelect: SubSelect | undefined;
    public fullSelect: FullSelect | undefined;

    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.FullSelectItem;
    }

    public setSubjectSelect(node: SubSelect): boolean {
        return this.setNode('subjectSelect', node, 0);
    }

    public setFullSelect(node: FullSelect): boolean {
        return this.setNode('fullSelect', node, 1);
    }

    public getChildSelectItem(): SubSelect | FullSelect {
        return this.subjectSelect || this.fullSelect;
    }

    public getSelectLists(): SelectList[] {
        const childSelect = this.getChildSelectItem();
        if (childSelect instanceof SubSelect) {
            return [childSelect.getSelectList()];
        } else {
            return childSelect.getSelectLists();
        }
    }

    public getFromClauses() {
        const childSelect = this.getChildSelectItem();
        if (childSelect instanceof SubSelect) {
            return [childSelect.getFromClause()];
        } else {
            return childSelect.getFromClauses();
        }
    }
}

export class SubSelect extends Node {
    public selectList: SelectList | undefined;
    public fromClause: FromClause | undefined;

    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.SubSelect;
    }

    public setSelectList(node: SelectList): boolean {
        return this.setNode('selectList', node, 1);
    }

    public getSelectList(): SelectList | undefined {
        return this.selectList;
    }

    public setFromClause(node: FromClause): boolean {
        return this.setNode('fromClause', node, 2);
    };

    public getFromClause(): FromClause | undefined {
        return this.fromClause;
    }

    public getSelectCols(): ICol[] {
        return this.selectList.getSelectCols();
    }

    public getFromTables(): ITable[] {
        return this.fromClause ? this.fromClause.getFromTables() : [];
    }
}

export class SelectList extends Node {
    public selectListItem: SelectListItem[] = [];

    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.SelectList;
    }

    public addSelectListItem(node: SelectListItem) {
        this.selectListItem.push(node);
        this.addChild(node);
    }

    public getSelectCols(): ICol[] {
        return this.selectListItem.reduce<ICol[]>((prev, curr) => {
            return prev.concat(curr.getSelectCol());
        }, []);
    }
}

export class SelectListItem extends Node {
    public identifier: Identifier | undefined;
    public expr: Expr | undefined;
    public selectListAlias: SelectListAlias | undefined;
    public selectListAsterisk: SelectListAsterisk | undefined;

    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.SelectListItem;
    }

    public setIdentifier(node: Identifier): boolean {
        return this.setNode('identifier', node, 0);
    }

    public setExpr(node: Expr): boolean {
        return this.setNode('expr', node, this.identifier ? 2 : 0);
    }

    public setSelectListAlias(node: SelectListAlias): boolean {
        return this.setNode('selectListAlias', node, this.identifier ? 3 : 1);
    }

    public setSelectListAsterisk(node: SelectListAsterisk): boolean {
        return this.setNode('selectListAsterisk', node, 0);
    }

    public getColName(): string {
        if (this.selectListAsterisk) {
            return this.selectListAsterisk.getColName();
        }

        if (this.identifier) {
            return this.identifier.getText();
        } else {
            return this.expr.getText();
        }
    }

    public getAliasName(): string {
        return this.selectListAlias ? this.selectListAlias.getAlias() : '';
    }

    public getSelectCol(): ICol {
        return {
            name: this.getColName(),
            aliasName: this.getAliasName(),
            isAll: !!this.selectListAsterisk
        };
    }
}

export class SelectListAsterisk extends Node {
    public identifier: Identifier | undefined;

    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.SelectListAsterisk;
    }

    public setIdentifier(node: Identifier): boolean {
        return this.setNode('identifier', node, 0);
    }

    public getIdentifier(): Identifier {
        return this.identifier;
    }

    public getColName(): string {
        return this.identifier ? this.identifier.getText() + '.*' : '*';
    }
}

export class SelectListAlias extends Node {
    public identifier: Identifier;

    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.SelectListAlias;
    }

    public setIdentifier(node: Identifier): boolean {
        return this.setNode('identifier', node, this.getChildren().length);
    }

    public getAlias(): string {
        return this.identifier.getText();
    }
}

export class FromClause extends Node {
    public fromTableClause: FromTableClause | undefined;
    public fromJoinClauseList: FromJoinClause[] = [];

    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.FromClause;
    }

    public setFromTableClause(node: FromTableClause): boolean {
        return this.setNode('fromTableClause', node, 1);
    }

    public addFromJoinClauseList(nodes: FromJoinClause[]) {
        this.fromJoinClauseList = nodes;
        this.addChildren(nodes);
    }

    public getFromTables(): ITable[] {
        const result = [this.fromTableClause.getTable()];

        return result.concat(this.fromJoinClauseList.map(node => {
            return node.getTable();
        }));
    }
}

export class FromTableClause extends Node {
    public fromTableNameClause: FromTableNameClause | undefined;
    public fromSubjectSelectClause: FromSubSelectClause | undefined;

    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.FromTableClause;
    }

    public setFromTableNameClause(node: FromTableNameClause): boolean {
        return this.setNode('fromTableNameClause', node, 0);
    }

    public setFromSubjectSelectClause(node: FromSubSelectClause): boolean {
        return this.setNode('fromSubjectSelectClause', node, 0);
    }

    public getFromItem(): FromTableNameClause | FromSubSelectClause {
        return this.fromTableNameClause || this.fromSubjectSelectClause;
    }

    public getTable(): ITable {
        const fromItem = this.getFromItem();

        return fromItem.getTable();
    }
}

export class FromTableNameClause extends Node {
    public tableName: TableName;
    public tableAlias: FromAliasClause | undefined;

    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.FromTableNameClause;
    }

    public setTableName(node: TableName): boolean {
        return this.setNode('tableName', node, 0);
    }

    public setTableAlias(node: FromAliasClause): boolean {
        return this.setNode('tableAlias', node, 1);
    }

    public getTable(): ITable {
        return {
            rawTable: this.tableName.getTableName(),
            aliasName: this.tableAlias ? this.tableAlias.getAlias() : ''
        };
    }
}

export class TableName extends Node {
    public identifier: Identifier;

    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.TableName;
    }

    public setIdentifier(node: Identifier): boolean {
        return this.setNode('identifier', node, 0);
    }

    public getTableName(): string {
        return this.identifier.getText();
    }

    public getIdentifier(): Identifier {
        return this.identifier;
    }
}

export class FromSubSelectClause extends Node {
    public selectStmt: Select;
    public fromAlias: FromAliasClause;

    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.FromSubSelectClause;
    }

    public setSelect(node: Select): boolean {
        return this.setNode('selectStmt', node, 1);
    }

    public setFromAlias(node: FromAliasClause): boolean {
        return this.setNode('fromAlias', node, 3);
    }

    public getTable(): ITable {
        return {
            aliasName: this.fromAlias.getAlias(),
            rawTable: this.selectStmt
        };
    }
}

export class FromJoinClause extends Node {
    public fromTableClause: FromTableClause;

    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.FromJoinClause;
    }

    public setFromTableClause(node: FromTableClause): boolean {
        return this.setNode('fromTableClause', node, 1);
    }

    public getTable(): ITable {
        return this.fromTableClause.getTable();
    }
}

export class FromAliasClause extends Node {
    public identifier: Identifier;

    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.FromAliasClause;
    }

    public setIdentifier(node: Identifier): boolean {
        return this.setNode('identifier', node, this.getChildren().length);
    }

    public getAlias(): string {
        return this.identifier.getText();
    }
}

export class Drop extends Node {
    public tableName: TableName;
    public expr: Expr;
    public dropType: 'table' | 'database' | 'schema';

    public get type(): NodeType {
        return NodeType.Drop;
    }

    public setExpr(node: Expr): boolean {
        return this.setNode('expr', node, this.getChildren().length);
    }

    public setTableName(node: TableName): boolean {
        return this.setNode('tableName', node, this.getChildren().length);
    }

    public setDropType(type: 'table' | 'database' | 'schema') {
        this.dropType = type;
    }

    public getTableName(): string {
        return this.tableName.getTableName();
    }

    public getDatabaseName(): string {
        return this.expr.getText();
    }

    public getSchemaName(): string {
        return this.expr.getText();
    }
}

export class Expr extends Node {
    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.Expr;
    }
}

export class Keyword extends Node {
    constructor(offset: number, length: number) {
        super(offset, length);
    }

    public get type(): NodeType {
        return NodeType.Keyword;
    }
}

export interface IRule {
    id: string;
    message: string;
}

export enum Level {
    Ignore = 1,
    Warning = 2,
    Error = 4
}

export interface IMarker {
    getNode(): Node;

    getMessage(): string;

    getOffset(): number;

    getLength(): number;

    getRule(): IRule;

    getLevel(): Level;
}

export class Marker implements IMarker {
    private node: Node;
    private rule: IRule;
    private level: Level;
    private message: string;
    private offset: number;
    private length: number;

    constructor(node: Node, rule: IRule, level: Level, message?: string, offset: number = node.offset, length: number = node.length) {
        this.node = node;
        this.rule = rule;
        this.level = level;
        this.message = message || rule.message;
        this.offset = offset;
        this.length = length;
    }

    getLength(): number {
        return this.length;
    }

    getLevel(): Level {
        return this.level;
    }

    getMessage(): string {
        return this.message;
    }

    getNode(): Node {
        return this.node;
    }

    getOffset(): number {
        return this.offset;
    }

    getRule(): IRule {
        return this.rule;
    }
}

export interface IVisitor {
    visitNode: (node: Node) => boolean;
}

export interface IVisitorFunction {
    (node: Node): boolean;
}
