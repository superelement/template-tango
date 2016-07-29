# bombom

## Important note
This is a hacked version of the Bombom library because the most recent version on NPM was broken. Had to precompile it from TS because the version of node.d.ts was different to my main project.

> Detect, enforce or strip BOM signatures.

[![Build Status][]](http://travis-ci.org/jedmao/bombom)
[![Dependency Status][]](https://gemnasium.com/jedmao/bombom)
[![NPM version][]](http://badge.fury.io/js/bombom)
[![Views][]](https://sourcegraph.com/github.com/jedmao/bombom)

[![NPM](https://nodei.co/npm/bombom.png?downloads=true)](https://nodei.co/npm/bombom/)


# Getting Started

## Installation

```bash
$ npm install bombom
```

## TypeScript Usage

```ts
/// <reference path="node_modules/bombom/bombom.d.ts" />
import bombom = require('bombom');
```

## JavaScript Usage

```js
var bombom = require('bombom');
```


# API

## Terms
- BOM type: This is the key (e.g., `utf8`) used to point to a particular BOM signature. See [pre-registered BOM types](https://github.com/jedmao/bombom/edit/master/README.md#pre-registered-bom-types) below.
- BOM signature: This is a small `NodeBuffer` with an array of hex codes in it. For your convenience, you can [register](https://github.com/jedmao/bombom/edit/master/README.md#registertype-string-signature-number-void) a new BOM type and signature by providing a simple `number[]`.

## Pre-registered BOM Types
- `utf8: new Buffer([0xEF, 0xBB, 0xBF])`
- `utf16le: new Buffer([0xFF, 0xFE])`
- `utf16be: new Buffer([0xFE, 0xFF])`
- `utf32le: new Buffer([0xFF, 0xFE, 0x00, 0x00])`
- `utf32be: new Buffer([0x00, 0x00, 0xFE, 0xFF])`
<br>*See [boms.ts](https://github.com/jedmao/bombom/blob/master/lib/boms.ts)*

## Public Methods

### detect(buffer: NodeBuffer): string
Detects if the specified buffer has a BOM signature and returns the type if it does.

### enforce(buffer: NodeBuffer, type: string): void
Enforces the specified BOM type on the buffer. This will either add the BOM signature to the buffer or, if there is an existing BOM signature that is not of the type specified, it will replace it with the type specified.
<br>*Emits "error" if type is not registered*

### isRegistered(type: string): boolean
Checks whether the specified BOM type is already registered.

### isSigned(buffer: NodeBuffer, type?: string): boolean
Checks whether the specified buffer is signed or not. If the type is specified, it only checks for that type.
<br>*Emits "error" if type is not registered*

### register(type: string, signature: number[]): void
Registers a BOM type with a BOM signature (an array of hex values).
<br>*Emits "warn" if type is already registered*

### strip(buffer: NodeBuffer, type?: string): NodeBuffer
Strips off the BOM signature from the specified buffer and returns the new, stripped-off buffer. If the type is specified, it only strips off that type of signature, if it exists.
<br>*Emits "error" if type is not registered*

### unregister(type: string): void
Unregisters the specified BOM type.
<br>*Emits "warn" if type hasn't been registered*


## License

Released under the MIT license.

[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/jedmao/bombom/trend.png)](https://bitdeli.com/free "Bitdeli Badge")



[Build Status]: https://secure.travis-ci.org/jedmao/bombom.png?branch=master
[Dependency Status]: https://gemnasium.com/jedmao/bombom.png
[NPM version]: https://badge.fury.io/js/bombom.png
[Views]: https://sourcegraph.com/api/repos/github.com/jedmao/bombom/counters/views-24h.png
