import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
import {mergeMaximaPhysical,parseMaximaStructured} from "../scripts/collectors/maxima.js";
import type {RawOffer} from "../scripts/types.js";

const fixture=readFileSync(new URL("./fixtures/maxima-pasiulymai.html",import.meta.url),"utf8");

describe("Maxima structured physical-store offers",()=>{
  it("extracts comparable promotions and rejects campaigns and invalid prices",()=>{
    const result=parseMaximaStructured(fixture,"https://www.maxima.lt/pasiulymai",new Date("2026-08-24T12:00:00Z"));
    expect(result.rawCards).toBe(5);
    expect(result.offers).toHaveLength(2);
    expect(result.campaignOnly).toBe(1);
    expect(result.rejected).toBe(1);
    expect(result.duplicates).toBe(1);
    expect(result.offers[0]).toMatchObject({externalId:"fruit-1",salePrice:.49,regularPrice:.89,discountPercent:44,pricePerUnit:.49,pricePerUnitType:"kg",validUntil:"2026-08-24",sourceCategory:"Vaisiai ir daržovės",category:"Fruit & Vegetables",sourceType:"structured",channel:"physical"});
    expect(result.offers[1]).toMatchObject({externalId:"loyalty-1",salePrice:1.09,loyaltyPrice:1.09,promotionType:"LOYALTY",validFrom:"2026-08-18",validUntil:"2026-08-24"});
  });

  it("keeps the structured record when the leaflet repeats it",()=>{
    const structured:RawOffer={externalId:"s",name:"Arbūzai 1 kg",salePrice:.49,sourceUrl:"https://maxima.lt/pasiulymai",sourceType:"structured",sourcePlatform:"maxima",channel:"physical"};
    const repeated:RawOffer={...structured,externalId:"l",name:"Arbūzai, 1 kg",sourceType:"leaflet"};
    const extra:RawOffer={...repeated,externalId:"x",name:"Bananai, 1 kg",salePrice:.79};
    const merged=mergeMaximaPhysical([structured],[repeated,extra]);
    expect(merged.duplicates).toBe(1);
    expect(merged.offers.map(offer=>offer.externalId)).toEqual(["s","x"]);
  });

  it("rejects anti-bot pages instead of publishing an empty dataset",()=>{
    expect(()=>parseMaximaStructured("<title>Just a moment...</title>")).toThrow(/challenge response/);
  });
});
