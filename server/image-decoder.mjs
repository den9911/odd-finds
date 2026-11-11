import sharp from 'sharp';
import {decodeImage as inspect,HttpError} from './validation.mjs';
sharp.cache(false);sharp.concurrency(1);
let active=0;
/** Reject rather than queue excess decoder work; every input must complete a real pixel decode. */
export async function decodePixels(value){
 const parsed=inspect(value);if(!parsed.image)return parsed;
 if(active>=2)throw new HttpError(503,'Обработка занята. Повторите позже.');
 active++;
 try{
  const data=await sharp(parsed.image,{limitInputPixels:2048*2048,failOn:'warning',sequentialRead:true}).timeout({seconds:3}).raw().toBuffer({resolveWithObject:true});
  if(!data.info.width||!data.info.height||data.info.width>2048||data.info.height>2048)throw new Error('Dimensions');
  return parsed;
 }catch{throw new HttpError(400,'Повреждённая картинка или размер больше 2048 × 2048.');}
 finally{active--;}
}
