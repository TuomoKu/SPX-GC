
// `npm -i gulp`
// This gulpfile.js will handle compiling the BROADCAST
// version of the SPX Graphics Controller.

const del = require('del');
const path = require('path');
const gulp = require('gulp');
const log = require('fancy-log');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const replace = require('gulp-async-replace');
const fileinclude = require('gulp-file-include');
const { src, series, parallel, dest, watch } = require('gulp');


// =========================================== conf these ====================

    const params = {

        /* ### Configure these ### */

        project:    'SPX Graphics Broadcast',
        folder:     'RSO',
        vendor:     'softpix',
        version:    '0.9.2',
        comment:    'Refactored package',

        fileToCopyAsIs: [
            'src/README.md',
            'src/css/**/*',
            'src/themes/**/*',
            'src/files/**/*',
            'src/fonts/**/*',
            'src/img/**/*',
            'src/img/icon/**/*',
            'src/*.js',
            'src/js/**/*',
            'src/lottie/**/*',
            'src/webm/**/*',
            'src/BONUS/**/*'
            ],
    }

    let SPXROOT = process.env.SPX_ROOT_FOLDER || null;
    if ( !SPXROOT ) {
        log('\n\n** ERROR! ** SPX_ROOT_FOLDER not set in environment variables, exiting!\n\n');
        process.exit()
    }

    let destFolder = path.join( SPXROOT,'ASSETS', 'templates', params.vendor, params.folder)

// ===========================================================================


async function copyFilesNormal() {
    let normalCopyfiles = params.fileToCopyAsIs;
    normalCopyfiles.push('src/js/spx_*.js')
    return src(normalCopyfiles, { base: 'src', allowEmpty: true})
        // .pipe(gulp.dest(destFolder))
        .on('end', function(){
            log('-- COMPLETED --\n');
        });
};

async function buildNormalHTML(){
    var timestamp = Date(Date.now()).toString(); 
    return gulp.src('src/*.html')
    //   .pipe(fileinclude({prefix: '@@', basepath: '@file' }))
    //   .pipe(replace('##-builddate-##', timestamp))
    //   .pipe(replace('##-version-##', params.version))
    //   .pipe(replace('##-comment-##', params.comment))
    //   .pipe(replace('##-minifyinfo-##', 'Non-minified source build.'))
    //   .pipe(replace('##-project-description-##', params.project))

    //   .pipe(rename(function (path) {
    //         path.basename = path.basename.replace("_SRC", ""); // remove _SRC
    //     }))
    //   .pipe(gulp.dest(destFolder))
      .on('end', function(){
            log('-- COMPLETED --\n');
        });
      
  }



// ---------------------------------------------------------------------------

// Default export with watcher, start with "gulp" ----------------------------------------------
exports.default = function() {
    log('\n\nGULP to ▸ ' + destFolder + '\n');
    watch(['src/*', 'src/*/**'], { events: 'change'}, series(copyFilesNormal, buildNormalHTML));
  };

