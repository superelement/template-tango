
export interface IMergeOptions {
	beyondComparePath: string;
    cloneDest:string;
    completeCB: Function;
    backEnd: IMergableFiles;
    frontEnd: IMergableFiles;
    nameMap?: INameMapGroup
}

export interface IMergableFiles {
    rootDir: string
    , extension: string
    , pagesDir: string
    , modulesDir: string
    , pageExclusions: Array<string>
    , moduleExclusions: Array<string>
    , subDir: string
}


export interface ISuccessList {
    errList: Array<string>;
    sucList: Array<string>;
}

export interface IWalk {
    path: string
}

export interface INameMap {
    from:string
    to:string
}

export interface INameMapSpecific {
    backEnd:string
    frontEnd:string
}

export interface INameMapGroup {
    pages:Array<INameMapSpecific>
    modules:Array<INameMapSpecific>
}