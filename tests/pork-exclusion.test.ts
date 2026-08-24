import {mkdtemp,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach,describe,expect,it} from "vitest";
import {buildDeals} from "../scripts/build-deals.js";
import {loadHistory} from "../scripts/deals/history.js";
import {detectExcludedPorkProduct,isExcludedPorkProduct,porkExclusionMetrics,resetPorkExclusionAudit,retainNonPorkOffer} from "../scripts/exclusions/pork.js";
import type {Deal,RawOffer,StoreData} from "../scripts/types.js";

const offer=(name:string,extra:Partial<RawOffer>={}):RawOffer=>({name,salePrice:2,regularPrice:3,sourceUrl:"https://retailer.test/product",...extra});
afterEach(()=>resetPorkExclusionAudit());

describe("shared confirmed-pork detector",()=>{
  it.each(["kiauliena","kiaulienos sprandinė","kiaulienos kumpis","kiaulių ausys","pork ham","pork sausage","pork and beef sausage","KIAULIENOS   FARŠAS","kiaul. sprandinė"])("excludes %s",name=>expect(isExcludedPorkProduct(offer(name))).toBe(true));
  it("uses structured fields in priority order",()=>{expect(detectExcludedPorkProduct(offer("Mėsos gaminys",{sourceCategory:"Kiauliena",description:"pork"}))).toMatchObject({evidenceType:"CATEGORY",evidence:"Kiauliena"});expect(detectExcludedPorkProduct(offer("Mėsos gaminys",{meatType:"pork",description:"kiauliena"}))).toMatchObject({evidenceType:"MEAT_TYPE"});expect(detectExcludedPorkProduct(offer("Dumplings",{ingredients:"pork, onion"}))).toMatchObject({evidenceType:"INGREDIENTS"})});
  it.each(["kalakutienos kumpis","vištienos kumpis","turkey ham","chicken ham","jautienos faršas","kumpis","dešra","beef sausage","turkey bacon","chicken bacon","beef bacon","bacon-style pieces"])("retains ambiguous or confirmed non-pork %s",name=>expect(isExcludedPorkProduct(offer(name))).toBe(false));
  it("handles punctuation and mixed meat",()=>expect(isExcludedPorkProduct(offer("Kiauliena + vištiena, dešrelės"))).toBe(true));
  it("excludes ordinary bacon unless another meat is explicit",()=>{expect(isExcludedPorkProduct(offer("Smoked bacon"))).toBe(true);expect(isExcludedPorkProduct(offer("Turkey bacon"))).toBe(false)});
});

describe("pipeline boundaries and audit",()=>{
  it("uses the same rule for Rimi leaflet, Rimi e-shop, and Maxima",()=>{expect(retainNonPorkOffer(offer("Kiaulienos kumpis",{externalId:"rl"}),"rimi","rimi-leaflet")).toBe(false);expect(retainNonPorkOffer(offer("Pork sausage",{externalId:"re"}),"rimi","rimi-eshop")).toBe(false);expect(retainNonPorkOffer(offer("Kiauliena",{externalId:"ms"}),"maxima","maxima-structured")).toBe(false);expect(retainNonPorkOffer(offer("Pork ribs",{externalId:"ml"}),"maxima","maxima-leaflet")).toBe(false);expect(porkExclusionMetrics()).toEqual({total:4,rimi:2,maxima:2,breakdown:{rimiLeaflet:1,rimiEshop:1,maximaStructured:1,maximaLeaflet:1,pipeline:0}})});
  it("never creates normalized products or deal scores",()=>{const input:StoreData={store:"rimi",collectedAt:"2026-08-24",source:"test",offers:[offer("Pork ham"),offer("Chicken ham")]};const deals=buildDeals([input],"2026-08-24");expect(deals).toHaveLength(1);expect(deals[0].offers[0].name).toBe("Chicken ham");expect(deals.some(deal=>deal.offers.some(row=>row.intelligence))).toBe(false)});
  it("ignores pork in legacy history without rewriting it",async()=>{const directory=await mkdtemp(join(tmpdir(),"priceradar-pork-"));try{const pork={...offer("Kiaulienos sprandinė",{externalId:"pork"}),store:"rimi",sourceName:"Kiaulienos sprandinė",displayName:"Pork",displayNameSource:"AUTO"} as const,chicken={...offer("Vištienos kumpis",{externalId:"chicken"}),store:"rimi",sourceName:"Vištienos kumpis",displayName:"Chicken ham",displayNameSource:"AUTO"} as const,deals:Deal[]=[{id:"meat",name:"Meat",category:"Meat",aliases:[],offers:[pork,chicken]}];await writeFile(join(directory,"2026-08-24.json"),JSON.stringify(deals));const history=await loadHistory(directory);expect([...history.observations.keys()]).toEqual(["rimi|rimi|physical|external:chicken"]);expect(JSON.parse(await import("node:fs/promises").then(fs=>fs.readFile(join(directory,"2026-08-24.json"),"utf8")))[0].offers).toHaveLength(2)}finally{await rm(directory,{recursive:true,force:true})}});
});
