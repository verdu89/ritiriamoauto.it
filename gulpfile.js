const { src, dest, series, parallel, watch } = require("gulp");
const del = (...args) => import("del").then((m) => m.deleteAsync(...args));
const plumber = require("gulp-plumber");
const htmlmin = require("gulp-htmlmin");
const csso = require("gulp-csso");
const terser = require("gulp-terser");
const webp = require("gulp-webp");
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

// Per ora: copia immagini (zero ottimizzazione) -> niente errori ESM
function img() {
  return src(paths.imgAll)
    .pipe(plumber())
    .pipe(dest("dist/img"))
    .pipe(browserSync.stream());
}

// Facoltativo: genera webp (non rompe) quando vuoi
function imgWebp() {
  return src(paths.imgToWebp)
    .pipe(plumber())
    .pipe(webp({ quality: 82 }))
    .pipe(dest("dist/img"));
}

function other() {
  return src(paths.other).pipe(dest("dist"));
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
