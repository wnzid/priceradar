import { aliases, type Alias } from "./aliases.js";
import { normalizeName } from "./normalize-name.js";
export function matchProduct(name: string): Alias | undefined { const n = normalizeName(name),tokens=n.split(" "),has=(value:string)=>{const needle=normalizeName(value);return needle.includes(" ")?n.includes(needle):tokens.some(token=>token.startsWith(needle))},groupable=aliases.filter(alias=>alias.groupable!==false); return groupable.find(a => a.aliases.some(x => normalizeName(x) === n)) ?? groupable.find(a => a.required?.every(has) && !a.excluded?.some(has)); }
export function matchExactTranslation(name:string):Alias|undefined{const n=normalizeName(name);return aliases.find(alias=>alias.groupable===false&&alias.aliases.some(source=>normalizeName(source)===n))}
