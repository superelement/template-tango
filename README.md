# template-tango
Tool for merging HTML templates between front and back end. Uses Inquirer to prompt you with a series of questions, then launches Beyond Compare folder comparison with customized settings to aid you when merging.

## Install
```
$ npm install --save-dev template-tango
```

### Install Beyond Compare on the command line
To make use of Folder Compare, install Beyond Compare (an awesome diffing GUI for Windows and Mac) and add it to the command-line.
- http://www.scootersoftware.com/support.php?zz=kb_vcs
- `git config --global diff.tool bc3`
- `git config --global difftool.bc3.path "c:/Program Files/Beyond Compare 4/bcomp.exe"`

## Usage

```js
var tt = require("template-tango").default

tt.startQuestions({
    
    // Optionally override the clone destination directory. Otherwise it will default to the temp directory for your OS.
	// cloneDest: 'C:/Users/johnnydepp/Desktop/my-clones/', 
    
    // Optionally override the Beyond Compare path Otherwise it will default to 'C:/Program Files/Beyond Compare 4/BCompare.exe'
	// beyondComparePath: 'C:/Program Files/Beyond Compare 4/BCompare.exe',
	
    backEnd: {
		rootDir: "LOCAL_PATH_TO_YOUR_BACK_END_PROJECT"
		, extension: ".cshtml" // template file extension (.Net will usually be ".cshtml")
		, pagesDir: "Views/" // directory where your pages are kept (.Net will usually be "Views/")
		, modulesDir: "Components/" // directory where your UI module (aka component/widget) templates are kept
		, pageExclusions: ["Views/About/*.cshtml"] // glob pattern of files to exclude
		, subDir: "" // perhaps you have your templates inside a nested directory within your pages and UI modules? .Net will usually be empty string
	},
	frontEnd: {
		rootDir: "LOCAL_PATH_TO_YOUR_FRONT_END_PROJECT"
		, extension: ".vash" // Your front end project might be using "Vash" razor templates (see npm "vash-static" and "gulp-vash-static")
		, pagesDir: "Pages/" // You might have a completely different folder structure on the front end for your page templates
		, modulesDir: "Widgets/" // You might have a completely different folder structure on the front end for your UI module (aka component/widget) templates
		, moduleExclusions: [] // glob pattern of files to exclude
		, subDir: "tmpl/" // perhaps you have your templates inside a nested directory within your pages and UI modules? Add the directory here so they still compare side-by-side correctly
	}
}, function() {
	console.log("Now do other stuff for your production build");
})
```

## Ignore comments
The settings inside `deps/BCSettings.bcpkg` contain custom grammar for '.cshtml' and '.vash' files, which tells Beyond Compare to ignore eveything between these comment blocks:

### Outside razor logic
- `@*BC_IGNORE_START*@`
- `@*BC_IGNORE_END*@`

### Inside razor logic
- `//BC_IGNORE_START`
- `//BC_IGNORE_END`

## OS
Only Windows 10 has been tested. OSX will potentially be supported in future. 

## Workarounds
The most recent version on NPM Bombom was broken, so I've had to hack it a bit to get it to work. Currently lives inside "deps/bombom". 
Bombom is a library that adds a BOM (Byte Order Mark) to the beginning of files, so that files created in Visual Studio don't appear as different to regular files when being compared in Beyond Compare.

## Examples
Edit "src/_example" with your own local paths, the run `npm run example` to see this app in action.

## Tests
Unit tests can be run just by running `gulp`, which will compile TypeScript and then run the tests.

## Typings
If you need to add TypeScript typings, add them to "typings.json" and run `npm run typings`.