import fs = require("fs-extra");
import chalk = require("chalk");
import globby = require("globby");
import _ = require("lodash");
import replaceExt = require('replace-ext');
import Bombom = require("../deps/bombom/dist/BomBom.js");
import {Promise} from "es6-promise";
import {polyfill} from "es6-promise";
import {exec} from 'child_process';

import {ISuccessList,IMergableFiles,IWalk} from "./interfaces";

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
    opts.pagesDir = ensureTrainlingSlash(opts.pagesDir);
    opts.modulesDir = ensureTrainlingSlash(opts.modulesDir);
    
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
 * @param errList (optional) - Array of failes file paths (uses originalFilePath).
 */
function copyToNewFolderStructure(originalFilePath:string, originalMainDir:string, newMainDir:string, ext:string, originalSubDir:string, newSubDir:string, cb:Function, sucList:Array<string> = null, errList:Array<string> = null):void {

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

        // The destination filePath removes the original directory (eg back end) and extension, because they've been replaced (eg. to match the front end ones), which makes them easily comparable
        var dest = newMainDir + 
                replaceExt( originalFilePath
                    .replace(originalMainDir, "") // removes original main directory so it can be replaced with new one
                , ext)

        dest = normalizePaths(dest); // needs to be called before replacing subDir in path because of slash inconsistency on Windows

        if(originalSubDir) dest = dest.replace( "/" + originalSubDir, "/" ) // removes original subdirectory so it can be replaced with new one 

        var fileName = getFileName(dest);
        dest = dest.replace( fileName, newSubDir + fileName ); // adds new subdirectory
        

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
                        feModulesDir:string = "Widgets/"): Promise<ISuccessList> {
    
    beOpts = prepareCopyOpts(beOpts);
    fePagesDir = ensureTrainlingSlash(fePagesDir);
    feModulesDir = ensureTrainlingSlash(feModulesDir);
    
    // makes sure destination directories exist
    fs.ensureDirSync(cloneDest + fePagesDir);
    fs.ensureDirSync(cloneDest + feModulesDir);
    
    var backEndPages:Array<string> = getOptsFullPaths(beOpts, "page");
    var backEndModules:Array<string> = getOptsFullPaths(beOpts, "module");

    
    return new Promise((resolve, reject) => {
        var count = 0
          , total:number = backEndPages.length + backEndModules.length
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

        backEndPages.forEach((filePath:string) => {
            copyToNewFolderStructure(filePath, beOpts.rootDir + beOpts.pagesDir, cloneDest + fePagesDir, feExt, beOpts.subDir, feSubDir, checkCount, sucList, errList);
        });

        backEndModules.forEach((filePath:string) => {
            copyToNewFolderStructure(filePath, beOpts.rootDir + beOpts.modulesDir, cloneDest + feModulesDir, feExt, beOpts.subDir, feSubDir, checkCount, sucList, errList);
        });
    });
}


function copyFrontToBack(cloneDest:string, 
                        feOpts:IMergableFiles,
                        // will write using front end values
                        beExt:string = ".vash",
                        beSubDir:string = "",
                        bePagesDir:string = "Views/", 
                        beModulesDir:string = "Components/"): Promise<ISuccessList> {
    
    
    feOpts = prepareCopyOpts(feOpts);
    bePagesDir = ensureTrainlingSlash(bePagesDir);
    beModulesDir = ensureTrainlingSlash(beModulesDir);
    
    // makes sure destination directories exist
    fs.ensureDirSync(cloneDest + bePagesDir);
    fs.ensureDirSync(cloneDest + beModulesDir);
    
    var fePages:Array<string> = getOptsFullPaths(feOpts, "page");
    var feModules:Array<string> = getOptsFullPaths(feOpts, "module");

    
    return new Promise((resolve, reject) => {
        var count = 0
          , total:number = fePages.length + feModules.length
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

        fePages.forEach((filePath:string) => {
            copyToNewFolderStructure(filePath, feOpts.rootDir + feOpts.pagesDir, cloneDest + bePagesDir, beExt, feOpts.subDir, beSubDir, checkCount, sucList, errList);
        });

        feModules.forEach((filePath:string) => {
            copyToNewFolderStructure(filePath, feOpts.rootDir + feOpts.modulesDir, cloneDest + beModulesDir, beExt, feOpts.subDir, beSubDir, checkCount, sucList, errList);
        });
    });
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