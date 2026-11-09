import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const dir=path.resolve(import.meta.dirname,'../public/assets');
for(const name of ['pine-axis','pine-executive','lahore-technology-park']){const input=path.join(dir,name+'.webp');if(!fs.existsSync(input))continue;for(const width of [320,640]){const out=path.join(dir,`${name}-${width}.webp`);await sharp(input).resize({width,withoutEnlargement:true}).webp({quality:78}).toFile(out)}console.log(name+': responsive WebP sizes generated')}
