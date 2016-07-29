var gulp = require('gulp')
  , flatten = require("gulp-flatten")
  , ts = require("gulp-typescript")
  , tsProject = ts.createProject("tsconfig.json")
  , runSequence = require('run-sequence').use(gulp)


gulp.task('default', ["ts"])

gulp.task("ts", function() {
	return tsProject.src()
	    .pipe(ts(tsProject))
	    // .js
        .pipe(flatten())
	    .pipe(gulp.dest("dist"))
})