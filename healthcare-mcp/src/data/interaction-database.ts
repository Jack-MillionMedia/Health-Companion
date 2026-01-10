/**
 * Drug Interaction Database v2.0.0
 * 
 * Evidence-based drug-drug interaction data curated from:
 * - FDA Drug Labels and Safety Communications
 * - CredibleMeds QT Drug Lists
 * - ISMP High-Alert Medication Guidelines
 * - Clinical Pharmacology References (Micromedex, Lexicomp)
 * - Peer-reviewed literature
 * 
 * Structure modeled after DrugBank API for future compatibility.
 * 
 * @version 2.0.0
 * @lastUpdated 2026-01-10
 */

// ============================================================================
// DATABASE VERSION
// ============================================================================

export const INTERACTION_DB_VERSION = "2.0.0";
export const INTERACTION_DB_LAST_UPDATED = "2026-01-10";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type SeverityLevel = "contraindicated" | "major" | "moderate" | "minor";
export type EvidenceLevel = "established" | "probable" | "suspected" | "possible";
export type MechanismType = "pharmacodynamic" | "pharmacokinetic" | "both" | "unknown";
export type InteractionEffect = 
  | "increased_toxicity"
  | "increased_bleeding"
  | "decreased_efficacy"
  | "qt_prolongation"
  | "serotonin_syndrome"
  | "respiratory_depression"
  | "hypotension"
  | "hyperkalemia"
  | "hypokalemia"
  | "nephrotoxicity"
  | "hepatotoxicity"
  | "cns_depression"
  | "myopathy"
  | "seizure_risk"
  | "arrhythmia"
  | "hypoglycemia"
  | "other";

export interface DrugInteractionEntry {
  /** Primary drug or drug class */
  drug: string;
  /** Interacting drug or drug class */
  interactsWith: string;
  /** Severity level */
  severity: SeverityLevel;
  /** Evidence level */
  evidence: EvidenceLevel;
  /** Type of mechanism */
  mechanism: MechanismType;
  /** Primary effect of interaction */
  effect: InteractionEffect;
  /** Clinical description */
  description: string;
  /** Mechanism explanation */
  mechanismDetail: string;
  /** Management recommendation */
  management: string;
  /** Whether monitoring is required */
  monitoringRequired: boolean;
  /** Specific parameters to monitor */
  monitoringParameters?: string[];
  /** Source citations */
  sources: string[];
}

// ============================================================================
// DRUG CLASS DEFINITIONS
// ============================================================================

/** SSRIs - Selective Serotonin Reuptake Inhibitors */
export const SSRI_DRUGS = [
  "sertraline", "zoloft",
  "fluoxetine", "prozac",
  "paroxetine", "paxil",
  "citalopram", "celexa",
  "escitalopram", "lexapro",
  "fluvoxamine", "luvox",
] as const;

/** SNRIs - Serotonin-Norepinephrine Reuptake Inhibitors */
export const SNRI_DRUGS = [
  "venlafaxine", "effexor",
  "duloxetine", "cymbalta",
  "desvenlafaxine", "pristiq",
  "levomilnacipran", "fetzima",
  "milnacipran", "savella",
] as const;

/** MAOIs - Monoamine Oxidase Inhibitors */
export const MAOI_DRUGS = [
  "phenelzine", "nardil",
  "tranylcypromine", "parnate",
  "isocarboxazid", "marplan",
  "selegiline", "emsam", "eldepryl",
  "rasagiline", "azilect",
  "linezolid", "zyvox", // Antibiotic with MAOI activity
  "methylene blue",
] as const;

/** NSAIDs - Nonsteroidal Anti-inflammatory Drugs */
export const NSAID_DRUGS = [
  "ibuprofen", "advil", "motrin",
  "naproxen", "aleve", "naprosyn",
  "aspirin",
  "diclofenac", "voltaren",
  "meloxicam", "mobic",
  "celecoxib", "celebrex",
  "indomethacin", "indocin",
  "ketorolac", "toradol",
  "piroxicam", "feldene",
  "nabumetone", "relafen",
] as const;

/** ACE Inhibitors */
export const ACE_INHIBITORS = [
  "lisinopril", "zestril", "prinivil",
  "enalapril", "vasotec",
  "ramipril", "altace",
  "benazepril", "lotensin",
  "captopril", "capoten",
  "fosinopril", "monopril",
  "quinapril", "accupril",
  "perindopril", "aceon",
  "trandolapril", "mavik",
] as const;

/** ARBs - Angiotensin Receptor Blockers */
export const ARB_DRUGS = [
  "losartan", "cozaar",
  "valsartan", "diovan",
  "irbesartan", "avapro",
  "olmesartan", "benicar",
  "telmisartan", "micardis",
  "candesartan", "atacand",
  "azilsartan", "edarbi",
] as const;

/** Potassium-Sparing Diuretics */
export const K_SPARING_DIURETICS = [
  "spironolactone", "aldactone",
  "eplerenone", "inspra",
  "amiloride", "midamor",
  "triamterene", "dyrenium",
] as const;

/** Statins */
export const STATIN_DRUGS = [
  "simvastatin", "zocor",
  "atorvastatin", "lipitor",
  "rosuvastatin", "crestor",
  "pravastatin", "pravachol",
  "lovastatin", "mevacor", "altoprev",
  "fluvastatin", "lescol",
  "pitavastatin", "livalo",
] as const;

/** Opioids */
export const OPIOID_DRUGS = [
  "morphine", "ms contin",
  "oxycodone", "oxycontin", "percocet",
  "hydrocodone", "vicodin", "norco",
  "fentanyl", "duragesic", "sublimaze",
  "hydromorphone", "dilaudid",
  "methadone", "dolophine",
  "tramadol", "ultram",
  "codeine",
  "meperidine", "demerol",
  "buprenorphine", "subutex", "suboxone",
  "tapentadol", "nucynta",
] as const;

/** Benzodiazepines */
export const BENZODIAZEPINE_DRUGS = [
  "alprazolam", "xanax",
  "lorazepam", "ativan",
  "diazepam", "valium",
  "clonazepam", "klonopin",
  "temazepam", "restoril",
  "triazolam", "halcion",
  "midazolam", "versed",
  "oxazepam", "serax",
  "chlordiazepoxide", "librium",
] as const;

/** QT-Prolonging Drugs (Known Risk - CredibleMeds) */
export const QT_PROLONGING_DRUGS = [
  // Antiarrhythmics
  "amiodarone", "cordarone", "pacerone",
  "sotalol", "betapace",
  "dofetilide", "tikosyn",
  "dronedarone", "multaq",
  "quinidine",
  "procainamide",
  // Antipsychotics
  "haloperidol", "haldol",
  "ziprasidone", "geodon",
  "thioridazine",
  "droperidol",
  "chlorpromazine", "thorazine",
  "pimozide", "orap",
  // Antibiotics
  "erythromycin",
  "clarithromycin", "biaxin",
  "azithromycin", "zithromax", "z-pak",
  "moxifloxacin", "avelox",
  "levofloxacin", "levaquin",
  "ciprofloxacin", "cipro",
  // Antifungals
  "fluconazole", "diflucan",
  "ketoconazole",
  // Antiemetics
  "ondansetron", "zofran",
  "metoclopramide", "reglan",
  // Antidepressants
  "citalopram", "celexa",
  "escitalopram", "lexapro",
  // Others
  "methadone",
  "hydroxychloroquine", "plaquenil",
  "chloroquine",
] as const;

/** CYP3A4 Inhibitors (Strong) */
export const CYP3A4_INHIBITORS = [
  "ketoconazole", "nizoral",
  "itraconazole", "sporanox",
  "clarithromycin", "biaxin",
  "erythromycin",
  "ritonavir", "norvir",
  "nelfinavir",
  "indinavir",
  "cobicistat",
  "grapefruit",
  "nefazodone",
] as const;

/** CYP3A4 Inducers (Strong) */
export const CYP3A4_INDUCERS = [
  "rifampin", "rifampicin", "rifadin",
  "phenytoin", "dilantin",
  "carbamazepine", "tegretol",
  "phenobarbital",
  "st john's wort", "st. john's wort",
] as const;

/** Anticoagulants */
export const ANTICOAGULANT_DRUGS = [
  "warfarin", "coumadin", "jantoven",
  "apixaban", "eliquis",
  "rivaroxaban", "xarelto",
  "dabigatran", "pradaxa",
  "edoxaban", "savaysa",
  "heparin",
  "enoxaparin", "lovenox",
] as const;

/** Antiplatelet Drugs */
export const ANTIPLATELET_DRUGS = [
  "aspirin",
  "clopidogrel", "plavix",
  "prasugrel", "effient",
  "ticagrelor", "brilinta",
  "dipyridamole", "persantine",
] as const;

/** Triptans (Migraine) */
export const TRIPTAN_DRUGS = [
  "sumatriptan", "imitrex",
  "rizatriptan", "maxalt",
  "zolmitriptan", "zomig",
  "eletriptan", "relpax",
  "naratriptan", "amerge",
  "almotriptan", "axert",
  "frovatriptan", "frova",
] as const;

/** PDE5 Inhibitors */
export const PDE5_INHIBITORS = [
  "sildenafil", "viagra", "revatio",
  "tadalafil", "cialis", "adcirca",
  "vardenafil", "levitra", "staxyn",
  "avanafil", "stendra",
] as const;

/** Nitrates */
export const NITRATE_DRUGS = [
  "nitroglycerin", "nitrostat", "nitro-dur",
  "isosorbide mononitrate", "imdur",
  "isosorbide dinitrate", "isordil",
  "amyl nitrite",
] as const;

/** Proton Pump Inhibitors */
export const PPI_DRUGS = [
  "omeprazole", "prilosec",
  "esomeprazole", "nexium",
  "lansoprazole", "prevacid",
  "pantoprazole", "protonix",
  "rabeprazole", "aciphex",
  "dexlansoprazole", "dexilant",
] as const;

/** Thyroid Medications */
export const THYROID_DRUGS = [
  "levothyroxine", "synthroid", "levoxyl", "tirosint",
  "liothyronine", "cytomel",
] as const;

// ============================================================================
// INTERACTION DATABASE
// ============================================================================

export const DRUG_INTERACTIONS: DrugInteractionEntry[] = [
  // ===========================================================================
  // CONTRAINDICATED COMBINATIONS (Do Not Use Together)
  // ===========================================================================
  
  // 1. MAOIs + SSRIs/SNRIs - Serotonin Syndrome
  {
    drug: "maoi",
    interactsWith: "ssri",
    severity: "contraindicated",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "serotonin_syndrome",
    description: "Concurrent use causes severe serotonin syndrome - potentially fatal. Requires 14-day washout between drugs (5 weeks for fluoxetine).",
    mechanismDetail: "MAOIs prevent serotonin breakdown while SSRIs block reuptake, causing dangerous serotonin accumulation in CNS.",
    management: "CONTRAINDICATED. Do not use together. Wait 14 days after stopping MAOI before starting SSRI. Wait 14 days after stopping SSRI (5 weeks for fluoxetine) before starting MAOI.",
    monitoringRequired: false,
    sources: ["FDA Drug Safety Communication", "Sternbach H. Am J Psychiatry 1991"],
  },
  
  // 2. MAOIs + SNRIs - Serotonin Syndrome
  {
    drug: "maoi",
    interactsWith: "snri",
    severity: "contraindicated",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "serotonin_syndrome",
    description: "Concurrent use causes severe serotonin syndrome - potentially fatal.",
    mechanismDetail: "Both drug classes increase serotonergic activity through different mechanisms, causing dangerous accumulation.",
    management: "CONTRAINDICATED. Do not use together. Minimum 14-day washout required between drugs.",
    monitoringRequired: false,
    sources: ["FDA Drug Safety Communication"],
  },
  
  // 3. MAOIs + Meperidine - Fatal Interaction
  {
    drug: "maoi",
    interactsWith: "meperidine",
    severity: "contraindicated",
    evidence: "established",
    mechanism: "both",
    effect: "serotonin_syndrome",
    description: "Can cause fatal serotonin syndrome, hyperpyrexia, and cardiovascular collapse. One of the most dangerous drug combinations.",
    mechanismDetail: "Meperidine has significant serotonin reuptake inhibition. Combined with MAO inhibition, causes severe serotonin toxicity.",
    management: "CONTRAINDICATED. Never use together. Use alternative opioids (morphine, hydromorphone) if analgesia needed.",
    monitoringRequired: false,
    sources: ["Gillman PK. Br J Pharmacol 2005", "FDA Label Meperidine"],
  },
  
  // 4. PDE5 Inhibitors + Nitrates - Severe Hypotension
  {
    drug: "pde5_inhibitor",
    interactsWith: "nitrate",
    severity: "contraindicated",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "hypotension",
    description: "Combination causes severe, potentially fatal hypotension. Do not use within 24-48 hours of each other.",
    mechanismDetail: "Both drugs cause vasodilation via cGMP pathway. Synergistic effect leads to profound blood pressure drop.",
    management: "CONTRAINDICATED. Do not use nitrates within 24h of sildenafil/vardenafil or 48h of tadalafil. Educate patients about nitrate sources.",
    monitoringRequired: false,
    sources: ["FDA Label Viagra", "ACC/AHA Guidelines"],
  },
  
  // 5. Linezolid + Serotonergic Drugs
  {
    drug: "linezolid",
    interactsWith: "ssri",
    severity: "contraindicated",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "serotonin_syndrome",
    description: "Linezolid is a reversible MAOI. Combination with SSRIs causes serotonin syndrome.",
    mechanismDetail: "Linezolid's MAO-A inhibition combined with SSRI's serotonin reuptake inhibition causes serotonin accumulation.",
    management: "CONTRAINDICATED unless no alternatives. If must use, stop SSRI and monitor closely. Consider alternative antibiotics.",
    monitoringRequired: true,
    monitoringParameters: ["Mental status", "Vital signs", "Neuromuscular function"],
    sources: ["FDA Safety Alert 2011", "Lawrence KR et al. Clin Infect Dis 2006"],
  },
  
  // ===========================================================================
  // MAJOR INTERACTIONS - FDA BLACK BOX WARNINGS
  // ===========================================================================
  
  // 6. Opioids + Benzodiazepines - FDA Black Box Warning
  {
    drug: "opioid",
    interactsWith: "benzodiazepine",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "respiratory_depression",
    description: "FDA BLACK BOX WARNING: Concurrent use increases risk of profound sedation, respiratory depression, coma, and death.",
    mechanismDetail: "Both classes depress CNS and respiratory drive. Effects are synergistic, not merely additive.",
    management: "Avoid concurrent use if possible. If necessary, use lowest effective doses and shortest duration. Counsel patients on risks. Consider prescribing naloxone.",
    monitoringRequired: true,
    monitoringParameters: ["Respiratory rate", "Oxygen saturation", "Level of sedation"],
    sources: ["FDA Drug Safety Communication 2016", "FDA Black Box Warning"],
  },
  
  // 7. Opioids + Other CNS Depressants
  {
    drug: "opioid",
    interactsWith: "alcohol",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "respiratory_depression",
    description: "Combination significantly increases risk of respiratory depression, overdose, and death.",
    mechanismDetail: "Additive CNS and respiratory depression effects.",
    management: "Avoid alcohol during opioid therapy. Counsel patients extensively about risks.",
    monitoringRequired: true,
    monitoringParameters: ["Respiratory rate", "Mental status"],
    sources: ["FDA Drug Safety Communication"],
  },
  
  // ===========================================================================
  // MAJOR INTERACTIONS - QT PROLONGATION / CARDIAC
  // ===========================================================================
  
  // 8. Amiodarone + Other QT Prolonging Drugs
  {
    drug: "amiodarone",
    interactsWith: "qt_prolonging_drug",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "qt_prolongation",
    description: "Additive QT prolongation increases risk of Torsades de Pointes, a potentially fatal arrhythmia.",
    mechanismDetail: "Multiple drugs blocking cardiac potassium channels cause additive QT interval prolongation.",
    management: "Avoid combination if possible. If necessary, obtain baseline ECG, monitor QTc closely, correct electrolytes, avoid other QT-prolonging factors.",
    monitoringRequired: true,
    monitoringParameters: ["ECG/QTc interval", "Potassium", "Magnesium"],
    sources: ["CredibleMeds.org", "Tisdale JE. Drug Saf 2016"],
  },
  
  // 9. Citalopram + QT Prolonging Drugs
  {
    drug: "citalopram",
    interactsWith: "qt_prolonging_drug",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "qt_prolongation",
    description: "Citalopram causes dose-dependent QT prolongation. Max dose 40mg (20mg in elderly). Risk increased with other QT drugs.",
    mechanismDetail: "Citalopram blocks hERG potassium channels. Effect is dose-dependent and additive with other QT-prolonging drugs.",
    management: "Limit citalopram to 40mg/day (20mg if >60 years old). Avoid other QT-prolonging drugs. Monitor ECG if combination necessary.",
    monitoringRequired: true,
    monitoringParameters: ["ECG/QTc interval", "Heart rate"],
    sources: ["FDA Drug Safety Communication 2012", "CredibleMeds.org"],
  },
  
  // 10. Fluoroquinolones + QT Prolonging Drugs
  {
    drug: "fluoroquinolone",
    interactsWith: "amiodarone",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "qt_prolongation",
    description: "Both drug classes prolong QT interval. Combination significantly increases risk of Torsades de Pointes.",
    mechanismDetail: "Additive blockade of cardiac potassium channels leading to delayed repolarization.",
    management: "Use alternative antibiotic if possible. If necessary, monitor ECG and electrolytes closely.",
    monitoringRequired: true,
    monitoringParameters: ["ECG/QTc interval", "Potassium", "Magnesium"],
    sources: ["FDA Label", "CredibleMeds.org"],
  },
  
  // ===========================================================================
  // MAJOR INTERACTIONS - SEROTONIN SYNDROME
  // ===========================================================================
  
  // 11. SSRIs + Tramadol
  {
    drug: "ssri",
    interactsWith: "tramadol",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "serotonin_syndrome",
    description: "Tramadol inhibits serotonin reuptake. Combined with SSRIs increases risk of serotonin syndrome and lowers seizure threshold.",
    mechanismDetail: "Both drugs increase serotonergic activity. Tramadol also lowers seizure threshold, which SSRIs can potentiate.",
    management: "Avoid if possible. If necessary, use lowest effective doses and monitor for serotonin syndrome symptoms (agitation, hyperthermia, tremor, hyperreflexia).",
    monitoringRequired: true,
    monitoringParameters: ["Mental status", "Temperature", "Neuromuscular status"],
    sources: ["FDA Safety Communication 2016", "Beakley BD et al. Am J Emerg Med 2015"],
  },
  
  // 12. SSRIs + Triptans
  {
    drug: "ssri",
    interactsWith: "triptan",
    severity: "major",
    evidence: "probable",
    mechanism: "pharmacodynamic",
    effect: "serotonin_syndrome",
    description: "Triptans are serotonin agonists. Combined with SSRIs may increase risk of serotonin syndrome.",
    mechanismDetail: "Triptans stimulate 5-HT1 receptors while SSRIs increase synaptic serotonin, potentially causing serotonin syndrome.",
    management: "Use with caution. Many patients use this combination safely, but monitor for serotonin syndrome. Consider lower triptan doses.",
    monitoringRequired: true,
    monitoringParameters: ["Serotonin syndrome symptoms"],
    sources: ["FDA Safety Alert 2006", "Evans RW. Headache 2007"],
  },
  
  // 13. SSRIs + SNRIs (Duplicate serotonergic)
  {
    drug: "ssri",
    interactsWith: "snri",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "serotonin_syndrome",
    description: "Both drug classes increase serotonin. Concurrent use significantly increases serotonin syndrome risk.",
    mechanismDetail: "Redundant serotonin reuptake inhibition leads to excessive serotonergic activity.",
    management: "Generally avoid. If switching between drugs, appropriate washout period required.",
    monitoringRequired: true,
    monitoringParameters: ["Serotonin syndrome symptoms"],
    sources: ["Clinical practice guidelines"],
  },
  
  // 14. SSRIs + Dextromethorphan
  {
    drug: "ssri",
    interactsWith: "dextromethorphan",
    severity: "major",
    evidence: "probable",
    mechanism: "both",
    effect: "serotonin_syndrome",
    description: "Dextromethorphan has serotonergic activity. OTC cough medicines may precipitate serotonin syndrome with SSRIs.",
    mechanismDetail: "DXM inhibits serotonin reuptake and is also metabolized by CYP2D6, which some SSRIs inhibit, raising DXM levels.",
    management: "Advise patients on SSRIs to avoid dextromethorphan-containing products. Use alternative cough suppressants.",
    monitoringRequired: false,
    sources: ["Schwartz AR et al. N Engl J Med 2008"],
  },
  
  // ===========================================================================
  // MAJOR INTERACTIONS - BLEEDING RISK
  // ===========================================================================
  
  // 15. Warfarin + NSAIDs
  {
    drug: "warfarin",
    interactsWith: "nsaid",
    severity: "major",
    evidence: "established",
    mechanism: "both",
    effect: "increased_bleeding",
    description: "NSAIDs increase bleeding risk through antiplatelet effects and GI mucosal damage. Some NSAIDs also increase warfarin levels.",
    mechanismDetail: "NSAIDs inhibit COX-1 (platelet function), damage GI mucosa, and some (particularly azapropazone) displace warfarin from protein binding.",
    management: "Avoid if possible. Use acetaminophen for pain. If NSAID necessary, use lowest dose, shortest duration, add PPI for GI protection, monitor INR closely.",
    monitoringRequired: true,
    monitoringParameters: ["INR", "Signs of bleeding", "Hemoglobin"],
    sources: ["AAFP Clinical Guidelines", "Holbrook AM et al. Arch Intern Med 2005"],
  },
  
  // 16. Warfarin + Aspirin
  {
    drug: "warfarin",
    interactsWith: "aspirin",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "increased_bleeding",
    description: "Aspirin's antiplatelet effect combined with warfarin's anticoagulation significantly increases bleeding risk.",
    mechanismDetail: "Aspirin irreversibly inhibits platelet COX-1, adding antiplatelet effect to warfarin's anticoagulation.",
    management: "Avoid unless specifically indicated (mechanical heart valve, recent ACS). If used, ensure INR target is appropriate, add PPI, monitor closely.",
    monitoringRequired: true,
    monitoringParameters: ["INR", "Signs of bleeding"],
    sources: ["CHEST Guidelines", "Hart RG et al. Ann Intern Med 2007"],
  },
  
  // 17. Warfarin + Amiodarone
  {
    drug: "warfarin",
    interactsWith: "amiodarone",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "increased_toxicity",
    description: "Amiodarone inhibits warfarin metabolism, typically increasing INR by 30-50%. Effect persists for weeks after amiodarone stopped.",
    mechanismDetail: "Amiodarone inhibits CYP2C9 and CYP3A4, reducing warfarin clearance. Long half-life means effect persists 1-3 months.",
    management: "Empirically reduce warfarin dose by 30-50% when starting amiodarone. Monitor INR weekly for several weeks, then regularly thereafter.",
    monitoringRequired: true,
    monitoringParameters: ["INR (weekly initially)", "Signs of bleeding"],
    sources: ["Sanoski CA. Ann Pharmacother 2009", "FDA Label"],
  },
  
  // 18. Warfarin + Fluoroquinolones
  {
    drug: "warfarin",
    interactsWith: "fluoroquinolone",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "increased_bleeding",
    description: "Fluoroquinolones can significantly increase INR. Risk highest with ciprofloxacin and levofloxacin.",
    mechanismDetail: "Fluoroquinolones inhibit CYP1A2 and alter gut flora affecting vitamin K production, increasing warfarin effect.",
    management: "Monitor INR closely during antibiotic course and for 1 week after. Consider alternative antibiotics if available.",
    monitoringRequired: true,
    monitoringParameters: ["INR", "Signs of bleeding"],
    sources: ["Holbrook AM et al. Arch Intern Med 2005"],
  },
  
  // 19. Warfarin + Fluconazole
  {
    drug: "warfarin",
    interactsWith: "fluconazole",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "increased_bleeding",
    description: "Fluconazole significantly inhibits warfarin metabolism, often doubling INR.",
    mechanismDetail: "Fluconazole is a potent CYP2C9 inhibitor, dramatically reducing warfarin clearance.",
    management: "Consider dose reduction of warfarin by 25-50%. Monitor INR closely. Short courses of fluconazole may still require adjustment.",
    monitoringRequired: true,
    monitoringParameters: ["INR (every 2-3 days during therapy)"],
    sources: ["Black DJ et al. Ann Intern Med 1996"],
  },
  
  // 20. Warfarin + Metronidazole
  {
    drug: "warfarin",
    interactsWith: "metronidazole",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "increased_bleeding",
    description: "Metronidazole inhibits warfarin metabolism, significantly increasing INR and bleeding risk.",
    mechanismDetail: "Metronidazole inhibits CYP2C9 metabolism of S-warfarin (more potent enantiomer).",
    management: "Monitor INR closely. Consider empiric warfarin dose reduction. Effect begins within days of starting metronidazole.",
    monitoringRequired: true,
    monitoringParameters: ["INR"],
    sources: ["O'Reilly RA. Ann Intern Med 1976"],
  },
  
  // 21. Warfarin + TMP-SMX
  {
    drug: "warfarin",
    interactsWith: "trimethoprim-sulfamethoxazole",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "increased_bleeding",
    description: "TMP-SMX (Bactrim) significantly increases INR. One of the most common and serious warfarin interactions.",
    mechanismDetail: "Sulfamethoxazole inhibits CYP2C9. Trimethoprim may reduce vitamin K production by gut flora.",
    management: "Avoid if alternative antibiotic available. If used, empirically reduce warfarin dose and monitor INR every 2-3 days.",
    monitoringRequired: true,
    monitoringParameters: ["INR (every 2-3 days)"],
    sources: ["Schelleman H et al. Blood 2010"],
  },
  
  // 22. DOACs + NSAIDs
  {
    drug: "doac",
    interactsWith: "nsaid",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "increased_bleeding",
    description: "NSAIDs increase bleeding risk with DOACs (apixaban, rivaroxaban, dabigatran) through antiplatelet effects and GI mucosal damage.",
    mechanismDetail: "NSAIDs impair platelet function and cause GI mucosal injury, additive to anticoagulant bleeding risk.",
    management: "Avoid chronic NSAID use. For acute pain, use lowest dose, shortest duration. Add PPI for GI protection if NSAID necessary.",
    monitoringRequired: true,
    monitoringParameters: ["Signs of bleeding", "Hemoglobin"],
    sources: ["Davidson BL et al. Lancet 2014"],
  },
  
  // 23. SSRIs + Warfarin
  {
    drug: "ssri",
    interactsWith: "warfarin",
    severity: "major",
    evidence: "established",
    mechanism: "both",
    effect: "increased_bleeding",
    description: "SSRIs impair platelet function and some inhibit warfarin metabolism, increasing bleeding risk 1.5-2 fold.",
    mechanismDetail: "SSRIs deplete platelet serotonin needed for aggregation. Fluoxetine and fluvoxamine also inhibit CYP2C9/3A4.",
    management: "Monitor INR when starting/stopping SSRI. Consider adding PPI. Mirtazapine may be safer alternative if antidepressant needed.",
    monitoringRequired: true,
    monitoringParameters: ["INR", "Signs of bleeding"],
    sources: ["Schalekamp T et al. Thromb Haemost 2008"],
  },
  
  // 24. SSRIs + Antiplatelet Drugs
  {
    drug: "ssri",
    interactsWith: "antiplatelet",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "increased_bleeding",
    description: "SSRIs impair platelet function. Combined with antiplatelet drugs (aspirin, clopidogrel) significantly increases GI bleeding risk.",
    mechanismDetail: "SSRIs deplete platelet serotonin stores needed for aggregation, adding to antiplatelet drug effects.",
    management: "Use PPI for GI protection if combination necessary. Monitor for bleeding. Consider SSRI alternatives.",
    monitoringRequired: true,
    monitoringParameters: ["Signs of GI bleeding", "Hemoglobin"],
    sources: ["Anglin R et al. Am J Med 2014"],
  },
  
  // ===========================================================================
  // MAJOR INTERACTIONS - MYOPATHY/RHABDOMYOLYSIS
  // ===========================================================================
  
  // 25. Simvastatin + Amiodarone
  {
    drug: "simvastatin",
    interactsWith: "amiodarone",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "myopathy",
    description: "Amiodarone inhibits simvastatin metabolism. FDA limits simvastatin to 10mg/day with amiodarone due to myopathy/rhabdomyolysis risk.",
    mechanismDetail: "Amiodarone inhibits CYP3A4 and OATP1B1, significantly increasing simvastatin exposure.",
    management: "Do not exceed simvastatin 10mg/day with amiodarone. Consider pravastatin or rosuvastatin as alternatives (not CYP3A4 substrates).",
    monitoringRequired: true,
    monitoringParameters: ["Muscle symptoms", "CK if symptomatic"],
    sources: ["FDA Drug Safety Communication 2011"],
  },
  
  // 26. Simvastatin + Diltiazem/Verapamil
  {
    drug: "simvastatin",
    interactsWith: "diltiazem",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "myopathy",
    description: "Diltiazem and verapamil inhibit CYP3A4. FDA limits simvastatin to 10mg/day with these calcium channel blockers.",
    mechanismDetail: "CYP3A4 inhibition increases simvastatin AUC ~5-fold, dramatically increasing myopathy risk.",
    management: "Do not exceed simvastatin 10mg/day. Consider pravastatin or rosuvastatin (not CYP3A4 substrates) as alternatives.",
    monitoringRequired: true,
    monitoringParameters: ["Muscle symptoms", "CK if symptomatic"],
    sources: ["FDA Drug Safety Communication 2011"],
  },
  
  // 27. Statins + Gemfibrozil
  {
    drug: "statin",
    interactsWith: "gemfibrozil",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "myopathy",
    description: "Gemfibrozil significantly increases statin exposure and myopathy risk. Combination with simvastatin is contraindicated.",
    mechanismDetail: "Gemfibrozil inhibits OATP1B1 hepatic uptake and glucuronidation of statins, markedly increasing systemic exposure.",
    management: "Avoid gemfibrozil with statins. If fibrate needed, fenofibrate is preferred (lower interaction potential).",
    monitoringRequired: true,
    monitoringParameters: ["Muscle symptoms", "CK"],
    sources: ["FDA Label", "Thompson PD et al. Circulation 2016"],
  },
  
  // 28. Statins + CYP3A4 Inhibitors
  {
    drug: "cyp3a4_statin",
    interactsWith: "cyp3a4_inhibitor",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "myopathy",
    description: "Strong CYP3A4 inhibitors dramatically increase levels of simvastatin, lovastatin, and atorvastatin, increasing myopathy risk.",
    mechanismDetail: "CYP3A4 is the primary metabolic pathway. Inhibition can increase statin AUC >10-fold.",
    management: "Avoid simvastatin/lovastatin with strong CYP3A4 inhibitors. Limit atorvastatin to 20mg/day. Use pravastatin or rosuvastatin instead.",
    monitoringRequired: true,
    monitoringParameters: ["Muscle symptoms"],
    sources: ["FDA Label", "Jacobson TA. Am J Cardiol 2004"],
  },
  
  // ===========================================================================
  // MAJOR INTERACTIONS - HYPERKALEMIA
  // ===========================================================================
  
  // 29. ACE Inhibitors + K-Sparing Diuretics
  {
    drug: "ace_inhibitor",
    interactsWith: "k_sparing_diuretic",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "hyperkalemia",
    description: "Both drug classes increase potassium. Combination significantly increases hyperkalemia risk, potentially causing fatal arrhythmias.",
    mechanismDetail: "ACE inhibitors reduce aldosterone, decreasing K excretion. K-sparing diuretics block aldosterone or ENaC in collecting duct.",
    management: "If combination indicated (e.g., heart failure with reduced EF), start low doses, monitor K and creatinine at baseline, 1 week, and regularly thereafter.",
    monitoringRequired: true,
    monitoringParameters: ["Potassium (baseline, 1 week, then monthly)", "Creatinine", "ECG if K elevated"],
    sources: ["Juurlink DN et al. NEJM 2004", "ACC/AHA Heart Failure Guidelines"],
  },
  
  // 30. ACE Inhibitors + Potassium Supplements
  {
    drug: "ace_inhibitor",
    interactsWith: "potassium",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "hyperkalemia",
    description: "ACE inhibitors reduce potassium excretion. Adding potassium supplements can cause dangerous hyperkalemia.",
    mechanismDetail: "ACE inhibitors decrease aldosterone secretion, reducing renal potassium excretion. Exogenous K adds to retained K.",
    management: "Avoid routine K supplementation with ACE inhibitors. If needed, use lowest effective dose and monitor K closely.",
    monitoringRequired: true,
    monitoringParameters: ["Potassium"],
    sources: ["Clinical practice"],
  },
  
  // 31. ARBs + K-Sparing Diuretics
  {
    drug: "arb",
    interactsWith: "k_sparing_diuretic",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "hyperkalemia",
    description: "Similar to ACE inhibitors, ARBs reduce aldosterone effect. Combination with K-sparing diuretics significantly increases hyperkalemia risk.",
    mechanismDetail: "ARBs block AT1 receptor, reducing aldosterone. Combined with aldosterone antagonist causes additive K retention.",
    management: "If combination needed, monitor potassium closely. Start with low doses of both. Avoid in patients with CKD stage 4+.",
    monitoringRequired: true,
    monitoringParameters: ["Potassium", "Creatinine"],
    sources: ["Juurlink DN et al. NEJM 2004"],
  },
  
  // 32. Triple Whammy: ACE/ARB + Diuretic + NSAID
  {
    drug: "ace_inhibitor",
    interactsWith: "nsaid",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "nephrotoxicity",
    description: "NSAIDs with ACE inhibitors increase risk of acute kidney injury. Risk is even higher if a diuretic is also present ('triple whammy').",
    mechanismDetail: "NSAIDs constrict afferent arteriole, ACE inhibitors dilate efferent arteriole - together they reduce glomerular filtration. Diuretics amplify this by reducing volume.",
    management: "Avoid if possible. If NSAID needed, use lowest dose for shortest duration. Monitor renal function. Extra caution if patient also on diuretics.",
    monitoringRequired: true,
    monitoringParameters: ["Creatinine", "eGFR", "Blood pressure"],
    sources: ["Lapi F et al. BMJ 2013", "White WB et al. Hypertension 2007"],
  },
  
  // ===========================================================================
  // MAJOR INTERACTIONS - NARROW THERAPEUTIC INDEX DRUGS
  // ===========================================================================
  
  // 33. Lithium + NSAIDs
  {
    drug: "lithium",
    interactsWith: "nsaid",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "increased_toxicity",
    description: "NSAIDs reduce renal lithium clearance, increasing levels 15-60%. Can cause lithium toxicity even at previously stable doses.",
    mechanismDetail: "NSAIDs inhibit prostaglandin-mediated renal blood flow and sodium handling, decreasing lithium excretion.",
    management: "Avoid NSAIDs if possible. If needed, use lowest dose, shortest duration, and monitor lithium levels closely (within 5-7 days).",
    monitoringRequired: true,
    monitoringParameters: ["Lithium level (5-7 days after starting NSAID)", "Signs of toxicity"],
    sources: ["Ragheb M. J Clin Psychiatry 1990"],
  },
  
  // 34. Lithium + ACE Inhibitors
  {
    drug: "lithium",
    interactsWith: "ace_inhibitor",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "increased_toxicity",
    description: "ACE inhibitors can increase lithium levels unpredictably (up to 4-fold reported). Risk of severe lithium toxicity.",
    mechanismDetail: "ACE inhibitors affect renal hemodynamics and sodium handling, reducing lithium clearance. Effect variable between patients.",
    management: "Monitor lithium levels closely when starting ACE inhibitor (at 1, 2, and 4 weeks). Consider empiric lithium dose reduction.",
    monitoringRequired: true,
    monitoringParameters: ["Lithium level (weekly initially)", "Creatinine", "Signs of toxicity"],
    sources: ["Finley PR et al. Pharmacotherapy 1996"],
  },
  
  // 35. Lithium + Thiazide Diuretics
  {
    drug: "lithium",
    interactsWith: "thiazide",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "increased_toxicity",
    description: "Thiazides reduce lithium clearance by 25-40%, often necessitating lithium dose reduction. Can cause toxicity.",
    mechanismDetail: "Thiazides cause sodium depletion, triggering compensatory lithium reabsorption in proximal tubule.",
    management: "Empirically reduce lithium dose by 25-50% when starting thiazide. Monitor lithium levels closely.",
    monitoringRequired: true,
    monitoringParameters: ["Lithium level", "Electrolytes"],
    sources: ["Finley PR et al. Pharmacotherapy 1996"],
  },
  
  // 36. Methotrexate + NSAIDs
  {
    drug: "methotrexate",
    interactsWith: "nsaid",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "increased_toxicity",
    description: "NSAIDs reduce methotrexate clearance and can cause severe/fatal methotrexate toxicity, especially with high-dose MTX.",
    mechanismDetail: "NSAIDs compete with MTX for renal tubular secretion and reduce renal blood flow, decreasing MTX clearance.",
    management: "Avoid with high-dose methotrexate. With low-dose (rheumatologic), use with caution, avoid around MTX dosing day, monitor CBC.",
    monitoringRequired: true,
    monitoringParameters: ["CBC", "Creatinine", "LFTs"],
    sources: ["Frenia ML et al. J Rheumatol 1989"],
  },
  
  // 37. Methotrexate + Trimethoprim
  {
    drug: "methotrexate",
    interactsWith: "trimethoprim",
    severity: "major",
    evidence: "established",
    mechanism: "both",
    effect: "increased_toxicity",
    description: "Trimethoprim is also a folate antagonist. Combination causes severe, sometimes fatal bone marrow suppression.",
    mechanismDetail: "Both drugs inhibit folate metabolism at different points. Combined antifolate effect causes severe myelosuppression.",
    management: "AVOID combination. Use alternative antibiotics. If inadvertent exposure, monitor CBC closely, consider leucovorin rescue.",
    monitoringRequired: true,
    monitoringParameters: ["CBC (urgently if exposed)"],
    sources: ["Groenendal H et al. Neth J Med 1990"],
  },
  
  // 38. Digoxin + Amiodarone
  {
    drug: "digoxin",
    interactsWith: "amiodarone",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "increased_toxicity",
    description: "Amiodarone increases digoxin levels approximately 70-100%. Risk of digoxin toxicity (nausea, arrhythmias, visual disturbances).",
    mechanismDetail: "Amiodarone inhibits P-glycoprotein and possibly reduces renal clearance of digoxin.",
    management: "Empirically reduce digoxin dose by 50% when starting amiodarone. Monitor digoxin levels and for toxicity symptoms.",
    monitoringRequired: true,
    monitoringParameters: ["Digoxin level", "Heart rate", "ECG", "Potassium"],
    sources: ["Leahey EB et al. Ann Intern Med 1984"],
  },
  
  // 39. Digoxin + Verapamil
  {
    drug: "digoxin",
    interactsWith: "verapamil",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "increased_toxicity",
    description: "Verapamil increases digoxin levels 50-75%. Also causes additive bradycardia. Significant toxicity risk.",
    mechanismDetail: "Verapamil inhibits P-glycoprotein-mediated digoxin efflux in gut and kidney, increasing absorption and decreasing clearance.",
    management: "Reduce digoxin dose empirically when starting verapamil. Monitor digoxin levels. Watch for bradycardia.",
    monitoringRequired: true,
    monitoringParameters: ["Digoxin level", "Heart rate", "ECG"],
    sources: ["Rodin SM et al. Am J Cardiol 1988"],
  },
  
  // 40. Digoxin + Clarithromycin
  {
    drug: "digoxin",
    interactsWith: "clarithromycin",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "increased_toxicity",
    description: "Clarithromycin significantly increases digoxin levels through P-gp inhibition. Risk of toxicity.",
    mechanismDetail: "Clarithromycin inhibits P-glycoprotein and may alter gut flora affecting digoxin metabolism.",
    management: "Monitor for digoxin toxicity. Check level if using more than a few days. Consider azithromycin as alternative (less interaction).",
    monitoringRequired: true,
    monitoringParameters: ["Digoxin level", "Heart rate", "Symptoms of toxicity"],
    sources: ["Zapater P et al. Clin Pharmacol Ther 2002"],
  },
  
  // ===========================================================================
  // MAJOR INTERACTIONS - OTHER CRITICAL
  // ===========================================================================
  
  // 41. Clopidogrel + Omeprazole
  {
    drug: "clopidogrel",
    interactsWith: "omeprazole",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "decreased_efficacy",
    description: "Omeprazole inhibits CYP2C19, reducing clopidogrel activation. May decrease antiplatelet effect and increase cardiovascular event risk.",
    mechanismDetail: "Clopidogrel is a prodrug activated by CYP2C19. Omeprazole/esomeprazole inhibit this enzyme, reducing active metabolite formation.",
    management: "Use pantoprazole or H2-blockers instead (less CYP2C19 inhibition). FDA recommends avoiding omeprazole/esomeprazole with clopidogrel.",
    monitoringRequired: false,
    sources: ["FDA Drug Safety Communication 2010", "Ho PM et al. JAMA 2009"],
  },
  
  // 42. Levothyroxine + Calcium
  {
    drug: "levothyroxine",
    interactsWith: "calcium",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "decreased_efficacy",
    description: "Calcium significantly reduces levothyroxine absorption, potentially causing hypothyroidism.",
    mechanismDetail: "Calcium forms insoluble complex with levothyroxine in GI tract, reducing absorption by up to 25%.",
    management: "Separate administration by at least 4 hours. Take levothyroxine on empty stomach, 30-60 minutes before breakfast.",
    monitoringRequired: true,
    monitoringParameters: ["TSH (if timing changed)"],
    sources: ["Singh N et al. JAMA 2000"],
  },
  
  // 43. Levothyroxine + Iron
  {
    drug: "levothyroxine",
    interactsWith: "iron",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "decreased_efficacy",
    description: "Iron significantly reduces levothyroxine absorption.",
    mechanismDetail: "Iron forms insoluble complex with levothyroxine in GI tract.",
    management: "Separate administration by at least 4 hours.",
    monitoringRequired: true,
    monitoringParameters: ["TSH"],
    sources: ["Campbell NR et al. Ann Intern Med 1992"],
  },
  
  // 44. Phenytoin + Many Drugs (CYP Inducer)
  {
    drug: "phenytoin",
    interactsWith: "hormonal_contraceptive",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "decreased_efficacy",
    description: "Phenytoin induces metabolism of oral contraceptives, potentially causing contraceptive failure and unintended pregnancy.",
    mechanismDetail: "Phenytoin induces CYP3A4, dramatically increasing metabolism of ethinyl estradiol and progestins.",
    management: "Use non-hormonal or IUD contraception. If hormonal method used, consider higher estrogen formulation and backup method.",
    monitoringRequired: false,
    sources: ["FDA Label", "ACOG Guidelines"],
  },
  
  // 45. Metformin + Iodinated Contrast
  {
    drug: "metformin",
    interactsWith: "contrast_dye",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "other",
    description: "Iodinated contrast can cause acute kidney injury. In patients on metformin, this can lead to dangerous lactic acidosis.",
    mechanismDetail: "Contrast-induced nephropathy reduces metformin clearance. Accumulated metformin inhibits hepatic lactate uptake, causing lactic acidosis.",
    management: "Hold metformin on day of contrast and for 48 hours after. Check creatinine before restarting. Resume if renal function stable.",
    monitoringRequired: true,
    monitoringParameters: ["Creatinine (before restarting metformin)"],
    sources: ["ACR Guidelines", "FDA Label"],
  },
  
  // ===========================================================================
  // MODERATE INTERACTIONS
  // ===========================================================================
  
  // 46. Beta Blockers + Non-DHP Calcium Channel Blockers
  {
    drug: "beta_blocker",
    interactsWith: "verapamil",
    severity: "moderate",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "other",
    description: "Combined negative chronotropic and inotropic effects can cause symptomatic bradycardia, heart block, or heart failure.",
    mechanismDetail: "Both drug classes slow AV conduction and reduce contractility. Effects are additive.",
    management: "Use with caution. Monitor heart rate and for symptoms of heart failure. Avoid in patients with conduction abnormalities.",
    monitoringRequired: true,
    monitoringParameters: ["Heart rate", "ECG", "Symptoms of heart failure"],
    sources: ["ACC/AHA Guidelines"],
  },
  
  // 48. PPIs + Clopidogrel (Pantoprazole safer)
  {
    drug: "pantoprazole",
    interactsWith: "clopidogrel",
    severity: "moderate",
    evidence: "probable",
    mechanism: "pharmacokinetic",
    effect: "decreased_efficacy",
    description: "Pantoprazole has less CYP2C19 inhibition than omeprazole but some interaction may still occur.",
    mechanismDetail: "Pantoprazole has weak CYP2C19 inhibition, producing smaller reduction in clopidogrel active metabolite.",
    management: "Pantoprazole preferred over omeprazole/esomeprazole when PPI needed with clopidogrel. H2-blockers are alternative.",
    monitoringRequired: false,
    sources: ["Kwok CS et al. Am J Gastroenterol 2010"],
  },
  
  // 49. Fluconazole + Statins (not simvastatin)
  {
    drug: "fluconazole",
    interactsWith: "atorvastatin",
    severity: "moderate",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "myopathy",
    description: "Fluconazole inhibits CYP3A4, increasing atorvastatin levels. Lower myopathy risk than with simvastatin but caution needed.",
    mechanismDetail: "CYP3A4 inhibition by fluconazole increases atorvastatin exposure approximately 2-3 fold.",
    management: "Consider temporary statin discontinuation during short fluconazole courses. Use lowest atorvastatin dose if needed. Monitor for myopathy.",
    monitoringRequired: true,
    monitoringParameters: ["Muscle symptoms"],
    sources: ["Kantola T et al. Eur J Clin Pharmacol 2000"],
  },
  
  // 50. Amlodipine + Simvastatin
  {
    drug: "amlodipine",
    interactsWith: "simvastatin",
    severity: "moderate",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "myopathy",
    description: "Amlodipine modestly inhibits CYP3A4. FDA limits simvastatin to 20mg/day with amlodipine.",
    mechanismDetail: "Amlodipine weakly inhibits CYP3A4, increasing simvastatin exposure approximately 1.5-2 fold.",
    management: "Do not exceed simvastatin 20mg/day with amlodipine. Consider pravastatin or rosuvastatin as alternatives.",
    monitoringRequired: true,
    monitoringParameters: ["Muscle symptoms"],
    sources: ["FDA Drug Safety Communication 2011"],
  },
  
  // ===========================================================================
  // ADDITIONAL CRITICAL INTERACTIONS (51-56)
  // ===========================================================================
  
  // 51. Sotalol + Ondansetron - QT Prolongation
  {
    drug: "sotalol",
    interactsWith: "ondansetron",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "qt_prolongation",
    description: "Both sotalol and ondansetron prolong QT interval. Combination significantly increases risk of Torsades de Pointes.",
    mechanismDetail: "Additive blockade of cardiac potassium channels (hERG) leading to delayed repolarization.",
    management: "Avoid combination if possible. If necessary, obtain baseline ECG, monitor QTc, correct electrolytes. Consider alternative antiemetic.",
    monitoringRequired: true,
    monitoringParameters: ["ECG/QTc", "Potassium", "Magnesium"],
    sources: ["CredibleMeds.org", "FDA Label"],
  },
  
  // 52. Fluoroquinolones + Sotalol - QT Prolongation
  {
    drug: "fluoroquinolone",
    interactsWith: "sotalol",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "qt_prolongation",
    description: "Fluoroquinolones and sotalol both prolong QT interval. Significant risk of Torsades de Pointes.",
    mechanismDetail: "Additive blockade of cardiac potassium channels causing delayed repolarization.",
    management: "Use alternative antibiotic if possible. If necessary, monitor ECG and electrolytes closely.",
    monitoringRequired: true,
    monitoringParameters: ["ECG/QTc", "Potassium", "Magnesium"],
    sources: ["CredibleMeds.org", "FDA Label"],
  },
  
  // 53. DOACs + NSAIDs (apixaban, rivaroxaban, dabigatran)
  {
    drug: "doac",
    interactsWith: "nsaid",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "increased_bleeding",
    description: "NSAIDs increase bleeding risk with DOACs through antiplatelet effects and GI mucosal damage.",
    mechanismDetail: "NSAIDs impair platelet function and cause GI mucosal injury, adding to anticoagulant bleeding risk.",
    management: "Avoid chronic NSAID use. For acute pain, use lowest dose, shortest duration. Add PPI for GI protection.",
    monitoringRequired: true,
    monitoringParameters: ["Signs of bleeding", "Hemoglobin"],
    sources: ["Davidson BL et al. Lancet 2014"],
  },
  
  // 54. Simvastatin + Clarithromycin - CYP3A4
  {
    drug: "simvastatin",
    interactsWith: "clarithromycin",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "myopathy",
    description: "Clarithromycin is a potent CYP3A4 inhibitor. Dramatically increases simvastatin levels and rhabdomyolysis risk.",
    mechanismDetail: "Clarithromycin inhibits CYP3A4, increasing simvastatin AUC >10-fold.",
    management: "AVOID combination. Temporarily discontinue simvastatin during clarithromycin course, or use azithromycin (weaker inhibitor).",
    monitoringRequired: true,
    monitoringParameters: ["Muscle symptoms", "CK if symptomatic"],
    sources: ["FDA Drug Safety Communication", "Kantola T et al. Clin Pharmacol Ther 1998"],
  },
  
  // 55. Warfarin + Ciprofloxacin
  {
    drug: "warfarin",
    interactsWith: "ciprofloxacin",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacokinetic",
    effect: "increased_bleeding",
    description: "Ciprofloxacin significantly increases INR through CYP1A2 inhibition and gut flora changes affecting vitamin K.",
    mechanismDetail: "Ciprofloxacin inhibits CYP1A2 and alters intestinal flora that produce vitamin K, increasing warfarin effect.",
    management: "Monitor INR closely during antibiotic course. Check INR within 3-5 days of starting ciprofloxacin.",
    monitoringRequired: true,
    monitoringParameters: ["INR", "Signs of bleeding"],
    sources: ["Holbrook AM et al. Arch Intern Med 2005"],
  },
  
  // 56. SSRIs + Aspirin (antiplatelet)
  {
    drug: "ssri",
    interactsWith: "aspirin",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "increased_bleeding",
    description: "SSRIs impair platelet function by depleting serotonin stores. Combined with aspirin, GI bleeding risk increases 3-15 fold.",
    mechanismDetail: "SSRIs deplete platelet serotonin needed for aggregation. Combined with aspirin's COX-1 inhibition, significantly impairs hemostasis.",
    management: "Use PPI for GI protection if combination necessary. Monitor for bleeding. Consider if both drugs truly needed.",
    monitoringRequired: true,
    monitoringParameters: ["Signs of GI bleeding", "Hemoglobin"],
    sources: ["Anglin R et al. Am J Med 2014", "Loke YK et al. Aliment Pharmacol Ther 2008"],
  },
  
  // 57. Levofloxacin + Sotalol - QT Prolongation (explicit)
  {
    drug: "levofloxacin",
    interactsWith: "sotalol",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "qt_prolongation",
    description: "Both levofloxacin and sotalol prolong QT interval. Significant risk of Torsades de Pointes.",
    mechanismDetail: "Additive blockade of cardiac potassium channels (hERG) causing delayed repolarization.",
    management: "Use alternative antibiotic if possible. If necessary, obtain baseline ECG, monitor QTc, correct electrolytes.",
    monitoringRequired: true,
    monitoringParameters: ["ECG/QTc", "Potassium", "Magnesium"],
    sources: ["CredibleMeds.org", "FDA Label"],
  },
  
  // 58. Apixaban + NSAIDs (explicit DOAC interaction)
  {
    drug: "apixaban",
    interactsWith: "nsaid",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "increased_bleeding",
    description: "NSAIDs increase bleeding risk with apixaban through antiplatelet effects and GI mucosal damage.",
    mechanismDetail: "NSAIDs impair platelet function and cause GI mucosal injury, adding to anticoagulant bleeding risk.",
    management: "Avoid chronic NSAID use. For acute pain, use lowest dose, shortest duration. Add PPI for GI protection.",
    monitoringRequired: true,
    monitoringParameters: ["Signs of bleeding", "Hemoglobin"],
    sources: ["Davidson BL et al. Lancet 2014", "CHEST Guidelines"],
  },
  
  // 59. Rivaroxaban + NSAIDs
  {
    drug: "rivaroxaban",
    interactsWith: "nsaid",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "increased_bleeding",
    description: "NSAIDs increase bleeding risk with rivaroxaban through antiplatelet effects and GI mucosal damage.",
    mechanismDetail: "NSAIDs impair platelet function and cause GI mucosal injury, adding to anticoagulant bleeding risk.",
    management: "Avoid chronic NSAID use. For acute pain, use lowest dose, shortest duration. Add PPI for GI protection.",
    monitoringRequired: true,
    monitoringParameters: ["Signs of bleeding", "Hemoglobin"],
    sources: ["Davidson BL et al. Lancet 2014", "CHEST Guidelines"],
  },
  
  // 60. Dabigatran + NSAIDs
  {
    drug: "dabigatran",
    interactsWith: "nsaid",
    severity: "major",
    evidence: "established",
    mechanism: "pharmacodynamic",
    effect: "increased_bleeding",
    description: "NSAIDs increase bleeding risk with dabigatran through antiplatelet effects and GI mucosal damage.",
    mechanismDetail: "NSAIDs impair platelet function and cause GI mucosal injury, adding to anticoagulant bleeding risk.",
    management: "Avoid chronic NSAID use. For acute pain, use lowest dose, shortest duration. Add PPI for GI protection.",
    monitoringRequired: true,
    monitoringParameters: ["Signs of bleeding", "Hemoglobin"],
    sources: ["Davidson BL et al. Lancet 2014", "RE-LY Trial"],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** DOAC (Direct Oral Anticoagulants) */
export const DOAC_DRUGS = [
  "apixaban", "eliquis",
  "rivaroxaban", "xarelto",
  "dabigatran", "pradaxa",
  "edoxaban", "savaysa",
] as const;

/** Fluoroquinolone Antibiotics */
export const FLUOROQUINOLONE_DRUGS = [
  "ciprofloxacin", "cipro",
  "levofloxacin", "levaquin",
  "moxifloxacin", "avelox",
  "ofloxacin",
  "norfloxacin",
] as const;

/** Thiazide Diuretics */
export const THIAZIDE_DRUGS = [
  "hydrochlorothiazide", "hctz",
  "chlorthalidone",
  "metolazone",
  "indapamide",
] as const;

/**
 * Get all drugs in a class
 */
export function getDrugClass(drugName: string): string | null {
  const normalized = drugName.toLowerCase().trim();
  
  if (SSRI_DRUGS.some(d => normalized.includes(d))) return "ssri";
  if (SNRI_DRUGS.some(d => normalized.includes(d))) return "snri";
  if (MAOI_DRUGS.some(d => normalized.includes(d))) return "maoi";
  if (NSAID_DRUGS.some(d => normalized.includes(d))) return "nsaid";
  if (ACE_INHIBITORS.some(d => normalized.includes(d))) return "ace_inhibitor";
  if (ARB_DRUGS.some(d => normalized.includes(d))) return "arb";
  if (K_SPARING_DIURETICS.some(d => normalized.includes(d))) return "k_sparing_diuretic";
  if (STATIN_DRUGS.some(d => normalized.includes(d))) return "statin";
  if (OPIOID_DRUGS.some(d => normalized.includes(d))) return "opioid";
  if (BENZODIAZEPINE_DRUGS.some(d => normalized.includes(d))) return "benzodiazepine";
  if (QT_PROLONGING_DRUGS.some(d => normalized.includes(d))) return "qt_prolonging_drug";
  if (CYP3A4_INHIBITORS.some(d => normalized.includes(d))) return "cyp3a4_inhibitor";
  if (CYP3A4_INDUCERS.some(d => normalized.includes(d))) return "cyp3a4_inducer";
  if (ANTICOAGULANT_DRUGS.some(d => normalized.includes(d))) return "anticoagulant";
  if (ANTIPLATELET_DRUGS.some(d => normalized.includes(d))) return "antiplatelet";
  if (TRIPTAN_DRUGS.some(d => normalized.includes(d))) return "triptan";
  if (PDE5_INHIBITORS.some(d => normalized.includes(d))) return "pde5_inhibitor";
  if (NITRATE_DRUGS.some(d => normalized.includes(d))) return "nitrate";
  if (PPI_DRUGS.some(d => normalized.includes(d))) return "ppi";
  if (THYROID_DRUGS.some(d => normalized.includes(d))) return "thyroid";
  if (DOAC_DRUGS.some(d => normalized.includes(d))) return "doac";
  if (FLUOROQUINOLONE_DRUGS.some(d => normalized.includes(d))) return "fluoroquinolone";
  if (THIAZIDE_DRUGS.some(d => normalized.includes(d))) return "thiazide";
  
  return null;
}

/**
 * Check if a drug name matches a drug or drug class
 */
export function matchesDrug(drugName: string, target: string): boolean {
  const normalized = drugName.toLowerCase().trim();
  const targetNorm = target.toLowerCase().trim();
  
  // Direct match
  if (normalized.includes(targetNorm) || targetNorm.includes(normalized)) {
    return true;
  }
  
  // Class match
  const drugClass = getDrugClass(normalized);
  if (drugClass && drugClass === targetNorm) {
    return true;
  }
  
  return false;
}

export default DRUG_INTERACTIONS;
