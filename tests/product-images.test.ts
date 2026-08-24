import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {buildDeals} from "../scripts/build-deals.js";
import {scoreDeal} from "../scripts/deals/score-deal.js";
import {selectPrimaryImage} from "../scripts/normalization/product-images.js";
import type {DealOffer,StoreData} from "../scripts/types.js";
import {ProductImage} from "../src/components/ProductImage.js";

const source=(store:"rimi"|"maxima",name:string,imageUrl?:string):StoreData=>({store,collectedAt:"x",source:"x",offers:[{name,imageUrl,sourceUrl:"x",salePrice:5,regularPrice:10,pricePerUnit:5,pricePerUnitType:"kg"}]});
describe("retailer product images",()=>{
  it("uses the only retailer image",()=>{expect(buildDeals([source("maxima","Arbūzai, 1 kg","maxima.jpg")],"2026-08-24")[0].primaryImageUrl).toBe("maxima.jpg");expect(buildDeals([source("rimi","Arbūzai, 1 kg","rimi.jpg")],"2026-08-24")[0].primaryImageUrl).toBe("rimi.jpg")});
  it("prefers Maxima while retaining both matched offer images",()=>{const deal=buildDeals([source("rimi","Glaistyti saldainiai su riešutais CANDY NUT, 1 kg","rimi.jpg"),source("maxima","Saldainiai ROSHEN CANDY NUT, sveriami, 1 kg","maxima.jpg")],"2026-08-24")[0];expect(deal.id).toBe("roshen-candy-nut");expect(deal.primaryImageUrl).toBe("maxima.jpg");expect(deal.offers.map(offer=>offer.imageUrl)).toEqual(expect.arrayContaining(["rimi.jpg","maxima.jpg"]))});
  it("falls back from missing Maxima image to Rimi",()=>expect(selectPrimaryImage([{store:"maxima"},{store:"rimi",imageUrl:"rimi.jpg"}])).toBe("rimi.jpg"));
  it("allows all images to be missing and renders a fallback",()=>{expect(selectPrimaryImage([{store:"maxima"},{store:"rimi"}])).toBeUndefined();expect(renderToStaticMarkup(createElement(ProductImage,{alt:"Milk"}))).toContain("Milk image unavailable")});
  it("renders each retailer-specific source in expanded image markup",()=>{const html=renderToStaticMarkup(createElement("div",null,createElement(ProductImage,{src:"maxima.jpg",alt:"Product at MAXIMA"}),createElement(ProductImage,{src:"rimi.jpg",alt:"Product at RIMI"})));expect(html).toContain("maxima.jpg");expect(html).toContain("rimi.jpg")});
  it("does not change deal scoring",()=>{const base:DealOffer={store:"rimi",name:"Milk",sourceName:"Milk",displayName:"Milk",displayNameSource:"AUTO",sourceUrl:"x",salePrice:7,regularPrice:10,quantity:1,unit:"l",pricePerUnit:7,pricePerUnitType:"l",confidence:"HIGH"},history={status:"INSUFFICIENT_HISTORY" as const,observations:0};expect(scoreDeal({...base,imageUrl:"retailer.jpg"},history)).toEqual(scoreDeal(base,history))});
});
