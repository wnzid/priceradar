import * as cheerio from "cheerio";
import type {AnyNode} from "domhandler";
import {fetchText} from "../http.js";
import {discount,parsePrice} from "../normalization/normalize-price.js";
import {normalizeName} from "../normalization/normalize-name.js";
import {parseQuantity,unitPrice} from "../normalization/normalize-units.js";
import {retainNonPorkOffer} from "../exclusions/pork.js";
import type {RawOffer,StoreData} from "../types.js";
import {buildRimiLeafletAudit,discoverRimiLeafletUrls,mergeRimiSources,parseRimiLeafletViewer,RIMI_LEAFLETS_URL,type RimiEshopProduct,type RimiLeaflet} from "./rimi-leaflet.js";

export const RIMI_URL="https://www.rimi.lt/e-parduotuve/lt/akcijos",RIMI_PAGE_SIZE=100,RIMI_MAX_PAGES=200;
export interface RimiPage{rawCount:number;excludedCount:number;offers:RawOffer[];products:RimiEshopProduct[];productIds:string[];nextPage?:number;rejections:Record<string,number>}
const clean=(value:string)=>value.replace(/\s+/g," ").trim();
const reject=(reasons:Record<string,number>,reason:string)=>{reasons[reason]=(reasons[reason]??0)+1};
function brand(card:cheerio.Cheerio<AnyNode>){const raw=card.find("[data-gtm-eec-product]").first().attr("data-gtm-eec-product")??card.attr("data-gtm-eec-product");if(!raw)return undefined;try{const value=JSON.parse(raw) as{brand?:unknown};return typeof value.brand==="string"&&value.brand.trim()?value.brand.trim():undefined}catch{return undefined}}
function usefulImage(card:cheerio.Cheerio<AnyNode>){const image=card.find(".card__image-wrapper img").first(),source=image.attr("src")??image.attr("data-src");return source?.replace(/h_216,q_1,w_216/,"h_360,q_auto:good,w_360")}
function pageNumber(url:string|undefined){if(!url)return undefined;const value=Number(new URL(url,RIMI_URL).searchParams.get("currentPage"));return Number.isInteger(value)&&value>0?value:undefined}
function priceText(card:cheerio.Cheerio<AnyNode>,selector:string){const field=card.find(selector).first(),accessible=field.find(".sr-only").first().text();return accessible||field.text()}

export function parseRimiPage(html:string,pageUrl:string):RimiPage{
  if(/challenge-error|Just a moment/i.test(html))throw new Error("RIMI e-shop: challenge response; previous data preserved");
  const $=cheerio.load(html),offers:RawOffer[]=[],products:RimiEshopProduct[]=[],productIds:string[]=[],rejections:Record<string,number>={};let rawCount=0;
  $(".product-grid__item").each((_,element)=>{
    rawCount++;
    try{
      const card=$(element),root=card.find("[data-product-code]").first().length?card.find("[data-product-code]").first():card,externalId=root.attr("data-product-code")??root.attr("data-gtms-product-id"),name=clean(card.find(".card__name, h3").first().text());
      if(externalId)productIds.push(externalId);
      if(!externalId||!name){reject(rejections,"missing identity");return}
      const text=clean(card.text()),quantity=parseQuantity(name)??parseQuantity(text),href=card.find("a.card__url[href], a[href]").first().attr("href"),sourceUrl=href?new URL(href,pageUrl).href:pageUrl,imageUrl=usefulImage(card),normal=parsePrice(card.find(".card__price [itemprop='price']").attr("content")??priceText(card,".card__price")),old=parsePrice(priceText(card,".card__old-price, .old-price-tag")),member=card.find(".price-label").first(),loyalty=member.length>0,major=clean(member.find(".major").first().text()),cents=clean(member.find(".cents").first().text()),memberPrice=parsePrice(member.attr("data-price")??(major&&cents?`${major}.${cents}`:priceText(card,".price-label"))),salePrice=loyalty?memberPrice:normal,regularPrice=loyalty?normal:old;
      products.push({externalId,name,brand:brand(card),quantity:quantity?.quantity,unit:quantity?.unit,imageUrl,sourceUrl,onlineAvailable:card.find("form.card__cart-btn, .js-add-to-cart").length>0,currentPrice:salePrice});
      if(salePrice==null||salePrice<=0){reject(rejections,"missing sale price");return}
      if(regularPrice==null||regularPrice<=salePrice){reject(rejections,"no verified discount");return}
      const perText=priceText(card,".card__price-per")||text,perMatch=perText.match(/(\d+[,.]\d{1,2})\s*€?\s*\/\s*(kg|l|vnt\.?)/i);
      offers.push({externalId,name,brand:brand(card),salePrice,regularPrice,discountPercent:discount(salePrice,regularPrice),quantity:quantity?.quantity,unit:quantity?.unit,pricePerUnit:loyalty?unitPrice(salePrice,quantity):parsePrice(perMatch?.[1])??unitPrice(salePrice,quantity),pricePerUnitType:perMatch?(perMatch[2].toLowerCase().startsWith("vnt")?"piece":perMatch[2].toLowerCase() as "kg"|"l"):quantity?.type,imageUrl,sourceUrl,promotionType:loyalty?"LOYALTY":"SALE",sourceType:"web",sourcePlatform:"rimi",channel:"physical",confidence:"HIGH"});
    }catch{reject(rejections,"malformed card")}
  });
  const nextPage=pageNumber($("a[rel='next'][href]").attr("href"));return{rawCount,excludedCount:rawCount-offers.length,offers,products,productIds,nextPage,rejections};
}

const richness=(offer:RawOffer)=>Object.values(offer).filter(value=>value!=null&&value!=="").length;
function mergeOffers(a:RawOffer,b:RawOffer){const leaflet=a.promotionSource==="leaflet"?a:b.promotionSource==="leaflet"?b:undefined,preferred=leaflet??(richness(a)>=richness(b)?a:b),other=preferred===a?b:a,result={...preferred} as Record<string,unknown>;for(const[key,value]of Object.entries(other))if(result[key]==null||result[key]==="")result[key]=value;return result as unknown as RawOffer}
function stableKey(offer:RawOffer){const promotion=offer.promotionSource==="leaflet"?`|promo:${offer.salePrice??""}|${normalizeName(offer.promotionConditions??"")}`:"";if(offer.externalId)return`id:${offer.externalId}${promotion}`;try{const url=new URL(offer.sourceUrl);if(url.pathname.includes("/produktai/"))return`url:${url.pathname}${promotion}`}catch{/* invalid fallback URL */}return`normalized:${normalizeName(offer.name)}|${offer.quantity??""}|${offer.unit??""}${promotion}`}
export function deduplicateRimi(offers:RawOffer[]):RawOffer[]{const unique=new Map<string,RawOffer>();for(const offer of offers){const key=stableKey(offer),previous=unique.get(key);unique.set(key,previous?mergeOffers(previous,offer):offer)}return[...unique.values()].sort((a,b)=>(a.externalId??a.sourceUrl).localeCompare(b.externalId??b.sourceUrl))}

export async function collectRimiPages(fetchPage:(page:number)=>Promise<string>,onProducts?:(products:RimiEshopProduct[])=>void):Promise<RawOffer[]>{
  const all:RawOffer[]=[],seenResponses=new Set<string>();let raw=0,excluded=0,page=1,pages=0;const rejected:Record<string,number>={};
  while(pages<RIMI_MAX_PAGES){
    const result=parseRimiPage(await fetchPage(page),`${RIMI_URL}?currentPage=${page}&pageSize=${RIMI_PAGE_SIZE}`),signature=result.productIds.join("|");
    if(signature&&seenResponses.has(signature)){console.warn(`RIMI repeated page detected at ${page}; stopping safely`);return deduplicateRimi(all)}
    if(signature)seenResponses.add(signature);onProducts?.(result.products);
    const retained=result.offers.filter(offer=>retainNonPorkOffer(offer,"rimi","rimi-eshop"));
    pages++;raw+=result.rawCount;excluded+=result.excludedCount+(result.offers.length-retained.length);all.push(...retained);
    for(const[key,count]of Object.entries(result.rejections))rejected[key]=(rejected[key]??0)+count;
    console.log(`RIMI page ${page}: ${result.offers.length}/${result.rawCount} promoted`);
    if(result.nextPage&&result.nextPage>page){page=result.nextPage;continue}
    if(!result.nextPage&&result.rawCount>=RIMI_PAGE_SIZE){page++;continue}
    const unique=deduplicateRimi(all);
    console.log(`RIMI audit: ${pages} pages, ${raw} raw, ${unique.length} genuine promotions, ${excluded} excluded, ${all.length-unique.length} duplicates removed${Object.keys(rejected).length?`, rejected ${Object.entries(rejected).map(([reason,count])=>`${reason}=${count}`).join(", ")}`:""}`);
    return unique;
  }
  throw new Error(`RIMI pagination exceeded safety limit (${RIMI_MAX_PAGES} pages); previous data preserved`);
}
export async function collectRimi():Promise<StoreData>{console.log("RIMI LEAFLETS AUTHORITATIVE + E-SHOP ENRICHMENT");const products:RimiEshopProduct[]=[],eshopOffers=await collectRimiPages(page=>fetchText(`${RIMI_URL}?currentPage=${page}&pageSize=${RIMI_PAGE_SIZE}`,5),rows=>products.push(...rows));const index=await fetchText(RIMI_LEAFLETS_URL,5),urls=discoverRimiLeafletUrls(index),leaflets:RimiLeaflet[]=[];for(const url of urls){try{const parsed=parseRimiLeafletViewer(await fetchText(url,5),url);if(parsed)leaflets.push(parsed)}catch(error){console.warn(`RIMI leaflet failure ${url}: ${error instanceof Error?error.message:String(error)}`)}}const audit=buildRimiLeafletAudit(leaflets),merged=mergeRimiSources(audit.offers,eshopOffers,products),offers=deduplicateRimi(merged.offers),coverage=audit.detectedBlocks?((audit.parsedBlocks/audit.detectedBlocks)*100).toFixed(1):"0.0";console.log(`RIMI LEAFLET COVERAGE\nActive leaflets: ${audit.activeLeaflets}\nPages processed: ${audit.pages}\nDetected offer blocks: ${audit.detectedBlocks}\nSuccessfully parsed blocks: ${audit.parsedBlocks}\nValid records before source merge: ${audit.validOffers}\nRejected blocks: ${audit.rejected}\nParse coverage: ${coverage}%\nRejections: ${Object.entries(audit.rejections).map(([reason,count])=>`${reason}=${count}`).join(", ")||"none"}\nMatched to e-shop: ${merged.matched}\nUnmatched leaflet offers: ${merged.unmatched}\nE-shop-only promotions: ${merged.eshopOnly}\nPrice conflicts: ${merged.priceConflicts}\nFinal deduplicated Rimi offers: ${offers.length}`);return{store:"rimi",collectedAt:new Date().toISOString(),source:RIMI_LEAFLETS_URL,offers}}
