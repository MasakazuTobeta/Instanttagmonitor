import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const APRILTAG_COMMIT = '305766652af34cafa5bab68fc2ebb2ca272e1482';
const APRILTAG_TARBALL_URL = `https://codeload.github.com/AprilRobotics/apriltag/tar.gz/${APRILTAG_COMMIT}`;
const outputDir = path.resolve('public/vendor/apriltag');
const wrapperPath = path.resolve('src/native/apriltag_runtime.c');

function run(command, args, options = {}) {
  execFileSync(command, args, {
    stdio: 'inherit',
    ...options,
  });
}

function ensureEmcc() {
  try {
    execFileSync('emcc', ['--version'], { stdio: 'ignore' });
  } catch (error) {
    throw new Error('emcc was not found in PATH. Source emsdk before running this script.');
  }
}

async function downloadApriltagSource(workingDir) {
  const archivePath = path.join(workingDir, 'apriltag.tar.gz');
  const response = await fetch(APRILTAG_TARBALL_URL);
  if (!response.ok) {
    throw new Error(`Failed to download AprilTag source: ${response.status}`);
  }

  writeFileSync(archivePath, Buffer.from(await response.arrayBuffer()));
  run('tar', ['-xzf', archivePath, '-C', workingDir]);
  return path.join(workingDir, `apriltag-${APRILTAG_COMMIT}`);
}

async function main() {
  ensureEmcc();
  mkdirSync(outputDir, { recursive: true });

  const workingDir = mkdtempSync(path.join(tmpdir(), 'apriltag-build-'));

  try {
    const apriltagDir = await downloadApriltagSource(workingDir);
    const outputJsPath = path.join(outputDir, 'apriltag_wasm.js');

    const sourceFiles = [
      path.join(apriltagDir, 'apriltag.c'),
      path.join(apriltagDir, 'apriltag_quad_thresh.c'),
      path.join(apriltagDir, 'tag16h5.c'),
      path.join(apriltagDir, 'tag25h9.c'),
      path.join(apriltagDir, 'tag36h11.c'),
      path.join(apriltagDir, 'tagCircle21h7.c'),
      path.join(apriltagDir, 'tagCircle49h12.c'),
      path.join(apriltagDir, 'tagStandard41h12.c'),
      path.join(apriltagDir, 'tagStandard52h13.c'),
      path.join(apriltagDir, 'common/g2d.c'),
      path.join(apriltagDir, 'common/getopt.c'),
      path.join(apriltagDir, 'common/homography.c'),
      path.join(apriltagDir, 'common/image_u8.c'),
      path.join(apriltagDir, 'common/image_u8_parallel.c'),
      path.join(apriltagDir, 'common/image_u8x3.c'),
      path.join(apriltagDir, 'common/image_u8x4.c'),
      path.join(apriltagDir, 'common/matd.c'),
      path.join(apriltagDir, 'common/pam.c'),
      path.join(apriltagDir, 'common/pjpeg-idct.c'),
      path.join(apriltagDir, 'common/pjpeg.c'),
      path.join(apriltagDir, 'common/pnm.c'),
      path.join(apriltagDir, 'common/pthreads_cross.c'),
      path.join(apriltagDir, 'common/string_util.c'),
      path.join(apriltagDir, 'common/svd22.c'),
      path.join(apriltagDir, 'common/time_util.c'),
      path.join(apriltagDir, 'common/unionfind.c'),
      path.join(apriltagDir, 'common/workerpool.c'),
      path.join(apriltagDir, 'common/zarray.c'),
      path.join(apriltagDir, 'common/zhash.c'),
      path.join(apriltagDir, 'common/zmaxheap.c'),
    ];

    run('emcc', [
      wrapperPath,
      ...sourceFiles,
      '-O3',
      '-I',
      apriltagDir,
      '-I',
      path.join(apriltagDir, 'common'),
      '-s',
      'WASM=1',
      '-s',
      'MODULARIZE=1',
      '-s',
      'EXPORT_NAME=AprilTagWasm',
      '-s',
      'ALLOW_MEMORY_GROWTH=1',
      '-s',
      'NO_EXIT_RUNTIME=1',
      '-s',
      'FILESYSTEM=0',
      '-s',
      'ENVIRONMENT=web,worker,node',
      '-s',
      'EXPORT_ALL=1',
      '-s',
      "EXPORTED_RUNTIME_METHODS=['cwrap','getValue']",
      '-s',
      "EXPORTED_FUNCTIONS=['_atagjs_init','_atagjs_destroy','_atagjs_set_detector_options','_atagjs_set_detector_families','_atagjs_set_img_buffer','_atagjs_detect']",
      '-o',
      outputJsPath,
    ]);

    copyFileSync(path.join(apriltagDir, 'LICENSE.md'), path.join(outputDir, 'LICENSE'));
    console.log(`Built multi-family AprilTag runtime at ${outputJsPath}`);
  } finally {
    rmSync(workingDir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
