/**
 * Golden Tests for Drug Interaction Database v2.0.0
 * 
 * These tests verify that known critical drug interactions are correctly
 * identified by the interaction checker. Each test represents a clinically
 * significant interaction that MUST be detected.
 * 
 * Run with: npx tsx src/tests/interaction-golden-tests.ts
 */

import {
  DRUG_INTERACTIONS,
  INTERACTION_DB_VERSION,
  getDrugClass,
  matchesDrug,
  SSRI_DRUGS,
  OPIOID_DRUGS,
  BENZODIAZEPINE_DRUGS,
  QT_PROLONGING_DRUGS,
  NSAID_DRUGS,
  ACE_INHIBITORS,
} from "../data/interaction-database.js";

// ============================================================================
// TEST FRAMEWORK
// ============================================================================

interface GoldenTest {
  id: number;
  drug1: string;
  drug2: string;
  expectedSeverity: "contraindicated" | "major" | "moderate" | "minor";
  description: string;
  category: string;
}

let passed = 0;
let failed = 0;

function findInteraction(drug1: string, drug2: string) {
  for (const interaction of DRUG_INTERACTIONS) {
    const drug1MatchesPrimary = matchesDrug(drug1, interaction.drug);
    const drug2MatchesSecondary = matchesDrug(drug2, interaction.interactsWith);
    const drug1MatchesSecondary = matchesDrug(drug1, interaction.interactsWith);
    const drug2MatchesPrimary = matchesDrug(drug2, interaction.drug);
    
    if ((drug1MatchesPrimary && drug2MatchesSecondary) || 
        (drug1MatchesSecondary && drug2MatchesPrimary)) {
      return interaction;
    }
  }
  return null;
}

function runTest(test: GoldenTest): boolean {
  const interaction = findInteraction(test.drug1, test.drug2);
  
  if (!interaction) {
    console.log(`❌ FAIL #${test.id}: ${test.drug1} + ${test.drug2}`);
    console.log(`   Expected: ${test.expectedSeverity} interaction`);
    console.log(`   Got: No interaction found`);
    console.log(`   Category: ${test.category}`);
    return false;
  }
  
  if (interaction.severity !== test.expectedSeverity) {
    console.log(`❌ FAIL #${test.id}: ${test.drug1} + ${test.drug2}`);
    console.log(`   Expected severity: ${test.expectedSeverity}`);
    console.log(`   Got severity: ${interaction.severity}`);
    return false;
  }
  
  console.log(`✅ PASS #${test.id}: ${test.drug1} + ${test.drug2} → ${interaction.severity}`);
  return true;
}

// ============================================================================
// GOLDEN TEST CASES - 50 Critical Interactions
// ============================================================================

const GOLDEN_TESTS: GoldenTest[] = [
  // ---------------------------------------------------------------------------
  // CONTRAINDICATED COMBINATIONS (1-5)
  // ---------------------------------------------------------------------------
  {
    id: 1,
    drug1: "phenelzine",
    drug2: "sertraline",
    expectedSeverity: "contraindicated",
    description: "MAOI + SSRI = Serotonin syndrome risk",
    category: "Serotonin Syndrome",
  },
  {
    id: 2,
    drug1: "tranylcypromine",
    drug2: "venlafaxine",
    expectedSeverity: "contraindicated",
    description: "MAOI + SNRI = Serotonin syndrome risk",
    category: "Serotonin Syndrome",
  },
  {
    id: 3,
    drug1: "phenelzine",
    drug2: "meperidine",
    expectedSeverity: "contraindicated",
    description: "MAOI + Meperidine = Fatal serotonin syndrome",
    category: "Serotonin Syndrome",
  },
  {
    id: 4,
    drug1: "sildenafil",
    drug2: "nitroglycerin",
    expectedSeverity: "contraindicated",
    description: "PDE5 inhibitor + Nitrate = Severe hypotension",
    category: "Cardiovascular",
  },
  {
    id: 5,
    drug1: "linezolid",
    drug2: "fluoxetine",
    expectedSeverity: "contraindicated",
    description: "Linezolid (MAOI) + SSRI = Serotonin syndrome",
    category: "Serotonin Syndrome",
  },
  
  // ---------------------------------------------------------------------------
  // FDA BLACK BOX WARNINGS (6-10)
  // ---------------------------------------------------------------------------
  {
    id: 6,
    drug1: "oxycodone",
    drug2: "alprazolam",
    expectedSeverity: "major",
    description: "Opioid + Benzodiazepine = Respiratory depression (FDA Black Box)",
    category: "Respiratory Depression",
  },
  {
    id: 7,
    drug1: "fentanyl",
    drug2: "lorazepam",
    expectedSeverity: "major",
    description: "Opioid + Benzodiazepine = Respiratory depression",
    category: "Respiratory Depression",
  },
  {
    id: 8,
    drug1: "hydrocodone",
    drug2: "diazepam",
    expectedSeverity: "major",
    description: "Opioid + Benzodiazepine = Respiratory depression",
    category: "Respiratory Depression",
  },
  {
    id: 9,
    drug1: "morphine",
    drug2: "clonazepam",
    expectedSeverity: "major",
    description: "Opioid + Benzodiazepine = Respiratory depression",
    category: "Respiratory Depression",
  },
  {
    id: 10,
    drug1: "methadone",
    drug2: "alcohol",
    expectedSeverity: "major",
    description: "Opioid + Alcohol = CNS/respiratory depression",
    category: "Respiratory Depression",
  },
  
  // ---------------------------------------------------------------------------
  // QT PROLONGATION (11-15)
  // ---------------------------------------------------------------------------
  {
    id: 11,
    drug1: "amiodarone",
    drug2: "ciprofloxacin",
    expectedSeverity: "major",
    description: "QT drug + Fluoroquinolone = Torsades risk",
    category: "QT Prolongation",
  },
  {
    id: 12,
    drug1: "citalopram",
    drug2: "amiodarone",
    expectedSeverity: "major",
    description: "Citalopram + QT drug = Additive QT prolongation",
    category: "QT Prolongation",
  },
  {
    id: 13,
    drug1: "amiodarone",
    drug2: "haloperidol",
    expectedSeverity: "major",
    description: "Two QT-prolonging drugs",
    category: "QT Prolongation",
  },
  {
    id: 14,
    drug1: "sotalol",
    drug2: "ondansetron",
    expectedSeverity: "major",
    description: "Antiarrhythmic + QT drug",
    category: "QT Prolongation",
  },
  {
    id: 15,
    drug1: "levofloxacin",
    drug2: "sotalol",
    expectedSeverity: "major",
    description: "Fluoroquinolone + Antiarrhythmic",
    category: "QT Prolongation",
  },
  
  // ---------------------------------------------------------------------------
  // SEROTONIN SYNDROME (16-20)
  // ---------------------------------------------------------------------------
  {
    id: 16,
    drug1: "sertraline",
    drug2: "tramadol",
    expectedSeverity: "major",
    description: "SSRI + Tramadol = Serotonin syndrome risk",
    category: "Serotonin Syndrome",
  },
  {
    id: 17,
    drug1: "fluoxetine",
    drug2: "sumatriptan",
    expectedSeverity: "major",
    description: "SSRI + Triptan = Serotonin syndrome risk",
    category: "Serotonin Syndrome",
  },
  {
    id: 18,
    drug1: "paroxetine",
    drug2: "tramadol",
    expectedSeverity: "major",
    description: "SSRI + Tramadol",
    category: "Serotonin Syndrome",
  },
  {
    id: 19,
    drug1: "escitalopram",
    drug2: "dextromethorphan",
    expectedSeverity: "major",
    description: "SSRI + DXM = Serotonin risk (OTC interaction)",
    category: "Serotonin Syndrome",
  },
  {
    id: 20,
    drug1: "citalopram",
    drug2: "duloxetine",
    expectedSeverity: "major",
    description: "SSRI + SNRI = Duplicate serotonergic",
    category: "Serotonin Syndrome",
  },
  
  // ---------------------------------------------------------------------------
  // BLEEDING RISK (21-30)
  // ---------------------------------------------------------------------------
  {
    id: 21,
    drug1: "warfarin",
    drug2: "aspirin",
    expectedSeverity: "major",
    description: "Anticoagulant + Antiplatelet = Bleeding risk",
    category: "Bleeding",
  },
  {
    id: 22,
    drug1: "warfarin",
    drug2: "ibuprofen",
    expectedSeverity: "major",
    description: "Warfarin + NSAID = GI bleeding risk",
    category: "Bleeding",
  },
  {
    id: 23,
    drug1: "warfarin",
    drug2: "amiodarone",
    expectedSeverity: "major",
    description: "Warfarin + Amiodarone = INR increase",
    category: "Bleeding",
  },
  {
    id: 24,
    drug1: "warfarin",
    drug2: "fluconazole",
    expectedSeverity: "major",
    description: "Warfarin + Azole = CYP2C9 inhibition",
    category: "Bleeding",
  },
  {
    id: 25,
    drug1: "warfarin",
    drug2: "metronidazole",
    expectedSeverity: "major",
    description: "Warfarin + Metronidazole = INR increase",
    category: "Bleeding",
  },
  {
    id: 26,
    drug1: "warfarin",
    drug2: "ciprofloxacin",
    expectedSeverity: "major",
    description: "Warfarin + Fluoroquinolone",
    category: "Bleeding",
  },
  {
    id: 27,
    drug1: "warfarin",
    drug2: "trimethoprim-sulfamethoxazole",
    expectedSeverity: "major",
    description: "Warfarin + TMP-SMX = Severe INR increase",
    category: "Bleeding",
  },
  {
    id: 28,
    drug1: "sertraline",
    drug2: "warfarin",
    expectedSeverity: "major",
    description: "SSRI + Warfarin = Bleeding risk",
    category: "Bleeding",
  },
  {
    id: 29,
    drug1: "fluoxetine",
    drug2: "aspirin",
    expectedSeverity: "major",
    description: "SSRI + Antiplatelet = GI bleeding",
    category: "Bleeding",
  },
  {
    id: 30,
    drug1: "apixaban",
    drug2: "naproxen",
    expectedSeverity: "major",
    description: "DOAC + NSAID = Bleeding risk",
    category: "Bleeding",
  },
  
  // ---------------------------------------------------------------------------
  // MYOPATHY / RHABDOMYOLYSIS (31-35)
  // ---------------------------------------------------------------------------
  {
    id: 31,
    drug1: "simvastatin",
    drug2: "amiodarone",
    expectedSeverity: "major",
    description: "Simvastatin + Amiodarone = Myopathy (FDA max 10mg)",
    category: "Myopathy",
  },
  {
    id: 32,
    drug1: "simvastatin",
    drug2: "diltiazem",
    expectedSeverity: "major",
    description: "Simvastatin + Diltiazem = CYP3A4 interaction",
    category: "Myopathy",
  },
  {
    id: 33,
    drug1: "atorvastatin",
    drug2: "gemfibrozil",
    expectedSeverity: "major",
    description: "Statin + Gemfibrozil = Severe myopathy risk",
    category: "Myopathy",
  },
  {
    id: 34,
    drug1: "simvastatin",
    drug2: "clarithromycin",
    expectedSeverity: "major",
    description: "CYP3A4 statin + Strong inhibitor",
    category: "Myopathy",
  },
  {
    id: 35,
    drug1: "amlodipine",
    drug2: "simvastatin",
    expectedSeverity: "moderate",
    description: "Amlodipine + Simvastatin = FDA max 20mg",
    category: "Myopathy",
  },
  
  // ---------------------------------------------------------------------------
  // HYPERKALEMIA (36-40)
  // ---------------------------------------------------------------------------
  {
    id: 36,
    drug1: "lisinopril",
    drug2: "spironolactone",
    expectedSeverity: "major",
    description: "ACE inhibitor + K-sparing diuretic = Hyperkalemia",
    category: "Electrolyte",
  },
  {
    id: 37,
    drug1: "enalapril",
    drug2: "potassium",
    expectedSeverity: "major",
    description: "ACE inhibitor + K supplement = Hyperkalemia",
    category: "Electrolyte",
  },
  {
    id: 38,
    drug1: "losartan",
    drug2: "spironolactone",
    expectedSeverity: "major",
    description: "ARB + K-sparing diuretic = Hyperkalemia",
    category: "Electrolyte",
  },
  {
    id: 39,
    drug1: "ramipril",
    drug2: "ibuprofen",
    expectedSeverity: "major",
    description: "ACE + NSAID = Triple whammy component, nephrotoxicity risk",
    category: "Renal",
  },
  {
    id: 40,
    drug1: "lisinopril",
    drug2: "naproxen",
    expectedSeverity: "major",
    description: "ACE + NSAID (Triple whammy component)",
    category: "Renal",
  },
  
  // ---------------------------------------------------------------------------
  // NARROW THERAPEUTIC INDEX (41-47)
  // ---------------------------------------------------------------------------
  {
    id: 41,
    drug1: "lithium",
    drug2: "ibuprofen",
    expectedSeverity: "major",
    description: "Lithium + NSAID = Toxicity risk",
    category: "NTI Drug",
  },
  {
    id: 42,
    drug1: "lithium",
    drug2: "lisinopril",
    expectedSeverity: "major",
    description: "Lithium + ACE inhibitor = Level increase",
    category: "NTI Drug",
  },
  {
    id: 43,
    drug1: "lithium",
    drug2: "hydrochlorothiazide",
    expectedSeverity: "major",
    description: "Lithium + Thiazide = Toxicity",
    category: "NTI Drug",
  },
  {
    id: 44,
    drug1: "methotrexate",
    drug2: "ibuprofen",
    expectedSeverity: "major",
    description: "Methotrexate + NSAID = Toxicity",
    category: "NTI Drug",
  },
  {
    id: 45,
    drug1: "methotrexate",
    drug2: "trimethoprim",
    expectedSeverity: "major",
    description: "Methotrexate + TMP = Fatal myelosuppression",
    category: "NTI Drug",
  },
  {
    id: 46,
    drug1: "digoxin",
    drug2: "amiodarone",
    expectedSeverity: "major",
    description: "Digoxin + Amiodarone = Toxicity risk",
    category: "NTI Drug",
  },
  {
    id: 47,
    drug1: "digoxin",
    drug2: "verapamil",
    expectedSeverity: "major",
    description: "Digoxin + Verapamil = Level increase + bradycardia",
    category: "NTI Drug",
  },
  
  // ---------------------------------------------------------------------------
  // OTHER CRITICAL (48-50)
  // ---------------------------------------------------------------------------
  {
    id: 48,
    drug1: "clopidogrel",
    drug2: "omeprazole",
    expectedSeverity: "major",
    description: "Clopidogrel + Omeprazole = Reduced activation",
    category: "Drug Efficacy",
  },
  {
    id: 49,
    drug1: "levothyroxine",
    drug2: "calcium",
    expectedSeverity: "major",
    description: "Levothyroxine + Calcium = Absorption decrease",
    category: "Drug Absorption",
  },
  {
    id: 50,
    drug1: "metformin",
    drug2: "contrast_dye",
    expectedSeverity: "major",
    description: "Metformin + IV Contrast = Lactic acidosis risk",
    category: "Metabolic",
  },
];

// ============================================================================
// RUN TESTS
// ============================================================================

console.log("═══════════════════════════════════════════════════════════════");
console.log(`Drug Interaction Database Golden Tests - v${INTERACTION_DB_VERSION}`);
console.log("═══════════════════════════════════════════════════════════════");
console.log(`Total tests: ${GOLDEN_TESTS.length}`);
console.log(`Database contains: ${DRUG_INTERACTIONS.length} interactions`);
console.log("");

// Group tests by category
const categories = [...new Set(GOLDEN_TESTS.map(t => t.category))];

for (const category of categories) {
  console.log(`\n--- ${category} ---`);
  const categoryTests = GOLDEN_TESTS.filter(t => t.category === category);
  
  for (const test of categoryTests) {
    if (runTest(test)) {
      passed++;
    } else {
      failed++;
    }
  }
}

console.log("\n═══════════════════════════════════════════════════════════════");
console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${GOLDEN_TESTS.length} tests`);

if (failed === 0) {
  console.log("✅ ALL GOLDEN TESTS PASSED");
  process.exit(0);
} else {
  console.log(`❌ ${failed} TESTS FAILED`);
  process.exit(1);
}
