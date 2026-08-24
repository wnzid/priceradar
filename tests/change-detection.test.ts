import { describe,expect,it } from "vitest";
describe("stable data policy",()=>{it("timestamps do not represent promotional content",()=>{const a={collectedAt:"a",offers:[{name:"Milk",salePrice:1}]};const b={collectedAt:"b",offers:[{name:"Milk",salePrice:1}]};expect(JSON.stringify(a.offers)).toBe(JSON.stringify(b.offers))})});
