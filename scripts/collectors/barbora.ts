import * as cheerio from "cheerio";
import type {AnyNode} from "domhandler";
import {fetchText} from "../http.js";
import {discount,parsePrice} from "../normalization/normalize-price.js";
import {parseQuantity,unitPrice} from "../normalization/normalize-units.js";
import type {RawOffer,StoreData} from "../types.js";

export const BARBORA_ACIU_URL="https://barbora.lt/aciu-akcijos";
export interface BarboraPage{page:number;lastPage:number;rawCount:number;offers:RawOffer[]}
const clean=(value:string)=>value.replace(/\s+/g," ").trim();
const firstText=($card:cheerio.Cheerio<AnyNode>,selectors:string)=>clean($card.find(selectors).first().text());

export function parseBarboraPage(html:string,pageUrl:string,page=1):BarboraPage{
 if(/cf-chl-|challenge-error-text|Just a moment/i.test(html))throw new Error("BARBORA: Cloudflare challenge received; previous online data preserved");
 const $=cheerio.load(html),cards=$(".b-product--wrap2, .b-product--wrap, [data-product-id].b-product"),offers:RawOffer[]=[];
 cards.each((_,element)=>{
  const card=$(element),link=card.find("a.b-product-title, a.b-link--product-info, a[href*='/produktai/']").first(),href=link.attr("href"),sourceUrl=href?new URL(href,pageUrl).href:pageUrl;
  const name=clean(link.find("span").first().text()||link.text()||firstText(card,".b-product-title")),salePrice=parsePrice(firstText(card,".b-product-price-current-number, .b-product-price-current")),regularPrice=parsePrice(firstText(card,".b-product-crossed-out-price, del"));
  const badge=firstText(card,".b-product-promo-label, .b-product--badge, .b-product-discount, [class*='promotion']"),campaignEvidence=regularPrice!=null||/AČIŪ|ACIU|%|\buž\b|nuolaid/i.test(`${badge} ${card.attr("class")??""}`);
  if(!name||salePrice==null||!campaignEvidence||regularPrice!=null&&salePrice>=regularPrice)return;
  const rawId=card.attr("data-product-id")??card.attr("data-b-for-cart")??card.find("[data-product-id]").attr("data-product-id"),externalId=rawId?.match(/[A-Za-z0-9_-]{3,}/)?.[0]??new URL(sourceUrl).pathname.split("/").filter(Boolean).at(-1);if(!externalId)return;
  const unitText=firstText(card,".b-product-price--extra, .b-product-price-extra"),per=unitText.match(/(\d+[,.]\d+)\s*€?\s*\/\s*(kg|l|vnt)/i),q=parseQuantity(name),pricePerUnit=parsePrice(per?.[1])??unitPrice(salePrice,q),pricePerUnitType=per?(per[2].toLowerCase()==="vnt"?"piece":per[2].toLowerCase() as "kg"|"l"):q?.type;
  offers.push({externalId:`barbora-${externalId}`,name,brand:card.attr("data-brand")||undefined,salePrice,loyaltyPrice:salePrice,regularPrice,discountPercent:discount(salePrice,regularPrice),quantity:q?.quantity,unit:q?.unit,pricePerUnit,pricePerUnitType,imageUrl:card.find("img").first().attr("data-src")??card.find("img").first().attr("src"),sourceUrl,promotionType:"LOYALTY",sourceType:"web",sourcePlatform:"barbora",channel:"online",campaignId:"aciu-akcijos",confidence:"HIGH",page});
 });
 const pages=$(".pagination a[href], a[href*='page=']").map((_,a)=>Number(new URL($(a).attr("href")!,pageUrl).searchParams.get("page"))).get().filter(Number.isFinite),lastPage=Math.max(page,...pages);
 return{page,lastPage,rawCount:cards.length,offers};
}
export function deduplicateBarbora(offers:RawOffer[]):RawOffer[]{const map=new Map<string,RawOffer>();for(const offer of offers)map.set(`${offer.sourcePlatform}|${offer.channel}|${offer.externalId}`,offer);return[...map.values()].sort((a,b)=>(a.externalId??"").localeCompare(b.externalId??""))}
export async function collectBarboraPages(fetchPage:(page:number)=>Promise<string>):Promise<RawOffer[]>{const all:RawOffer[]=[];let raw=0,requests=0,lastPage=1;for(let page=1;page<=lastPage;page++){const parsed=parseBarboraPage(await fetchPage(page),`${BARBORA_ACIU_URL}?page=${page}`,page);requests++;raw+=parsed.rawCount;lastPage=parsed.lastPage;all.push(...parsed.offers);console.log(`BARBORA page ${page}/${lastPage}: ${parsed.offers.length}/${parsed.rawCount} promotional`);if(page>=200)throw new Error("BARBORA: pagination safety limit reached")}const offers=deduplicateBarbora(all);console.log(`BARBORA ONLINE: ${requests} request(s), ${raw} raw products, ${offers.length} accepted promotions`);return offers}
export async function collectBarbora():Promise<StoreData>{console.log("BARBORA ONLINE\nPromotion source: public AČIŪ campaign pages");const offers=await collectBarboraPages(page=>fetchText(`${BARBORA_ACIU_URL}?page=${page}`));if(!offers.length)throw new Error("BARBORA: zero AČIŪ promotions; previous online data preserved");return{store:"maxima",collectedAt:new Date().toISOString(),source:BARBORA_ACIU_URL,offers}}
