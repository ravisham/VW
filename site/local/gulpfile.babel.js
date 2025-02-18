import gulp from 'gulp';
import autoprefixer from 'autoprefixer';
import browserify from 'browserify';
import watchify from 'watchify';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import eslint from 'gulp-eslint';
import babelify from 'babelify';
import uglify from 'gulp-uglify';
import rimraf from 'rimraf';
import notify from 'gulp-notify';
import browserSync, { reload } from 'browser-sync';
import sourcemaps from 'gulp-sourcemaps';
import postcss from 'gulp-postcss';
import rename from 'gulp-rename';
import nested from 'postcss-nested';
import inline from 'postcss-strip-inline-comments';
import cssnano from 'gulp-cssnano';
import imagemin from 'gulp-imagemin';
import pngquant from 'imagemin-pngquant';
import runSequence from 'run-sequence';
import eStream from 'event-stream';
import factor from 'factor-bundle';
import assemble from 'assemble';
import scss from 'postcss-scss';
import handlebarsHelpers from 'handlebars-helpers';
import prettify from 'gulp-prettify';
import sass from 'gulp-sass';
import csswring from 'csswring';

const app = assemble();

const paths = {
  bundle: 'app.js',
  entry: './src/global/app.js',
  srcCss: './src/scss/**/**/*.scss',
  srcImg: './src/media/img/**/*',
  srcLint: ['./src/js/polymap.js'],
  build: './build',
  buildJs: './build/js',
  buildImg: './build/media/img',
  buildDeploy: './build/**/*'
};

const entries = [
  './src/js/app.js'
];

const output = [
  './build/js/app.js'
];

const customOpts = {
  entries: entries,
  debug: true,
  cache: {},
  packageCache: {}
};

const options = {
  locale: 'en-GB',
  timestamp: Date.now(),
  assets: './build/media/img/'
}

const opts = Object.assign({}, watchify.args, customOpts);

gulp.task('clean', cb => {
  rimraf('./build/js/*', cb);
});

gulp.task('browserSync', () => {
  browserSync({
    server: {baseDir: './build/'}
  });
});

gulp.task('watchify', () => {
  const bundler = watchify(browserify(opts));

  function rebundle() {
    return bundler.plugin(factor, {o: output})
      .bundle()
      .on('error', notify.onError())
      .pipe(source('common.js'))
      .pipe(gulp.dest(paths.buildJs))
      .pipe(reload({stream: true}));
  }

  bundler.transform(babelify)
  .on('update', rebundle);
  return rebundle();
});

gulp.task('browserify', () => {
  return browserify({entries: entries})
  .plugin(factor, {o: output})
  .bundle()
  .pipe(source('common.js'))
  .pipe(buffer())
  .pipe(uglify())
  .pipe(gulp.dest(paths.buildJs));
});

gulp.task('styles', () => {
  gulp.src('./src/scss/**/*.scss')
    .pipe(sourcemaps.init())
    .pipe(sass({
      outputStyle: 'compressed'
    }).on('error', sass.logError))
    .pipe(postcss([autoprefixer({
      browsers: ['> 2%'],
      cascade: false,
      map: true,
      remove: true
    }), csswring({removeAllComments: true})]))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./build/css'))
    .pipe(reload({stream: true}));
});

gulp.task('images', () => {
  gulp.src(paths.srcImg)
    .pipe(imagemin({
      progressive: true,
      svgoPlugins: [{removeViewBox: false}],
      use: [pngquant()]
    }))
    .pipe(gulp.dest(paths.buildImg))
    .pipe(reload({stream: true}));
});

gulp.task('html', () => {
  // Find layouts and partials
  app.layouts('./src/hbs/layout/*.hbs');
  app.partials('./src/hbs/components/*.hbs');

  // Add data
  // app.data('./src/components/**/*.{json,yml}');
  app.data({imagePath: './build/media/img/'});

  // Add classic helpers
  app.helpers(handlebarsHelpers(), app.helpers);

  // Add options
  app.option('layout', 'layout.hbs');

  // Build templates
  return app.src('./src/hbs/pages/*.hbs')
    .pipe(app.renderFile(options))
    .pipe(rename({extname: '.html'}))
    .pipe(prettify({indent_size: 2}))
    .pipe(app.dest('./build/'))
    .pipe(reload({stream: true}));
});

gulp.task('lint', () => {
  gulp.src(paths.srcLint)
  .pipe(eslint())
  .pipe(eslint.format());
});

gulp.task('moveMedia', () => {
  gulp.src("./src/media/**")
    .pipe(gulp.dest('./build/media'));
});

gulp.task('watchTask', () => {
  gulp.watch(paths.srcImg, ['images', 'moveMedia']);
  gulp.watch('./src/scss/**/*.scss', ['styles']);
  gulp.watch(paths.srcLint, ['lint']);
  gulp.watch('./src/hbs/**/*.hbs', ['html']);
  // gulp.watch('./src/components/**/*.{json,yml}', ['html']);
});

gulp.task('watch', cb => {
  runSequence('clean', ['browserSync', 'watchTask', 'watchify', 'styles', 'lint', 'html', 'moveMedia', 'images'], cb);
});

gulp.task('build', cb => {
  process.env.NODE_ENV = 'production';
  runSequence('clean', ['browserify', 'styles', 'html', 'moveMedia', 'images'], cb);
});
