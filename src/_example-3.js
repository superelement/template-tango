/**
 * This is intended to run as an example of the main "startQuestions" function from node.
 * It shows how to compare back end modules with no subdirectories (just files), using `modulesDir: "/"`, instead of a folder name.
 * Front end modules come from a folder hierarchy of `Widgets/SurfNav/mdl/SurfNav.cs`.
 */

var tt = require("../dist/index.js").default

tt.startQuestions({
	backEnd: {
		rootDir: process.cwd() + "/test-resources/back-end-files/"
		, extension: ".md"
		, modulesDir: "Components/"
		, subDir: "Docs/"
	},
	frontEnd: {
		rootDir: process.cwd() + "/test-resources/front-end-files/Docs"
		, extension: ".md"
		, modulesDir: "/"
	}
}, function() {
	console.log("Now do other stuff for your production build");
})