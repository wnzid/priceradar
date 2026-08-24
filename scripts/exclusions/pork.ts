import type {RawOffer,Store} from "../types.js";

export type PorkEvidenceType="CATEGORY"|"MEAT_TYPE"|"NAME"|"DESCRIPTION"|"INGREDIENTS";
export type PorkSource="rimi-leaflet"|"rimi-eshop"|"maxima-structured"|"maxima-leaflet"|"pipeline";
export interface PorkExclusion{reason:"pork";evidenceType:PorkEvidenceType;evidence:string}
export interface PorkExclusionRecord extends PorkExclusion{store:Store;source:PorkSource;product:string}

type PorkCandidate=Pick<RawOffer,"name"|"description"|"category"|"sourceCategory"|"meatType"|"ingredients">;
const records=new Map<string,PorkExclusionRecord>();
function normalized(value:string){return value.toLocaleLowerCase("lt-LT").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ")}
const explicitPork=(value:string)=>/\bpork\b/.test(value)||/\bkiaul(?:ien[a-z]*|iu|es|e|i|)\b/.test(value);
const nonPorkBacon=(value:string)=>/\b(?:turkey|chicken|beef)\s+bacon\b/.test(value)||/\b(?:kalakutien|vistien|jautien)[a-z]*\s+(?:bekon|bacon)[a-z]*\b/.test(value);
const ordinaryBacon=(value:string)=>/\bbacon\b/.test(value)&&!(/\bbacon\s+style\b/.test(value)||nonPorkBacon(value));

export function detectExcludedPorkProduct(product:PorkCandidate):PorkExclusion|undefined{const fields:[PorkEvidenceType,string|undefined][]=[["CATEGORY",[product.sourceCategory,product.category].filter(Boolean).join(" ")],["MEAT_TYPE",product.meatType],["NAME",product.name],["DESCRIPTION",product.description],["INGREDIENTS",product.ingredients]];for(const[type,raw]of fields){if(!raw)continue;const value=normalized(raw);if(explicitPork(value)||ordinaryBacon(value))return{reason:"pork",evidenceType:type,evidence:raw}}return undefined}
export function isExcludedPorkProduct(product:PorkCandidate){return detectExcludedPorkProduct(product)!=null}
export function retainNonPorkOffer(offer:RawOffer,store:Store,source:PorkSource,diagnose=true){const exclusion=detectExcludedPorkProduct(offer);if(!exclusion)return true;if(diagnose){const key=`${store}|${source}|${offer.externalId??normalized(offer.name)}|${offer.salePrice??""}`;records.set(key,{...exclusion,store,source,product:offer.name})}return false}
export function porkExclusionRecords(){return[...records.values()]}
export function porkExclusionMetrics(){const rows=porkExclusionRecords(),rimi=rows.filter(row=>row.store==="rimi"),maxima=rows.filter(row=>row.store==="maxima");return{total:rows.length,rimi:rimi.length,maxima:maxima.length,breakdown:{rimiLeaflet:rimi.filter(row=>row.source==="rimi-leaflet").length,rimiEshop:rimi.filter(row=>row.source==="rimi-eshop").length,maximaStructured:maxima.filter(row=>row.source==="maxima-structured").length,maximaLeaflet:maxima.filter(row=>row.source==="maxima-leaflet").length,pipeline:rows.filter(row=>row.source==="pipeline").length}}}
export function resetPorkExclusionAudit(){records.clear()}
