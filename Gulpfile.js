var gulp =  require('gulp');
var react = require('gulp-react');
var header = require('gulp-header');
var browserify = require('browserify');
var reactify = require('reactify');
var rename = require('gulp-rename');
var source = require('vinyl-source-stream');
var gutil = require('gulp-util');

var pkg = require('./package.json');
var version = pkg.version;
var banner = ['/**',
  ' * <%= pkg.name %> - <%= pkg.description %>',
  ' * @version v<%= pkg.version %>',
  ' * @link <%= pkg.homepage %>',
  ' * @license <%= pkg.license %>',
  ' */',
  ''].join('\n');

// ------------------------------------
// watch (main task for development)
// ------------------------------------
var paths = {
  dev: ['lib/**/*.js', 'dev/index.js', 'index.js']
};
gulp.task('watch', ['build'], function() {
  gulp.watch(paths.dev, ['dev']);
});

// ------------------------------------
// default (main task for releases)
// ------------------------------------
gulp.task('default', ['build']);

gulp.task('build', ['dev']);

gulp.task('dev', function(){
  browserify('./dev/index.js', {
    transform: [reactify],
    detectGlobals: true
  })
  .bundle()
  .on('error', function (err) {
    gutil.beep();
    console.log(String(err));
    this.end();
  })
  .pipe(source('dev/index.js'))
  .pipe(rename('bundle.js'))
  .pipe(header(banner, { pkg : pkg } ))
  .pipe(gulp.dest('dev'));
});
