// This is intended to run and example of the main "startQuestions" function from node

var tt = require("../dist/index.js").default

tt.startQuestions({
	cloneDest: 'C:/Users/jimd/Desktop/clones/'
	, beyondComparePath: 'C:/Program Files/Beyond Compare 4/BCompare.exe'
	, backEnd: {
		rootDir: "C:/Users/jimd/Documents/repos/template-tango/test-resources/back-end-files/"
		, extension: ".cshtml"
		, pagesDir: "Views/"
		, modulesDir: "Components/"
		, pageExclusions: ["Views/About/*.cshtml"] // glob pattern of files to exclude 
	}
	, frontEnd: {
		rootDir: "C:/Users/jimd/Documents/repos/template-tango/test-resources/front-end-files/"
		, extension: ".vash" 
		, pagesDir: "Pages/"
		, modulesDir: "Widgets/"
		, moduleExclusions: [] // glob pattern of files to exclude
	}
}, function() {
	console.log("Now do other stuff for your production build");
})