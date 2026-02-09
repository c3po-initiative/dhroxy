import React, { useState, useEffect } from 'react';
import {
  Heart,
  Utensils,
  Dumbbell,
  Wine,
  Cigarette,
  Moon,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  Beef,
  Leaf,
  Droplets,
  Sun,
  Brain,
  Users,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowRight,
  Calendar
} from 'lucide-react';
import sundhedDkService from '../../services/sundhedDkService';

/**
 * PersonalRecommendations - Personlige anbefalinger baseret på labværdier
 * Inkluderer KRAM-faktorer (Kost, Rygning, Alkohol, Motion) og familiehistorik
 */
const PersonalRecommendations = () => {
  const [labResults, setLabResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState(null);
  const [familyHistory, setFamilyHistory] = useState({
    diabetes: false,
    heartDisease: false,
    cancer: false,
    hypertension: false
  });
  const [lifestyle, setLifestyle] = useState({
    smoker: false,
    alcoholWeekly: 0,
    exerciseWeekly: 0,
    sleepHours: 7
  });
  const [showProfileForm, setShowProfileForm] = useState(false);

  useEffect(() => {
    fetchLabResults();
  }, []);

  const fetchLabResults = async () => {
    setLoading(true);
    try {
      const result = await sundhedDkService.getLabResults('Alle', 500);
      if (result.success && result.data?.entry) {
        const observations = result.data.entry.map(e => e.resource);
        setLabResults(observations);
      }
    } catch (error) {
      console.error('Fejl ved hentning af labsvar:', error);
    }
    setLoading(false);
  };

  // Find seneste værdi for en given test med reference range
  const findLatestValue = (keywords) => {
    const matching = labResults.filter(obs => {
      const name = (obs.code?.text || obs.code?.coding?.[0]?.display || '').toLowerCase();
      return keywords.some(kw => name.includes(kw.toLowerCase()));
    });

    if (matching.length === 0) return null;

    // Sorter efter dato og tag den nyeste
    const sorted = matching.sort((a, b) => {
      const dateA = new Date(a.effectiveDateTime || a.issued || 0);
      const dateB = new Date(b.effectiveDateTime || b.issued || 0);
      return dateB - dateA;
    });

    const latest = sorted[0];
    const value = latest.valueQuantity?.value ?? latest.valueString;
    const unit = latest.valueQuantity?.unit || '';
    const name = latest.code?.text || latest.code?.coding?.[0]?.display || '';
    const referenceRange = latest.referenceRange?.[0]?.text || null;

    return {
      value,
      unit,
      name,
      date: latest.effectiveDateTime || latest.issued,
      referenceRange,
      observation: latest
    };
  };

  // Analyser alle labværdier og find dem der kræver opmærksomhed
  const analyzeLabValues = () => {
    const criticalLabs = [];
    const warningLabs = [];
    const normalLabs = [];

    // Definer tests med deres grænseværdier
    const labChecks = [
      {
        keywords: ['ferritin'],
        name: 'Ferritin (jernlager)',
        lowThreshold: 15,
        highThreshold: 300,
        lowWarning: 30,
        unit: 'µg/L',
        category: 'Jernstatus'
      },
      {
        keywords: ['hæmoglobin', 'hemoglobin', 'hgb'],
        name: 'Hæmoglobin',
        lowThreshold: 7.0, // Kritisk lav for kvinder
        highThreshold: 11.0,
        lowWarning: 7.5,
        highWarning: 10.5,
        unit: 'mmol/L',
        category: 'Blodværdier'
      },
      {
        keywords: ['kolesterol', 'cholesterol'],
        name: 'Total-kolesterol',
        highThreshold: 8.0, // Kritisk høj
        highWarning: 5.0,
        unit: 'mmol/L',
        category: 'Lipider'
      },
      {
        keywords: ['ldl'],
        name: 'LDL-kolesterol',
        highThreshold: 5.0,
        highWarning: 3.0,
        unit: 'mmol/L',
        category: 'Lipider'
      },
      {
        keywords: ['hdl'],
        name: 'HDL-kolesterol',
        lowThreshold: 0.8,
        lowWarning: 1.0,
        unit: 'mmol/L',
        category: 'Lipider'
      },
      {
        keywords: ['triglycerid'],
        name: 'Triglycerid',
        highThreshold: 4.0,
        highWarning: 2.0,
        unit: 'mmol/L',
        category: 'Lipider'
      },
      {
        keywords: ['hba1c', 'glykeret'],
        name: 'HbA1c (langtidsblodsukker)',
        highThreshold: 48, // Diabetes
        highWarning: 42, // Prædiabetes
        unit: 'mmol/mol',
        category: 'Blodsukker'
      },
      {
        keywords: ['glukose', 'glucose', 'blodsukker'],
        name: 'Faste-blodsukker',
        highThreshold: 7.0,
        highWarning: 6.1,
        lowThreshold: 3.0,
        lowWarning: 4.0,
        unit: 'mmol/L',
        category: 'Blodsukker'
      },
      {
        keywords: ['vitamin d', 'd-vitamin', '25-hydroxy'],
        name: 'D-vitamin',
        lowThreshold: 12, // Svær mangel
        lowWarning: 50,
        unit: 'nmol/L',
        category: 'Vitaminer'
      },
      {
        keywords: ['b12', 'cobalamin'],
        name: 'Vitamin B12',
        lowThreshold: 100, // Svær mangel
        lowWarning: 200,
        unit: 'pmol/L',
        category: 'Vitaminer'
      },
      {
        keywords: ['folat', 'folsyre'],
        name: 'Folat',
        lowThreshold: 5,
        lowWarning: 10,
        unit: 'nmol/L',
        category: 'Vitaminer'
      },
      {
        keywords: ['egfr', 'gfr'],
        name: 'eGFR (nyrefunktion)',
        lowThreshold: 30, // Svært nedsat
        lowWarning: 60,
        unit: 'mL/min',
        category: 'Nyrer'
      },
      {
        keywords: ['kreatinin', 'creatinin'],
        name: 'Kreatinin',
        highThreshold: 200,
        highWarning: 105,
        unit: 'µmol/L',
        category: 'Nyrer'
      },
      {
        keywords: ['alat', 'alt', 'alanin'],
        name: 'ALAT (levertal)',
        highThreshold: 100,
        highWarning: 45,
        unit: 'U/L',
        category: 'Lever'
      },
      {
        keywords: ['asat', 'ast'],
        name: 'ASAT (levertal)',
        highThreshold: 100,
        highWarning: 35,
        unit: 'U/L',
        category: 'Lever'
      },
      {
        keywords: ['ggt', 'gamma'],
        name: 'GGT (levertal)',
        highThreshold: 150,
        highWarning: 60,
        unit: 'U/L',
        category: 'Lever'
      },
      {
        keywords: ['tsh'],
        name: 'TSH (skjoldbruskkirtel)',
        lowThreshold: 0.1,
        highThreshold: 10,
        lowWarning: 0.4,
        highWarning: 4.0,
        unit: 'mIU/L',
        category: 'Skjoldbruskkirtel'
      },
      {
        keywords: ['crp', 'c-reaktiv'],
        name: 'CRP (inflammation)',
        highThreshold: 50, // Svær inflammation
        highWarning: 10,
        unit: 'mg/L',
        category: 'Inflammation'
      },
      {
        keywords: ['leukocyt', 'hvide blodlegemer'],
        name: 'Leukocytter',
        lowThreshold: 2.0,
        highThreshold: 15.0,
        lowWarning: 4.0,
        highWarning: 10.0,
        unit: '10^9/L',
        category: 'Blodværdier'
      },
      {
        keywords: ['trombocyt', 'blodplade'],
        name: 'Trombocytter',
        lowThreshold: 50,
        highThreshold: 500,
        lowWarning: 150,
        highWarning: 400,
        unit: '10^9/L',
        category: 'Blodværdier'
      }
    ];

    labChecks.forEach(check => {
      const result = findLatestValue(check.keywords);
      if (!result || result.value === null || result.value === undefined) return;

      const value = parseFloat(result.value);
      if (isNaN(value)) return;

      let status = 'normal';
      let statusText = 'Normal';
      let deviation = null;

      // Check kritiske værdier først
      if (check.lowThreshold !== undefined && value < check.lowThreshold) {
        status = 'critical';
        statusText = 'Kritisk lav';
        deviation = 'low';
      } else if (check.highThreshold !== undefined && value > check.highThreshold) {
        status = 'critical';
        statusText = 'Kritisk høj';
        deviation = 'high';
      }
      // Check warning værdier
      else if (check.lowWarning !== undefined && value < check.lowWarning) {
        status = 'warning';
        statusText = 'Lav';
        deviation = 'low';
      } else if (check.highWarning !== undefined && value > check.highWarning) {
        status = 'warning';
        statusText = 'Forhøjet';
        deviation = 'high';
      }

      const labEntry = {
        ...check,
        value,
        actualUnit: result.unit || check.unit,
        date: result.date,
        referenceRange: result.referenceRange,
        status,
        statusText,
        deviation,
        displayName: result.name || check.name
      };

      if (status === 'critical') {
        criticalLabs.push(labEntry);
      } else if (status === 'warning') {
        warningLabs.push(labEntry);
      } else {
        normalLabs.push(labEntry);
      }
    });

    return { criticalLabs, warningLabs, normalLabs };
  };

  const { criticalLabs, warningLabs, normalLabs } = analyzeLabValues();

  // Analyser labværdier og generer anbefalinger
  const generateRecommendations = () => {
    const recommendations = {
      diet: [],
      exercise: [],
      lifestyle: [],
      monitoring: []
    };

    // === JERN/FERRITIN ANALYSE ===
    const ferritin = findLatestValue(['ferritin']);
    const iron = findLatestValue(['jern', 'iron', 'fe;']);
    const hemoglobin = findLatestValue(['hæmoglobin', 'hemoglobin', 'hgb']);

    if (ferritin?.value && ferritin.value < 30) {
      recommendations.diet.push({
        priority: 'high',
        title: 'Spis jernrig kost',
        description: `Dit ferritin er ${ferritin.value} ${ferritin.unit}, hvilket tyder på lave jernlagre.`,
        tips: [
          'Spis rødt kød 2-3 gange om ugen (oksekød, lammekød)',
          'Inkluder lever eller leverpostej ugentligt',
          'Spis C-vitamin rige fødevarer sammen med jernkilder (citrus, peberfrugt)',
          'Undgå kaffe og te til måltider - de hæmmer jernoptagelse',
          'Prøv grønne bladgrøntsager som spinat og grønkål'
        ],
        foods: ['Oksekød', 'Lever', 'Linser', 'Spinat', 'Tofu', 'Quinoa'],
        icon: Beef
      });
    }

    // === KOLESTEROL ANALYSE ===
    const totalChol = findLatestValue(['kolesterol', 'cholesterol']);
    const ldl = findLatestValue(['ldl']);
    const hdl = findLatestValue(['hdl']);
    const triglycerides = findLatestValue(['triglycerid']);

    if (totalChol?.value && totalChol.value > 5) {
      recommendations.diet.push({
        priority: totalChol.value > 6.5 ? 'high' : 'medium',
        title: 'Reducer dit kolesterol gennem kosten',
        description: `Dit totalkolesterol er ${totalChol.value} ${totalChol.unit}. Målværdi er under 5 mmol/L.`,
        tips: [
          'Erstat smør med olivenolie eller rapsolie',
          'Spis fed fisk 2-3 gange ugentligt (laks, makrel, sild)',
          'Øg indtag af fibre fra havregryn, bønner og grøntsager',
          'Reducer indtag af forarbejdet kød og rødt kød',
          'Spis en håndfuld nødder dagligt (valnødder, mandler)'
        ],
        foods: ['Havregryn', 'Laks', 'Valnødder', 'Avocado', 'Bønner', 'Olivenolie'],
        icon: Heart
      });

      recommendations.exercise.push({
        priority: 'medium',
        title: 'Regelmæssig motion sænker kolesterol',
        description: 'Fysisk aktivitet øger HDL (det gode kolesterol) og hjælper med vægtkontrol.',
        tips: [
          'Gå mindst 30 minutter dagligt i raskt tempo',
          'Overvej cykling til arbejde eller indkøb',
          'Prøv svømning - skånsomt for led og godt for hjertet',
          'Styrketræning 2 gange ugentligt forbedrer kolesterolprofil'
        ],
        icon: Dumbbell
      });
    }

    if (ldl?.value && ldl.value > 3) {
      recommendations.diet.push({
        priority: ldl.value > 4 ? 'high' : 'medium',
        title: 'Sænk dit LDL-kolesterol',
        description: `Dit LDL er ${ldl.value} ${ldl.unit}. LDL kaldes "det dårlige kolesterol" og bør være under 3 mmol/L.`,
        tips: [
          'Spis plantebaserede måltider flere gange om ugen',
          'Undgå transfedtsyrer (friturestegt mad, kager, kiks)',
          'Vælg fuldkornsprodukter frem for hvidt brød og pasta',
          'Spis flere bælgfrugter som linser og kikærter'
        ],
        foods: ['Linser', 'Kikærter', 'Fuldkornsbrød', 'Æbler', 'Jordbær'],
        icon: Leaf
      });
    }

    if (hdl?.value && hdl.value < 1.0) {
      recommendations.exercise.push({
        priority: 'high',
        title: 'Øg dit HDL med motion',
        description: `Dit HDL er ${hdl.value} ${hdl.unit}. HDL er "det gode kolesterol" og bør være over 1.0 mmol/L.`,
        tips: [
          'Intensiv motion 3-4 gange ugentligt øger HDL markant',
          'Intervaltræning er særligt effektivt',
          'Selv moderat aktivitet som rask gang hjælper',
          'Tab af overvægt øger også HDL'
        ],
        icon: Dumbbell
      });
    }

    // === BLODSUKKER/DIABETES ANALYSE ===
    const hba1c = findLatestValue(['hba1c', 'glykeret']);
    const glucose = findLatestValue(['glukose', 'glucose', 'blodsukker']);

    if (hba1c?.value && hba1c.value > 42) {
      const isPreDiabetes = hba1c.value >= 42 && hba1c.value < 48;
      const isDiabetes = hba1c.value >= 48;

      recommendations.diet.push({
        priority: isDiabetes ? 'high' : 'medium',
        title: isPreDiabetes ? 'Forebyg diabetes med kostændringer' : 'Kontroller dit blodsukker',
        description: `Dit HbA1c er ${hba1c.value} ${hba1c.unit}. ${isPreDiabetes ? 'Du er i prædiabetes-stadiet.' : 'Det tyder på diabetes.'}`,
        tips: [
          'Vælg fødevarer med lavt glykæmisk indeks (GI)',
          'Spis regelmæssigt - undgå at springe måltider over',
          'Reducer sukker og hvide kulhydrater markant',
          'Spis protein og fiber til hvert måltid for at stabilisere blodsukkeret',
          'Vælg fuldkorn frem for raffinerede kornprodukter'
        ],
        foods: ['Havregryn', 'Quinoa', 'Grøntsager', 'Bønner', 'Nødder', 'Æg'],
        icon: Droplets
      });

      recommendations.exercise.push({
        priority: 'high',
        title: 'Motion forbedrer insulinfølsomhed',
        description: 'Regelmæssig motion er lige så vigtigt som kost for blodsukkerkontrol.',
        tips: [
          'Gå en tur efter måltider - det sænker blodsukkeret',
          'Styrketræning øger musklernes sukkeroptagelse',
          'Sigter mod 150 minutter moderat aktivitet ugentligt',
          'Undgå lange perioder med stillesiddende arbejde'
        ],
        icon: Dumbbell
      });
    }

    // === VITAMIN D ANALYSE ===
    const vitaminD = findLatestValue(['vitamin d', 'd-vitamin', '25-hydroxy']);

    if (vitaminD?.value && vitaminD.value < 50) {
      recommendations.lifestyle.push({
        priority: vitaminD.value < 25 ? 'high' : 'medium',
        title: 'Øg dit D-vitamin niveau',
        description: `Dit D-vitamin er ${vitaminD.value} ${vitaminD.unit}. Optimalt niveau er 50-100 nmol/L.`,
        tips: [
          'Tag D-vitamin tilskud (20-40 mikrogram dagligt i vinterhalvåret)',
          'Spis fed fisk 2-3 gange ugentligt',
          'Få 15-20 min sol dagligt om sommeren (uden solcreme)',
          'Spis æg og berigede mejeriprodukter'
        ],
        foods: ['Laks', 'Makrel', 'Æg', 'Berigede mejeriprodukter', 'Svampe'],
        icon: Sun
      });
    }

    // === B12 ANALYSE ===
    const b12 = findLatestValue(['b12', 'cobalamin']);

    if (b12?.value && b12.value < 200) {
      recommendations.diet.push({
        priority: b12.value < 150 ? 'high' : 'medium',
        title: 'Øg dit B12 indtag',
        description: `Dit B12 er ${b12.value} ${b12.unit}. B12 er vigtigt for nervesystem og blodproduktion.`,
        tips: [
          'Spis kød, fisk og æg regelmæssigt',
          'Hvis du er vegetar/veganer, tag B12 tilskud',
          'Spis berigede fødevarer som plantemælk med B12',
          'Tal med lægen om B12-injektioner ved meget lave værdier'
        ],
        foods: ['Oksekød', 'Lever', 'Laks', 'Æg', 'Berigede produkter'],
        icon: Brain
      });
    }

    // === NYREFUNKTION ===
    const creatinin = findLatestValue(['kreatinin', 'creatinin']);
    const egfr = findLatestValue(['egfr', 'gfr']);

    if (egfr?.value && egfr.value < 60) {
      recommendations.diet.push({
        priority: 'high',
        title: 'Beskyt dine nyrer med kosten',
        description: `Din eGFR er ${egfr.value}, hvilket tyder på nedsat nyrefunktion.`,
        tips: [
          'Reducer saltindtag til max 5-6 gram dagligt',
          'Drik rigeligt vand (1.5-2 liter dagligt)',
          'Begræns protein fra kød - vælg fisk og vegetarisk oftere',
          'Undgå NSAID smertestillende (ibuprofen) uden lægens accept'
        ],
        icon: Droplets
      });

      recommendations.monitoring.push({
        priority: 'high',
        title: 'Regelmæssig kontrol af nyrefunktion',
        description: 'Med nedsat nyrefunktion er det vigtigt med tæt opfølgning.',
        tips: [
          'Få tjekket nyreværdier hver 3-6 måned',
          'Hold blodtryk under kontrol (under 130/80)',
          'Følg diabetesbehandling nøje hvis relevant',
          'Undgå naturmedicin uden lægens godkendelse'
        ],
        icon: ClipboardList
      });
    }

    // === LEVERFUNKTION ===
    const alat = findLatestValue(['alat', 'alt', 'alanin']);
    const ggt = findLatestValue(['ggt', 'gamma']);

    if ((alat?.value && alat.value > 45) || (ggt?.value && ggt.value > 60)) {
      recommendations.lifestyle.push({
        priority: 'high',
        title: 'Pas på din lever',
        description: 'Dine levertal er forhøjede, hvilket kan skyldes alkohol, overvægt eller medicin.',
        tips: [
          'Reducer eller stop alkoholindtag',
          'Tab dig hvis du er overvægtig',
          'Undgå paracetamol i høje doser',
          'Spis levervenlig kost med masser af grøntsager'
        ],
        icon: Wine
      });
    }

    // === KRAM-FAKTORER ANBEFALINGER ===

    // Rygning
    if (lifestyle.smoker) {
      recommendations.lifestyle.push({
        priority: 'high',
        title: 'Rygestop - den vigtigste ændring',
        description: 'Rygning er den største enkeltfaktor for tidlig død og sygdom.',
        tips: [
          'Kontakt Stoplinjen på 80 31 31 31 for gratis hjælp',
          'Tal med lægen om nikotinerstatning eller medicin',
          'Download en rygestop-app til støtte',
          'Allerede efter 24 timer begynder kroppen at hele'
        ],
        icon: Cigarette
      });
    }

    // Alkohol
    if (lifestyle.alcoholWeekly > 7) {
      recommendations.lifestyle.push({
        priority: lifestyle.alcoholWeekly > 14 ? 'high' : 'medium',
        title: 'Reducer dit alkoholforbrug',
        description: `Du drikker ${lifestyle.alcoholWeekly} genstande om ugen. Sundhedsstyrelsen anbefaler max 7 om ugen.`,
        tips: [
          'Hold alkoholfrie dage hver uge',
          'Drik vand mellem alkoholholdige drinks',
          'Vælg alkoholfrie alternativer ved sociale lejligheder',
          'Søg hjælp hos Alkohollinjen på 80 20 00 00 hvis svært'
        ],
        icon: Wine
      });
    }

    // Motion
    if (lifestyle.exerciseWeekly < 3) {
      recommendations.exercise.push({
        priority: 'medium',
        title: 'Kom i gang med regelmæssig motion',
        description: `Du motionerer ${lifestyle.exerciseWeekly} gange om ugen. Anbefalet er mindst 3-4 gange.`,
        tips: [
          'Start småt - 10 minutters gang dagligt er en god start',
          'Find en motionsform du nyder (dans, svømning, cykling)',
          'Motioner med en ven for motivation',
          'Byg motion ind i hverdagen (trapper, gang til indkøb)'
        ],
        icon: Dumbbell
      });
    }

    // Søvn
    if (lifestyle.sleepHours < 6 || lifestyle.sleepHours > 9) {
      recommendations.lifestyle.push({
        priority: 'medium',
        title: 'Optimer din søvn',
        description: `Du sover ${lifestyle.sleepHours} timer. Optimal søvn for voksne er 7-9 timer.`,
        tips: [
          'Hold fast i faste sengetider, også i weekenden',
          'Undgå skærme 1 time før sengetid',
          'Hold soveværelset køligt og mørkt',
          'Undgå koffein efter kl. 14'
        ],
        icon: Moon
      });
    }

    // === FAMILIEHISTORIK ANBEFALINGER ===
    if (familyHistory.diabetes) {
      recommendations.monitoring.push({
        priority: 'medium',
        title: 'Øget fokus på diabetes-forebyggelse',
        description: 'Med diabetes i familien har du forhøjet risiko.',
        tips: [
          'Få tjekket HbA1c årligt',
          'Hold normalvægt',
          'Vær særligt opmærksom på blodsukkerstabiliserende kost',
          'Motion reducerer risikoen markant'
        ],
        icon: Users
      });
    }

    if (familyHistory.heartDisease) {
      recommendations.monitoring.push({
        priority: 'medium',
        title: 'Forebyg hjertekarsygdom',
        description: 'Med hjertesygdom i familien bør du være ekstra opmærksom.',
        tips: [
          'Få tjekket kolesterol og blodtryk årligt',
          'Prioriter hjertevenlig kost (Middelhavskost)',
          'Motion er særligt vigtigt for dig',
          'Undgå rygning og begræns alkohol'
        ],
        icon: Heart
      });
    }

    if (familyHistory.hypertension) {
      recommendations.lifestyle.push({
        priority: 'medium',
        title: 'Forebyg forhøjet blodtryk',
        description: 'Med forhøjet blodtryk i familien har du øget risiko.',
        tips: [
          'Reducer salt i kosten',
          'Motioner regelmæssigt',
          'Hold normalvægt',
          'Mål dit blodtryk regelmæssigt'
        ],
        icon: Heart
      });
    }

    return recommendations;
  };

  const recommendations = generateRecommendations();

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 border-red-300 text-red-800';
      case 'medium': return 'bg-amber-100 border-amber-300 text-amber-800';
      default: return 'bg-green-100 border-green-300 text-green-800';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return 'Vigtigt';
      case 'medium': return 'Anbefalet';
      default: return 'Tip';
    }
  };

  const renderRecommendationCard = (rec, index) => {
    const IconComponent = rec.icon || Info;
    return (
      <div key={index} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                         ${rec.priority === 'high' ? 'bg-red-100' : rec.priority === 'medium' ? 'bg-amber-100' : 'bg-green-100'}`}>
            <IconComponent className={`w-6 h-6 ${rec.priority === 'high' ? 'text-red-600' : rec.priority === 'medium' ? 'text-amber-600' : 'text-green-600'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-slate-800">{rec.title}</h4>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(rec.priority)}`}>
                {getPriorityLabel(rec.priority)}
              </span>
            </div>
            <p className="text-sm text-slate-600 mb-3">{rec.description}</p>

            <div className="space-y-2">
              {rec.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{tip}</span>
                </div>
              ))}
            </div>

            {rec.foods && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-medium text-slate-500 mb-2">ANBEFALEDE FØDEVARER</p>
                <div className="flex flex-wrap gap-2">
                  {rec.foods.map((food, i) => (
                    <span key={i} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm text-slate-700">
                      {food}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (title, icon, items, sectionKey, color) => {
    const IconComponent = icon;
    const isExpanded = expandedSection === sectionKey || items.some(i => i.priority === 'high');
    const highPriorityCount = items.filter(i => i.priority === 'high').length;

    if (items.length === 0) return null;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => toggleSection(sectionKey)}
          className={`w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <IconComponent className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-slate-800">{title}</h3>
              <p className="text-sm text-slate-500">{items.length} anbefaling{items.length !== 1 ? 'er' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {highPriorityCount > 0 && (
              <span className="px-2.5 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                {highPriorityCount} vigtig{highPriorityCount !== 1 ? 'e' : ''}
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="px-5 pb-5 space-y-4">
            {items.map((rec, index) => renderRecommendationCard(rec, index))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <span className="ml-3 text-slate-600">Analyserer dine labsvar...</span>
      </div>
    );
  }

  const totalRecommendations =
    recommendations.diet.length +
    recommendations.exercise.length +
    recommendations.lifestyle.length +
    recommendations.monitoring.length;

  const highPriorityTotal = [
    ...recommendations.diet,
    ...recommendations.exercise,
    ...recommendations.lifestyle,
    ...recommendations.monitoring
  ].filter(r => r.priority === 'high').length;

  // Formater dato
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Render lab value card
  const renderLabCard = (lab, showCategory = true) => {
    const statusColors = {
      critical: {
        bg: 'bg-red-50',
        border: 'border-red-300',
        text: 'text-red-800',
        badge: 'bg-red-100 text-red-700',
        icon: 'text-red-500'
      },
      warning: {
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        text: 'text-amber-800',
        badge: 'bg-amber-100 text-amber-700',
        icon: 'text-amber-500'
      },
      normal: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        badge: 'bg-green-100 text-green-700',
        icon: 'text-green-500'
      }
    };

    const colors = statusColors[lab.status] || statusColors.normal;

    return (
      <div key={lab.name} className={`${colors.bg} ${colors.border} border rounded-xl p-4`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-slate-800">{lab.displayName || lab.name}</h4>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors.badge}`}>
                {lab.statusText}
              </span>
            </div>
            {showCategory && (
              <p className="text-xs text-slate-500 mt-0.5">{lab.category}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {lab.deviation === 'high' ? (
              <TrendingUp className={`w-5 h-5 ${colors.icon}`} />
            ) : lab.deviation === 'low' ? (
              <TrendingDown className={`w-5 h-5 ${colors.icon}`} />
            ) : (
              <CheckCircle2 className={`w-5 h-5 ${colors.icon}`} />
            )}
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${colors.text}`}>
                {typeof lab.value === 'number' ? lab.value.toFixed(1) : lab.value}
              </span>
              <span className="text-sm text-slate-500">{lab.actualUnit}</span>
            </div>
            {lab.referenceRange && (
              <p className="text-xs text-slate-500 mt-1">
                Ref: {lab.referenceRange}
              </p>
            )}
          </div>
          {lab.date && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Calendar className="w-3 h-3" />
              {formatDate(lab.date)}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Lab Values Alert Section - KRITISKE */}
      {criticalLabs.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-red-800 text-lg">Labsvar der kræver opmærksomhed</h3>
              <p className="text-sm text-red-600">
                {criticalLabs.length} værdi{criticalLabs.length !== 1 ? 'er' : ''} er uden for normalområdet - kontakt din læge
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {criticalLabs.map(lab => renderLabCard(lab))}
          </div>
        </div>
      )}

      {/* Lab Values Warning Section - WARNINGS */}
      {warningLabs.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-amber-800 text-lg">Labsvar at holde øje med</h3>
              <p className="text-sm text-amber-600">
                {warningLabs.length} værdi{warningLabs.length !== 1 ? 'er' : ''} ligger i grænseområdet
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {warningLabs.map(lab => renderLabCard(lab))}
          </div>
        </div>
      )}

      {/* Normale værdier - collapsible */}
      {normalLabs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => toggleSection('normalLabs')}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-800">Labsvar inden for normalområdet</h3>
                <p className="text-sm text-green-600">{normalLabs.length} værdi{normalLabs.length !== 1 ? 'er' : ''} er normale</p>
              </div>
            </div>
            {expandedSection === 'normalLabs' ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>
          {expandedSection === 'normalLabs' && (
            <div className="px-5 pb-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {normalLabs.map(lab => renderLabCard(lab))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Dine personlige anbefalinger</h2>
            <p className="text-teal-100">
              Baseret på {labResults.length} labsvar og din profil
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{totalRecommendations}</div>
            <div className="text-teal-100 text-sm">anbefalinger</div>
          </div>
        </div>

        {highPriorityTotal > 0 && (
          <div className="mt-4 p-3 bg-white/20 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            <span className="font-medium">
              {highPriorityTotal} vigtig{highPriorityTotal !== 1 ? 'e' : ''} anbefaling{highPriorityTotal !== 1 ? 'er' : ''} kræver opmærksomhed
            </span>
          </div>
        )}

        {criticalLabs.length === 0 && warningLabs.length === 0 && (
          <div className="mt-4 p-3 bg-white/20 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6" />
            <span className="font-medium">
              Alle dine analyserede labværdier er inden for normalområdet
            </span>
          </div>
        )}
      </div>

      {/* KRAM Profile Form */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => setShowProfileForm(!showProfileForm)}
          className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-slate-800">Din sundhedsprofil (KRAM)</h3>
              <p className="text-sm text-slate-500">Udfyld for mere præcise anbefalinger</p>
            </div>
          </div>
          {showProfileForm ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {showProfileForm && (
          <div className="px-5 pb-5 space-y-6">
            {/* Livsstil */}
            <div className="space-y-4">
              <h4 className="font-medium text-slate-700">Livsstil</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Cigarette className="w-5 h-5 text-slate-500" />
                    <span className="font-medium text-slate-700">Ryger du?</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setLifestyle({...lifestyle, smoker: true})}
                      className={`flex-1 py-2 rounded-lg border transition-colors ${lifestyle.smoker ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white border-slate-200'}`}
                    >
                      Ja
                    </button>
                    <button
                      onClick={() => setLifestyle({...lifestyle, smoker: false})}
                      className={`flex-1 py-2 rounded-lg border transition-colors ${!lifestyle.smoker ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-slate-200'}`}
                    >
                      Nej
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Wine className="w-5 h-5 text-slate-500" />
                    <span className="font-medium text-slate-700">Genstande pr. uge</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={lifestyle.alcoholWeekly}
                    onChange={(e) => setLifestyle({...lifestyle, alcoholWeekly: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-slate-500 mt-1">
                    <span>0</span>
                    <span className="font-medium text-slate-700">{lifestyle.alcoholWeekly} genstande</span>
                    <span>30+</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Dumbbell className="w-5 h-5 text-slate-500" />
                    <span className="font-medium text-slate-700">Motion pr. uge</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="7"
                    value={lifestyle.exerciseWeekly}
                    onChange={(e) => setLifestyle({...lifestyle, exerciseWeekly: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-slate-500 mt-1">
                    <span>0</span>
                    <span className="font-medium text-slate-700">{lifestyle.exerciseWeekly} gange</span>
                    <span>7</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Moon className="w-5 h-5 text-slate-500" />
                    <span className="font-medium text-slate-700">Søvn pr. nat</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="12"
                    value={lifestyle.sleepHours}
                    onChange={(e) => setLifestyle({...lifestyle, sleepHours: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-slate-500 mt-1">
                    <span>4t</span>
                    <span className="font-medium text-slate-700">{lifestyle.sleepHours} timer</span>
                    <span>12t</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Familiehistorik */}
            <div className="space-y-4">
              <h4 className="font-medium text-slate-700">Familiehistorik (forældre, søskende)</h4>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { key: 'diabetes', label: 'Diabetes', icon: Droplets },
                  { key: 'heartDisease', label: 'Hjertesygdom', icon: Heart },
                  { key: 'cancer', label: 'Kræft', icon: AlertTriangle },
                  { key: 'hypertension', label: 'Forhøjet blodtryk', icon: Heart }
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => setFamilyHistory({...familyHistory, [item.key]: !familyHistory[item.key]})}
                    className={`p-3 rounded-xl border transition-colors flex flex-col items-center gap-2
                               ${familyHistory[item.key] ? 'bg-purple-100 border-purple-300' : 'bg-white border-slate-200'}`}
                  >
                    <item.icon className={`w-5 h-5 ${familyHistory[item.key] ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className={`text-sm ${familyHistory[item.key] ? 'text-purple-700 font-medium' : 'text-slate-600'}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recommendation Sections */}
      {renderSection('Kostanbefalinger', Utensils, recommendations.diet, 'diet', 'bg-orange-500')}
      {renderSection('Motionsanbefalinger', Dumbbell, recommendations.exercise, 'exercise', 'bg-blue-500')}
      {renderSection('Livsstil & vaner', Heart, recommendations.lifestyle, 'lifestyle', 'bg-rose-500')}
      {renderSection('Opfølgning & kontrol', ClipboardList, recommendations.monitoring, 'monitoring', 'bg-purple-500')}

      {totalRecommendations === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Alt ser godt ud!</h3>
          <p className="text-slate-600 max-w-md mx-auto">
            Dine labværdier giver ikke anledning til specifikke anbefalinger.
            Fortsæt med en sund livsstil og regelmæssige helbredstjek.
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Vigtigt at vide</p>
            <p>
              Disse anbefalinger er generelle og baseret på dine labværdier. De erstatter ikke
              professionel sundhedsrådgivning. Tal altid med din læge før du foretager større
              ændringer i kost, motion eller livsstil, især hvis du har kroniske sygdomme.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalRecommendations;
