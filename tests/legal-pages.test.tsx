import {readFileSync} from "node:fs";
import {renderToStaticMarkup} from "react-dom/server";
import {MemoryRouter} from "react-router-dom";
import {describe,expect,it} from "vitest";
import {RetailerSourceLink} from "../src/components/RetailerSourceLink.js";
import {SiteFooter} from "../src/components/SiteFooter.js";
import {Contact} from "../src/pages/Contact.js";
import {Legal} from "../src/pages/Legal.js";
import {Privacy} from "../src/pages/Privacy.js";
import type {Offer} from "../src/types/index.js";

const render=(node:React.ReactNode)=>renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
describe("footer and information pages",()=>{
  it("renders a compact footer with all information routes",()=>{const html=render(<SiteFooter/>);expect(html).toContain("independent price-comparison service");expect(html).toContain('href="/legal"');expect(html).toContain('href="/privacy"');expect(html).toContain('href="/contact"')});
  it("renders legal disclosures",()=>{const html=render(<Legal/>);expect(html).toContain("Legal &amp; Disclaimer");expect(html).toContain("not affiliated with");expect(html).toContain("does not guarantee real-time accuracy");expect(html).toContain("Lowest observed");expect(html).toContain("Rights-holder requests")});
  it("describes actual local-only shopping-list persistence",()=>{const html=render(<Privacy/>);expect(html).toContain("stored locally in your browser");expect(html).toContain("not uploaded to PriceRadar servers");expect(html).toContain("does not currently integrate an analytics service");expect(html).toContain("does not set application cookies")});
  it("renders contact guidance with email and GitHub links",()=>{const html=render(<Contact/>);expect(html).toContain("Data correction");expect(html).toContain("Rights-holder request");expect(html).toContain('href="mailto:anthone2548@gmail.com"');expect(html).toContain('href="https://github.com/wnzid/"');expect(html).toContain('rel="noopener noreferrer"')});
  it("keeps the mobile footer stacked",()=>{const css=readFileSync("src/styles.css","utf8");expect(css).toMatch(/@media\(max-width:700px\).*?\.site-footer\{[^}]*grid-template-columns:1fr/s)});
});
describe("retailer source links",()=>{const offer={store:"rimi",sourceName:"Rimi",sourceUrl:"https://www.rimi.lt/product/1"} as Offer;
  it("links safely to the retailer source",()=>{const html=render(<RetailerSourceLink offer={offer} productName="Milk"/>);expect(html).toContain('target="_blank"');expect(html).toContain('rel="noopener noreferrer"');expect(html).toContain("View at RIMI")});
  it("renders nothing when a source URL is unavailable",()=>expect(render(<RetailerSourceLink offer={{...offer,sourceUrl:""}} productName="Milk"/>)).toBe(""));
});
