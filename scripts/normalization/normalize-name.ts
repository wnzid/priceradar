const endings = /\b(šviežias|šviežia|šviežios|atšaldyta|atšaldytas|fasuota|fasuotas)\b/g;
export function normalizeName(value: string): string { return value.toLocaleLowerCase("lt-LT").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(endings, "").replace(/[^a-z0-9ąčęėįšųūž]+/gi, " ").trim().replace(/\s+/g, " "); }
export function slugify(value: string): string { return normalizeName(value).replace(/\s/g, "-").slice(0, 80); }
