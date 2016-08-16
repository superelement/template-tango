import fs = require("fs-extra");
import _ = require("lodash");
import {IWalk,IMergableFiles} from "./interfaces";

var tt = require("./index.js").default
  , utils = require("./utils.js").default

// stops console from clogging up with warnings during tests
tt.testable.suppressWarnings(true);

var MAIN_DIR = utils.normalizePaths(__dirname).split("dist")[0]
  , TEST_RES = MAIN_DIR + "test-resources/"
  , TEMP_DIR = MAIN_DIR + "dist/temp/"

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;


afterEach(() => {
	fs.removeSync(TEMP_DIR);
})

describe("normalizePaths", () => {
	var fun = utils.normalizePaths

	it("should convert Windows paths to Unix paths", () => {
		expect(fun('example\\windows\\path')).toBe('example/windows/path')
	})
})


describe("checkVal", () => {
	var fun = utils.checkVal

	it("should return false for falsy input", () => {
		var msg = "failed";
		expect(fun(null, msg)).toBe(false);
		expect(fun(undefined, msg)).toBe(false);
	})

	it("should return true for truthy input, zero and empty strings", () => {
		var msg = "failed";
		
		expect(fun("", msg)).toBe(true);
		expect(fun(0, msg)).toBe(true);

		expect(fun(1, msg)).toBe(true);
		expect(fun("A value", msg)).toBe(true);
	})
})


describe("getCWD", () => {
	var fun = utils.getCWD

	it("should return the current working directory with forward slashed paths", () => {
		expect(fun()).toBe( process.cwd().split("\\").join("/") + "/" )
	})
})

describe("ensureTrainlingSlash", () => {
	var fun = utils.ensureTrainlingSlash

	it("should make sure a path ends in a single slash", () => {
		expect(fun('a')).toBe('a/')
		expect(fun('a/b/')).toBe('a/b/')
	})
})


describe("expectFiles", () => {
	let fun = utils.expectFiles
	  , beFiles = TEST_RES + "back-end-files/"

	it("should expect files to exist", (done:Function) => {
		utils.expectFiles([
			beFiles + "Components/SideNav/SideNav.cshtml"
			, beFiles + "Views/Home/Index.cshtml"
		], done);
	})
})


describe("copyBackToFront", () => {
	const COPY_FE = "should copy all test resources into temp dist folder and change the directory names and extensions to be front end values";
	var fun = utils.copyBackToFront
	  , beFiles = TEST_RES + "back-end-files/"
	  , feModulesDir = "Widgets/"
	  , fePagesDir = "Pages/"
	  , fsSubDir = "tmpl/"
	  , beOpts:IMergableFiles = {
		  rootDir: beFiles
		, extension: ".cshtml"
		, pagesDir: "Views/"
		, modulesDir: "Components/"
		, pageExclusions: null
		, moduleExclusions: null
		, subDir: ""
	  };

	 it(COPY_FE, (done:Function) => {
		
		let p:Promise<string> = fun(TEMP_DIR, beOpts, ".vash", fsSubDir, fePagesDir, feModulesDir);
		let fileList:Array<string> = [];
		p.then(() => {
			utils.expectFiles([
				  TEMP_DIR + feModulesDir + "SideNav/"+ fsSubDir +"SideNav.vash"
				, TEMP_DIR + fePagesDir + "Home/"+ fsSubDir +"Index.vash"
				, TEMP_DIR + fePagesDir + "About/"+ fsSubDir +"Index.vash"
				, TEMP_DIR + fePagesDir + "Home/"+ fsSubDir +"Index.vash"
				, TEMP_DIR + fePagesDir + "Shared/"+ fsSubDir +"Header.vash"
			], done);	
		});
	})

	it(COPY_FE+", affecting modules only (excludes pages).", (done:Function) => {
		
		let _beOpts:IMergableFiles = _.clone(beOpts);
		_beOpts.pageExclusions = ["Views/**/*.cshtml"]; // glob pattern of files to exclude

		let p:Promise<string> = fun(TEMP_DIR, _beOpts, ".vash", fsSubDir, fePagesDir, feModulesDir);
		let fileList:Array<string> = [];
		p.then(() => {
			utils.expectFiles([TEMP_DIR + feModulesDir + "SideNav/"+ fsSubDir +"SideNav.vash"], done);
		});
	})
})


describe("copyFrontToBack", () => {
	const COPY_BE = "should copy all test resources into temp dist folder and change the directory names and extensions to be back end values";
	var fun = utils.copyFrontToBack
	  , feFiles = TEST_RES + "front-end-files/"
	  , beModulesDir = "Components/"
	  , bePagesDir = "Views/"
	  , feOpts:IMergableFiles = {
		  rootDir: feFiles
		, extension: ".vash"
		, pagesDir: "Pages/"
		, modulesDir: "Widgets/"
		, pageExclusions: null
		, moduleExclusions: null
		, subDir: "tmpl/"
	  };

	it(COPY_BE, (done:Function) => {
		
		let p:Promise<string> = fun(TEMP_DIR, feOpts, ".cshtml", "", bePagesDir, beModulesDir);
		let fileList:Array<string> = [];
		p.then(() => {
			utils.expectFiles([
				  TEMP_DIR + beModulesDir + "SideNav/SideNav.cshtml"
				, TEMP_DIR + bePagesDir + "Home/Index.cshtml"
				, TEMP_DIR + bePagesDir + "About/Index.cshtml"
				, TEMP_DIR + bePagesDir + "Home/Index.cshtml"
				, TEMP_DIR + bePagesDir + "Shared/Header.cshtml"
			], done);	
		});
	})


	it(COPY_BE+", affecting modules only (excludes pages).", (done:Function) => {
		
		let _feOpts:IMergableFiles = _.clone(feOpts);
		_feOpts.pageExclusions = ["Pages/**/*.vash"]; // glob pattern of files to exclude

		let p:Promise<string> = fun(TEMP_DIR, _feOpts, ".cshtml", "", bePagesDir, beModulesDir);
		let fileList:Array<string> = [];
		p.then(() => {
			utils.expectFiles([TEMP_DIR + beModulesDir + "SideNav/SideNav.cshtml"], done);
		});
	})
})

describe("copyToNewFolderStructure", () => {
	let fun = utils.testable.copyToNewFolderStructure
	  , BASE_MSG = "should copy a file to new location and change the extension"
	  , feFiles = TEST_RES + "front-end-files/"
	  , feSubDir = "tmpl" // doesn't need trailing slash (it will get added it missed)
	  , beSubDir = ""
	  , originalPageDir:string = feFiles + "Pages/"
	  , originalPagePath:string = originalPageDir + "About/tmpl/Index.vash"
	  , newPageDir:string = TEMP_DIR + "Views/"

	it("should copy a file to new location and change the extension", (done) => {
		fun(originalPagePath, originalPageDir, newPageDir, ".cshtml", feSubDir, beSubDir, () => {
			expect(fs.existsSync(newPageDir + "About/Index.cshtml")).toBe(true)
			done();
		})
	})

	it("should add original file path to the 'success array', after copying", (done) => {
		let successArray:Array<string> = []

		fun(originalPagePath, originalPageDir, newPageDir, ".cshtml", feSubDir, beSubDir, () => {
			expect(successArray).toContain(originalPagePath)
			done();
		}, successArray)
	})

	it("should add original file path to the 'error array', after failing to copy", (done) => {
		let originalPagePath:string = originalPageDir + "SomethingThatDoesntExist.vash"
		  , failArray:Array<string> = []

		fun(originalPagePath, originalPageDir, newPageDir, ".cshtml", feSubDir, beSubDir, () => {
			expect(failArray).toContain(originalPagePath)
			done();
		}, null, failArray)
	})
})


describe("getOptsFullPaths", () => {
	let fun = utils.testable.getOptsFullPaths
	  , beFiles = TEST_RES + "back-end-files/"
	  , beOpts:IMergableFiles = {
		  rootDir: beFiles
		, extension: ".cshtml"
		, pagesDir: "Views/"
		, modulesDir: "Components/"
		, pageExclusions: [ "Views/Shared/**/*" ]
		, moduleExclusions: null
		, subDir: ""
	  };

	it("should get an array of all back end page file paths, except excluded Shared ones", () => {
		var pages:Array<string> = fun(beOpts, 'page', true);

		expect(pages).toContain(beFiles + "Views/Home/Index.cshtml");
		expect(pages).toContain(beFiles + "Views/About/Index.cshtml");
		expect(pages).not.toContain(beFiles + "Views/Shared/Header.cshtml");
	})
})


describe("bangUpExclusions", () => {
	let fun = utils.testable.bangUpExclusions

	it("should add a '!' character to a path that does not start with one", () => {
		expect(fun(['path'], 'root/')).toContain('!root/path')
	})

	it("should only contain a single '!' character even though path already starts with one", () => {
		expect(fun(['!path'], 'root/')).toContain('!root/path')
	})
})


/*

describe("XXXX", () => {
	let fun = utils.XXXX

	xit("should ", () => {
		expect(fun('XXX')).toBe('XXX')
	})
})

*/