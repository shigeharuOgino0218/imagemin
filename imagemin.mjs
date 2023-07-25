import imagemin from "imagemin";
import imageminMozjpeg from "imagemin-mozjpeg";
import imageminPngquant from "imagemin-pngquant";

import fs from "fs";
import path from "path";

const SRC_DIR = "./img";
const OUT_DIR = "./dist";

const extension = "jpg|jpeg|png";

(async () => {
  console.log("optimizing...");

  const beforeSumSize = await getSumSize(SRC_DIR);

  console.log(`${beforeSumSize.length} files.`);

  const imgs = await imagemin([SRC_DIR + `/**/*.{${extension.replace(/\|/g, ",")}}`], {
    plugins: [imageminMozjpeg({ quality: 75 }), imageminPngquant()],
  });

  if (imgs.length) {
    await Promise.all(
      imgs.map(async (img) => {
        const source = path.parse(img.sourcePath);
        img.destinationPath = `${source.dir.replace(SRC_DIR, OUT_DIR)}/${source.name}${source.ext}`;

        await fs.promises.mkdir(path.dirname(img.destinationPath), {
          recursive: true,
        });
        fs.writeFileSync(img.destinationPath, img.data);
        return true;
      })
    );

    // setFiles(OUT_DIR);
    const afterSumSize = await getSumSize(OUT_DIR);
    const diff = convertByte(beforeSumSize.val - afterSumSize.val);
    const percent = Math.round(((beforeSumSize.val - afterSumSize.val) / beforeSumSize.val) * 100 * 100) / 100;

    console.log(
      `\x1b[33m sum image size\n before: ${beforeSumSize.conversion} ${beforeSumSize.unit}, after: ${afterSumSize.conversion} ${afterSumSize.unit} \x1b[0m`
    );
    console.log(`\x1b[32m optimized. (saved ${diff.conversion} ${diff.unit}) - ${percent}% \x1b[0m`);
  }
})();

async function getSumSize(dir) {
  const setFiles = async (dir) => {
    const fileNames = await fs.promises.readdir(dir);
    for (const fileName of fileNames) {
      const filePath = path.join(dir, fileName);
      const stats = await fs.promises.stat(filePath);
      if (stats.isFile()) {
        if (!new RegExp(`.(${extension})$`).test(fileName)) continue;
        files.push(filePath.replace(/\\/g, "/"));
      } else if (stats.isDirectory()) {
        await setFiles(filePath);
      }
    }
  };

  const files = [];
  let sumSize = 0;

  await setFiles(dir);

  const sizes = await Promise.all(
    files.map(async (file) => {
      const stats = await fs.promises.stat(file);
      if (stats.isFile()) {
        // console.log(file, stats.size);
        return stats.size;
      } else {
        return 0;
      }
    })
  );

  sumSize = sizes.reduce((a, b) => a + b, 0);

  return { ...convertByte(sumSize), length: files.length };
}

function convertByte(byte) {
  let unit = "";
  let conversion = 0;

  if (byte > 1024 * 1024 * 1024) {
    unit = "GB";
    conversion = Math.round((byte / (1024 * 1024 * 1024)) * 100) / 100;
  } else if (byte > 1024 * 1024) {
    unit = "MB";
    conversion = Math.round((byte / (1024 * 1024)) * 100) / 100;
  } else if (byte > 1024) {
    unit = "KB";
    conversion = Math.round((byte / 1024) * 100) / 100;
  } else {
    unit = "B";
    conversion = byte;
  }

  return { conversion: conversion, unit: unit, val: byte };
}
