const gulp = require('gulp');
const tslint = require("gulp-tslint");
const ts = require("gulp-typescript");
const uglify = require('gulp-uglify');
const rename = require("gulp-rename");
const csslint = require('gulp-csslint');
const browserSync = require('browser-sync').create();
const gutil = require('gulp-util');
const cleanCSS = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');
const path = require('path');
const del = require('del');
const merge = require('merge-stream');
const plumber = require('gulp-plumber');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const tsify = require('tsify');
const buffer = require('vinyl-buffer');
const paths = {
    pages: ['src/*.html']
};

gulp.task('cleanCSS', function() {
  return del(['build/css']);
});
gulp.task('cleanJS', function() {
  return del(['build/js']);
});

gulp.task('csslint', function() {
  gulp.src('./src/*.css')
    .pipe(csslint({
      'adjoining-classes': false,
      'box-sizing': false,
      'box-model': false,
      'fallback-colors': false,
      'order-alphabetical': false
    }))
    .pipe(csslint.formatter());
});

gulp.task('css', ['csslint', 'cleanCSS'], function() {
  return gulp.src('./src/*.css')
    .pipe(sourcemaps.init())
    .pipe(cleanCSS())
    .pipe(rename('orgchart.css'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('build/css'))
    .pipe(gulp.dest('demo/css'));
});

gulp.task('tslint', function () {
  return gulp.src(['./src/*.ts'])
  .pipe( tslint({
      formatter: 'prose',
      program: require('tslint').Linter.createProgram("./tsconfig.json"),
  }) )
  .pipe(tslint.report({
      configuration: {},
      rulesDirectory: null,
      emitError: true,
      reportLimit: 0,
      summarizeFailureOutput: true
  }));
});

gulp.task('js', ['tslint', 'cleanJS'], function () {
  return browserify({
      basedir: '.',
      debug: true,
      entries: ['src/orgchart.ts'],
      cache: {},
      packageCache: {}
  })
  .plugin(tsify)
  .transform('babelify', {
      presets: ['es2015'],
      extensions: ['.ts']
  })
  .bundle()
  .pipe(source('orgchart.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest('build/js'))
  .pipe(gulp.dest('demo/js'));
});

gulp.task('watch', function () {
  gulp.watch('src/*.ts', ['js']);
  gulp.watch('src/*.css', ['css']);
});

gulp.task('copyVendorAssets', function() {
  var fontawesomeCSS = gulp.src('node_modules/font-awesome/css/font-awesome.min.css')
    .pipe(gulp.dest('demo/css/vendor'));

  var fontawesomeFonts = gulp.src('node_modules/font-awesome/fonts/*')
    .pipe(gulp.dest('demo/css/fonts'));

  var html2canvas = gulp.src('node_modules/html2canvas/dist/html2canvas.min.js')
    .pipe(gulp.dest('demo/js/vendor'));

  return merge(fontawesomeCSS, fontawesomeFonts, html2canvas);
});

gulp.task('build', ['css', 'js', 'watch']);

gulp.task('serve', ['copyVendorAssets', 'build'], function () {
  browserSync.init({
    files: ['src/*.css', 'demo/**/*.html', 'demo/**/*.css', '!demo/css/vendor/*.css'],
    server: 'demo',
    socket: {
      domain: 'localhost:3000'
    }
  });

  gulp.watch('src/*.ts', ['js']);

  gulp.watch('demo/js/*').on('change', browserSync.reload);

});