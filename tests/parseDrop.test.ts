import { getPath, Parser } from '../src';
import * as nodes from '../src/nodes';

const parser = new Parser();

function getNode(value: string): nodes.Node {
    let offset = value.indexOf('|');
    value = value.substr(0, offset) + value.substr(offset + 1);

    const node = parser.parse(value);
    return getPath(node, offset).pop();
}

describe('Parse drop', () => {
    test('drop|', () => {
        const node = getNode('use|');
        expect(node).toBeInstanceOf(nodes.Expr);
    });

    test('drop table table1; drop|', () => {
        const node = getNode('drop table table1; drop|');
        expect(node).toBeInstanceOf(nodes.Expr);
    });

    test('drop table table1|', () => {
        const node = getNode('drop table table1|');

        const dropNode = node.findParent(nodes.NodeType.Drop);
        expect(dropNode).toBeInstanceOf(nodes.Drop);
        expect((dropNode as nodes.Drop).dropType).toBe('table');
        expect((dropNode as nodes.Drop).getTableName()).toBe('table1');
    });

    test('drop table if exists table1|', () => {
        const node = getNode('drop table if exists table1|');

        const dropNode = node.findParent(nodes.NodeType.Drop);
        expect(dropNode).toBeInstanceOf(nodes.Drop);
        expect((dropNode as nodes.Drop).dropType).toBe('table');
        expect((dropNode as nodes.Drop).getTableName()).toBe('table1');
    });

    test('drop table if exists db.table1|', () => {
        const node = getNode('drop table if exists db.table1|');

        const dropNode = node.findParent(nodes.NodeType.Drop);
        expect(dropNode).toBeInstanceOf(nodes.Drop);
        expect((dropNode as nodes.Drop).dropType).toBe('table');
        expect((dropNode as nodes.Drop).getTableName()).toBe('db.table1');
    });

    test('drop database db|', () => {
        const node = getNode('drop database db|');

        const dropNode = node.findParent(nodes.NodeType.Drop);
        expect(dropNode).toBeInstanceOf(nodes.Drop);
        expect((dropNode as nodes.Drop).dropType).toBe('database');
        expect((dropNode as nodes.Drop).getDatabaseName()).toBe('db');
    });

    test('drop database if exists db|', () => {
        const node = getNode('drop database if exists db|');

        const dropNode = node.findParent(nodes.NodeType.Drop);
        expect(dropNode).toBeInstanceOf(nodes.Drop);
        expect((dropNode as nodes.Drop).dropType).toBe('database');
        expect((dropNode as nodes.Drop).getDatabaseName()).toBe('db');
    });

    test('drop schema schema|', () => {
        const node = getNode('drop schema schema|');

        const dropNode = node.findParent(nodes.NodeType.Drop);
        expect(dropNode).toBeInstanceOf(nodes.Drop);
        expect((dropNode as nodes.Drop).dropType).toBe('schema');
        expect((dropNode as nodes.Drop).getSchemaName()).toBe('schema');
    });

    test('drop schema if exists schema|', () => {
        const node = getNode('drop schema if exists schema|');

        const dropNode = node.findParent(nodes.NodeType.Drop);
        expect(dropNode).toBeInstanceOf(nodes.Drop);
        expect((dropNode as nodes.Drop).dropType).toBe('schema');
        expect((dropNode as nodes.Drop).getSchemaName()).toBe('schema');
    });
});
