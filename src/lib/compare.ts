import type {Offer,Store} from "../types/index.js";

export interface StoreComparison{offers:Partial<Record<Store,Offer>>;unit?:string;winner?:Store;equal:boolean;difference?:number;percentDifference?:number;compatible:boolean}
const physical=(offer:Offer)=>offer.channel!=="online";
export function compareStoreOffers(offers:Offer[]):StoreComparison{
  const byStore={rimi:offers.filter(offer=>physical(offer)&&offer.store==="rimi"),maxima:offers.filter(offer=>physical(offer)&&offer.store==="maxima")};
  const units=[...new Set(byStore.rimi.map(offer=>offer.pricePerUnitType).filter((unit):unit is string=>Boolean(unit)))].filter(unit=>byStore.maxima.some(offer=>offer.pricePerUnitType===unit));
  if(!units.length){const cheapest=(rows:Offer[])=>[...rows].sort((a,b)=>(a.pricePerUnit??a.salePrice??Infinity)-(b.pricePerUnit??b.salePrice??Infinity))[0];return{offers:{rimi:cheapest(byStore.rimi),maxima:cheapest(byStore.maxima)},equal:false,compatible:false}}
  const unit=units[0],cheapest=(rows:Offer[])=>rows.filter(offer=>offer.pricePerUnitType===unit&&offer.pricePerUnit!=null).sort((a,b)=>a.pricePerUnit!-b.pricePerUnit!)[0],rimi=cheapest(byStore.rimi),maxima=cheapest(byStore.maxima);if(!rimi||!maxima)return{offers:{rimi,maxima},unit,equal:false,compatible:false};
  const difference=Number(Math.abs(rimi.pricePerUnit!-maxima.pricePerUnit!).toFixed(2));if(difference===0)return{offers:{rimi,maxima},unit,equal:true,compatible:true,difference:0,percentDifference:0};const winner=rimi.pricePerUnit!<maxima.pricePerUnit!?"rimi":"maxima",higher=Math.max(rimi.pricePerUnit!,maxima.pricePerUnit!);return{offers:{rimi,maxima},unit,winner,equal:false,compatible:true,difference,percentDifference:Number(((difference/higher)*100).toFixed(1))};
}
