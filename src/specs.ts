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
	  , feSubDir = "tmpl/"
	  , beOpts:IMergableFiles = {
		  rootDir: beFiles
		, extension: ".cshtml"
		, pagesDir: "Views/"
		, modulesDir: "Components/"
		, pageExclusions: null
		, moduleExclusions: null
		, subDir: ""
	  };

	 it("should trigger a callback when 'back to front' copy is complete", (done:Function) => {
		
		let _beOpts = _.clone(beOpts);
		_beOpts.completeCB = done;

		fun(TEMP_DIR, _beOpts, ".vash", feSubDir, fePagesDir, feModulesDir);
	 })

	 it(COPY_FE, (done:Function) => {
		
		let p:Promise<string> = fun(TEMP_DIR, beOpts, ".vash", feSubDir, fePagesDir, feModulesDir);
		let fileList:Array<string> = [];
		p.then(() => {
			utils.expectFiles([
				  TEMP_DIR + feModulesDir + "SideNav/"+ feSubDir +"SideNav.vash"
				, TEMP_DIR + fePagesDir + "Home/"+ feSubDir +"Index.vash"
				, TEMP_DIR + fePagesDir + "About/"+ feSubDir +"Index.vash"
				, TEMP_DIR + fePagesDir + "Home/"+ feSubDir +"Index.vash"
				, TEMP_DIR + fePagesDir + "Shared/"+ feSubDir +"Header.vash"
			], done);	
		});
	})

	it(COPY_FE+", affecting modules only (excludes pages, using 'pageExclusions').", (done:Function) => {
		
		// tt.testable.suppressWarnings(false);

		let _beOpts:IMergableFiles = _.clone(beOpts);
		_beOpts.pageExclusions = ["Views/**/*.cshtml"]; // glob pattern of files to exclude

		let p:Promise<string> = fun(TEMP_DIR, _beOpts, ".vash", feSubDir, fePagesDir, feModulesDir);
		let fileList:Array<string> = [];
		p.then(() => {
			utils.expectFiles([TEMP_DIR + feModulesDir + "SideNav/"+ feSubDir +"SideNav.vash"], done);
		});
	})

	it(COPY_FE+", affecting modules only (by having a null 'pagesDir').", (done:Function) => {
		
		let _beOpts:IMergableFiles = _.clone(beOpts);
		_beOpts.pagesDir = null;

		let p:Promise<string> = fun(TEMP_DIR, _beOpts, ".vash", feSubDir, null, feModulesDir);
		let fileList:Array<string> = [];
		p.then(() => {
			utils.expectFiles([TEMP_DIR + feModulesDir + "SideNav/"+ feSubDir +"SideNav.vash"], done);
		});
	})

	// related to 'src/_example-2.js'
	it(COPY_FE+", affecting just modules and without a back end parent folder.", (done:Function) => {
		
		let _beOpts:IMergableFiles = {
			rootDir: beFiles + "Models/"
			, extension: ".cs"
			, pagesDir: null
			, modulesDir: "/"
			, pageExclusions: null
			, moduleExclusions: null
			, subDir: ""
		}

		let p:Promise<string> = fun(TEMP_DIR, _beOpts, ".cs", "mdl/", null, feModulesDir);
		let fileList:Array<string> = [];
		p.then(() => {
			utils.expectFiles([TEMP_DIR + feModulesDir + "SideNav/mdl/SideNav.cs"], done);
			utils.expectFiles([TEMP_DIR + feModulesDir + "SurfNav/mdl/SurfNav.cs"], done);
			utils.expectFiles([TEMP_DIR + feModulesDir + "TopNav/mdl/TopNav.cs"], done);
		});
	})

	// related to 'src/_example-3.js'
	it(COPY_FE+", affecting just modules and without a front end parent folder.", (done:Function) => {
		
		let _beOpts:IMergableFiles = {
			rootDir: beFiles
			, extension: ".md"
			, pagesDir: null
			, modulesDir: "Components/"
			, pageExclusions: null
			, moduleExclusions: null
			, subDir: "Docs/"
		}

		let p:Promise<string> = fun(TEMP_DIR + "Docs/", _beOpts, ".md", "", null, "/");
		let fileList:Array<string> = [];
		p.then(() => {
			utils.expectFiles([TEMP_DIR + "Docs/SideNav.md"], done);
		});
	})

	// TODO: Test Pages without a parent folder

	it(COPY_FE+", using 'nameMapGroup' for modules and pages.", (done:Function) => {
		
		let _beOpts:IMergableFiles = _.clone(beOpts);
		let nameMapGroup = { // maps template name exceptions between front and back end
			pages: [{ backEnd: "DashboardPage/Home", frontEnd: "Dashboard/tmpl/Index" }],
			modules: [{ backEnd: "AppNav/Index", frontEnd: "TopNav/tmpl/TopNav" }]
		}

		let p:Promise<string> = fun(TEMP_DIR, _beOpts, ".vash", feSubDir, fePagesDir, feModulesDir, nameMapGroup);
		let fileList:Array<string> = [];
		p.then(() => {
			utils.expectFiles([TEMP_DIR + fePagesDir + "Dashboard/"+ feSubDir +"Index.vash"], function() {
				utils.expectFiles([TEMP_DIR + feModulesDir + "TopNav/"+ feSubDir +"TopNav.vash"], done);
			});
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

	it("should trigger a callback when 'front to back' copy is complete", (done:Function) => {
		
		let _feOpts = _.clone(feOpts);
		_feOpts.completeCB = done;

		fun(TEMP_DIR, _feOpts, ".cshtml", "", bePagesDir, beModulesDir);
	 })

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


	it(COPY_BE+" ---- affecting modules only (excludes pages using 'pageExclusions').", (done:Function) => {
		
		let _feOpts:IMergableFiles = _.clone(feOpts);
		_feOpts.pageExclusions = ["Pages/**/*.vash"]; // glob pattern of files to exclude

		let p:Promise<string> = fun(TEMP_DIR, _feOpts, ".cshtml", "", bePagesDir, beModulesDir);
		let fileList:Array<string> = [];
		p.then(() => {
			utils.expectFiles([TEMP_DIR + beModulesDir + "SideNav/SideNav.cshtml"], done);
		});
	})
	
	it(COPY_BE+" ---- affecting modules only (by having a null 'pagesDir').", (done:Function) => {
		
		let _feOpts:IMergableFiles = _.clone(feOpts);
		_feOpts.pagesDir = null;

		let p:Promise<string> = fun(TEMP_DIR, _feOpts, ".cshtml", "", null, beModulesDir);
		let fileList:Array<string> = [];
		p.then(() => {
			utils.expectFiles([TEMP_DIR + beModulesDir + "SideNav/SideNav.cshtml"], done);
		});
	})

	// related to 'src/_example-3.js'
	it(COPY_BE+", affecting just modules and without a front end parent folder.", (done:Function) => {
		
		let _feOpts:IMergableFiles = {
			rootDir: feFiles + "Docs/"
			, extension: ".md"
			, pagesDir: null
			, modulesDir: "/"
			, pageExclusions: null
			, moduleExclusions: null
			, subDir: ""
		}

		let p:Promise<string> = fun(TEMP_DIR, _feOpts, ".md", "Docs/", null, beModulesDir);
		let fileList:Array<string> = [];
		p.then(() => {
			utils.expectFiles([TEMP_DIR + beModulesDir + "SideNav/Docs/SideNav.md"], done);
		});
	})

	// related to 'src/_example-2.js'
	it(COPY_BE+", affecting just modules and without a backend parent folder.", (done:Function) => {
		
		let _feOpts:IMergableFiles = {
			rootDir: feFiles
			, extension: ".cs"
			, pagesDir: null
			, modulesDir: "Widgets/"
			, pageExclusions: null
			, moduleExclusions: null
			, subDir: "mdl/"
		}

		let p:Promise<string> = fun(TEMP_DIR + "Models/", _feOpts, ".cs", "", null, "/");
		let fileList:Array<string> = [];
		p.then(() => {
			utils.expectFiles([TEMP_DIR + "Models/SurfNav.cs"], done);
		});
	})

	// TODO: Test Pages without a parent folder

	it(COPY_BE+" ---- using 'nameMapGroup' for modules and pages.", (done:Function) => {
		
		let _feOpts:IMergableFiles = _.clone(feOpts);
		let nameMapGroup = { // maps template name exceptions between front and back end
			pages: [{ backEnd: "DashboardPage/Home", frontEnd: "Dashboard/tmpl/Index" }],
			modules: [{ backEnd: "AppNav/Index", frontEnd: "TopNav/tmpl/TopNav" }]
		}

		let p:Promise<string> = fun(TEMP_DIR, _feOpts, ".cshtml", "", bePagesDir, beModulesDir, nameMapGroup);
		let fileList:Array<string> = [];
		p.then(() => {
			utils.expectFiles([TEMP_DIR + bePagesDir + "DashboardPage/Home.cshtml"], function() {
				utils.expectFiles([TEMP_DIR + beModulesDir + "AppNav/Index.cshtml"], done);
			});
		});
	})
})

describe("copyToNewFolderStructure", () => {
	let fun = utils.testable.copyToNewFolderStructure
	  , BASE_MSG = "should copy a file to new location and change the extension"
	  , feFiles = TEST_RES + "front-end-files/"
	  , beFiles = TEST_RES + "back-end-files/"
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

	
	it("should copy a file to new location as a single file without a parent folder", (done) => {
		var feSubDir = "mdl" 
		  , originalModulesDir:string = feFiles + "Widgets/"
		  , originalModulesPath:string = originalModulesDir + "SurfNav/mdl/SurfNav.cs"
		  , newModulesDir:string = TEMP_DIR + "Models/"
		  , justFile = true
		
		fun(originalModulesPath, originalModulesDir, newModulesDir, ".cs", feSubDir, "", () => {
			expect(fs.existsSync(newModulesDir + "SurfNav.cs")).toBe(true)
			done();
		}, null, null, null, justFile)
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

	// just cleans up after last test
	afterEach(() => {
		fs.removeSync(TEMP_DIR);
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