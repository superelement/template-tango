import fs = require("fs-extra");
import chalk = require("chalk");
import globby = require("globby");
import _ = require("lodash");
import replaceExt = require('replace-ext');
import Bombom = require("../deps/bombom/dist/BomBom.js");
import {Promise} from "es6-promise";
import {polyfill} from "es6-promise";
import {exec} from 'child_process';

import {ISuccessList,IMergableFiles,IWalk,INameMap,INameMapSpecific,INameMapGroup} from "./interfaces";

const NS = "TemplateTango";
var bcLaunchedAtLeastOnce:boolean = false;

var bombom = new Bombom.default()
  , suppressWarnings = false;

// checks a value, logs a warning and returns if successful
function checkVal(val:any, msg:string) : boolean {
    if(val === null || val === undefined) {
        if(!suppressWarnings)
            console.warn(chalk.cyan(NS + " - checkVal"), chalk.red(msg), chalk.red("Returning early."));
        return false;
    }

    return true;
}

// replaces back slashes with forward slashes
function normalizePaths( filePath:string ) : string {
	return filePath.split("\\").join("/");
}

// gets the current working directory
function getCWD() : string {
    return normalizePaths( process.cwd()+ "/");
}


// Ensures the path given ends in a "/" character.
function ensureTrainlingSlash(path:string): string {
    if(path.substr(path.length - 1) !== "/") path += "/";
    return path;
}


// add bang to exclusions
function bangUpExclusions(exclusions:Array<string>, rootDir:string): Array<string> {
    exclusions = exclusions.map((filePath) => {
        return "!" + rootDir + filePath.replace("!", "");
    });

    return exclusions;
}


function prepareCopyOpts(opts:IMergableFiles):IMergableFiles {

    // makes sure all paths use forward slashes
    opts.rootDir = normalizePaths(opts.rootDir);

    // makes sure paths all have trailing slashes
    if(opts.pagesDir) opts.pagesDir = ensureTrainlingSlash(opts.pagesDir);
    if(opts.modulesDir) opts.modulesDir = ensureTrainlingSlash(opts.modulesDir);
    
    return opts;
}


// creates page or module paths (minus exclusions)
function getOptsFullPaths(opts:IMergableFiles, type:string, log:boolean = false):Array<string> {
    
    //if(log) console.log(opts.rootDir + (type === "page" ? opts.pagesDir : opts.modulesDir)  + "**/*" + opts.extension)
    
    if(!opts.pageExclusions) opts.pageExclusions = [];
    if(!opts.moduleExclusions) opts.moduleExclusions = [];

    // add bang to exclusions
    opts.pageExclusions = bangUpExclusions( opts.pageExclusions, opts.rootDir);
    opts.moduleExclusions = bangUpExclusions( opts.moduleExclusions, opts.rootDir);

    var query:Array<string> = [
        opts.rootDir + (type === "page" ? opts.pagesDir : opts.modulesDir)  + "**/*" + opts.extension
    ];

         if(type === "page" && opts.pageExclusions)     query = query.concat(opts.pageExclusions);
    else if(type === "module" && opts.moduleExclusions) query = query.concat(opts.moduleExclusions); 

    return globby.sync(query);
}


/**
 * @description Copies a file to a new destination, changing the extension and folder structure and adding original file paths to either a success or error array
 * @param originalFilePath - File to copy from.
 * @param originalMainDir - Part of the file path to swap out with 'newMainDir'.
 * @param newMainDir - New directory path to replace 'originalMainDir'. 
 * @param ext - New extention for the copied file.
 * @param originalSubDir - Sub-directory from original target template.
 * @param newSubDir - Sub-directory for target template.
 * @param cb - Callback on complete, passing boolean for success/fail.
 * @param sucList (optional) - Array of successful file paths (uses originalFilePath).
 * @param errList (optional) - Array of failed file paths (uses originalFilePath).
 * @param nameMap (optional) - Maps page and module names that differ between front and back end
 * @param justFile (optional) - Pass true if you just want the file copied without any folder hierarchy
 */
function copyToNewFolderStructure(originalFilePath:string, originalMainDir:string, newMainDir:string, ext:string, originalSubDir:string, newSubDir:string, cb:Function, sucList:Array<string> = null, errList:Array<string> = null, nameMap:INameMap = null, justFile:boolean = false):void {

    // fail it if original file doesn't exist
    if(!fs.existsSync(originalFilePath)) {
        if(errList) errList.push(originalFilePath);
        cb(false);
        return;
    }

    if(originalSubDir)  originalSubDir = ensureTrainlingSlash(originalSubDir);
    if(newSubDir)       newSubDir = ensureTrainlingSlash(newSubDir);

    fs.readFile(originalFilePath, (err:Error, buf:Buffer) => {
        // we add a BOM to each file to avoid differences with Visual Studio created files
        buf = bombom.enforce(buf, "utf8");
        

        var fileName:string = replaceExt( originalFilePath
                        .replace(originalMainDir, "") // removes original main directory so it can be replaced with new one
                    , ext);
        
        fileName = normalizePaths(fileName);
        
        // if(nameMap) console.log("--", nameMap.from + ext, fileName)
        if(nameMap && nameMap.from + ext === fileName) {
            fileName = nameMap.to + ext;
            if(!suppressWarnings)
                console.log(chalk.cyan(NS + " - copyToNewFolderStructure"), chalk.red("'nameMap' used"), nameMap);
        }

        // The destination filePath removes the original directory (eg back end) and extension, because they've been replaced (eg. to match the front end ones), which makes them easily comparable
        var dest = newMainDir + fileName;

        dest = normalizePaths(dest); // needs to be called before replacing subDir in path because of slash inconsistency on Windows

        if(originalSubDir) dest = dest.replace( "/" + originalSubDir, "/" ) // removes original subdirectory so it can be replaced with new one 

        // adds new subdirectory, but if nameMap is used, this subdirectory will already exist, so gets skipped
        fileName = getFileName(dest);
        if(dest.indexOf(newSubDir + fileName) === -1)
            dest = dest.replace( fileName, newSubDir + fileName );
        

        if(justFile) {
            dest = newMainDir + fileName;
            console.log("dest", dest)
        }
        

        fs.outputFile(dest, buf, (err:Error) => {
            if(err) {
                if(errList) errList.push(err.message);
                cb(false);
            } else {
                if(sucList) sucList.push(originalFilePath);
                cb(true);
            }
        });
    });
}


function copyBackToFront(cloneDest:string, 
                        beOpts:IMergableFiles,
                        // will write using front end values
                        feExt:string = ".vash",
                        feSubDir:string = "tmpl/",
                        fePagesDir:string = "Pages/", 
                        feModulesDir:string = "Widgets/",
                        nameMapGroup:INameMapGroup = null): Promise<ISuccessList> {
    
    var noPages:boolean = !fePagesDir || !beOpts.pagesDir;
    var noModules:boolean = !feModulesDir || !beOpts.modulesDir;

    beOpts = prepareCopyOpts(beOpts);

    var bePages:Array<string>;
    if(!noPages) {
        fs.ensureDirSync(cloneDest + fePagesDir);
        bePages = getOptsFullPaths(beOpts, "page");
        fePagesDir = ensureTrainlingSlash(fePagesDir);
    }


    var beModules:Array<string>;
    if(!noModules) {
        feModulesDir = ensureTrainlingSlash(feModulesDir);
        fs.ensureDirSync(cloneDest + feModulesDir);
        beModules = getOptsFullPaths(beOpts, "module");
    }

    
    return new Promise((resolve, reject) => {
        var count = 0
          , total:number = (noPages ? 0 : bePages.length) + (noModules ? 0 : beModules.length)
          , errList:Array<string> = []
          , sucList:Array<string> = []

        // when all files are copied, resolve the promise
        var checkCount = () => {
            count++;
    
            if(count >= total) {
                resolve({
                    sucList: sucList,
                    errList: errList
                });
            }
        }

        if(!noPages) {
        
            if(!bePages.length) {
                if(!suppressWarnings)
                    console.warn(NS, "copyBackToFront", "No back end 'pages' found. Check that 'extension', 'pagesDir' and 'rootDir' resolve to files that exist.");
                
                checkCount();
            } else {

                bePages.forEach((filePath:string) => {
                    let originalMainDir:string = beOpts.rootDir + beOpts.pagesDir;
                    let nameMap:INameMap = getNameMap(filePath, nameMapGroup, originalMainDir, true, true);
                    let justFile:boolean = fePagesDir === "/";
                    
                    // normalizes trailing double slash from `fePagesDir` when there is no parent folder 
                    let noParentFolder:boolean = beOpts.pagesDir === "/";
                    if(noParentFolder) {
                        originalMainDir = originalMainDir.replace("//", "/")
                        fePagesDir += getFileName(filePath, false) + "/"; // generates the folder from the file name
                    }

                    copyToNewFolderStructure(filePath, originalMainDir, cloneDest + fePagesDir, feExt, beOpts.subDir, feSubDir, checkCount, sucList, errList, nameMap, justFile);
                });
            }

        }

        if(!noModules) {
        
            if(!beModules.length) {
                if(!suppressWarnings)
                    console.warn(NS, "copyBackToFront", "No back end 'modules' found. Check that 'extension', 'modulesDir' and 'rootDir' resolve to files that exist.");
                
                checkCount();
            } else {

                beModules.forEach((filePath:string) => {
                    let originalMainDir:string = beOpts.rootDir + beOpts.modulesDir;
                    let nameMap:INameMap = getNameMap(filePath, nameMapGroup, originalMainDir, true, false);
                    let justFile:boolean = feModulesDir === "/";
                    
                    // normalizes trailing double slash from `feModulesDir` when there is no parent folder 
                    let noParentFolder:boolean = beOpts.modulesDir === "/";
                    if(noParentFolder) {
                        originalMainDir = originalMainDir.replace("//", "/")
                        feModulesDir += getFileName(filePath, false) + "/"; // generates the folder from the file name
                    }
                    
                    copyToNewFolderStructure(filePath, originalMainDir, cloneDest + feModulesDir, feExt, beOpts.subDir, feSubDir, checkCount, sucList, errList, nameMap, justFile);
                });
            }

        }
    });
}


function copyFrontToBack(cloneDest:string, 
                        feOpts:IMergableFiles,
                        // will write using front end values
                        beExt:string = ".vash",
                        beSubDir:string = "",
                        bePagesDir:string = "Views/", 
                        beModulesDir:string = "Components/",
                        nameMapGroup:INameMapGroup = null): Promise<ISuccessList> {
    
    var noPages:boolean = !bePagesDir || !feOpts.pagesDir;
    var noModules:boolean = !beModulesDir || !feOpts.modulesDir;
    
    feOpts = prepareCopyOpts(feOpts);
    
    var fePages:Array<string>;
    if(!noPages) {
        bePagesDir = ensureTrainlingSlash(bePagesDir);
        fs.ensureDirSync(cloneDest + bePagesDir);
        fePages = getOptsFullPaths(feOpts, "page");
    }

    var feModules:Array<string>;
    if(!noModules) {
        beModulesDir = ensureTrainlingSlash(beModulesDir);
        fs.ensureDirSync(cloneDest + beModulesDir);
        feModules = getOptsFullPaths(feOpts, "module");
    }

    
    return new Promise((resolve, reject) => {
        var count = 0
          , total:number = (noPages ? 0 : fePages.length) + (noModules ? 0 : feModules.length)
          , errList:Array<string> = []
          , sucList:Array<string> = []

        // when all files are copied, resolve the promise
        var checkCount = () => {
            count++;
    
            if(count >= total) {
                resolve({
                    sucList: sucList,
                    errList: errList
                });
            }
        }

        if(!noPages) {
        
            if(!fePages.length) {
                if(!suppressWarnings)
                    console.warn(NS, "copyFrontToBack", "No front end 'pages' found. Check that 'extension', 'pagesDir' and 'rootDir' resolve to files that exist.");
                
                checkCount();
            } else {

                fePages.forEach((filePath:string) => {
                    let originalMainDir:string = feOpts.rootDir + feOpts.pagesDir;
                    let nameMap:INameMap = getNameMap(filePath, nameMapGroup, originalMainDir, false, true);
                    let justFile:boolean = bePagesDir === "/";

                    // normalizes trailing double slash from `bePagesDir` when there is no parent folder 
                    let noParentFolder:boolean = feOpts.pagesDir === "/";
                    if(noParentFolder) {
                        originalMainDir = originalMainDir.replace("//", "/")
                        bePagesDir += getFileName(filePath, false) + "/"; // generates the folder from the file name
                    }

                    copyToNewFolderStructure(filePath, originalMainDir, cloneDest + bePagesDir, beExt, feOpts.subDir, beSubDir, checkCount, sucList, errList, nameMap, justFile);
                });
            }

        }

        if(!noModules) {
        
            if(!feModules.length) {
                if(!suppressWarnings)
                    console.warn(NS, "copyFrontToBack", "No front end 'modules' found. Check that 'extension', 'modulesDir' and 'rootDir' resolve to files that exist.");
                
                checkCount();
            } else {

                feModules.forEach((filePath:string) => {
                    let originalMainDir:string = feOpts.rootDir + feOpts.modulesDir;
                    let nameMap:INameMap = getNameMap(filePath, nameMapGroup, originalMainDir, false, false);
                    let justFile:boolean = beModulesDir === "/";
                    
                    
                    // normalizes trailing double slash from `beModulesDir` when there is no parent folder 
                    let noParentFolder:boolean = feOpts.modulesDir === "/";
                    if(noParentFolder) {
                        originalMainDir = originalMainDir.replace("//", "/")
                        beModulesDir += getFileName(filePath, false) + "/"; // generates the folder from the file name
                    }

                    copyToNewFolderStructure(filePath, originalMainDir, cloneDest + beModulesDir, beExt, feOpts.subDir, beSubDir, checkCount, sucList, errList, nameMap, justFile);
                });
            }

        }
    });
}



function getNameMap(filePath:string, nameMapGroup:INameMapGroup, originalMainDir:string, isBackEnd:boolean, isPages:boolean):INameMap {

    let nameMap:INameMap = null;
    if(nameMapGroup) {
        var fileName:string = normalizePaths( replaceExt( filePath.replace(originalMainDir, ""), "") );
        var filterObj = isBackEnd ? { backEnd: fileName } : { frontEnd: fileName };
        var matches = _.filter(isPages ? nameMapGroup.pages : nameMapGroup.modules, filterObj);

        if(matches.length === 1) {
            var nameMapSpecific:INameMapSpecific = matches[0];

            nameMap = {
                from: isBackEnd ? nameMapSpecific.backEnd : nameMapSpecific.frontEnd
                ,to: isBackEnd ? nameMapSpecific.frontEnd : nameMapSpecific.backEnd
            };
        }
    }

    return nameMap;
}


function expectFiles(fileList:Array<string>, cb:Function):void {
    fileList.forEach((filePath, i) => {
        //console.log(filePath, fs.existsSync(filePath))
        expect(fs.existsSync(filePath)).toBe(true);
        if(i === fileList.length-1) cb();
    });
}


function launchBC(bcPath:string, cloneDest:string, targetDir:string, cb:Function = null, delay:number = 1000):void {
    
    var cmd:string = '"' + bcPath + '" "' + cloneDest + '" "' + targetDir + '"';
    
    // timeout is just so you have a chance to read the message above
    setTimeout(function () {
        exec(cmd, function (err:string, stdout:string, stderr:string) {
            if (err) {
                console.error(err);
                if(cb) cb(false, err);
                return;
            }
            if(cb) cb(true);
        });
    }, delay);
}

function getBeyondCompareMessage(type:string, col:string, bgCol:string):string {
    var colFn:any = (<any>chalk)[col];
    var bgColFn:any = (<any>chalk)[bgCol];


    var msg:string = bgColFn.white('\n"'+type+'" clone complete.') +
        colFn('\n\n Launching beyond compare...');

    if(!bcLaunchedAtLeastOnce) {
        msg += colFn('\n\n In Beyond Compare, go to ') + 
            bgColFn.white('"Tools -> Import Settings"')+ 
            colFn(' and choose the file ') + 
            bgColFn.white('"deps/BCSettings.bcpkg"') + 
            colFn(' and check all the options. ') +
            colFn.bold('You only need to set this once.') +
        colFn('\n\n When you\'re finished hit enter.');
    }
    
    bcLaunchedAtLeastOnce = true;

    return msg;
}




function getFileName(filePath:string, inclExt:boolean = true) {
	filePath = normalizePaths(filePath);
	
	var lastSlashIndex = filePath.lastIndexOf("/");

    if(inclExt) return filePath.slice(lastSlashIndex + 1);

    var lastDotIndex = filePath.lastIndexOf(".");
	return filePath.slice(lastSlashIndex + 1, lastDotIndex);
}


export default {
	checkVal: checkVal
	, normalizePaths: normalizePaths
    , copyBackToFront: copyBackToFront
    , copyFrontToBack: copyFrontToBack
    , getCWD: getCWD
    , expectFiles: expectFiles
    , getBeyondCompareMessage: getBeyondCompareMessage   
    , ensureTrainlingSlash: ensureTrainlingSlash
    , launchBC: launchBC
    // just for unit tests
    , testable: {
        suppressWarnings: function(val:boolean) {
            suppressWarnings = val;
        }
        ,getOptsFullPaths: getOptsFullPaths
        ,bangUpExclusions: bangUpExclusions
        ,copyToNewFolderStructure: copyToNewFolderStructure
    }
}