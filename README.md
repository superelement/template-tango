# Template Tango

## Description
Tool for merging HTML templates between front and back end, making use of Beyond Compare folder comparison.

## Install Beyond Compare on the command line
To make use of Folder Compare, install Beyond Compare (an awesome diffing GUI for Windows and Mac) and add it to the command-line.
- http://www.scootersoftware.com/support.php?zz=kb_vcs
- `git config --global diff.tool bc3`
- `git config --global difftool.bc3.path "c:/Program Files/Beyond Compare 4/bcomp.exe"`

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