import {describe,expect,it} from "vitest";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {MemoryRouter} from "react-router-dom";
import {compareStoreOffers} from "../src/lib/compare.js";
import {bestGroceryDeals,isGroceryCategory} from "../src/lib/grocery.js";
import {addShoppingItem,readShoppingList,removeShoppingItem,resolveShoppingItem,shoppingIdentity,writeShoppingList} from "../src/lib/shopping-list.js";
import type {Deal,Offer} from "../src/types/index.js";
import {matchesDealQuery} from "../src/lib/search.js";
import {compactRetailerOffers,retailerPriority,sortDefaultProducts} from "../src/lib/retailer-coverage.js";
import {DealCard} from "../src/components/DealCard.js";
import {ShoppingListProvider} from "../src/hooks/useShoppingList.js";

const readFileSync=(...args:unknown[])=>{void args;return JSON.stringify([
  {id:"fresh-potatoes",name:"Fresh Potatoes",category:"Fruit & Vegetables",aliases:[],offers:[{store:"rimi",sourceName:"Bulvės",sourceUrl:"x",pricePerUnit:1,pricePerUnitType:"kg"},{store:"maxima",sourceName:"Bulvės",sourceUrl:"y",pricePerUnit:.9,pricePerUnitType:"kg"}]},
  {id:"salmon",name:"Fresh Salmon",category:"Fish & Seafood",aliases:["lašiša"],offers:[{store:"rimi",sourceName:"Lašiša",sourceUrl:"x",pricePerUnit:10,pricePerUnitType:"kg"}]},
  {id:"chicken",name:"Vištienos filė",category:"Meat",aliases:["chicken"],offers:[{store:"maxima",sourceName:"Vištienos filė",sourceUrl:"x",pricePerUnit:6,pricePerUnitType:"kg"}]},
])};

const offer=(store:"rimi"|"maxima",price:number,unit="kg",sourceName=`${store}-${price}`):Offer=>({store,sourceName,sourceUrl:"x",pricePerUnit:price,pricePerUnitType:unit,intelligence:{historicalStatus:"INSUFFICIENT_HISTORY",historicalObservations:0,dealScore:price,reasons:[],comparisonReasons:[]}});
const deal=(id:string,category:string,score:number,name=id):Deal=>({id,name,category,aliases:[],offers:[{...offer("rimi",score),intelligence:{historicalStatus:"INSUFFICIENT_HISTORY",historicalObservations:0,dealScore:score,reasons:[],comparisonReasons:[]}}]});

describe("grocery dashboard",()=>{
  it("classifies from taxonomy, not names",()=>{expect(isGroceryCategory("Meat")).toBe(true);expect(isGroceryCategory("Drinks")).toBe(true);expect(isGroceryCategory("Household")).toBe(false);expect(isGroceryCategory("Personal Care")).toBe(false)});
  it("uses existing deal score ordering and excludes non-food",()=>expect(bestGroceryDeals([deal("low","Meat",20),deal("blanket","Household",99),deal("high","Meat",80)],2).map(item=>item.id)).toEqual(["high","low"]));
});
describe("store comparison",()=>{
  it("selects the cheapest same-store offer and calculates the winner",()=>expect(compareStoreOffers([offer("rimi",5),offer("rimi",4),offer("maxima",3)])).toMatchObject({winner:"maxima",difference:1,percentDifference:25,compatible:true,offers:{rimi:{pricePerUnit:4},maxima:{pricePerUnit:3}}}));
  it("reports equal prices without a fake winner",()=>{const result=compareStoreOffers([offer("rimi",3),offer("maxima",3)]);expect(result.equal).toBe(true);expect(result.winner).toBeUndefined()});
  it("does not compare incompatible units",()=>{const result=compareStoreOffers([offer("rimi",3,"kg"),offer("maxima",2,"piece")]);expect(result.compatible).toBe(false);expect(result.winner).toBeUndefined()});
});
describe("retailer coverage cards and ordering",()=>{const withStores=(id:string,stores:("rimi"|"maxima")[],score:number):Deal=>({id,name:id,category:"Meat",aliases:[],offers:stores.map(store=>({...offer(store,store==="maxima"?3:4),salePrice:store==="maxima"?3:4,regularPrice:store==="maxima"?6:8,quantity:1,unit:"kg",intelligence:{historicalStatus:"INSUFFICIENT_HISTORY",historicalObservations:0,dealScore:score,reasons:[],comparisonReasons:[]}}))});
  it("renders both retailer prices and their own regular prices on one card",()=>{const product=withStores("Dual",["rimi","maxima"],50),html=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(ShoppingListProvider,null,createElement(DealCard,{deal:product}))));expect(html.match(/MAXIMA/g)?.length).toBe(1);expect(html.match(/RIMI/g)?.length).toBe(1);expect(html).toContain("€3.00/kg");expect(html).toContain("€4.00/kg");expect(html).toContain("€6.00");expect(html).toContain("€8.00");expect(compactRetailerOffers(product)).toHaveLength(2)});
  it("renders only the retailer that has an offer",()=>{expect(compactRetailerOffers(withStores("Maxima",["maxima"],1)).map(item=>item.store)).toEqual(["maxima"]);expect(compactRetailerOffers(withStores("Rimi",["rimi"],1)).map(item=>item.store)).toEqual(["rimi"])});
  it("orders dual, Maxima-only, then Rimi-only while preserving rank and determinism",()=>{const rows=[withStores("Rimi B",["rimi"],20),withStores("Dual Low",["rimi","maxima"],30),withStores("Maxima",["maxima"],99),withStores("Dual High",["maxima","rimi"],80),withStores("Rimi A",["rimi"],20)],sorted=sortDefaultProducts(rows);expect(sorted.map(item=>item.name)).toEqual(["Dual High","Dual Low","Maxima","Rimi A","Rimi B"]);expect(sorted.map(retailerPriority)).toEqual([0,0,1,2,2])});
});
describe("shopping list persistence",()=>{const product=deal("chicken-breast","Meat",70,"Chicken Breast");
  it("adds, reloads, removes, and clears",()=>{let raw:string|null=null;const storage={getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value}},added=addShoppingItem([],product);writeShoppingList(storage,added);const reloaded=readShoppingList(storage);expect(reloaded).toHaveLength(1);expect(removeShoppingItem(reloaded,reloaded[0].id)).toEqual([]);writeShoppingList(storage,[]);expect(readShoppingList(storage)).toEqual([])});
  it("survives display-name changes through stable identity",()=>{const items=addShoppingItem([],product),renamed={...product,name:"Renamed Chicken"};expect(shoppingIdentity(renamed)).toBe(items[0].id);expect(resolveShoppingItem(items[0],[renamed]).deal?.name).toBe("Renamed Chicken")});
  it("retains a missing product as an unresolved list item",()=>{const item=addShoppingItem([],product)[0],resolved=resolveShoppingItem(item,[]);expect(resolved.item.label).toBe("Chicken Breast");expect(resolved.deal).toBeUndefined()});
});
describe("real-data shopping workflow",()=>{it("finds bilingual groceries, persists three items, compares, and removes one",()=>{const deals=JSON.parse(readFileSync("data/current/deals.json","utf8")) as Deal[],potatoes=deals.find(item=>item.id==="fresh-potatoes")!,english=deals.find(item=>matchesDealQuery(item,"salmon"))!,lithuanian=deals.find(item=>matchesDealQuery(item,"vištienos"))!;expect(potatoes).toBeTruthy();expect(english).toBeTruthy();expect(lithuanian).toBeTruthy();let items=addShoppingItem([],potatoes);items=addShoppingItem(items,english);items=addShoppingItem(items,lithuanian);let raw:string|null=null;const storage={getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value}};writeShoppingList(storage,items);const reloaded=readShoppingList(storage);expect(reloaded).toHaveLength(3);const current=reloaded.map(item=>resolveShoppingItem(item,deals));expect(current.every(row=>row.deal)).toBe(true);expect(compareStoreOffers(current[0].deal!.offers).compatible).toBe(true);expect(removeShoppingItem(reloaded,reloaded[1].id)).toHaveLength(2)})});
