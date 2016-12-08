"use strict";
var fs = require("fs-extra");
var chalk = require("chalk");
var globby = require("globby");
var _ = require("lodash");
var replaceExt = require('replace-ext');
var Bombom = require("../deps/bombom/dist/BomBom.js");
var es6_promise_1 = require("es6-promise");
var child_process_1 = require('child_process');
var NS = "TemplateTango";
var bcLaunchedAtLeastOnce = false;
var bombom = new Bombom.default(), suppressWarnings = false;
// checks a value, logs a warning and returns if successful
function checkVal(val, msg) {
    if (val === null || val === undefined) {
        if (!suppressWarnings)
            console.warn(chalk.cyan(NS + " - checkVal"), chalk.red(msg), chalk.red("Returning early."));
        return false;
    }
    return true;
}
// replaces back slashes with forward slashes
function normalizePaths(filePath) {
    return filePath.split("\\").join("/");
}
// gets the current working directory
function getCWD() {
    return normalizePaths(process.cwd() + "/");
}
// Ensures the path given ends in a "/" character.
function ensureTrainlingSlash(path) {
    if (path.substr(path.length - 1) !== "/")
        path += "/";
    return path;
}
// add bang to exclusions
function bangUpExclusions(exclusions, rootDir) {
    exclusions = exclusions.map(function (filePath) {
        return "!" + rootDir + filePath.replace("!", "");
    });
    return exclusions;
}
function prepareCopyOpts(opts) {
    // makes sure all paths use forward slashes
    opts.rootDir = normalizePaths(opts.rootDir);
    // makes sure paths all have trailing slashes
    if (opts.pagesDir)
        opts.pagesDir = ensureTrainlingSlash(opts.pagesDir);
    if (opts.modulesDir)
        opts.modulesDir = ensureTrainlingSlash(opts.modulesDir);
    return opts;
}
// creates page or module paths (minus exclusions)
function getOptsFullPaths(opts, type, log) {
    //if(log) console.log(opts.rootDir + (type === "page" ? opts.pagesDir : opts.modulesDir)  + "**/*" + opts.extension)
    if (log === void 0) { log = false; }
    if (!opts.pageExclusions)
        opts.pageExclusions = [];
    if (!opts.moduleExclusions)
        opts.moduleExclusions = [];
    // add bang to exclusions
    opts.pageExclusions = bangUpExclusions(opts.pageExclusions, opts.rootDir);
    opts.moduleExclusions = bangUpExclusions(opts.moduleExclusions, opts.rootDir);
    var query = [
        opts.rootDir + (type === "page" ? opts.pagesDir : opts.modulesDir) + "**/*" + opts.extension
    ];
    if (type === "page" && opts.pageExclusions)
        query = query.concat(opts.pageExclusions);
    else if (type === "module" && opts.moduleExclusions)
        query = query.concat(opts.moduleExclusions);
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
function copyToNewFolderStructure(originalFilePath, originalMainDir, newMainDir, ext, originalSubDir, newSubDir, cb, sucList, errList, nameMap, justFile) {
    if (sucList === void 0) { sucList = null; }
    if (errList === void 0) { errList = null; }
    if (nameMap === void 0) { nameMap = null; }
    if (justFile === void 0) { justFile = false; }
    // fail it if original file doesn't exist
    if (!fs.existsSync(originalFilePath)) {
        if (errList)
            errList.push(originalFilePath);
        cb(false);
        return;
    }
    if (originalSubDir)
        originalSubDir = ensureTrainlingSlash(originalSubDir);
    if (newSubDir)
        newSubDir = ensureTrainlingSlash(newSubDir);
    fs.readFile(originalFilePath, function (err, buf) {
        // we add a BOM to each file to avoid differences with Visual Studio created files
        buf = bombom.enforce(buf, "utf8");
        var fileName = replaceExt(originalFilePath
            .replace(originalMainDir, "") // removes original main directory so it can be replaced with new one
        , ext);
        fileName = normalizePaths(fileName);
        // if(nameMap) console.log("--", nameMap.from + ext, fileName)
        if (nameMap && nameMap.from + ext === fileName) {
            fileName = nameMap.to + ext;
            if (!suppressWarnings)
                console.log(chalk.cyan(NS + " - copyToNewFolderStructure"), chalk.red("'nameMap' used"), nameMap);
        }
        // The destination filePath removes the original directory (eg back end) and extension, because they've been replaced (eg. to match the front end ones), which makes them easily comparable
        var dest = newMainDir + fileName;
        dest = normalizePaths(dest); // needs to be called before replacing subDir in path because of slash inconsistency on Windows
        if (originalSubDir)
            dest = dest.replace("/" + originalSubDir, "/"); // removes original subdirectory so it can be replaced with new one 
        // adds new subdirectory, but if nameMap is used, this subdirectory will already exist, so gets skipped
        fileName = getFileName(dest);
        if (dest.indexOf(newSubDir + fileName) === -1)
            dest = dest.replace(fileName, newSubDir + fileName);
        if (justFile) {
            dest = newMainDir + fileName;
            console.log("dest", dest);
        }
        fs.outputFile(dest, buf, function (err) {
            if (err) {
                if (errList)
                    errList.push(err.message);
                cb(false);
            }
            else {
                if (sucList)
                    sucList.push(originalFilePath);
                cb(true);
            }
        });
    });
}
function copyBackToFront(cloneDest, beOpts, 
    // will write using front end values
    feExt, feSubDir, fePagesDir, feModulesDir, nameMapGroup) {
    if (feExt === void 0) { feExt = ".vash"; }
    if (feSubDir === void 0) { feSubDir = "tmpl/"; }
    if (fePagesDir === void 0) { fePagesDir = "Pages/"; }
    if (feModulesDir === void 0) { feModulesDir = "Widgets/"; }
    if (nameMapGroup === void 0) { nameMapGroup = null; }
    var noPages = !fePagesDir || !beOpts.pagesDir;
    var noModules = !feModulesDir || !beOpts.modulesDir;
    beOpts = prepareCopyOpts(beOpts);
    var bePages;
    if (!noPages) {
        fs.ensureDirSync(cloneDest + fePagesDir);
        bePages = getOptsFullPaths(beOpts, "page");
        fePagesDir = ensureTrainlingSlash(fePagesDir);
    }
    var beModules;
    if (!noModules) {
        feModulesDir = ensureTrainlingSlash(feModulesDir);
        fs.ensureDirSync(cloneDest + feModulesDir);
        beModules = getOptsFullPaths(beOpts, "module");
    }
    return new es6_promise_1.Promise(function (resolve, reject) {
        var count = 0, total = (noPages ? 0 : bePages.length) + (noModules ? 0 : beModules.length), errList = [], sucList = [];
        // when all files are copied, resolve the promise
        var checkCount = function () {
            count++;
            if (count >= total) {
                resolve({
                    sucList: sucList,
                    errList: errList
                });
            }
        };
        if (!noPages) {
            if (!bePages.length) {
                if (!suppressWarnings)
                    console.warn(NS, "copyBackToFront", "No back end 'pages' found. Check that 'extension', 'pagesDir' and 'rootDir' resolve to files that exist.");
                checkCount();
            }
            else {
                bePages.forEach(function (filePath) {
                    var pagesDir = fePagesDir;
                    var originalMainDir = beOpts.rootDir + beOpts.pagesDir;
                    var nameMap = getNameMap(filePath, nameMapGroup, originalMainDir, true, true);
                    var justFile = pagesDir === "/";
                    // normalizes trailing double slash from `fePagesDir` when there is no parent folder 
                    var noParentFolder = beOpts.pagesDir === "/";
                    if (noParentFolder) {
                        originalMainDir = originalMainDir.replace("//", "/");
                        pagesDir += getFileName(filePath, false) + "/"; // generates the folder from the file name
                    }
                    copyToNewFolderStructure(filePath, originalMainDir, cloneDest + pagesDir, feExt, beOpts.subDir, feSubDir, checkCount, sucList, errList, nameMap, justFile);
                });
            }
        }
        if (!noModules) {
            if (!beModules.length) {
                if (!suppressWarnings)
                    console.warn(NS, "copyBackToFront", "No back end 'modules' found. Check that 'extension', 'modulesDir' and 'rootDir' resolve to files that exist.");
                checkCount();
            }
            else {
                beModules.forEach(function (filePath) {
                    var modulesDir = feModulesDir;
                    var originalMainDir = beOpts.rootDir + beOpts.modulesDir;
                    var nameMap = getNameMap(filePath, nameMapGroup, originalMainDir, true, false);
                    var justFile = modulesDir === "/";
                    // normalizes trailing double slash from `feModulesDir` when there is no parent folder 
                    var noParentFolder = beOpts.modulesDir === "/";
                    if (noParentFolder) {
                        originalMainDir = originalMainDir.replace("//", "/");
                        modulesDir += getFileName(filePath, false) + "/"; // generates the folder from the file name
                    }
                    copyToNewFolderStructure(filePath, originalMainDir, cloneDest + modulesDir, feExt, beOpts.subDir, feSubDir, checkCount, sucList, errList, nameMap, justFile);
                });
            }
        }
    });
}
function copyFrontToBack(cloneDest, feOpts, 
    // will write using front end values
    beExt, beSubDir, bePagesDir, beModulesDir, nameMapGroup) {
    if (beExt === void 0) { beExt = ".vash"; }
    if (beSubDir === void 0) { beSubDir = ""; }
    if (bePagesDir === void 0) { bePagesDir = "Views/"; }
    if (beModulesDir === void 0) { beModulesDir = "Components/"; }
    if (nameMapGroup === void 0) { nameMapGroup = null; }
    var noPages = !bePagesDir || !feOpts.pagesDir;
    var noModules = !beModulesDir || !feOpts.modulesDir;
    feOpts = prepareCopyOpts(feOpts);
    var fePages;
    if (!noPages) {
        bePagesDir = ensureTrainlingSlash(bePagesDir);
        fs.ensureDirSync(cloneDest + bePagesDir);
        fePages = getOptsFullPaths(feOpts, "page");
    }
    var feModules;
    if (!noModules) {
        beModulesDir = ensureTrainlingSlash(beModulesDir);
        fs.ensureDirSync(cloneDest + beModulesDir);
        feModules = getOptsFullPaths(feOpts, "module");
    }
    return new es6_promise_1.Promise(function (resolve, reject) {
        var count = 0, total = (noPages ? 0 : fePages.length) + (noModules ? 0 : feModules.length), errList = [], sucList = [];
        // when all files are copied, resolve the promise
        var checkCount = function () {
            count++;
            if (count >= total) {
                resolve({
                    sucList: sucList,
                    errList: errList
                });
            }
        };
        if (!noPages) {
            if (!fePages.length) {
                if (!suppressWarnings)
                    console.warn(NS, "copyFrontToBack", "No front end 'pages' found. Check that 'extension', 'pagesDir' and 'rootDir' resolve to files that exist.");
                checkCount();
            }
            else {
                fePages.forEach(function (filePath) {
                    var pagesDir = bePagesDir;
                    var originalMainDir = feOpts.rootDir + feOpts.pagesDir;
                    var nameMap = getNameMap(filePath, nameMapGroup, originalMainDir, false, true);
                    var justFile = pagesDir === "/";
                    // normalizes trailing double slash from `bePagesDir` when there is no parent folder 
                    var noParentFolder = feOpts.pagesDir === "/";
                    if (noParentFolder) {
                        originalMainDir = originalMainDir.replace("//", "/");
                        pagesDir += getFileName(filePath, false) + "/"; // generates the folder from the file name
                    }
                    copyToNewFolderStructure(filePath, originalMainDir, cloneDest + pagesDir, beExt, feOpts.subDir, beSubDir, checkCount, sucList, errList, nameMap, justFile);
                });
            }
        }
        if (!noModules) {
            if (!feModules.length) {
                if (!suppressWarnings)
                    console.warn(NS, "copyFrontToBack", "No front end 'modules' found. Check that 'extension', 'modulesDir' and 'rootDir' resolve to files that exist.");
                checkCount();
            }
            else {
                feModules.forEach(function (filePath) {
                    var modulesDir = beModulesDir;
                    var originalMainDir = feOpts.rootDir + feOpts.modulesDir;
                    var nameMap = getNameMap(filePath, nameMapGroup, originalMainDir, false, false);
                    var justFile = modulesDir === "/";
                    // normalizes trailing double slash from `beModulesDir` when there is no parent folder 
                    var noParentFolder = feOpts.modulesDir === "/";
                    if (noParentFolder) {
                        originalMainDir = originalMainDir.replace("//", "/");
                        modulesDir += getFileName(filePath, false) + "/"; // generates the folder from the file name
                    }
                    copyToNewFolderStructure(filePath, originalMainDir, cloneDest + modulesDir, beExt, feOpts.subDir, beSubDir, checkCount, sucList, errList, nameMap, justFile);
                });
            }
        }
    });
}
function getNameMap(filePath, nameMapGroup, originalMainDir, isBackEnd, isPages) {
    var nameMap = null;
    if (nameMapGroup) {
        var fileName = normalizePaths(replaceExt(filePath.replace(originalMainDir, ""), ""));
        var filterObj = isBackEnd ? { backEnd: fileName } : { frontEnd: fileName };
        var matches = _.filter(isPages ? nameMapGroup.pages : nameMapGroup.modules, filterObj);
        if (matches.length === 1) {
            var nameMapSpecific = matches[0];
            nameMap = {
                from: isBackEnd ? nameMapSpecific.backEnd : nameMapSpecific.frontEnd,
                to: isBackEnd ? nameMapSpecific.frontEnd : nameMapSpecific.backEnd
            };
        }
    }
    return nameMap;
}
function expectFiles(fileList, cb) {
    fileList.forEach(function (filePath, i) {
        //console.log(filePath, fs.existsSync(filePath))
        expect(fs.existsSync(filePath)).toBe(true);
        if (i === fileList.length - 1)
            cb();
    });
}
function launchBC(bcPath, cloneDest, targetDir, cb, delay) {
    if (cb === void 0) { cb = null; }
    if (delay === void 0) { delay = 1000; }
    var cmd = '"' + bcPath + '" "' + cloneDest + '" "' + targetDir + '"';
    // timeout is just so you have a chance to read the message above
    setTimeout(function () {
        child_process_1.exec(cmd, function (err, stdout, stderr) {
            if (err) {
                console.error(err);
                if (cb)
                    cb(false, err);
                return;
            }
            if (cb)
                cb(true);
        });
    }, delay);
}
function getBeyondCompareMessage(type, col, bgCol) {
    var colFn = chalk[col];
    var bgColFn = chalk[bgCol];
    var msg = bgColFn.white('\n"' + type + '" clone complete.') +
        colFn('\n\n Launching beyond compare...');
    if (!bcLaunchedAtLeastOnce) {
        msg += colFn('\n\n In Beyond Compare, go to ') +
            bgColFn.white('"Tools -> Import Settings"') +
            colFn(' and choose the file ') +
            bgColFn.white('"deps/BCSettings.bcpkg"') +
            colFn(' and check all the options. ') +
            colFn.bold('You only need to set this once.') +
            colFn('\n\n When you\'re finished hit enter.');
    }
    bcLaunchedAtLeastOnce = true;
    return msg;
}
function getFileName(filePath, inclExt) {
    if (inclExt === void 0) { inclExt = true; }
    filePath = normalizePaths(filePath);
    var lastSlashIndex = filePath.lastIndexOf("/");
    if (inclExt)
        return filePath.slice(lastSlashIndex + 1);
    var lastDotIndex = filePath.lastIndexOf(".");
    return filePath.slice(lastSlashIndex + 1, lastDotIndex);
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    checkVal: checkVal,
    normalizePaths: normalizePaths,
    copyBackToFront: copyBackToFront,
    copyFrontToBack: copyFrontToBack,
    getCWD: getCWD,
    expectFiles: expectFiles,
    getBeyondCompareMessage: getBeyondCompareMessage,
    ensureTrainlingSlash: ensureTrainlingSlash,
    launchBC: launchBC,
    testable: {
        suppressWarnings: function (val) {
            suppressWarnings = val;
        },
        getOptsFullPaths: getOptsFullPaths,
        bangUpExclusions: bangUpExclusions,
        copyToNewFolderStructure: copyToNewFolderStructure
    }
};
