const { src, dest, series, parallel, watch } = require("gulp");
const del = (...args) => import("del").then((m) => m.deleteAsync(...args));
const plumber = require("gulp-plumber");
const htmlmin = require("gulp-htmlmin");
const csso = require("gulp-csso");
const terser = require("gulp-terser");
const browserSync = require("browser-sync").create();

const paths = {
  html: "src/**/*.html",
  css: "src/css/**/*.css",
  js: "src/js/**/*.js",
  imgAll: "src/img/**/*.{jpg,jpeg,png,webp,svg,gif}",
  imgToWebp: "src/img/**/*.{jpg,jpeg,png}",
  other: "public/**/*",
};

function clean() {
  return del(["dist"]);
}

function html() {
  return src(paths.html)
    .pipe(plumber())
    .pipe(htmlmin({ collapseWhitespace: true, removeComments: true }))
    .pipe(dest("dist"))
    .pipe(browserSync.stream());
}

function css() {
  return src(paths.css)
    .pipe(plumber())
    .pipe(csso())
    .pipe(dest("dist/css"))
    .pipe(browserSync.stream());
}

function js() {
  return src(paths.js)
    .pipe(plumber())
    .pipe(terser())
    .pipe(dest("dist/js"))
    .pipe(browserSync.stream());
}

/**
 * IMPORTANT:
 * - encoding:false forces binary (Buffer) read → prevents PNG corruption
 * - do NOT use browserSync.stream() for binary assets (images/fonts/etc)
 */
function img(done) {
  return src(paths.imgAll, { allowEmpty: true, encoding: false })
    .pipe(plumber())
    .pipe(dest("dist/img"))
    .on("end", () => {
      browserSync.reload();
      done();
    });
}

/**
 * WebP conversion: keep binary read too.
 * This is only for build, but safe to keep consistent.
 */
function imgWebp() {
  return import("gulp-webp").then((m) => {
    const webp = m.default || m;

    return src(paths.imgToWebp, { allowEmpty: true, encoding: false })
      .pipe(plumber())
      .pipe(webp({ quality: 82 }))
      .pipe(dest("dist/img"));
  });
}

/**
 * Copy other static files from /public as binary as well
 * (favicons, fonts, png, etc.)
 */
function other(done) {
  return src(paths.other, { encoding: false })
    .pipe(dest("dist"))
    .on("end", () => {
      browserSync.reload();
      done();
    });
}

function serve() {
  browserSync.init({
    server: { baseDir: "dist" },
    port: 5173,
    open: false,
  });

  watch(paths.html, html);
  watch(paths.css, css);
  watch(paths.js, js);
  watch(paths.imgAll, img);
  watch(paths.other, other);
}

exports.clean = clean;
exports.dev = series(clean, parallel(html, css, js, img, other), serve);
exports.build = series(clean, parallel(html, css, js, img, other, imgWebp));
