import type { Offer } from "../types/index.js";
export const stores={maxima:{label:"MAXIMA",color:"#e3222b"},rimi:{label:"RIMI",color:"#e4222d"}};
export function offerLabel(o:Offer){return o.store==="maxima"&&o.channel==="online"?"MAXIMA ONLINE":stores[o.store].label}
export function price(o:Offer){const value=o.pricePerUnit??o.salePrice; return value==null?"Price unavailable":`€${value.toFixed(2)}${o.pricePerUnitType?`/${o.pricePerUnitType}`:""}`}
export function dateLabel(v?:string){return v?new Intl.DateTimeFormat("en",{month:"short",day:"numeric",timeZone:"Europe/Vilnius"}).format(new Date(`${v}T12:00:00Z`)):"While stocks last"}
