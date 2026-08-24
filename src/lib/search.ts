import type {Deal} from "../types/index.js";
export function matchesDealQuery(deal:Deal,query:string){const needle=query.toLocaleLowerCase("lt-LT").trim();if(!needle)return true;return[deal.name,...deal.aliases,...deal.offers.flatMap(offer=>[offer.displayName??"",offer.sourceName,offer.brand??""])].join(" ").toLocaleLowerCase("lt-LT").includes(needle)}
