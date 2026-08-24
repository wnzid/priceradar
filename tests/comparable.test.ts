import {describe,expect,it} from "vitest";
import {comparableOffers} from "../src/lib/comparable.js";
import type {Offer} from "../src/types/index.js";

const offer=(store:"rimi"|"maxima",unit:"kg"|"l",price:number):Offer=>({store,sourceName:"Product",sourceUrl:"x",pricePerUnit:price,pricePerUnitType:unit});

describe("price comparison safety",()=>{
  it("does not produce a cheapest comparison across incompatible units",()=>expect(comparableOffers([offer("rimi","kg",2),offer("maxima","l",1)])).toHaveLength(1));
});
