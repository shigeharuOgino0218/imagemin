import imagemin from "imagemin";
import imageminMozjpeg from "imagemin-mozjpeg";
import imageminPngquant from "imagemin-pngquant";

import { promises as fsPromises, writeFileSync } from "fs";
import path from "path";

const SRC_DIR = "./img";
const OUT_DIR = "./dist";

(async () => {
  const files = await imagemin([SRC_DIR + "/**/*.{jpg,jpeg,png}"], {
    plugins: [imageminMozjpeg({ quality: 75 }), imageminPngquant()],
  });

  if (files.length) {
    files.forEach(async (file) => {
      const source = path.parse(file.sourcePath);
      const distPath = `${source.dir.replace(SRC_DIR, OUT_DIR)}/${source.name}${
        source.ext
      }`;

      await fsPromises.mkdir(path.dirname(distPath), {
        recursive: true,
      });
      writeFileSync(distPath, file.data);
    });
  }
})();
