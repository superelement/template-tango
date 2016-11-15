import fs = require("fs-extra");
import inquirer = require("inquirer");
import _ = require("lodash");
import os = require("os");
import chalk = require("chalk");
import globby = require("globby");
import slash = require("slash");
import {Promise} from "es6-promise";
import {polyfill} from "es6-promise";

import {IMergeOptions,ISuccessList} from "./interfaces";
import utils from "./utils";


const NS = "TemplateTango";
const B2F = "backToFront/";
const F2B = "frontToBack/";

var suppressWarnings = false;

class Questions {
    private opts:IMergeOptions;

    constructor(opts:IMergeOptions, completeCB:Function) {
        this.opts = opts;
        this.questions().then(completeCB);
    }

    private questions():any { // returns a promise
        
        var opts:IMergeOptions = this.opts;



        return inquirer.prompt([
        {
            type: 'confirm',
            name: 'beyondCompare',
            message: chalk.magenta('Have you got Beyond Compare installed on the command-line? You will need it to run this task. See README.md for setup guide'),
            default: true
        }
        ,{
            when: function (res:any):boolean {
                if(!res.beyondCompare) console.warn(chalk.red("Sorry, but you must have Beyond Compare installed on the command-line to run this app. Stopping early."))
                return res.beyondCompare;
            },
            type: 'confirm',
            name: 'backToFront',
            message: chalk.cyan('\nOk to clone "back to front" into ') + chalk.bgCyan.white( '"' + this.opts.cloneDest + B2F +'"') + chalk.cyan("?"),
            default: true
        }
        ,{
            when: (res:any):any => { // returns a promise
                
                if(!res.backToFront) {
                    console.warn(chalk.red("You answered 'No' to merging 'back to front'. Skipping step."))
                    return false;
                }

                return utils.copyBackToFront(opts.cloneDest + B2F, opts.backEnd, opts.frontEnd.extension, opts.frontEnd.subDir, opts.frontEnd.pagesDir, opts.frontEnd.modulesDir, opts.nameMap)
                    .then((result:ISuccessList) => {
                        if(result.errList.length) {
                            console.warn(chalk.red("Some files could not be found. Stopping early."), result.errList);
                            return false;
                        }

                        utils.launchBC(opts.beyondComparePath, opts.cloneDest + B2F, opts.frontEnd.rootDir);
                        console.log(utils.getBeyondCompareMessage('Back to front', "magenta", "bgMagenta"));
                        return true;
                    });
            },
            type: 'confirm',
            name: 'frontToBack',
            message: chalk.cyan('Ok to clone "front to back" into ') + chalk.bgCyan.white( '"' + this.opts.cloneDest + F2B +'"') + chalk.cyan("?"),
            default: true
        }
        ,{
            when: (res:any):any => { // returns a promise
                
                if(!res.frontToBack) {
                    console.warn(chalk.red("You answered 'No' to merging 'front to back'. Skipping step."))
                    return false;
                }

                return utils.copyFrontToBack(opts.cloneDest + F2B, opts.frontEnd, opts.backEnd.extension, opts.backEnd.subDir, opts.backEnd.pagesDir, opts.backEnd.modulesDir, opts.nameMap)
                    .then((result:ISuccessList) => {
                        if(result.errList.length) {
                            console.warn(chalk.red("Some files could not be found. Stopping early."), result.errList);
                            return false;
                        }

                        utils.launchBC(opts.beyondComparePath, opts.cloneDest + F2B, opts.backEnd.rootDir);
                        console.log(utils.getBeyondCompareMessage('Front to back', "cyan", "bgCyan"));
                        return true;
                    });
            },
            type: 'confirm',
            name: 'frontToBack',
            message: chalk.magenta("When you're done with forwards merge, press enter to run final step."),
            default: true
        }
        ])
    }

}

function startQuestions(opts:IMergeOptions, completeCB:Function):void {
    
    if(!opts.beyondComparePath) opts.beyondComparePath = 'C:/Program Files/Beyond Compare 4/BCompare.exe'; 

    // If cloneDest not provided, uses default OS tmpDir
    if(!opts.cloneDest) opts.cloneDest = utils.ensureTrainlingSlash(slash(os.tmpdir())) + "template-tango/";
    
    fs.remove(opts.cloneDest, function(err) {
        if(err) {
            console.warn(NS, "startQuestions", "Couldn't clear the 'cloneDest' directory", opts.cloneDest);
            return;
        }
        new Questions(opts, completeCB);
    });
}

export default {
    startQuestions: startQuestions
    , testable: {
        suppressWarnings: function(val:boolean) {
            suppressWarnings = val;
            utils.testable.suppressWarnings(val);
        }
    }
}
