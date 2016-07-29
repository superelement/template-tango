var fs = require('fs-extra')
  , glob = require('glob')
  , bombom = require('bombom')
  , _ = require('lodash-node')
  , semver = require("semver")


var 
  , WG_DIR_1 = "_Dev/Deps/subtrees/ras-ui-shared/Wg/"
  , WG_DIR_2 = "_Dev/App/Wg/"
  , WEB = '../../RAS.EasterShow.Web/'
  , RootViews = '../../RAS.EasterShow.Web/Views/'
  , appDir //set by setTheme method
  , themeDir //set by setTheme method
  , themeNamePC //set by setTheme method
  , oldVersion; //before version bump




/**
 * @description Ensures the path given ends in a "/" character.
 * @param path (string) Directory path to check.
 * @return (string) Path with guarunteed trailing slash.
 */

function ensureTrainlingSlash(path) {
    if(path.substr(path.length - 1) !== "/") path += "/";
    return path;
}



/**
 * @description Clones the front end project folders containing razor files, so they can be compared during merge.
 * @param dest (string) Destination directory.
 */
function cloneProject(dest, done) {
    var destAppWg = dest + WG_DIR_2
      , destSharedWg = dest + WG_DIR_1
      , destViews = dest + "Views/"
      , count = 0

    fs.ensureDirSync(destAppWg);
    fs.ensureDirSync(destSharedWg);
    fs.ensureDirSync(destViews);

    var callDone = function () {
        count++;
        if (count >= 3 && done) done();
    }

    fs.copy(WG_DIR_2, destAppWg, { clobber: true }, function (err, fileName) {
        if (err) {
            console.warn(err);
            return;
        }
        callDone();
        //console.log(destAppWg + " cloned");
    });

    fs.copy(WG_DIR_1, destSharedWg, { clobber: true }, function (err, fileName) {
        if (err) {
            console.warn(err);
            return;
        }
        callDone();
        //console.log(destSharedWg + " cloned");
    });

    fs.copy("Views/", destViews, { clobber: true }, function (err, fileName) {
        if (err) {
            console.warn(err);
            return;
        }
        callDone();
        //console.log(destViews + " cloned");
    });
}



/**
 * @description Copies page razor templates from Web project's "Views" folder to the destination directory. 
 * @param dest (string) Destination directory.
 * @param done (function) optional - Call back when complete.
 */
function copyPagesBackwards(dest, omitStyleGuide, done) {

    fs.copy(RootViews, dest + "Views/", { clobber: true }, function (err) {
        if (err) {
            console.warn(err);
            return;
        }

        if(omitStyleGuide) fs.removeSync(dest + "Views/StyleGuide");
        //console.log(dest + " cloned");
        done();
    });
}


/**
 * @description Copies widget razor templates from Web project's "UIBuild" folder to the destination directory. 
 * @param dest (string) Destination directory.
 * @param done (function) optional - Call back when complete.
 */
function copyWidgetsBackwards(dest, done) {

    var cnt = 0, doneCnt = 0;
    getWidgetNames(true).forEach(function (wgCnf) {
        var path = WEB + getWgPartialsPath(true) + wgCnf.name + "/*.cshtml"
          , wgRazor = glob.sync(path);

        wgRazor.forEach(function (razorPath) {
            cnt++;

            // Needs closure so names stay in sync
            (function (wgName, isShared, razorPath, razorName) {

                var newRazorPath = dest + (isShared ? WG_DIR_1 : WG_DIR_2) + wgName + "/" + razorName;

                fs.copy(razorPath, newRazorPath, { clobber: true }, function () {

                    doneCnt++;
                    
                    if (done && cnt === doneCnt) done();
                });

            })(wgCnf.name, wgCnf.isShared, razorPath, razorPath.slice(razorPath.lastIndexOf("/") + 1));
        });
    });
}


function changeWgPaths( dir, isBackwards, done ) {
    var prodDir = "~/" + getWgPartialsPath(true);

    dir = ensureTrainlingSlash(dir);

    glob(dir + "**/*.cshtml", {}, function (err, filePaths) {

        var len = filePaths.length
          , count = 0
        filePaths.forEach(function (filePath) {
            (function (fp) {
                fs.readFile(fp, function (err, content) {
                    var updated = "";

                    content = content.toString();

                    if (isBackwards) {
                        updated = replacePartialPath(content, prodDir, null, true);
                    } else {

                        updated = replacePartialPath(content, "~/_Dev/", prodDir, false);
                    }

                    fs.outputFile(fp, updated);

                    count++;
                    if (done && count === len) done();
                });
            })(filePath);
        });

    });
}



/**
 * @description Force razor template files to have a "BOM" character added to them (a Visual Studio thing), so they can be diff'd without the BOM always coming up.
 * @param customFiles (string) optional - Custom directory path to use if not using default.
 * @param done (function) optional - Call back when complete.
 */
function enforceBOM(customFiles, done) {
    var cnt = 0, doneCnt = 0, razors

    if (customFiles) {
        razors = glob.sync(customFiles + "**/*.cshtml");
        done();
        return;
    }


    var widgetsAndPages = getPageNames(true, true, true)
                            .concat(getWidgetNames(false, true)) // get widgets from original locations
                            .concat(getWidgetNames(false, true, true)) // get widgets from UIBuild
                            .concat(getWidgetNames(false, true, false, true)) // get widgets from _Build

    widgetsAndPages.forEach(function (dirPath) {
        razors = glob.sync(dirPath + "/*.cshtml");

        //console.log(razors)
        razors.forEach(function (rPath) {
            cnt++;

            (function (path) {
                //console.log(path);
                fs.readFile(path, function (err, stream) {
                    //console.log(err, stream);
                    if (!err) {
                        //console.log(bombom.detect(stream));
                        stream = bombom.enforce(stream, "utf8");
                        //console.log(stream.toString())
                        fs.outputFile(path, stream.toString());
                    }

                    doneCnt++;
                    if (done && cnt === doneCnt) done();
                });
            })(rPath);
        });
    });
}



/**
 * @description Copies widget razor templates from UIBuild project to the destination directory. Tasks are synchronouse, so no callback needed.
 * @param dest (string) Destination directory.
 */
function copyWidgetPartials(dest) {
    glob.sync("{" + WG_DIR_2 + '*,' + WG_DIR_1 + '*}').forEach(function (dirPath) {

        if (fs.lstatSync(dirPath).isDirectory()) {
            var wgName = dirPath.slice(dirPath.lastIndexOf("/") + 1);

            glob.sync(dirPath + "/*.cshtml").forEach(function (filePath) {
                var fileName = filePath.slice(filePath.lastIndexOf("/") + 1);

                fs.copySync(filePath, dest + wgName + "/" + fileName, { clobber: true });
            });

        }
    });
}

/**
 * @description Copies page razor templates from UIBuild project's "Views" folder to the destination directory. Tasks are synchronouse, so no callback needed.
 * @param dest (string) Destination directory.
 */

function copyProjectPages(dest) {
    var pages = getAllRazors(true, true);

    pages.forEach(function (pgName) {

        glob.sync("Views/" + pgName + "/*.cshtml").forEach(function (path) {
            var fileName = path.slice(path.lastIndexOf("/"));
            //console.log(RootViews + pgName + fileName);
            fs.copySync(path, dest + pgName + fileName, { clobber: true });
        });
    });

    glob.sync("Views/Shared/*.cshtml").forEach(function (path) {
        var fileName = path.slice(path.lastIndexOf("/"));
        fs.copySync(path, dest + "Shared/" + fileName, { clobber: true });
    });
    glob.sync("Views/Shared/Blocks/*.cshtml").forEach(function (path) {
        var fileName = path.slice(path.lastIndexOf("/"));
        fs.copySync(path, dest + "Shared/Blocks/" + fileName, { clobber: true });
    });
}



/**
 * @description Get all the razor templates paths and choose to retrieve from either the "UIBuild" project or the "Web" project.
 * @param justPages (boolean) Whether to just retrieve page razor templates (ignoring widgets) or to retrieve all.
 * @param justDirName (boolean) Whether to retieve template paths as either full paths or just the containing directories (this should give you the widget and page names).
 * @return (array of strings) Array of paths or widget/page names.
 */
function getAllRazors(justPages, justDirName) {
    var pages = getPageNames(true, true, true)
      , widgetsAndPages = pages.concat(getWidgetNames(false, true))
      , fullPaths = [];

    //console.log(pages);

    (justPages ? pages : widgetsAndPages).forEach(function (dirPath) {

        var razors = razors = glob.sync(dirPath + "/*.cshtml");

        razors = razors.map(function (val) {
            var rtn = val.slice(0, val.lastIndexOf("/"));
            return (justDirName ? rtn.slice(rtn.lastIndexOf("/") + 1) : rtn + "/*.cshtml");
        });

        fullPaths = fullPaths.concat(razors);
    });

    return fullPaths;
}



/**
 * @description Gets all the page paths or names, based on the folder structure within "_Dev/ShowGround/", but returning paths within "Views/" directory.
 * @param isBasedOnViews (boolean) - Whether or not to base the page names on the 'Views' directory, where the razor templates are, or the '_Dev/ShowGround/Pg/' directory, where front-end files are kept.
 * @param getAll (boolean) - Can return either a single page name or an array of all page names (if `getAll` is true).
 * @param includeViewsPath (boolean) - Whether to include the full path with the "Views/" directory, or just the page name.
 */
function getPageNames(isBasedOnViews, getAll, includeViewsPath) {

    if (getAll) {
        var pgNames = []
          , dirPaths = fs.readdirSync( isBasedOnViews ? "Views/" : appDir + 'Pg/')
        dirPaths.forEach(function (pgName) {
            if (pgName[0] !== "_" && pgName !== "Shared" && pgName !== "StyleGuide") {
                var name;
                if (isBasedOnViews) name = includeViewsPath ? 'Views/' + pgName : pgName;
                else                name = includeViewsPath ? 'Views/' + pgName + "Page" : pgName;
                pgNames.push(name);
            }
        });
        return pgNames;
    }

    //return getPageNameByArg();
}




/**
 * @description Gets a list of widget names from this project and ras ui shared subtree, with option to return if is shared, or not.
 * @param includeSharedInfo (boolean) - whether to return if the widget was from the `ras-ui-shared` directory or omit this info. Will return an object if true, or string if false.
 * @param includePath (boolean) - whether to include the full path in the `name` or not.
 */
function getWidgetNames(includeSharedInfo, includePath, isRootProject, isBuild) {

    var wgNames = []
      , wgDir = WG_DIR_2
      , sharedDir = WG_DIR_1
      , UIBPartialsPath = getWgPartialsPath()
      , WebPartialsPath = WEB + getWgPartialsPath(true)
    fs.readdirSync(wgDir).forEach(function (wgName) {

        if (fs.lstatSync(wgDir + wgName).isDirectory()) {
            var name;
            if (isRootProject) {
                name = WebPartialsPath + wgName;
            } else if (isBuild) {
                name = UIBPartialsPath + wgName;
            } else {
                name = includePath ? WG_DIR_2 + wgName : wgName;
            }

            wgNames.push(includeSharedInfo ? { name: name, isShared: false } : name);
        }
    });

    fs.readdirSync(sharedDir).forEach(function (wgName) {

        if (fs.lstatSync(sharedDir + wgName).isDirectory()) {
            var name;
            if (isRootProject) {
                name = WebPartialsPath + wgName;
            } else if (isBuild) {
                name = UIBPartialsPath + wgName;
            } else {
                name = includePath ? WG_DIR_1 + wgName : wgName;
            }

            wgNames.push(includeSharedInfo ? { name: name, isShared: true } : name);
        }
    });
    return wgNames;
}



// gets the WgPartials path, including themed directory (but not versioned)
function getWgPartialsPath(isProdBuild) {
    throwThemeError();

    return getBuildPath(isProdBuild, true, true) + "WgPartials/";
}


// gets the build directory path for either UIBuild project or Web project, with options for versioning
function getBuildPath(isProdBuild, hasExtras, noVersioning, useOldVersion) {
    throwThemeError();

    var path = (isProdBuild ? "UIBuild/" : "_Build/");
    if (hasExtras) {
        path += (noVersioning ? themeDir : getVersionPath(true, useOldVersion)) + "/";

        if (isProdBuild && useOldVersion && !noVersioning && !fs.existsSync(WEB + path))
            console.warn("gulp-helpers.js -> getBuildPath", "Looks like you're trying to get the path for the old production build, but it does not exist on the file system. Maybe the version is wrong?", path);
    }


    return path;
}



function throwThemeError() {
    if (!themeDir)
        throw new Error("'themeDir' not set! You must call 'setTheme' before running this function.");
}


// gets versioned directory name for current package.json, optionally including the theme diretory or old version (if prod build has already bumped it)
function getVersionPath(inclTheme, useOldVersion) {
    var version = (useOldVersion ? oldVersion : getVersion());
    return (inclTheme ? themeDir + "/" : "") + version.split(".").join("-");
}



function replacePartialPath(razorContent, originalPath, newPath, isBackwards) {
    var updated = "";
    razorContent.split(originalPath).forEach(function (chunk, i) {
        if (i === 0) {
            updated = chunk;
        } else {

            if (isBackwards) {
                var partialWgName = chunk.split("/")[0]
                  , wgDetails = getWidgetDetails(partialWgName)

                if (wgDetails) {
                    var isShared = wgDetails.isShared;
                    updated += ("~/" + (isShared ? WG_DIR_1 : WG_DIR_2) ) + chunk;
                } else {
                    updated += originalPath + chunk;
                    console.warn("Widget not found: " + partialWgName);
                }
            } else {
                updated += newPath + chunk.split("/Wg/")[1];
            }


        }
    });
    return updated;
}


/**
 * @description Gets an object containing widget details. If comma exists, will support multiple widgets and return an array.
 * @param wgName (string) - Single widget name or comma separated list.
 * @return (object / array of objects) - Details about the widget/s.
 */
function getWidgetDetails(wgName) {

    if (!wgName) return null;

    wgName = wgName.toLowerCase();

    var wgNames = getWidgetNames(true, false)
      , isList = wgName.indexOf(",") !== -1;

    var wgObj, wgObjArr = [], thisWgName;
    _.map(wgNames, function (obj) {
        
        thisWgName = obj.name.toLowerCase();

        if (isList) {
            wgName.split(",").forEach(function (wg) {
                //console.log(wg, thisWgName);
                if (wg === thisWgName) wgObjArr.push(obj);
            });
        } else {
            if (thisWgName === wgName) wgObj = obj;
        }
    });

    if (wgObjArr.length === 0) wgObjArr = null;

    return isList ? wgObjArr : wgObj;
}




module.exports = {

}