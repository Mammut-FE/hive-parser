# hive-parser

[![Build Status](https://travis-ci.org/Mammut-FE/hive-parser.svg?branch=master)](https://travis-ci.org/Mammut-FE/hive-parser)

## Install

```
npm i @mammut-fe/hive-parser --save
```

## Usage

```javascript
import { Parser } from '@mammut-fe/hive-parser';

const parser = new Parser();
const node = parser.parse(`use database`);

console.log(node);
```

result

![result](http://s.lleohao.com/Xnip2018-12-29_16-37-09.png)

