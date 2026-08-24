import type {Deal,Offer,Store} from "../types/index.js";

const physical=(offer:Offer)=>offer.channel!=="online";
export function retailerPriority(deal:Deal){const stores=new Set(deal.offers.filter(physical).map(offer=>offer.store));return stores.has("maxima")&&stores.has("rimi")?0:stores.has("maxima")?1:stores.has("rimi")?2:3}
export function compactRetailerOffers(deal:Deal){return(["maxima","rimi"] as Store[]).flatMap(store=>{const candidates=deal.offers.filter(offer=>physical(offer)&&offer.store===store),offer=[...candidates].sort((a,b)=>(a.pricePerUnit??a.salePrice??Infinity)-(b.pricePerUnit??b.salePrice??Infinity)||a.sourceName.localeCompare(b.sourceName,"lt"))[0];return offer?[offer]:[]})}
export function regularPriceLabel(offer:Offer){if(offer.regularPrice==null)return undefined;if(offer.pricePerUnit!=null&&offer.pricePerUnitType){const quantity=offer.quantity,base=quantity!=null&&(offer.unit==="g"||offer.unit==="ml")?quantity/1000:quantity;if(base!=null&&base>0)return`€${(offer.regularPrice/base).toFixed(2)}/${offer.pricePerUnitType}`;if(offer.salePrice!=null&&Math.abs(offer.pricePerUnit-offer.salePrice)<.01)return`€${offer.regularPrice.toFixed(2)}/${offer.pricePerUnitType}`;return undefined}return`€${offer.regularPrice.toFixed(2)}`}
export function sortDefaultProducts(deals:Deal[]){return[...deals].sort((a,b)=>retailerPriority(a)-retailerPriority(b)||bestScore(b)-bestScore(a)||bestDiscount(b)-bestDiscount(a)||a.name.localeCompare(b.name,"en")||a.id.localeCompare(b.id))}
const bestScore=(deal:Deal)=>Math.max(0,...deal.offers.filter(physical).map(offer=>offer.intelligence?.dealScore??0));
const bestDiscount=(deal:Deal)=>Math.max(0,...deal.offers.filter(physical).map(offer=>offer.intelligence?.advertisedDiscountPercent??0));
