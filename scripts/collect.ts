import {mkdir,readFile,writeFile} from "node:fs/promises";
import {buildDeals} from "./build-deals.js";
import {collectBarbora} from "./collectors/barbora.js";
import {collectMaxima} from "./collectors/maxima.js";
import {collectRimi} from "./collectors/rimi.js";
import {generateDealIntelligence} from "./deals/write-ranking.js";
import {isExcludedPorkProduct,porkExclusionMetrics,porkExclusionRecords,resetPorkExclusionAudit,retainNonPorkOffer} from "./exclusions/pork.js";
import {translationStats} from "./translation/translate-product.js";
import type {Store,StoreData} from "./types.js";
import {acceptStoreData} from "./write-data.js";

type CollectorKey=Store|"barbora";
const collectors={rimi:collectRimi,maxima:collectMaxima,barbora:collectBarbora};
const requested=process.argv[2] as CollectorKey|undefined,targets=requested?[requested]:(Object.keys(collectors) as CollectorKey[]),results:Record<string,{status:string;offers:number;error?:string}>={};
resetPorkExclusionAudit();let meaningful=false;
for(const key of targets)try{const data=await collectors[key]();data.offers=data.offers.filter(offer=>retainNonPorkOffer(offer,data.store,"pipeline"));await acceptStoreData(data,key);meaningful=true;results[key]={status:"success",offers:data.offers.length};console.log(`${key}: ${data.offers.length} offers`)}catch(error){const message=error instanceof Error?error.message:String(error);results[key]={status:"failure",offers:0,error:message};console.error(message)}
const exclusions=porkExclusionMetrics(),excludedRows=porkExclusionRecords();
console.log(`EXCLUDED PRODUCTS\nPork total: ${exclusions.total}\n- Rimi: ${exclusions.rimi} (leaflet ${exclusions.breakdown.rimiLeaflet}, e-shop ${exclusions.breakdown.rimiEshop})\n- Maxima: ${exclusions.maxima} (structured ${exclusions.breakdown.maximaStructured}, leaflet ${exclusions.breakdown.maximaLeaflet})\n- Post-enrichment safety boundary: ${exclusions.breakdown.pipeline}`);
for(const row of excludedRows)console.log(`PORK EXCLUDED [${row.store}/${row.source}] ${row.evidenceType}: ${row.product} | ${row.evidence}`);
if(meaningful){const stores=await Promise.all((["rimi","maxima"] as Store[]).map(async key=>JSON.parse(await readFile(`data/current/${key}.json`,"utf8")) as StoreData));try{stores.push(JSON.parse(await readFile("data/current/barbora.json","utf8")) as StoreData)}catch{/* optional source */}for(const data of stores)data.offers=data.offers.filter(offer=>!isExcludedPorkProduct(offer));const deals=buildDeals(stores),now=new Date().toISOString(),translation=translationStats(stores.flatMap(data=>data.offers)),storeEntries=stores.map(data=>{const key=data.offers[0]?.sourcePlatform==="barbora"?"barbora":data.store;return[key,results[key]??{status:"retained",offers:data.offers.length}]});console.log(`TRANSLATION\nOffers: ${translation.totalOffers}\nCanonical English names: ${translation.canonical}\nAutomatically translated: ${translation.automatic}\nUntranslated: ${translation.untranslated}\nEnglish coverage: ${translation.englishCoveragePercent}%`);await generateDealIntelligence(deals,now);await writeFile("data/current/metadata.json",`${JSON.stringify({generatedAt:now,stores:Object.fromEntries(storeEntries),totalOffers:stores.reduce((total,data)=>total+data.offers.length,0),normalizedProducts:deals.length,translation,exclusions:{pork:exclusions}},null,2)}\n`);await mkdir("data/history",{recursive:true});try{await writeFile(`data/history/${now.slice(0,10)}.json`,`${JSON.stringify(deals,null,2)}\n`,{flag:"wx"})}catch(error){if((error as NodeJS.ErrnoException).code!=="EEXIST")throw error}}
if(Object.values(results).every(result=>result.status==="failure"))process.exitCode=1;
