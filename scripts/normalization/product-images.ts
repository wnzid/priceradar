import type {DealOffer} from "../types.js";

export function selectPrimaryImage(offers:Pick<DealOffer,"store"|"imageUrl">[]){
  return offers.find(offer=>offer.store==="maxima"&&offer.imageUrl)?.imageUrl??offers.find(offer=>offer.store==="rimi"&&offer.imageUrl)?.imageUrl??offers.find(offer=>offer.imageUrl)?.imageUrl;
}
