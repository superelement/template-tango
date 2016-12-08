"use strict";
var fs = require("fs-extra");
var _ = require("lodash");
var tt = require("./index.js").default, utils = require("./utils.js").default;
// stops console from clogging up with warnings during tests
tt.testable.suppressWarnings(true);
var MAIN_DIR = utils.normalizePaths(__dirname).split("dist")[0], TEST_RES = MAIN_DIR + "test-resources/", TEMP_DIR = MAIN_DIR + "dist/temp/";
jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
afterEach(function () {
    // fs.removeSync(TEMP_DIR);
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
    var fun = utils.ensureTrainlingSlash;
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
    var fun = utils.copyBackToFront, beFiles = TEST_RES + "back-end-files/", feModulesDir = "Widgets/", fePagesDir = "Pages/", feSubDir = "tmpl/", beOpts = {
        rootDir: beFiles,
        extension: ".cshtml",
        pagesDir: "Views/",
        modulesDir: "Components/",
        pageExclusions: null,
        moduleExclusions: null,
        subDir: ""
    };
    it("should trigger a callback when 'back to front' copy is complete", function (done) {
        var _beOpts = _.clone(beOpts);
        _beOpts.completeCB = done;
        fun(TEMP_DIR, _beOpts, ".vash", feSubDir, fePagesDir, feModulesDir);
    });
    it(COPY_FE, function (done) {
        var p = fun(TEMP_DIR, beOpts, ".vash", feSubDir, fePagesDir, feModulesDir);
        var fileList = [];
        p.then(function () {
            utils.expectFiles([
                TEMP_DIR + feModulesDir + "SideNav/" + feSubDir + "SideNav.vash",
                TEMP_DIR + fePagesDir + "Home/" + feSubDir + "Index.vash",
                TEMP_DIR + fePagesDir + "About/" + feSubDir + "Index.vash",
                TEMP_DIR + fePagesDir + "Home/" + feSubDir + "Index.vash",
                TEMP_DIR + fePagesDir + "Shared/" + feSubDir + "Header.vash"
            ], done);
        });
    });
    it(COPY_FE + ", affecting modules only (excludes pages, using 'pageExclusions').", function (done) {
        // tt.testable.suppressWarnings(false);
        var _beOpts = _.clone(beOpts);
        _beOpts.pageExclusions = ["Views/**/*.cshtml"]; // glob pattern of files to exclude
        var p = fun(TEMP_DIR, _beOpts, ".vash", feSubDir, fePagesDir, feModulesDir);
        var fileList = [];
        p.then(function () {
            utils.expectFiles([TEMP_DIR + feModulesDir + "SideNav/" + feSubDir + "SideNav.vash"], done);
        });
    });
    it(COPY_FE + ", affecting modules only (by having a null 'pagesDir').", function (done) {
        var _beOpts = _.clone(beOpts);
        _beOpts.pagesDir = null;
        var p = fun(TEMP_DIR, _beOpts, ".vash", feSubDir, null, feModulesDir);
        var fileList = [];
        p.then(function () {
            utils.expectFiles([TEMP_DIR + feModulesDir + "SideNav/" + feSubDir + "SideNav.vash"], done);
        });
    });
    // related to 'src/_example-2.js'
    it(COPY_FE + ", affecting just modules and without a back end parent folder.", function (done) {
        var _beOpts = {
            rootDir: beFiles + "Models/",
            extension: ".cs",
            pagesDir: null,
            modulesDir: "/",
            pageExclusions: null,
            moduleExclusions: null,
            subDir: ""
        };
        var p = fun(TEMP_DIR, _beOpts, ".cs", "mdl/", null, feModulesDir);
        var fileList = [];
        p.then(function () {
            utils.expectFiles([TEMP_DIR + feModulesDir + "SideNav/mdl/SideNav.cs"], done);
            utils.expectFiles([TEMP_DIR + feModulesDir + "SurfNav/mdl/SurfNav.cs"], done);
            utils.expectFiles([TEMP_DIR + feModulesDir + "TopNav/mdl/TopNav.cs"], done);
        });
    });
    // related to 'src/_example-3.js'
    it(COPY_FE + ", affecting just modules and without a front end parent folder.", function (done) {
        var _beOpts = {
            rootDir: beFiles,
            extension: ".md",
            pagesDir: null,
            modulesDir: "Components/",
            pageExclusions: null,
            moduleExclusions: null,
            subDir: "Docs/"
        };
        var p = fun(TEMP_DIR + "Docs/", _beOpts, ".md", "", null, "/");
        var fileList = [];
        p.then(function () {
            utils.expectFiles([TEMP_DIR + "Docs/SideNav.md"], done);
        });
    });
    // TODO: Test Pages without a parent folder
    it(COPY_FE + ", using 'nameMapGroup' for modules and pages.", function (done) {
        var _beOpts = _.clone(beOpts);
        var nameMapGroup = {
            pages: [{ backEnd: "DashboardPage/Home", frontEnd: "Dashboard/tmpl/Index" }],
            modules: [{ backEnd: "AppNav/Index", frontEnd: "TopNav/tmpl/TopNav" }]
        };
        var p = fun(TEMP_DIR, _beOpts, ".vash", feSubDir, fePagesDir, feModulesDir, nameMapGroup);
        var fileList = [];
        p.then(function () {
            utils.expectFiles([TEMP_DIR + fePagesDir + "Dashboard/" + feSubDir + "Index.vash"], function () {
                utils.expectFiles([TEMP_DIR + feModulesDir + "TopNav/" + feSubDir + "TopNav.vash"], done);
            });
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
    it("should trigger a callback when 'front to back' copy is complete", function (done) {
        var _feOpts = _.clone(feOpts);
        _feOpts.completeCB = done;
        fun(TEMP_DIR, _feOpts, ".cshtml", "", bePagesDir, beModulesDir);
    });
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
    it(COPY_BE + " ---- affecting modules only (excludes pages using 'pageExclusions').", function (done) {
        var _feOpts = _.clone(feOpts);
        _feOpts.pageExclusions = ["Pages/**/*.vash"]; // glob pattern of files to exclude
        var p = fun(TEMP_DIR, _feOpts, ".cshtml", "", bePagesDir, beModulesDir);
        var fileList = [];
        p.then(function () {
            utils.expectFiles([TEMP_DIR + beModulesDir + "SideNav/SideNav.cshtml"], done);
        });
    });
    it(COPY_BE + " ---- affecting modules only (by having a null 'pagesDir').", function (done) {
        var _feOpts = _.clone(feOpts);
        _feOpts.pagesDir = null;
        var p = fun(TEMP_DIR, _feOpts, ".cshtml", "", null, beModulesDir);
        var fileList = [];
        p.then(function () {
            utils.expectFiles([TEMP_DIR + beModulesDir + "SideNav/SideNav.cshtml"], done);
        });
    });
    // related to 'src/_example-3.js'
    it(COPY_BE + ", affecting just modules and without a front end parent folder.", function (done) {
        var _feOpts = {
            rootDir: feFiles + "Docs/",
            extension: ".md",
            pagesDir: null,
            modulesDir: "/",
            pageExclusions: null,
            moduleExclusions: null,
            subDir: ""
        };
        var p = fun(TEMP_DIR, _feOpts, ".md", "Docs/", null, beModulesDir);
        var fileList = [];
        p.then(function () {
            utils.expectFiles([TEMP_DIR + beModulesDir + "SideNav/Docs/SideNav.md"], done);
        });
    });
    // related to 'src/_example-2.js'
    it(COPY_BE + ", affecting just modules and without a backend parent folder.", function (done) {
        var _feOpts = {
            rootDir: feFiles,
            extension: ".cs",
            pagesDir: null,
            modulesDir: "Widgets/",
            pageExclusions: null,
            moduleExclusions: null,
            subDir: "mdl/"
        };
        var p = fun(TEMP_DIR + "Models/", _feOpts, ".cs", "", null, "/");
        var fileList = [];
        p.then(function () {
            utils.expectFiles([TEMP_DIR + "Models/SurfNav.cs"], done);
        });
    });
    // TODO: Test Pages without a parent folder
    it(COPY_BE + " ---- using 'nameMapGroup' for modules and pages.", function (done) {
        var _feOpts = _.clone(feOpts);
        var nameMapGroup = {
            pages: [{ backEnd: "DashboardPage/Home", frontEnd: "Dashboard/tmpl/Index" }],
            modules: [{ backEnd: "AppNav/Index", frontEnd: "TopNav/tmpl/TopNav" }]
        };
        var p = fun(TEMP_DIR, _feOpts, ".cshtml", "", bePagesDir, beModulesDir, nameMapGroup);
        var fileList = [];
        p.then(function () {
            utils.expectFiles([TEMP_DIR + bePagesDir + "DashboardPage/Home.cshtml"], function () {
                utils.expectFiles([TEMP_DIR + beModulesDir + "AppNav/Index.cshtml"], done);
            });
        });
    });
});
describe("copyToNewFolderStructure", function () {
    var fun = utils.testable.copyToNewFolderStructure, BASE_MSG = "should copy a file to new location and change the extension", feFiles = TEST_RES + "front-end-files/", beFiles = TEST_RES + "back-end-files/", feSubDir = "tmpl" // doesn't need trailing slash (it will get added it missed)
    , beSubDir = "", originalPageDir = feFiles + "Pages/", originalPagePath = originalPageDir + "About/tmpl/Index.vash", newPageDir = TEMP_DIR + "Views/";
    it("should copy a file to new location and change the extension", function (done) {
        fun(originalPagePath, originalPageDir, newPageDir, ".cshtml", feSubDir, beSubDir, function () {
            expect(fs.existsSync(newPageDir + "About/Index.cshtml")).toBe(true);
            done();
        });
    });
    it("should copy a file to new location as a single file without a parent folder", function (done) {
        var feSubDir = "mdl", originalModulesDir = feFiles + "Widgets/", originalModulesPath = originalModulesDir + "SurfNav/mdl/SurfNav.cs", newModulesDir = TEMP_DIR + "Models/", justFile = true;
        fun(originalModulesPath, originalModulesDir, newModulesDir, ".cs", feSubDir, "", function () {
            expect(fs.existsSync(newModulesDir + "SurfNav.cs")).toBe(true);
            done();
        }, null, null, null, justFile);
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
