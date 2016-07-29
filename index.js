var gutil = require('gulp-util')
  , fs = require('fs-extra')
  , inquirer = require('inquirer')
  , hlp = require("./gulp-helpers")

const NS = "TemplateTango";

function merge(opts) {

    if(typeof opts.cloneDest !== "string") {

        return
    }
}


var CLONES_DEST = hlp.ensureTrainlingSlash("C:/Users/jimd/Desktop/clones/") // change this to be custom
  , backwardsPath = CLONES_DEST + "backwards/" // + hlp.getVersionPath(true) + "/";
  , forwardsPath = CLONES_DEST + 'forwards/'
  , suppressWarnings = false

/**
 * @description Logic for running gulp "production merge" task, with compares "Web -> UIBuild" razor templates, vise-versa and copies production-ready static assets (CSS, JS, JSON, etc) to the "Web" project. Prompts developer with instructions.
 */
function prodMerge(gulp, themeName, themeNamePC) {


    // make sure forward slashes are used!
    var beyondComparePath = "C:/Program Files/Beyond Compare 4/BCompare.exe"

    var uiBuildAbsPath = process.cwd().split("\\").join("/") + "/"
      , projAbsPath = uiBuildAbsPath.replace("/RAS.EasterShow.UIBuild/RAS.EasterShow.UIBuild", "")
      , webAbsPath = projAbsPath + "RAS.EasterShow.Web"

    var runSequence = require('run-sequence').use(gulp);
    
    gulp.task('prod-merge1', function (done) {
        var bcInstalled = false;

        gulp.src(webAbsPath) // don't actually do anything with the src
            .pipe(prompt.prompt({
                type: 'confirm',
                name: 'beyondCompare',
                message: gutil.colors.cyan('Have you got Beyond Compare installed on the command-line? You will need it to run this task. See README.md for setup guide and diagrams, under "Gulp Builds -> Production build".'),
                default: true
            }, function (res) {
                if (res.beyondCompare) {
                    bcInstalled = true;
                }
            }))
            .pipe(prompt.prompt({
                type: 'confirm',
                name: 'backwards',
                message: gutil.colors.yellow('Ok to clone "backwards" to "' + CLONES_DEST + 'backwards/"?'),
                default: true
            }, function (res) {
                if (bcInstalled && res.backwards) {
                    backwardsDone = true;
                    //console.log("backwards started");

                    hlp.cloneProject(backwardsPath, function () {

                        hlp.copyPagesBackwards(backwardsPath, true, function () {

                            // no longer needed
                            //hlp.changeLayoutNameByTheme(backwardsPath + 'Views/Shared/');

                            hlp.copyWidgetsBackwards(backwardsPath, function () {
                                //console.log("copyWidgetsBackwards done");
                                hlp.changeWgPaths(backwardsPath, true, function () {
                                    //console.log("changeWgPaths done");
                                    hlp.enforceBOM(backwardsPath, function () {
                                        console.log(gutil.colors.yellow('Backwards clone complete. Run Beyond Compare "folder compare" on "backwards" and the "UIBuild" project root directory.' +
                                            '\n Or run this from the command-line (include quotes) "' + beyondComparePath + '" "' + CLONES_DEST + 'backwards/" "' + uiBuildAbsPath + '" ' +
                                            '\n In Beyond Compare, make sure you load settings "Tools -> Import Settings" and choose the file "_Dev/Assets/BCSettings.bcpkg" and check all the options.' +
                                            '\n When you\'re finished, commit your changes as "backwards" and hit enter.'));
                                        done();
                                    });
                                });
                            });
                        });
                    });
                } else {
                    console.warn(gutil.colors.red("Ignoring this question as all questions must be answered true."));
                    done();
                }
            }))
    });

    gulp.task('prod-merge2', function (done) {
        gulp.src(webAbsPath) // don't actually do anything with the src
            .pipe(prompt.prompt({
                type: 'confirm',
                name: 'forwards',
                message: gutil.colors.yellow('Are you done with the backwards merge? Ok to clone "forwards" to "' + CLONES_DEST + 'forwards/"?'),
                default: true
            }, function (res) {
                hlp.copyWidgetPartials(forwardsPath + hlp.getWgPartialsPath(true)); // is sync
                hlp.copyProjectPages(forwardsPath + 'Views/'); // is sync

                hlp.changeWgPaths(forwardsPath, false, function () {
                    hlp.enforceBOM(forwardsPath, function () {
                        console.log(gutil.colors.yellow('Forwards clone complete. Run Beyond Compare "folder compare" on "forwards" and the "Web" project root directory.' +
                            '\n Or run this from the command-line (include quotes) "' + beyondComparePath + '" "' + forwardsPath + '" "' + webAbsPath + '" ' +
                            '\n In Beyond Compare, make sure you load settings "Tools -> Import Settings" and choose the file "_Dev/Assets/BCSettings.bcpkg" and check all the options.' +
                            '\n When you\'re finished, commit your changes as "forwards" and hit enter.'));
                        done();
                    });
                });
            }))
    });

    gulp.task('prod-merge3', function (done) {
        gulp.src(webAbsPath) // don't actually do anything with the src
            .pipe(prompt.prompt({
                type: 'confirm',
                name: 'build',
                message: gutil.colors.yellow('Are you done with forwards merge? Ok to run final step?'),
                default: true
            }, function (res) {
                runSequence(['build-prod-markup', 'build-prod-static', 'copy-pages-to-prod'], 'copy-build-to-prod', done);
            }))
    });



    gulp.task('prod-merge', function (done) {
        fs.removeSync(CLONES_DEST);

        runSequence('prod-merge1', 'prod-merge2', 'prod-merge3', done);
    });
}


// Exporting the plugin main function
module.exports = {
    merge: merge
  
    // just for unit tests
    , testable: {
        suppressWarnings: function(val) {
            suppressWarnings = val;
        }
  }
}