import { getPath, Parser } from '../src';
import * as nodes from '../src/nodes';

const parser = new Parser();

function getNode(value: string): nodes.Node {
    let offset = value.indexOf('|');
    value = value.substr(0, offset) + value.substr(offset + 1);

    const node = parser.parse(value);
    return getPath(node, offset).pop();
}

describe('Parse select', () => {
    describe('Common table expression', () => {
        test('None Cte', () => {
            const node = getNode('select * from t1|');
            const selectNode = node.findParent(nodes.NodeType.Select) as nodes.Select;

            expect(selectNode.cteSelectNode).toBe(undefined);
            expect(selectNode.getCteTables()).toEqual([]);
        });

        test('Single Cte', () => {
            const node = getNode('with t1 as (select * from table) select * from t1|');
            const selectNode = node.findParent(nodes.NodeType.Select) as nodes.Select;

            expect(selectNode.getCteTables().map(cteTable => cteTable.name)).toEqual(['t1']);
        });

        test('Multiple Cte', () => {
            const node = getNode('with t1 as (select * from table), t2 as (select * from table2) select * from t2|');
            const selectNode = node.findParent(nodes.NodeType.Select) as nodes.Select;

            expect(selectNode.getCteTables().map(cteTable => cteTable.name)).toEqual(['t1', 't2']);
        });

        test('Parse Cte fullselect', () => {
            const node = getNode('with t1 as (select col1, col2 from table) select * from t1|');
            const selectNode = node.findParent(nodes.NodeType.Select) as nodes.Select;
            const cteFullSelect = selectNode.getCteTables()[0].origin;

            expect(selectNode.getCteTables().map(cteTable => cteTable.name)).toEqual(['t1']);
            expect(cteFullSelect.getFromTables()).toEqual(<nodes.ITable[]>[
                {
                    rawTable: 'table',
                    aliasName: ''
                }
            ]);
            expect(cteFullSelect.getSelectCols()).toEqual(<nodes.ICol[]>[
                {
                    aliasName: '',
                    name: 'col1',
                    isAll: false
                }, {
                    aliasName: '',
                    name: 'col2',
                    isAll: false
                }
            ]);
        });
    });

    describe('From clause', () => {
        test('from_table_name_clause', () => {
            const node = getNode('select * from table|');
            const fromClauseNode = node.findParent(nodes.NodeType.FullSelect) as nodes.FullSelect;

            expect(fromClauseNode.getFromTables()).toEqual([
                {
                    rawTable: 'table',
                    aliasName: ''
                }
            ]);
        });

        test('from_table_name_clause with alias', () => {
            const node = getNode('select * from table as t|');
            const node1 = getNode('select * from table t|');

            const fromClauseNode = node.findParent(nodes.NodeType.FullSelect) as nodes.FullSelect;
            expect(fromClauseNode.getFromTables()).toEqual([
                {
                    rawTable: 'table',
                    aliasName: 't'
                }
            ]);

            const fromClauseNode1 = node1.findParent(nodes.NodeType.FullSelect) as nodes.FullSelect;
            expect(fromClauseNode1.getFromTables()).toEqual([
                {
                    rawTable: 'table',
                    aliasName: 't'
                }
            ]);
        });

        test('from_subselect_clause', () => {
            const node = getNode('select * from (select * from table1) t|');
            const fromClause = node.findParent(nodes.NodeType.FullSelect) as nodes.FullSelect;

            const fromTable = fromClause.getFromTables()[0];

            expect(fromTable.aliasName).toBe('t');
            expect(fromTable.rawTable).toBeInstanceOf(nodes.Select);
        });

        test('from_join_clause without comma', () => {
            const node = getNode('select * from t1, table2 as t2, t3|');
            const fromClause = node.findParent(nodes.NodeType.FullSelect) as nodes.FullSelect;

            expect(fromClause.getFromTables()).toEqual([
                {
                    rawTable: 't1',
                    aliasName: ''
                },
                {
                    rawTable: 'table2',
                    aliasName: 't2'
                },
                {
                    rawTable: 't3',
                    aliasName: ''
                }
            ]);
        });

        test('from_join_clause with join', () => {
            const node = getNode('select col1, col2 from t1 join t2 on col1 = col2|');
            const fromClause = node.findParent(nodes.NodeType.FullSelect) as nodes.FullSelect;

            expect(fromClause.getFromTables()).toEqual([
                {
                    rawTable: 't1',
                    aliasName: ''
                },
                {
                    rawTable: 't2',
                    aliasName: ''
                }
            ]);
        });
    });

    describe('Select list', () => {
        test('simple select', () => {
            const node = getNode('select col1, col2| from table as t');
            const select = node.findParent(nodes.NodeType.FullSelect) as nodes.FullSelect;

            expect(select.getSelectCols()).toEqual([
                {
                    name: 'col1',
                    aliasName: '',
                    isAll: false
                },
                {
                    name: 'col2',
                    aliasName: '',
                    isAll: false
                }
            ]);
        });

        test('simple select with alias', () => {
            const node = getNode('select col1, col2 as c2| from table as t');
            const select = node.findParent(nodes.NodeType.FullSelect) as nodes.FullSelect;

            expect(select.getSelectCols()).toEqual([
                {
                    name: 'col1',
                    aliasName: '',
                    isAll: false
                },
                {
                    name: 'col2',
                    aliasName: 'c2',
                    isAll: false
                }
            ]);
        });

        test('select asterisk', () => {
            const node = getNode('select t.*, *| from table as t');
            const select = node.findParent(nodes.NodeType.FullSelect) as nodes.FullSelect;

            expect(select.getSelectCols()).toEqual([
                {
                    name: 't.*',
                    aliasName: '',
                    isAll: true
                },
                {
                    name: '*',
                    aliasName: '',
                    isAll: true
                }
            ]);
        });

        test('select with compare', () => {
            const node = getNode('select a = 1, b = 2 as b2| from table as t');
            const select = node.findParent(nodes.NodeType.FullSelect) as nodes.FullSelect;

            expect(select.getSelectCols()).toEqual([
                {
                    name: 'a',
                    aliasName: '',
                    isAll: false
                },
                {
                    name: 'b',
                    aliasName: 'b2',
                    isAll: false
                }
            ]);
        });
    });
});
