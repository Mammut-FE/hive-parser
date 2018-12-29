import { getPath, Parser } from '../src';
import { splitStr } from './helper';

const parser = new Parser();

const textElem = document.getElementById('text') as HTMLTextAreaElement;
const bodyTrElem = document.getElementById('bodyTr');
const headTrElem = document.getElementById('headTr');

let node;

function onBlur() {
    const sql = textElem.value;

    const charList = splitStr(sql);
    let headTrHtml = [];
    let bodyTrHtml = [];

    charList.forEach((char, index) => {
        headTrHtml.push(`<td width="32px">${index}</td>`);
        bodyTrHtml.push(`<td class="${char.startsWith('\\') ? 'space' : ''}"><pre>${char}</pre></td>`);
    });

    bodyTrElem.innerHTML = bodyTrHtml.join('\n');
    headTrElem.innerHTML = headTrHtml.join('\n');

    node = parser.parse(sql);
    console.log(node);

    bindHoverEvent();
}

function bindHoverEvent() {
    Array.from(headTrElem.children).forEach(elem => {
        elem.addEventListener('click', onClick);
    });
}

function onClick(e) {
    const offset = e.target.cellIndex;
    const path = getPath(node, offset);

    console.log(offset, path);
}

textElem.addEventListener('blur', onBlur);
onBlur();

