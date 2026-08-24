import {describe,expect,it} from "vitest";
import {enrichDeals,rankDeals} from "../scripts/deals/generate-ranking.js";
import {summarizeHistory} from "../scripts/deals/history.js";
import {advertisedDiscount,savingEvidence,scoreDeal} from "../scripts/deals/score-deal.js";
import type {HistoricalObservation} from "../scripts/deals/types.js";
import {buildDeals} from "../scripts/build-deals.js";
import type {DealOffer,StoreData} from "../scripts/types.js";

const offer=(overrides:Partial<DealOffer>={}):DealOffer=>({store:"rimi",name:"Milk 1 l",sourceName:"Milk 1 l",displayName:"Milk",displayNameSource:"AUTO",externalId:"milk-1",sourceUrl:"x",salePrice:7,regularPrice:10,quantity:1,unit:"l",pricePerUnit:7,pricePerUnitType:"l",promotionType:"LOYALTY",confidence:"HIGH",...overrides});
describe("deal evidence",()=>{
  it("calculates a 30% discount and €3 saving",()=>{expect(advertisedDiscount(offer())).toBe(30);expect(savingEvidence(offer())).toMatchObject({absoluteSaving:3,unitSaving:3})});
  it("rejects invalid discounts",()=>expect(advertisedDiscount(offer({salePrice:11}))).toBeUndefined());
  it("keeps scores bounded and loyalty explicit",()=>{const intel=scoreDeal(offer(),{status:"INSUFFICIENT_HISTORY",observations:0});expect(intel.dealScore).toBeGreaterThanOrEqual(0);expect(intel.dealScore).toBeLessThanOrEqual(100);expect(intel.reasons).toContain("LOYALTY_REQUIRED")});
});
describe("historical intelligence",()=>{const rows=(values:number[],unit:"kg"|"l"|"piece"="l"):HistoricalObservation[]=>values.map((price,index)=>({snapshot:`2026-08-${20+index}`,price,unit}));it("detects a lowest observed price",()=>expect(summarizeHistory(3,"l",rows([4,5,6]))).toMatchObject({status:"LOWEST_OBSERVED",low:4,median:5}));it("uses the 5% near-low threshold",()=>expect(summarizeHistory(4.2,"l",rows([4,5,6])).status).toBe("NEAR_LOWEST"));it("does not fabricate claims with shallow history",()=>expect(summarizeHistory(3,"l",rows([4,5])).status).toBe("INSUFFICIENT_HISTORY"));it("rejects incompatible historical units",()=>expect(summarizeHistory(3,"kg",rows([4,5,6],"piece")).observations).toBe(0))});
describe("ranking safety",()=>{it("is stable and excludes expired offers before ranking",()=>{const input:StoreData={store:"rimi",collectedAt:"x",source:"x",offers:[{name:"Current",externalId:"current",sourceUrl:"x",salePrice:2,regularPrice:4,validUntil:"2026-08-31"},{name:"Expired",externalId:"expired",sourceUrl:"x",salePrice:1,regularPrice:10,validUntil:"2026-08-01"}]},built=buildDeals([input],"2026-08-24"),enriched=enrichDeals(built,new Map());expect(enriched.flatMap(item=>item.offers).map(item=>item.sourceName)).toEqual(["Current"]);expect(rankDeals(enriched,"x")).toEqual(rankDeals(enriched,"x"))});it("cannot rank Lidl",()=>{type LidlIsStore="lidl" extends DealOffer["store"]?true:false;const lidlIsStore:LidlIsStore=false;expect(lidlIsStore).toBe(false)})});
