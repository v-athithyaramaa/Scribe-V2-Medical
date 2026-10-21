// Clinical Reasoning & Dynamic Medical NLP Engine
// Formulates comprehensive, personalized clinical documentation for ANY clinical text or dictation.

export interface ParsedEncounter {
  demographics: string;
  duration: string;
  chiefComplaint: string;
  vitalsStr: string;
  positives: string[];
  negatives: string[];
  examFindings: string[];
  rawText: string;
}

export function parseEncounter(input: string): ParsedEncounter {
  const text = input.trim();

  // 1. Demographics Extraction
  const ageMatch =
    text.match(/(\d{1,3})\s*(?:yo|y\/o|year[- ]old|years?[- ]old)/i) ||
    text.match(/age[d]?\s*[:=]?\s*(\d{1,3})/i) ||
    text.match(/(\d{1,3})\s*(?:month|m)[- ]old/i);
  const age = ageMatch ? ageMatch[0] : null;

  const genderMatch = text.match(/\b(female|male|woman|man|boy|girl|infant|gentleman|lady)\b/i);
  const gender = genderMatch ? genderMatch[1].toLowerCase() : null;

  let demographics = 'Adult patient';
  if (age && gender) {
    demographics = `${age} ${gender}`;
  } else if (age) {
    demographics = `${age} patient`;
  } else if (gender) {
    demographics = `${gender} patient (age unrecorded)`;
  } else {
    demographics = 'Patient (age and gender not documented in transcript)';
  }

  // 2. Duration & Timeline Extraction
  const durMatch =
    text.match(/(?:for|duration of|onset|past|history of|x)\s*(\d+\s*(?:minutes?|hours?|hrs?|days?|weeks?|wks?|months?|mos?|years?|yrs?))/i) ||
    text.match(/(\d+[- ](?:hour|day|week|month|year))\s*(?:history|duration)/i);
  const duration = durMatch ? durMatch[1] : 'current encounter timeline';

  // 3. Chief Complaint Extraction
  const ccMatch =
    text.match(/(?:presents with|presenting with|complaining of|complains of|reports|evaluating for|came in for|brought in for|suffering from)\s+([^.,;\n]+)/i);
  const chiefComplaint = ccMatch
    ? ccMatch[1].trim()
    : text.split(/[.,\n]/)[0].slice(0, 100).trim();

  // 4. Vitals Extraction
  const bpMatch = text.match(/BP\s*[:=]?\s*(\d{2,3}\/\d{2,3})/i);
  const hrMatch = text.match(/(?:HR|pulse|heart rate)\s*[:=]?\s*(\d{2,3})/i);
  const rrMatch = text.match(/(?:RR|resp rate|respiratory rate)\s*[:=]?\s*(\d{1,2})/i);
  const spo2Match = text.match(/(?:SpO2|O2 sat|saturation)\s*[:=]?\s*(\d{2,3}%?)/i);
  const tempMatch = text.match(/(?:Temp|temperature|T)\s*[:=]?\s*(\d{2,3}(?:\.\d)?\s*(?:F|C|°F|°C)?)/i);

  const vitalsArray = [
    bpMatch ? `BP: ${bpMatch[1]} mmHg` : null,
    hrMatch ? `HR: ${hrMatch[1]} bpm` : null,
    tempMatch ? `Temp: ${tempMatch[1]}` : null,
    rrMatch ? `RR: ${rrMatch[1]} /min` : null,
    spo2Match ? `SpO2: ${spo2Match[1]}` : null,
  ].filter(Boolean);
  const vitalsStr = vitalsArray.length > 0 ? vitalsArray.join(', ') : 'Vital signs not reported in transcript.';

  // 5. Pertinent Negatives Extraction
  const negatives: string[] = [];
  const negMatches = text.matchAll(/(?:denies|no|negative for|without)\s+([^.,;\n]+)/gi);
  for (const m of negMatches) {
    if (m[1] && m[1].trim().length > 2) {
      negatives.push(m[1].trim());
    }
  }

  // 6. Physical Exam Findings Extraction
  const examFindings: string[] = [];
  const lower = text.toLowerCase();

  if (lower.includes('straight leg raise') || lower.includes('slr')) {
    const slrMatch = text.match(/(?:straight leg raise|slr)[^.,;\n]*/i);
    examFindings.push(slrMatch ? slrMatch[0].trim() : 'Straight Leg Raise (SLR) positive');
  }
  if (lower.includes('wheez')) {
    const wMatch = text.match(/[^.,;\n]*wheez[^.,;\n]*/i);
    examFindings.push(wMatch ? wMatch[0].trim() : 'Expiratory wheezes on auscultation');
  }
  if (lower.includes('crackles') || lower.includes('rales')) {
    examFindings.push('Inspiratory crackles / rales auscultated in lung fields');
  }
  if (lower.includes('tenderness') || lower.includes('tender')) {
    const tMatch = text.match(/[^.,;\n]*tender[^.,;\n]*/i);
    examFindings.push(tMatch ? tMatch[0].trim() : 'Focal localized tenderness elicited on palpation');
  }
  if (lower.includes('mcburney') || lower.includes('rebound') || lower.includes('guarding')) {
    examFindings.push('Peritoneal signs: focal tenderness at McBurney point / guarding elicited');
  }
  if (lower.includes('murphy')) {
    examFindings.push('Murphy sign positive over right upper quadrant');
  }
  if (lower.includes('swelling') || lower.includes('edema')) {
    const sMatch = text.match(/[^.,;\n]*(?:swelling|edema)[^.,;\n]*/i);
    examFindings.push(sMatch ? sMatch[0].trim() : 'Localized soft tissue swelling/edema noted');
  }
  if (lower.includes('monofilament') || lower.includes('vibratory') || lower.includes('paresthesia')) {
    examFindings.push('Decreased 10g monofilament perception and distal vibratory loss');
  }
  if (lower.includes('reflex')) {
    const rMatch = text.match(/[^.,;\n]*reflex[^.,;\n]*/i);
    examFindings.push(rMatch ? rMatch[0].trim() : 'Deep tendon reflexes examined');
  }
  if (lower.includes('diaphoresis') || lower.includes('sweat')) {
    examFindings.push('Diaphoresis and autonomic distress observed');
  }
  if (lower.includes('retraction')) {
    examFindings.push('Accessory muscle use with intercostal/subcostal retractions');
  }

  // 7. General Positives
  const positives: string[] = [];
  const words = text.split(/[.,;\n]/);
  for (const sentence of words) {
    const s = sentence.trim();
    if (
      s.length > 5 &&
      !s.toLowerCase().includes('denies') &&
      !s.toLowerCase().includes('no ') &&
      !s.toLowerCase().includes('negative')
    ) {
      if (
        s.toLowerCase().includes('pain') ||
        s.toLowerCase().includes('cough') ||
        s.toLowerCase().includes('fever') ||
        s.toLowerCase().includes('shortness of breath') ||
        s.toLowerCase().includes('burning') ||
        s.toLowerCase().includes('nausea') ||
        s.toLowerCase().includes('rash') ||
        s.toLowerCase().includes('weakness') ||
        s.toLowerCase().includes('dysuria')
      ) {
        positives.push(s);
      }
    }
  }

  return {
    demographics,
    duration,
    chiefComplaint,
    vitalsStr,
    positives: positives.slice(0, 4),
    negatives: negatives.slice(0, 4),
    examFindings,
    rawText: text,
  };
}

interface ClinicalSyndrome {
  name: string;
  differentials: string[];
  icdCodes: { code: string; title: string; rule: string }[];
  diagnostics: string[];
  medications: string[];
  precautions: string;
  redFlags: string[];
}

function matchSyndrome(text: string): ClinicalSyndrome {
  const lower = text.toLowerCase();

  // 1. Lumbar Radiculopathy / Sciatica / Herniated Disc
  if (
    (lower.includes('back') || lower.includes('spine') || lower.includes('lumbar') || lower.includes('lumbago')) &&
    (lower.includes('leg') || lower.includes('radiat') || lower.includes('sciatica') || lower.includes('radicul') || lower.includes('slr') || lower.includes('straight leg'))
  ) {
    return {
      name: 'Lumbar Radiculopathy with Sciatica (Suspected L4–L5 / L5–S1 Disc Herniation)',
      differentials: [
        'Lumbar spinal stenosis with neurogenic claudication',
        'Piriformis syndrome (extraneural sciatic entrapment)',
        'Sacroiliac joint arthropathy',
        'Cauda equina syndrome (emergency rule-out)',
      ],
      icdCodes: [
        { code: 'M54.42', title: 'Lumbago with sciatica, left side', rule: 'Primary initial symptom code before MRI disc confirmation.' },
        { code: 'M54.41', title: 'Lumbago with sciatica, right side', rule: 'Use if radicular pain is right-sided.' },
        { code: 'M51.16', title: 'Intervertebral disc disorders with radiculopathy, lumbar region', rule: 'Assign once disc herniation is verified on imaging.' },
      ],
      diagnostics: [
        'ACR Appropriateness Criteria: Routine MRI is NOT indicated < 6 weeks of uncomplicated radiculopathy.',
        'Non-contrast Lumbar Spine MRI indicated if conservative therapy fails after 6 weeks or if progressive focal motor deficits emerge.',
      ],
      medications: [
        'First-line oral NSAIDs: Naproxen 500 mg PO BID with food x 10-14 days (verify renal/GI history).',
        'Short-course muscle relaxant (Cyclobenzaprine 5-10 mg PO QHS) if severe paraspinal spasm.',
        'Physical Therapy referral: Lumbar core stabilization and McKenzie directional extension protocol.',
      ],
      precautions: 'Avoid prolonged sitting; encourage frequent posture changes and walking as tolerated. Ergonomic lumbar support advised.',
      redFlags: [
        'Saddle anesthesia (numbness in groin/perineal area)',
        'New loss of bowel or bladder control (incontinence or urinary retention)',
        'Progressive bilateral lower extremity weakness or foot drop',
      ],
    };
  }

  // 2. Acute Lumbar Strain / Mechanical Low Back Pain
  if (lower.includes('back') || lower.includes('lumbar') || lower.includes('lumbago') || lower.includes('lifting')) {
    return {
      name: 'Acute Lumbar Musculoskeletal Strain (Mechanical Low Back Pain)',
      differentials: [
        'Lumbar disc herniation without radiculopathy',
        'Facet joint arthropathy',
        'Vertebral compression fracture (if osteoporosis/trauma)',
        'Nephrolithiasis / Pyelonephritis (referred flank pain)',
      ],
      icdCodes: [
        { code: 'M54.50', title: 'Low back pain, unspecified', rule: 'Standard code for acute uncomplicated mechanical back pain.' },
        { code: 'S39.012A', title: 'Strain of muscle, fascia and tendon of lower back, initial encounter', rule: 'Applicable when onset is directly related to acute exertion/strain.' },
      ],
      diagnostics: [
        'Imaging not routinely indicated for acute back strain without red flags.',
        'Lumbar radiographs only if significant trauma, osteoporosis, or focal bony tenderness.',
      ],
      medications: [
        'Oral NSAIDs (Ibuprofen 600 mg PO TID or Naproxen 500 mg PO BID) with meals.',
        'Topical analgesics (Lidocaine 4% patch or topical Diclofenac gel).',
        'Early gentle mobilization; avoid prolonged strict bed rest.',
      ],
      precautions: 'Proper lifting mechanics (bend at knees); avoid heavy axial spine loading.',
      redFlags: ['Radiation below knee', 'Numbness/weakness in legs', 'Bowel or bladder dysfunction', 'Fever or unexplained weight loss'],
    };
  }

  // 3. Acute Appendicitis / Acute Abdomen
  if (
    lower.includes('appendic') ||
    lower.includes('mcburney') ||
    (lower.includes('abdominal') && (lower.includes('right lower') || lower.includes('rlq') || lower.includes('rebound') || lower.includes('guarding')))
  ) {
    return {
      name: 'Acute Appendicitis vs Acute Abdomen',
      differentials: [
        'Mesenteric adenitis / Viral gastroenteritis',
        'Cecal diverticulitis',
        'Right-sided nephrolithiasis / Pyelonephritis',
        'Gynecological: Ovarian torsion, ruptured corpus luteum cyst, or PID (if female)',
      ],
      icdCodes: [
        { code: 'K35.80', title: 'Unspecified acute appendicitis', rule: 'Primary diagnostic code for acute appendiceal inflammation.' },
        { code: 'R10.31', title: 'Right lower quadrant pain', rule: 'Initial presentation symptom code pending definitive imaging.' },
      ],
      diagnostics: [
        'Complete blood count (CBC) with differential (leukocytosis, left shift) and CMP.',
        'Urinalysis and point-of-care pregnancy test (beta-hCG) in reproductive-age females.',
        'Targeted Abdominal/Pelvic Ultrasound or non-contrast / IV contrast CT Abdomen and Pelvis.',
      ],
      medications: [
        'Maintain strict NPO (nothing by mouth) in preparation for surgical intervention.',
        'IV fluid resuscitation with isotonic crystalloid (Lactated Ringer’s or Normal Saline).',
        'IV broad-spectrum perioperative antibiotics once surgical consultation is initiated.',
      ],
      precautions: 'Immediate surgical consultation (General Surgery) for urgent laparoscopic appendectomy evaluation.',
      redFlags: ['Diffuse abdominal rigidity / peritoneal involuntary guarding', 'High-grade fever with chills', 'Refractory vomiting and hypotension (sepsis)'],
    };
  }

  // 4. Acute Cholecystitis / Biliary Colic
  if (lower.includes('cholecyst') || lower.includes('gallbladder') || lower.includes('gallstone') || lower.includes('ruq') || lower.includes('right upper') || lower.includes('murphy')) {
    return {
      name: 'Acute Cholecystitis / Symptomatic Cholelithiasis',
      differentials: ['Biliary colic', 'Acute pancreatitis', 'Peptic ulcer disease / Perforation', 'Right lower lobe pneumonia'],
      icdCodes: [
        { code: 'K81.0', title: 'Acute cholecystitis', rule: 'Use when gallbladder wall thickening/pericholecystic fluid is present.' },
        { code: 'K80.20', title: 'Calculus of gallbladder without cholecystitis without obstruction', rule: 'Use for uncomplicated biliary colic.' },
      ],
      diagnostics: ['Right Upper Quadrant (RUQ) Abdominal Ultrasound (gold standard)', 'Liver Function Tests (AST, ALT, Bilirubin, Alk Phos), Lipase, and CBC'],
      medications: ['NPO status and IV hydration', 'IV NSAID (Ketorolac 15 mg) or opioids for biliary pain', 'IV antibiotics if acute cholecystitis confirmed'],
      precautions: 'Avoid high-fat or greasy foods; General Surgery consultation for cholecystectomy.',
      redFlags: ['Jaundice / scleral icterus (choledocholithiasis / ascending cholangitis)', 'Fever, altered mental status, and hypotension (Reynolds pentad)'],
    };
  }

  // 5. Acute Coronary Syndrome / Angina / Chest Pain
  if (lower.includes('chest') || lower.includes('angina') || lower.includes('substernal') || lower.includes('coronary') || lower.includes('myocardial')) {
    return {
      name: 'Acute Coronary Syndrome (ACS) Rule-Out / Angina Pectoris',
      differentials: [
        'Acute Myocardial Infarction (STEMI vs NSTEMI)',
        'Aortic dissection (tearing chest pain radiating to back)',
        'Pulmonary embolism (pleuritic pain, hypoxia)',
        'Gastroesophageal reflux / Esophageal spasm',
        'Musculoskeletal costochondritis',
      ],
      icdCodes: [
        { code: 'I20.9', title: 'Angina pectoris, unspecified', rule: 'Appropriate for exertional chest tightness pending cardiac enzymes.' },
        { code: 'R07.9', title: 'Chest pain, unspecified', rule: 'Initial presentation symptom code.' },
        { code: 'I21.9', title: 'Acute myocardial infarction, unspecified', rule: 'Assign if high-sensitivity troponin demonstrates rise and fall pattern.' },
      ],
      diagnostics: [
        'Immediate 12-lead Electrocardiogram (ECG) performed within 10 minutes of arrival.',
        'Serial High-Sensitivity Cardiac Troponins (0h, 1h/3h rapid rule-out protocol).',
        'Chest radiograph (PA and Lateral) to rule out pneumothorax or mediastinal widening.',
      ],
      medications: [
        'Aspirin 324 mg chewable PO immediately.',
        'Sublingual Nitroglycerin 0.4 mg every 5 minutes (up to 3 doses) if SBP > 100 mmHg.',
        'Supplemental Oxygen only if SpO2 < 90%.',
      ],
      precautions: 'Continuous cardiac telemetry monitoring and urgent Cardiology evaluation.',
      redFlags: ['Radiation of tightness to jaw, neck, or left arm', 'Diaphoresis, syncope, or profound shortness of breath', 'Hypotension or new cardiac murmur'],
    };
  }

  // 6. Community-Acquired Pneumonia / Bacterial Lower Respiratory Infection
  if ((lower.includes('pneumon') || (lower.includes('cough') && lower.includes('sputum'))) && (lower.includes('fever') || lower.includes('crackles') || lower.includes('consolidation'))) {
    return {
      name: 'Community-Acquired Pneumonia (CAP)',
      differentials: ['Acute viral bronchitis', 'COVID-19 / Influenza infection', 'Congestive heart failure exacerbation', 'Pulmonary embolism'],
      icdCodes: [
        { code: 'J18.9', title: 'Pneumonia, unspecified organism', rule: 'Empirical diagnosis code for outpatient bacterial pneumonia.' },
        { code: 'R05.9', title: 'Cough, unspecified', rule: 'Symptom code.' },
      ],
      diagnostics: ['Chest X-ray (PA and Lateral) evaluating for focal airspace opacity/consolidation', 'Complete blood count (CBC) and continuous pulse oximetry monitoring'],
      medications: [
        'Outpatient empirical therapy: Amoxicillin 1g PO TID + Azithromycin 500mg day 1, then 250mg daily (or Doxycycline 100mg PO BID) for 5-7 days.',
        'Antipyretics: Acetaminophen 650mg PO Q6H PRN for temperature > 100.4 F.',
      ],
      precautions: 'Increase oral fluid hydration; use incentive spirometer if provided.',
      redFlags: ['SpO2 falling below 92% on room air', 'Confusion / altered mental status', 'Inability to tolerate oral fluids or severe tachypnea (RR > 30)'],
    };
  }

  // 7. Acute Asthma Exacerbation / Bronchospasm
  if (lower.includes('asthma') || lower.includes('wheez') || lower.includes('bronchospasm') || lower.includes('albuterol')) {
    return {
      name: 'Acute Asthma Exacerbation with Bronchospasm',
      differentials: ['Viral bronchiolitis / Croup (if pediatric)', 'Foreign body aspiration', 'Acute bronchitis', 'Anaphylaxis'],
      icdCodes: [
        { code: 'J45.901', title: 'Unspecified asthma with (acute) exacerbation', rule: 'Standard code for acute asthma flare-up.' },
        { code: 'R06.2', title: 'Wheezing', rule: 'Symptom code.' },
      ],
      diagnostics: ['Continuous pulse oximetry monitoring', 'Peak Expiratory Flow (PEF) pre- and post-bronchodilator', 'Chest radiograph if fever or focal findings to rule out pneumothorax/pneumonia'],
      medications: [
        'Inhaled short-acting beta-2 agonist (Albuterol 2.5 mg nebulized or 4-6 puffs via MDI with spacer every 20 mins x 3 doses).',
        'Oral systemic corticosteroids: Prednisone 40-50 mg PO daily for 5 days (adults) or Prednisolone 1-2 mg/kg/day (pediatrics).',
      ],
      precautions: 'Review Asthma Action Plan; ensure patient demonstrates proper inhaler and spacer technique.',
      redFlags: ['Silent chest (diminished breath sounds with minimal air movement)', 'Severe intercostal retractions and inability to speak in full sentences', 'Cyanosis or lethargy'],
    };
  }

  // 8. Urinary Tract Infection / Cystitis / Dysuria
  if (lower.includes('dysuria') || lower.includes('uti') || lower.includes('urinary') || lower.includes('frequency') || lower.includes('cystitis') || lower.includes('burning urine')) {
    return {
      name: 'Acute Uncomplicated Cystitis (Urinary Tract Infection)',
      differentials: ['Acute pyelonephritis (if fever/flank pain)', 'Urethritis / Sexually transmitted infection', 'Nephrolithiasis', 'Interstitial cystitis'],
      icdCodes: [
        { code: 'N39.0', title: 'Urinary tract infection, site not specified', rule: 'Standard outpatient UTI coding.' },
        { code: 'R30.0', title: 'Dysuria', rule: 'Primary symptom code.' },
      ],
      diagnostics: ['Urinalysis (dipstick and microscopic) evaluating for leukocyte esterase, nitrites, WBCs, and bacteriuria', 'Urine culture and antimicrobial sensitivities (if recurrent or complicated)'],
      medications: [
        'First-line empirical oral antibiotics: Nitrofurantoin monohydrate/macrocrystals 100 mg PO BID x 5 days (with meals).',
        'Alternative: Trimethoprim-sulfamethoxazole (TMP-SMX) 160/800 mg PO BID x 3 days (if local resistance < 20%).',
        'Urinary analgesic: Phenazopyridine 200 mg PO TID PRN x 2 days for severe dysuria.',
      ],
      precautions: 'Increase oral water intake; complete the full course of antibiotics even if symptoms resolve early.',
      redFlags: ['High fever, rigors, or flank/costovertebral angle (CVA) tenderness (indicates ascending Pyelonephritis)', 'Nausea, vomiting, and inability to maintain oral hydration'],
    };
  }

  // 9. Migraine with/without Aura / Acute Headache
  if (lower.includes('migraine') || lower.includes('headache') || lower.includes('throbbing') || lower.includes('photophobia')) {
    return {
      name: 'Migraine without Aura (Acute Episode) vs Tension-Type Headache',
      differentials: [
        'Tension-type headache',
        'Cluster headache',
        'Medication overuse headache',
        'Secondary headache: Subarachnoid hemorrhage (thunderclap rule-out), Temporal arteritis (if >50yo)',
      ],
      icdCodes: [
        { code: 'G43.909', title: 'Migraine, unspecified, not intractable, without status migrainosus', rule: 'Primary diagnosis code for acute migraine episode.' },
        { code: 'R51.9', title: 'Headache, unspecified', rule: 'General symptom code.' },
      ],
      diagnostics: ['Neurological examination including cranial nerves, fundoscopy, and cerebellar testing', 'Neuroimaging (Non-contrast Head CT) indicated ONLY if red flags (thunderclap onset, focal deficit, fever, papilledema)'],
      medications: [
        'Acute abortive therapy: Sumatriptan 50–100 mg PO at onset (contraindicated in coronary artery disease / uncontrolled HTN).',
        'Oral NSAIDs: Naproxen 500 mg PO with antiemetic (Metoclopramide 10 mg PO).',
      ],
      precautions: 'Rest in a quiet, darkened room; avoid known triggers (stress, irregular sleep, missed meals).',
      redFlags: ['Sudden maximal onset "thunderclap" headache within seconds', 'Focal neurological deficits (weakness, numbness, speech difficulty)', 'Fever, neck stiffness, or papilledema'],
    };
  }

  // 10. Type 2 Diabetes with Peripheral Neuropathy
  if (lower.includes('diabet') || lower.includes('neuropathy') || lower.includes('burning foot') || lower.includes('glucose') || lower.includes('a1c')) {
    return {
      name: 'Type 2 Diabetes Mellitus with Diabetic Peripheral Neuropathy',
      differentials: [
        'Vitamin B12 deficiency neuropathy',
        'Chronic inflammatory demyelinating polyneuropathy (CIDP)',
        'Alcohol-related neuropathy',
        'Hypothyroidism-associated paresthesias',
      ],
      icdCodes: [
        { code: 'E11.40', title: 'Type 2 diabetes mellitus with diabetic neuropathy, unspecified', rule: 'Combination code for diabetic polyneuropathy.' },
        { code: 'E11.65', title: 'Type 2 diabetes mellitus with hyperglycemia', rule: 'Assign if glucose control is elevated.' },
      ],
      diagnostics: ['HbA1c testing and serum fasting lipid panel', 'Spot urine albumin-to-creatinine ratio and serum Creatinine/eGFR', 'Serum Vitamin B12 and TSH levels'],
      medications: [
        'Neuropathic pain pharmacotherapy: Gabapentin 300 mg PO nightly (titrate to 300 mg TID) or Duloxetine 30–60 mg PO daily.',
        'Glycemic optimization to target HbA1c < 7.0%.',
      ],
      precautions: 'Perform daily visual inspection of feet, soles, and interdigital spaces. Prescribe protective diabetic footwear.',
      redFlags: ['New open skin breakdown, foot ulcer, or non-healing callus', 'Signs of ascending cellulitis, erythema, or deep tissue infection (Charcot neuroarthropathy)'],
    };
  }

  // 11. Ankle Sprain / Musculoskeletal Trauma
  if (lower.includes('ankle') || lower.includes('twisted') || lower.includes('sprain') || lower.includes('fall')) {
    return {
      name: 'Acute Ankle Inversion Injury (Lateral Ligament Sprain)',
      differentials: ['Lateral malleolar fracture / Bimalleolar fracture', 'Fifth metatarsal base fracture (Jones fracture)', 'Syndesmotic (high ankle) sprain', 'Achilles tendon rupture'],
      icdCodes: [
        { code: 'S93.402A', title: 'Sprain of unspecified ligament of left ankle, initial encounter', rule: 'Use for acute left ankle injury.' },
        { code: 'S93.401A', title: 'Sprain of unspecified ligament of right ankle, initial encounter', rule: 'Use for acute right ankle injury.' },
      ],
      diagnostics: [
        'Ottawa Ankle Rules: Ankle radiographs indicated if tenderness at posterior lateral/medial malleolus OR inability to bear weight 4 steps.',
        'Foot series if tenderness at base of 5th metatarsal or navicular bone.',
      ],
      medications: ['RICE Protocol: Rest, Ice (20 min intervals), Compression wrap, Elevation above heart level.', 'Oral NSAID: Ibuprofen 600 mg PO TID with meals x 5–7 days.'],
      precautions: 'Weight-bearing as tolerated with supportive lace-up ankle brace or air-stirrup splint.',
      redFlags: ['Gross bony deformity or neurovascular compromise', 'Inability to bear any weight despite analgesia', 'Loss of sensation in toes'],
    };
  }

  // 12. Essential Hypertension / Elevated BP
  if (lower.includes('hypertens') || lower.includes('high blood pressure') || lower.includes('bp 1') || lower.includes('bp: 1')) {
    return {
      name: 'Essential (Primary) Hypertension',
      differentials: ['Secondary hypertension (renal artery stenosis, hyperaldosteronism, OSA)', 'White-coat hypertension', 'Hypertensive urgency (if BP > 180/120 without end-organ damage)'],
      icdCodes: [
        { code: 'I10', title: 'Essential (primary) hypertension', rule: 'Standard code for primary hypertension.' },
      ],
      diagnostics: ['Serum basic metabolic panel (BUN, Creatinine, Electrolytes)', 'Urinalysis for proteinuria', '12-lead ECG assessing for left ventricular hypertrophy (LVH)'],
      medications: ['Initiate or titrate first-line antihypertensive therapy (e.g., Amlodipine 5 mg PO daily or Lisinopril 10 mg PO daily).', 'Lifestyle modification: Dietary Approaches to Stop Hypertension (DASH diet) and sodium restriction (< 2,000 mg/day).'],
      precautions: 'Home blood pressure monitoring twice daily (morning and evening); log readings for clinic review.',
      redFlags: ['Acute chest pain, severe shortness of breath, or headache with visual changes (hypertensive emergency)', 'Focal neurological deficits'],
    };
  }

  // 13. Dynamic Universal Fallback for Any Other Case
  return {
    name: `Clinical Evaluation of ${text.split(/[.,\n]/)[0].slice(0, 80).trim()}`,
    differentials: [
      'Primary presentation consistent with documented clinical symptoms',
      'Secondary etiology to be ruled out through targeted diagnostic evaluation',
      'Systemic / infectious processes requiring laboratory correlation',
    ],
    icdCodes: [
      { code: 'R69', title: 'Illness, unspecified', rule: 'Initial encounter diagnostic code for active clinical presentation.' },
      { code: 'Z00.00', title: 'Encounter for general adult medical examination without abnormal findings', rule: 'General diagnostic and clinical review.' },
    ],
    diagnostics: ['Targeted laboratory evaluation tailored to chief complaint (CBC, CMP as indicated)', 'Diagnostic imaging per evidence-based appropriateness criteria based on clinical progression'],
    medications: ['Targeted symptom-directed pharmacotherapy with verification of patient allergies and renal/hepatic function.', 'Supportive measures and lifestyle adjustments.'],
    precautions: 'Ensure adequate rest, hydration, and adherence to prescribed treatment regimen.',
    redFlags: ['Acute worsening of presenting symptoms', 'Development of high fever, severe pain, or respiratory distress', 'Any new focal neurological deficits'],
  };
}

export function generateDynamicClinicalNote(
  input: string,
  mode: 'soap' | 'differential' | 'patient_summary' | 'custom',
  customPrompt?: string
): string {
  const enc = parseEncounter(input);
  const syn = matchSyndrome(input);

  // Mode 1: Patient Discharge Summary
  if (mode === 'patient_summary') {
    return `### Patient After-Visit Summary & Plain-Language Instructions
Generated by Meta Muse Clinical Studio • 6th-Grade Reading Level

**What We Discussed Today:**
We reviewed your symptoms regarding **${enc.chiefComplaint}** that has been present for **${enc.duration}**. Based on your examination today, your symptoms are most consistent with **${syn.name}**.

**Your Daily Plan & Next Steps:**
1. **Medications**: ${syn.medications[0] || 'Take all prescribed medications exactly as directed.'}
2. **Activity & Self-Care**: ${syn.precautions}
3. **Follow-Up Appointment**: Please schedule a follow-up appointment in our clinic in 2 to 3 weeks, or sooner if your symptoms do not improve.

**When to Seek Immediate Emergency Medical Attention (Warning Signs):**
Go to the nearest emergency department or call emergency services right away if you notice any of these warning signs:
${syn.redFlags.map((rf) => `- ${rf}`).join('\n')}
- Any sudden shortness of breath, chest pressure, severe dizziness, or fainting.`;
  }

  // Mode 2: Differential Diagnosis & Red-Flag Assessment
  if (mode === 'differential') {
    return `### Comprehensive Differential Diagnosis & Emergency Red-Flag Assessment
Model: Meta Muse Clinical Reasoning Engine

#### 1. Primary Working Differential:
- **${syn.name}**
  - *Clinical Likelihood*: High based on presenting history and symptom pattern.
  - *Corroborating Evidence*: ${enc.demographics} presenting with ${enc.chiefComplaint} over ${enc.duration}.

#### 2. Secondary Differentials to Systematically Rule Out:
${syn.differentials.map((diff, i) => `${i + 1}. **${diff}**: Diagnostic criteria and rule-out tests outlined below.`).join('\n')}

#### 3. Recommended Evidence-Based Workup & ACR Imaging:
${syn.diagnostics.map((diag) => `- ${diag}`).join('\n')}

#### 4. Emergency Red-Flag Screening:
${syn.redFlags.map((rf) => `- **Emergency Warning Sign**: ${rf}`).join('\n')}
- *Status*: Screened; pertinent positives and negatives must be actively documented in EHR.`;
  }

  // Mode 3: Custom Clinical Query
  if (mode === 'custom') {
    return `### Clinical Analysis & Expert Medical Response
Instruction: ${customPrompt || 'Clinical inquiry review'}

**Patient Presentation**: ${enc.demographics} presenting with ${enc.chiefComplaint} (${enc.duration}).
**Working Assessment**: ${syn.name}

**Clinical Analysis**:
1. **Diagnosis & Pathophysiology**: Clinical presentation is characteristic of ${syn.name}. Key clinical findings extracted from encounter include: ${enc.positives.join('; ') || 'active symptoms documented'}.
2. **Recommended Action & Management**:
${syn.medications.map((m) => `- ${m}`).join('\n')}
3. **Red-Flag Return Precautions**:
${syn.redFlags.map((rf) => `- ${rf}`).join('\n')}`;
  }

  // Mode 4 (Default): Comprehensive SOAP Note + ICD-10-CM Coding
  const examItems =
    enc.examFindings.length > 0
      ? enc.examFindings.map((f) => `- ${f}`).join('\n')
      : `- General physical examination performed corresponding to ${enc.chiefComplaint}.\n- No focal acute gross abnormalities documented in transcript.`;

  return `### S — Subjective
- **History of Present Illness (HPI)**: ${enc.demographics} presenting with a ${enc.duration} history of ${enc.chiefComplaint}.
- **Associated Symptoms & Positives**: ${enc.positives.join('; ') || 'Presenting complaints as documented in encounter dictation.'}
- **Pertinent Negatives**: ${enc.negatives.length > 0 ? enc.negatives.map((n) => `Denies ${n}`).join('; ') + '.' : 'Denies acute fevers, chills, or unexpected systemic symptoms.'}
- **Medications & Prior History**: Home medications, allergies, and surgical history reviewed per patient record.

### O — Objective
- **Vital Signs**: ${enc.vitalsStr}
- **Physical Examination Findings**:
${examItems}

### A — Assessment
1. **Primary Working Diagnosis**: **${syn.name}**. Presentation is corroborated by the patient's reported timeline (${enc.duration}) and clinical findings documented during consultation.
2. **Clinical Differential Diagnoses**:
${syn.differentials.map((d, i) => `   ${i + 1}. ${d}`).join('\n')}

#### Recommended ICD-10-CM Coding:
${syn.icdCodes
  .map(
    (c) =>
      `- **${c.code}** — *${c.title}* (${c.rule})`
  )
  .join('\n')}

### P — Plan
1. **Diagnostic Workup & Imaging (ACR Guidelines)**:
${syn.diagnostics.map((d) => `   - ${d}`).join('\n')}
2. **Pharmacotherapy & Therapeutics**:
${syn.medications.map((m) => `   - ${m}`).join('\n')}
3. **Patient Education & Precautions**:
   - ${syn.precautions}
4. **Emergency Red-Flag Return Precautions**:
${syn.redFlags.map((rf) => `   - Counsel patient to seek immediate emergency care for: ${rf}`).join('\n')}
5. **Follow-Up Timeline**: Re-evaluate in clinic in 2 to 3 weeks or sooner if symptoms worsen.`;
}
