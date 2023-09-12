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
        const imgSize = await getSize(img.sourcePath);
        const optimizedSize = Buffer.byteLength(img.data);

        if (Math.abs(imgSize - optimizedSize) > 100) {
          img.destinationPath = `${source.dir.replace(SRC_DIR, OUT_DIR)}/${source.name}${source.ext}`;

          // 圧縮後の画像を生成.
          await fs.promises.mkdir(path.dirname(img.destinationPath), {
            recursive: true,
          });
          await fs.promises.writeFile(img.destinationPath, img.data);
          return true;
        } else {
          // 100B 以下の差であればすでに圧縮済とみなす.
          console.log(img.sourcePath + " already optimized.");
          return false;
        }
      })
    );

    // 結果をログに出力.
    const afterSumSize = await getSumSize(OUT_DIR);
    const diff = convertByte(beforeSumSize.val - afterSumSize.val);
    const percent = Math.round(((beforeSumSize.val - afterSumSize.val) / beforeSumSize.val) * 100 * 100) / 100;
    console.log(
      `\x1b[33msum image size\n before: ${beforeSumSize.conversion} ${beforeSumSize.unit}, after: ${afterSumSize.conversion} ${afterSumSize.unit} \x1b[0m`
    );
    console.log(`\x1b[32moptimized. (saved ${diff.conversion} ${diff.unit}) - ${percent}% \x1b[0m`);
  }
})();

/**
 * 画像のサイズを取得.
 * @param {string} file
 * @returns
 */
async function getSize(file) {
  const stats = await fs.promises.stat(file);
  if (stats.isFile()) {
    return stats.size;
  } else {
    return 0;
  }
}

/**
 * 対象ファイルの合計サイズを返却.
 * @param {string} dir
 * @returns
 */
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

  const sizes = await Promise.all(files.map(async (file) => await getSize(file)));

  sumSize = sizes.reduce((a, b) => a + b, 0);

  return { ...convertByte(sumSize), length: files.length };
}

/**
 * バイト単位に変換.
 * @param {number} byte
 * @returns
 */
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
