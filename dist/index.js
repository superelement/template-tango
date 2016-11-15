"use strict";
var fs = require("fs-extra");
var inquirer = require("inquirer");
var os = require("os");
var chalk = require("chalk");
var slash = require("slash");
var utils_1 = require("./utils");
var NS = "TemplateTango";
var B2F = "backToFront/";
var F2B = "frontToBack/";
var suppressWarnings = false;
var Questions = (function () {
    function Questions(opts, completeCB) {
        this.opts = opts;
        this.questions().then(completeCB);
    }
    Questions.prototype.questions = function () {
        var opts = this.opts;
        return inquirer.prompt([
            {
                type: 'confirm',
                name: 'beyondCompare',
                message: chalk.magenta('Have you got Beyond Compare installed on the command-line? You will need it to run this task. See README.md for setup guide'),
                default: true
            },
            {
                when: function (res) {
                    if (!res.beyondCompare)
                        console.warn(chalk.red("Sorry, but you must have Beyond Compare installed on the command-line to run this app. Stopping early."));
                    return res.beyondCompare;
                },
                type: 'confirm',
                name: 'backToFront',
                message: chalk.cyan('\nOk to clone "back to front" into ') + chalk.bgCyan.white('"' + this.opts.cloneDest + B2F + '"') + chalk.cyan("?"),
                default: true
            },
            {
                when: function (res) {
                    if (!res.backToFront) {
                        console.warn(chalk.red("You answered 'No' to merging 'back to front'. Skipping step."));
                        return false;
                    }
                    return utils_1.default.copyBackToFront(opts.cloneDest + B2F, opts.backEnd, opts.frontEnd.extension, opts.frontEnd.subDir, opts.frontEnd.pagesDir, opts.frontEnd.modulesDir, opts.nameMap)
                        .then(function (result) {
                        if (result.errList.length) {
                            console.warn(chalk.red("Some files could not be found. Stopping early."), result.errList);
                            return false;
                        }
                        utils_1.default.launchBC(opts.beyondComparePath, opts.cloneDest + B2F, opts.frontEnd.rootDir);
                        console.log(utils_1.default.getBeyondCompareMessage('Back to front', "magenta", "bgMagenta"));
                        return true;
                    });
                },
                type: 'confirm',
                name: 'frontToBack',
                message: chalk.cyan('Ok to clone "front to back" into ') + chalk.bgCyan.white('"' + this.opts.cloneDest + F2B + '"') + chalk.cyan("?"),
                default: true
            },
            {
                when: function (res) {
                    if (!res.frontToBack) {
                        console.warn(chalk.red("You answered 'No' to merging 'front to back'. Skipping step."));
                        return false;
                    }
                    return utils_1.default.copyFrontToBack(opts.cloneDest + F2B, opts.frontEnd, opts.backEnd.extension, opts.backEnd.subDir, opts.backEnd.pagesDir, opts.backEnd.modulesDir, opts.nameMap)
                        .then(function (result) {
                        if (result.errList.length) {
                            console.warn(chalk.red("Some files could not be found. Stopping early."), result.errList);
                            return false;
                        }
                        utils_1.default.launchBC(opts.beyondComparePath, opts.cloneDest + F2B, opts.backEnd.rootDir);
                        console.log(utils_1.default.getBeyondCompareMessage('Front to back', "cyan", "bgCyan"));
                        return true;
                    });
                },
                type: 'confirm',
                name: 'frontToBack',
                message: chalk.magenta("When you're done with forwards merge, press enter to run final step."),
                default: true
            }
        ]);
    };
    return Questions;
}());
function startQuestions(opts, completeCB) {
    if (!opts.beyondComparePath)
        opts.beyondComparePath = 'C:/Program Files/Beyond Compare 4/BCompare.exe';
    // If cloneDest not provided, uses default OS tmpDir
    if (!opts.cloneDest)
        opts.cloneDest = utils_1.default.ensureTrainlingSlash(slash(os.tmpdir())) + "template-tango/";
    fs.remove(opts.cloneDest, function (err) {
        if (err) {
            console.warn(NS, "startQuestions", "Couldn't clear the 'cloneDest' directory", opts.cloneDest);
            return;
        }
        new Questions(opts, completeCB);
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    startQuestions: startQuestions,
    testable: {
        suppressWarnings: function (val) {
            suppressWarnings = val;
            utils_1.default.testable.suppressWarnings(val);
        }
    }
};
