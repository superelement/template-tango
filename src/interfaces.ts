
export interface IMergeOptions {
	beyondComparePath: string;
    cloneDest:string;
    completeCB: Function;
    backEnd: IMergableFiles;
    frontEnd: IMergableFiles;
}

export interface IMergableFiles {
    rootDir: string
    , extension: string
    , pagesDir: string
    , modulesDir: string
    , pageExclusions: Array<string>
    , moduleExclusions: Array<string>
}


export interface ISuccessList {
    errList: Array<string>;
    sucList: Array<string>;
}

export interface IWalk {
    path: string
}