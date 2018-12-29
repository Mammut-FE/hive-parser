import { ParserRuleContext } from 'antlr4';
import { TerminalNode } from 'antlr4/tree/Tree';

export function getRightmostNode(tree) {
    let children = tree.children;
    let node;

    while (children) {
        node = children[children.length - 1];

        if (node.children) {
            children = node.children;
        } else {
            children = null;
        }
    }

    return node;
}

export function getBetweenNode(context, offset) {
    let children = context.children;
    let i = 0, len = children.length;
    let node;

    for (; i < len; i++) {
        node = children[i];
        let range = getTokenRange(node);

        if (offset <= range.stop) {
            break;
        }
    }

    node = children[i - 1];

    if (node instanceof ParserRuleContext) {
        node = getRightmostNode(node);
    }

    return node;
}

export function getTokenRange(token) {
    if (token instanceof TerminalNode) {
        return {
            start: token.symbol.start,
            stop: token.symbol.stop
        };
    }

    if (token instanceof ParserRuleContext) {
        return {
            start: token.start.start,
            stop: token.stop.stop
        };
    }

    return {
        start: -1,
        stop: -1
    };
}

export function offsetIsInRange(offset, range) {
    offset--;

    return offset <= range.stop && offset >= range.start;
}
