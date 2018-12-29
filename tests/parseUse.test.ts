import { getPath, Parser } from '../src';
import * as nodes from '../src/nodes';

const parser = new Parser();

function getNode(value: string): nodes.Node {
    let offset = value.indexOf('|');
    value = value.substr(0, offset) + value.substr(offset + 1);

    const node = parser.parse(value);
    return getPath(node, offset).pop();
}

describe('Parse use', () => {
    test('use|', () => {
        const node = getNode('use|');
        expect(node).toBeInstanceOf(nodes.Expr);
    });

    test('use db; use|', () => {
        const node = getNode('use db; use|');
        expect(node).toBeInstanceOf(nodes.Expr);
    });

    test('use db|', () => {
        const node = getNode('use db|');
        expect(node).toBeInstanceOf(nodes.Identifier);

        const useNode = node.getParent();
        expect(useNode).toBeInstanceOf(nodes.Use);
        expect((useNode as nodes.Use).getUseDbName()).toBe('db');
    });

    test('use| db', () => {
        const node = getNode('use| db');
        expect(node).toBeInstanceOf(nodes.Keyword);

        const useNode = node.getParent();
        expect(useNode).toBeInstanceOf(nodes.Use);
        expect((useNode as nodes.Use).getUseDbName()).toBe('db');
    });
});
