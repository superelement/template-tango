"use strict";
var fs = require("fs-extra");
var _ = require("lodash");
var tt = require("./index.js").default, utils = require("./utils.js").default;
// stops console from clogging up with warnings during tests
tt.testable.suppressWarnings(true);
var MAIN_DIR = utils.normalizePaths(__dirname).split("dist")[0], TEST_RES = MAIN_DIR + "test-resources/", TEMP_DIR = MAIN_DIR + "dist/temp/";
jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
beforeEach(function () {
    fs.removeSync(TEMP_DIR);
});
afterEach(function () {
    fs.removeSync(TEMP_DIR);
});
describe("normalizePaths", function () {
    var fun = utils.normalizePaths;
    it("should convert Windows paths to Unix paths", function () {
        expect(fun('example\\windows\\path')).toBe('example/windows/path');
    });
});
describe("checkVal", function () {
    var fun = utils.checkVal;
    it("should return false for falsy input", function () {
        var msg = "failed";
        expect(fun(null, msg)).toBe(false);
        expect(fun(undefined, msg)).toBe(false);
    });
    it("should return true for truthy input, zero and empty strings", function () {
        var msg = "failed";
        expect(fun("", msg)).toBe(true);
        expect(fun(0, msg)).toBe(true);
        expect(fun(1, msg)).toBe(true);
        expect(fun("A value", msg)).toBe(true);
    });
});
describe("getCWD", function () {
    var fun = utils.getCWD;
    it("should return the current working directory with forward slashed paths", function () {
        expect(fun()).toBe(process.cwd().split("\\").join("/") + "/");
    });
});
describe("ensureTrainlingSlash", function () {
    var fun = utils.testable.ensureTrainlingSlash;
    it("should make sure a path ends in a single slash", function () {
        expect(fun('a')).toBe('a/');
        expect(fun('a/b/')).toBe('a/b/');
    });
});
describe("expectFiles", function () {
    var fun = utils.expectFiles, beFiles = TEST_RES + "back-end-files/";
    it("should expect files to exist", function (done) {
        utils.expectFiles([
            beFiles + "Components/SideNav/SideNav.cshtml",
            beFiles + "Views/Home/Index.cshtml"
        ], done);
    });
});
describe("copyBackToFront", function () {
    var COPY_FE = "should copy all test resources into temp dist folder and change the directory names and extensions to be front end values";
    var fun = utils.copyBackToFront, beFiles = TEST_RES + "back-end-files/", feModulesDir = "Widgets/", fePagesDir = "Pages/", fsSubDir = "tmpl/", beOpts = {
        rootDir: beFiles,
        extension: ".cshtml",
        pagesDir: "Views/",
        modulesDir: "Components/",
        pageExclusions: null,
        moduleExclusions: null,
        subDir: ""
    };
    it(COPY_FE, function (done) {
        var p = fun(TEMP_DIR, beOpts, ".vash", fsSubDir, fePagesDir, feModulesDir);
        var fileList = [];
        p.then(function () {
            utils.expectFiles([
                TEMP_DIR + feModulesDir + "SideNav/" + fsSubDir + "SideNav.vash",
                TEMP_DIR + fePagesDir + "Home/" + fsSubDir + "Index.vash",
                TEMP_DIR + fePagesDir + "About/" + fsSubDir + "Index.vash",
                TEMP_DIR + fePagesDir + "Home/" + fsSubDir + "Index.vash",
                TEMP_DIR + fePagesDir + "Shared/" + fsSubDir + "Header.vash"
            ], done);
        });
    });
    it(COPY_FE + ", affecting modules only (excludes pages).", function (done) {
        var _beOpts = _.clone(beOpts);
        _beOpts.pageExclusions = ["Views/**/*.cshtml"]; // glob pattern of files to exclude
        var p = fun(TEMP_DIR, _beOpts, ".vash", fsSubDir, fePagesDir, feModulesDir);
        var fileList = [];
        p.then(function () {
            utils.expectFiles([TEMP_DIR + feModulesDir + "SideNav/" + fsSubDir + "SideNav.vash"], done);
        });
    });
});
describe("copyFrontToBack", function () {
    var COPY_BE = "should copy all test resources into temp dist folder and change the directory names and extensions to be back end values";
    var fun = utils.copyFrontToBack, feFiles = TEST_RES + "front-end-files/", beModulesDir = "Components/", bePagesDir = "Views/", feOpts = {
        rootDir: feFiles,
        extension: ".vash",
        pagesDir: "Pages/",
        modulesDir: "Widgets/",
        pageExclusions: null,
        moduleExclusions: null,
        subDir: "tmpl/"
    };
    it(COPY_BE, function (done) {
        var p = fun(TEMP_DIR, feOpts, ".cshtml", "", bePagesDir, beModulesDir);
        var fileList = [];
        p.then(function () {
            utils.expectFiles([
                TEMP_DIR + beModulesDir + "SideNav/SideNav.cshtml",
                TEMP_DIR + bePagesDir + "Home/Index.cshtml",
                TEMP_DIR + bePagesDir + "About/Index.cshtml",
                TEMP_DIR + bePagesDir + "Home/Index.cshtml",
                TEMP_DIR + bePagesDir + "Shared/Header.cshtml"
            ], done);
        });
    });
    it(COPY_BE + ", affecting modules only (excludes pages).", function (done) {
        var _feOpts = _.clone(feOpts);
        _feOpts.pageExclusions = ["Pages/**/*.vash"]; // glob pattern of files to exclude
        var p = fun(TEMP_DIR, _feOpts, ".cshtml", "", bePagesDir, beModulesDir);
        var fileList = [];
        p.then(function () {
            utils.expectFiles([TEMP_DIR + beModulesDir + "SideNav/SideNav.cshtml"], done);
        });
    });
});
describe("copyToNewFolderStructure", function () {
    var fun = utils.testable.copyToNewFolderStructure, BASE_MSG = "should copy a file to new location and change the extension", feFiles = TEST_RES + "front-end-files/", feSubDir = "tmpl" // doesn't need trailing slash (it will get added it missed)
    , beSubDir = "", originalPageDir = feFiles + "Pages/", originalPagePath = originalPageDir + "About/tmpl/Index.vash", newPageDir = TEMP_DIR + "Views/";
    it("should copy a file to new location and change the extension", function (done) {
        fun(originalPagePath, originalPageDir, newPageDir, ".cshtml", feSubDir, beSubDir, function () {
            expect(fs.existsSync(newPageDir + "About/Index.cshtml")).toBe(true);
            done();
        });
    });
    it("should add original file path to the 'success array', after copying", function (done) {
        var successArray = [];
        fun(originalPagePath, originalPageDir, newPageDir, ".cshtml", feSubDir, beSubDir, function () {
            expect(successArray).toContain(originalPagePath);
            done();
        }, successArray);
    });
    it("should add original file path to the 'error array', after failing to copy", function (done) {
        var originalPagePath = originalPageDir + "SomethingThatDoesntExist.vash", failArray = [];
        fun(originalPagePath, originalPageDir, newPageDir, ".cshtml", feSubDir, beSubDir, function () {
            expect(failArray).toContain(originalPagePath);
            done();
        }, null, failArray);
    });
});
describe("getOptsFullPaths", function () {
    var fun = utils.testable.getOptsFullPaths, beFiles = TEST_RES + "back-end-files/", beOpts = {
        rootDir: beFiles,
        extension: ".cshtml",
        pagesDir: "Views/",
        modulesDir: "Components/",
        pageExclusions: ["Views/Shared/**/*"],
        moduleExclusions: null,
        subDir: ""
    };
    it("should get an array of all back end page file paths, except excluded Shared ones", function () {
        var pages = fun(beOpts, 'page', true);
        expect(pages).toContain(beFiles + "Views/Home/Index.cshtml");
        expect(pages).toContain(beFiles + "Views/About/Index.cshtml");
        expect(pages).not.toContain(beFiles + "Views/Shared/Header.cshtml");
    });
});
describe("bangUpExclusions", function () {
    var fun = utils.testable.bangUpExclusions;
    it("should add a '!' character to a path that does not start with one", function () {
        expect(fun(['path'], 'root/')).toContain('!root/path');
    });
    it("should only contain a single '!' character even though path already starts with one", function () {
        expect(fun(['!path'], 'root/')).toContain('!root/path');
    });
});
/*

describe("XXXX", () => {
    let fun = utils.XXXX

    xit("should ", () => {
        expect(fun('XXX')).toBe('XXX')
    })
})

*/ 
