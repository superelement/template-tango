var gulp = require('gulp')
  , watch = require('gulp-watch')
  , jasmine = require('gulp-jasmine')
  , flatten = require("gulp-flatten")
  , plumber = require('gulp-plumber')
  , ts = require("gulp-typescript")
  , tsProject = ts.createProject("tsconfig.json")
  , runSequence = require('run-sequence').use(gulp)



gulp.task('test', function() {
	return gulp.src('dist/specs.js')
		.pipe(jasmine())
})

gulp.task('default', function(done) {
	runSequence('ts', 'test', done);
})

gulp.task("ts", function() {
	return tsProject.src()
	    .pipe(ts(tsProject))
		// .pipe(plumber())
	    // .js
        .pipe(flatten())
	    .pipe(gulp.dest("dist"))
})

gulp.task("tsw", function() {
	runSequence('default');
	return watch('./src/**/*.ts', function() {
		runSequence('default');
	})
})