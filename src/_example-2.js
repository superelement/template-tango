/**
 * This is intended to run as an example of the main "startQuestions" function from node.
 * It shows how to compare back end modules with no subdirectories (just files), using `modulesDir: "/"`, instead of a folder name.
 * Front end modules come from a folder hierarchy of `Widgets/SurfNav/mdl/SurfNav.cs`.
 */

var tt = require("../dist/index.js").default

tt.startQuestions({
	backEnd: {
		rootDir: process.cwd() + "/test-resources/back-end-files/Models/"
		, extension: ".cs"
		, modulesDir: "/"
		, completeCB: function() {
			console.log("back to front complete");
		}
	},
	frontEnd: {
		rootDir: process.cwd() + "/test-resources/front-end-files/"
		, extension: ".cs"
		, modulesDir: "Widgets/"
		, subDir: "mdl/"
		, completeCB: function() {
			console.log("front to back complete");
		}
	}
}, function() {
	console.log("Now do other stuff for your production build");
})