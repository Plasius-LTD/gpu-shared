const defaults = Object.freeze({samplesPerPixel:64,maxDepth:6,width:800,height:600,denoise:true});
export function inspectionQuality(input = {}, previous = defaults) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key=>!Object.hasOwn(defaults,key))) throw new Error('Invalid inspection quality fields.');
  const value = {...previous,...input};
  for (const [key,max] of [['samplesPerPixel',256],['maxDepth',12],['width',1440],['height',1440]]) {
    if (!Number.isInteger(value[key]) || value[key]<1 || value[key]>max) throw new Error(`Invalid inspection quality: ${key}.`);
  }
  if (typeof value.denoise !== 'boolean') throw new Error('Invalid inspection quality: denoise.');
  return Object.freeze(value);
}
