import {describe,expect,it} from "vitest";
import {scoreCandidate} from "../scripts/normalization/candidate-matches.js";
import type {CandidateOffer} from "../scripts/normalization/candidate-matches.js";

const offer=(store:"rimi"|"maxima",name:string,unit:"kg"|"l"|"piece"="kg"):CandidateOffer=>({store,name,sourceUrl:"x",pricePerUnit:1,pricePerUnitType:unit});

describe("cross-store candidate scoring",()=>{
  it("ranks shared Lithuanian product evidence",()=>expect(scoreCandidate(offer("rimi","Vytintas BAJORŲ kumpis"),offer("maxima","KREKENAVOS vytintas BAJORŲ kumpis")).confidence).toBe("HIGH"));
  it("rejects preparation conflicts",()=>{
    expect(scoreCandidate(offer("rimi","Šviežia atlantinių lašišų filė"),offer("maxima","Šaldyta atlantinių lašišų filė")).warnings).toContain("preparation mismatch: fresh != frozen");
    expect(scoreCandidate(offer("rimi","Šviežia vištienos krūtinėlė"),offer("maxima","Marinuota vištienos krūtinėlė")).warnings).toContain("preparation mismatch: fresh != marinated");
  });
  it("rejects product subtype conflicts",()=>{
    expect(scoreCandidate(offer("rimi","Šviežia vištienos krūtinėlė"),offer("maxima","Šviežia vištienos šlaunelė")).warnings).toContain("product subtype mismatch: breast != thigh");
    expect(scoreCandidate(offer("rimi","Lašišos filė"),offer("maxima","Menkės filė")).warnings).toContain("product subtype mismatch: salmon != cod");
  });
  it("rejects brand-sensitive category overlap",()=>expect(scoreCandidate(offer("rimi","FAZER GEISHA saldainiai"),offer("maxima","ROSHEN CANDY NUT saldainiai")).warnings).toContain("brand-sensitive product identity mismatch"));
  it("rejects fat and unit conflicts",()=>{
    expect(scoreCandidate(offer("rimi","Pienas 2,5 % riebumo","l"),offer("maxima","Pienas 3,5 % riebumo","l")).warnings).toContain("fat percentage mismatch: 2.5% != 3.5%");
    expect(scoreCandidate(offer("rimi","Aliejus","l"),offer("maxima","Aliejus","kg")).warnings[0]).toMatch(/unit mismatch/);
  });
});
