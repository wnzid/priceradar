import type {DisplayNameSource} from "../types.js";
export interface TranslationResult{displayName:string;source:DisplayNameSource;confidence:number;unknownTokens:string[];category?:string;canonicalProductId?:string}
