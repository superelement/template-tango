﻿import IHashTable = require('./interfaces/IHashTable');


var boms: IHashTable<NodeBuffer> = {
	utf8: new Buffer([0xEF, 0xBB, 0xBF]),
	utf16le: new Buffer([0xFF, 0xFE]),
	utf16be: new Buffer([0xFE, 0xFF]),
	utf32le: new Buffer([0xFF, 0xFE, 0x00, 0x00]),
	utf32be: new Buffer([0x00, 0x00, 0xFE, 0xFF])
};

export = boms;
