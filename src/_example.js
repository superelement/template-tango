// This is intended to run and example of the main "startQuestions" function from node

var tt = require("../dist/index.js").default

tt.startQuestions({
	// cloneDest: 'OPTIONAL_CUSTOM_PATH_TO_ADD_CLONES_TO', // Optionally override the clone destination directory. Otherwise it will default to the temp directory for your OS.
	// beyondComparePath: 'OPTIONAL_CUSTOM_BEYOND_COMPARE_PATH', // Optionally override the Beyond Compare path Otherwise it will default to 'C:/Program Files/Beyond Compare 4/BCompare.exe'
	backEnd: {
		rootDir: process.cwd() + "/test-resources/back-end-files/"
		, extension: ".cshtml"
		, pagesDir: "Views/"
		, modulesDir: "Components/"
		, pageExclusions: ["Views/About/*.cshtml"] // glob pattern of files to exclude
		, subDir: "" 
	},
	frontEnd: {
		rootDir: process.cwd() + "/test-resources/front-end-files/"
		, extension: ".vash" 
		, pagesDir: "Pages/"
		, modulesDir: "Widgets/"
		, moduleExclusions: [] // glob pattern of files to exclude
		, subDir: "tmpl/"
	},
	nameMap: { // (optional) because sometimes the names on back end have to be different to front end (or refactoring after a name change is a pain in the butt)
		pages: [{ backEnd: "DashboardPage/Home", frontEnd: "Dashboard/tmpl/Index" }],
		modules: [{ backEnd: "AppNav/Index", frontEnd: "TopNav/tmpl/TopNav" }]
	}
}, function() {
	console.log("Now do other stuff for your production build");
})