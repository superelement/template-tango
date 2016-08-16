/// <reference path="../deps/bombom/typings/bombom.d.ts" />

declare module "fs-extra" {

	export function walk(src: string): any;
    export function on(src: string, cb:Function): void;
}

declare module "slash" {
    var slash:any;
    export = slash;
}