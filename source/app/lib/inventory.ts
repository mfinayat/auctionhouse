// The same catalogue drives the seller form and server validation.
const plots=(from:number,to:number,prefix='C-')=>Array.from({length:to-from+1},(_,i)=>prefix+(from+i));
export const inventory={
 axis:[
  {category:'2 Kanal · 150 ft Broadway',marla:40,blocks:{'Block-E/II (150 Feet Broadway)':plots(2,11,'C')}},
  {category:'2 Kanal · Broadway back',marla:40,blocks:{'Block-E/II (150 Feet Broadway Back)':plots(14,23,'C')}},
  {category:'8 Marla · Pine Avenue',marla:8,blocks:{'Block-A (Pine Avenue)':plots(26,42),'Block-D (Pine Avenue)':plots(33,75)}},
  {category:'8 Marla · Pine Avenue back',marla:8,blocks:{'Block-A (Pine Avenue Back)':plots(123,139),'Block-D (Pine Avenue Back)':plots(155,197)}},
 ],
 executive:[{category:'1 Kanal · Residential',marla:20,blocks:{'Block-E/I':plots(1,95,''),'Block-E/II':plots(1,125,'')}}],
};
