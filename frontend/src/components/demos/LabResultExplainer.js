import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  Loader2,
  Info,
  Stethoscope,
  Lightbulb,
  MessageSquare
} from 'lucide-react';
import sundhedDkService from '../../services/sundhedDkService';

/**
 * LabResultExplainer - Intelligent forklaring af labsvar
 * Viser labsvar med forståelige forklaringer, normalområder og anbefalinger
 */
const LabResultExplainer = () => {
  const [labResults, setLabResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedResult, setExpandedResult] = useState(null);
  const [explanations, setExplanations] = useState({});
  const [loadingExplanation, setLoadingExplanation] = useState(null);

  // Hent labsvar ved mount
  useEffect(() => {
    fetchLabResults();
  }, []);

  const fetchLabResults = async () => {
    setLoading(true);
    try {
      const result = await sundhedDkService.getLabResults('Alle', 20);
      if (result.success && result.data?.entry) {
        const observations = result.data.entry.map(e => e.resource);
        setLabResults(observations);
      }
    } catch (error) {
      console.error('Fejl ved hentning af labsvar:', error);
    }
    setLoading(false);
  };

  // Statiske forklaringer for almindelige tests (bruges som fallback)
  const staticExplanations = {
    'Kreatinin': {
      whatIs: 'Kreatinin er et affaldsstof fra dine muskler som nyrerne normalt renser ud. Det viser hvor godt dine nyrer fungerer.',
      normalRange: '60-105 μmol/L',
      highMeaning: 'Høj værdi kan tyde på nedsat nyrefunktion. Kan også skyldes dehydrering, meget muskelmasse, eller visse lægemidler.',
      lowMeaning: 'Lav værdi ses sjældent og er normalt ikke bekymrende. Kan skyldes lav muskelmasse.',
      doctorQuestions: [
        'Skal vi tjekke mine nyrer grundigere?',
        'Er der noget i min medicin der påvirker mine nyrer?',
        'Hvornår skal jeg have taget en ny prøve?'
      ],
      relatedTests: ['eGFR', 'Urinstof', 'Albumin/kreatinin-ratio']
    },
    'Hæmoglobin': {
      whatIs: 'Hæmoglobin er det protein i røde blodlegemer der transporterer ilt rundt i kroppen. Det viser om du har blodmangel (anæmi).',
      normalRange: 'Mænd: 8.3-10.5 mmol/L, Kvinder: 7.3-9.5 mmol/L',
      highMeaning: 'Høj værdi kan skyldes dehydrering, rygning, eller sjældnere blodsygdomme.',
      lowMeaning: 'Lav værdi betyder blodmangel (anæmi). Kan skyldes jernmangel, B12-mangel, kronisk sygdom, eller blødning.',
      doctorQuestions: [
        'Hvad er årsagen til min blodmangel?',
        'Skal jeg tage jerntilskud?',
        'Er der grund til yderligere undersøgelser?'
      ],
      relatedTests: ['Ferritin', 'Jern', 'B12', 'Folat', 'MCV']
    },
    'Kolesterol': {
      whatIs: 'Kolesterol er et fedtstof i blodet. For meget kan føre til åreforkalkning og øget risiko for blodpropper.',
      normalRange: 'Under 5.0 mmol/L (total)',
      highMeaning: 'Forhøjet kolesterol øger risiko for hjertekarsygdom. Kan skyldes kost, arv, eller underliggende sygdom.',
      lowMeaning: 'Meget lavt kolesterol er sjældent et problem, men kan ses ved alvorlig sygdom.',
      doctorQuestions: [
        'Skal jeg ændre min kost?',
        'Er der behov for kolesterolsænkende medicin?',
        'Hvordan er min samlede risiko for hjertesygdom?'
      ],
      relatedTests: ['LDL', 'HDL', 'Triglycerid']
    },
    'HbA1c': {
      whatIs: 'HbA1c (langtidsblodsukker) viser dit gennemsnitlige blodsukker over de sidste 2-3 måneder. Bruges til at opdage og følge diabetes.',
      normalRange: 'Under 42 mmol/mol (under 6.0%)',
      highMeaning: 'Forhøjet værdi kan betyde prædiabetes eller diabetes. Jo højere, jo dårligere blodsukkerregulering.',
      lowMeaning: 'Lav værdi er normalt godt. Meget lav kan ses ved blodtab eller visse blodsygdomme.',
      doctorQuestions: [
        'Har jeg diabetes eller er jeg i risiko?',
        'Hvad kan jeg gøre for at forbedre min værdi?',
        'Hvor tit skal jeg have det målt?'
      ],
      relatedTests: ['Faste-glucose', 'Glucose']
    },
    'CRP': {
      whatIs: 'CRP (C-reaktivt protein) er en inflammationsmarkør. Det stiger ved infektion, betændelse eller vævsskade.',
      normalRange: 'Under 8 mg/L (ofte under 5 mg/L)',
      highMeaning: 'Forhøjet værdi viser at kroppen reagerer på noget - infektion, betændelse, skade. Siger ikke hvad det er.',
      lowMeaning: 'Lav/normal værdi tyder på fravær af akut betændelse.',
      doctorQuestions: [
        'Hvad kan være årsagen til den forhøjede værdi?',
        'Er der behov for yderligere undersøgelser?',
        'Hvornår bør værdien kontrolleres igen?'
      ],
      relatedTests: ['Leukocytter', 'SR', 'Temperatur']
    },
    'TSH': {
      whatIs: 'TSH (thyroideastimulerende hormon) styrer skjoldbruskkirtlen. Det viser om din stofskiftekirtler fungerer normalt.',
      normalRange: '0.4-4.0 mIU/L',
      highMeaning: 'Høj TSH tyder på langsomt stofskifte (lavt stofskifte/hypothyreose). Skjoldbruskkirtlen arbejder for lidt.',
      lowMeaning: 'Lav TSH tyder på for højt stofskifte (hyperthyreose). Skjoldbruskkirtlen arbejder for meget.',
      doctorQuestions: [
        'Har jeg problemer med stofskiftet?',
        'Skal jeg have medicin?',
        'Hvilke symptomer skal jeg være opmærksom på?'
      ],
      relatedTests: ['T3', 'T4', 'Anti-TPO']
    },
    'D-vitamin': {
      whatIs: 'D-vitamin er vigtigt for knogler, muskler og immunforsvar. De fleste danskere har for lavt D-vitamin om vinteren.',
      normalRange: 'Over 50 nmol/L (optimalt: 75-150 nmol/L)',
      highMeaning: 'For højt D-vitamin (over 200 nmol/L) er sjældent, men kan ske ved overdosering af tilskud.',
      lowMeaning: 'Lavt D-vitamin er meget almindeligt. Kan give træthed, muskelsmerter og øget infektionsrisiko.',
      doctorQuestions: [
        'Hvor meget tilskud skal jeg tage?',
        'Hvornår skal jeg have det målt igen?',
        'Er der andre årsager til mine symptomer?'
      ],
      relatedTests: ['Calcium', 'Fosfat', 'PTH']
    }
  };

  // Hent referenceRange fra FHIR observation
  const getReferenceRangeFromFHIR = (observation) => {
    const refRange = observation.referenceRange?.[0];
    if (!refRange) return null;

    // Hvis der er tekst-baseret reference range (fra sundhed.dk)
    if (refRange.text) {
      return refRange.text;
    }

    // Hvis der er struktureret low/high værdier
    const low = refRange.low?.value;
    const high = refRange.high?.value;
    const unit = refRange.low?.unit || refRange.high?.unit || observation.valueQuantity?.unit || '';

    if (low !== undefined && high !== undefined) {
      return `${low} - ${high} ${unit}`.trim();
    } else if (low !== undefined) {
      return `> ${low} ${unit}`.trim();
    } else if (high !== undefined) {
      return `< ${high} ${unit}`.trim();
    }

    return null;
  };

  // Generer forklaring baseret på testtype og værdi
  const getExplanation = (observation) => {
    const testName = observation.code?.coding?.[0]?.display || observation.code?.text || 'Ukendt test';

    // Hent FHIR reference range først
    const fhirRefRange = getReferenceRangeFromFHIR(observation);

    // Find matching static explanation
    const matchingKey = Object.keys(staticExplanations).find(key =>
      testName.toLowerCase().includes(key.toLowerCase())
    );

    if (matchingKey) {
      const staticExp = staticExplanations[matchingKey];
      return {
        ...staticExp,
        // Brug FHIR referenceRange hvis tilgængeligt, ellers fald tilbage til statisk
        normalRange: fhirRefRange || staticExp.normalRange,
        // Marker om vi bruger faktisk data fra prøvesvaret
        isFromFHIR: !!fhirRefRange
      };
    }

    // Specialiserede forklaringer for smitteprøver/COVID
    if (testName.toLowerCase().includes('sars-cov') ||
        testName.toLowerCase().includes('covid') ||
        testName.toLowerCase().includes('corona')) {
      return {
        whatIs: `${testName} er en test for coronavirus (SARS-CoV-2), der forårsager COVID-19. Testen undersøger om du har virusset i kroppen.`,
        normalRange: fhirRefRange || 'Ikke påvist = Negativ',
        highMeaning: 'Påvist betyder at coronavirus er fundet i prøven. Du bør isolere dig og følge sundhedsmyndighedernes anbefalinger.',
        lowMeaning: 'Ikke påvist er det normale resultat og betyder at testen ikke fandt coronavirus.',
        doctorQuestions: [
          'Skal jeg isolere mig?',
          'Hvornår kan jeg teste igen hvis jeg har symptomer?',
          'Skal mine nærmeste kontakter også testes?'
        ],
        relatedTests: ['Antistof-test'],
        isFromFHIR: !!fhirRefRange
      };
    }

    // Mikrobiologiske prøver (dyrkning, resistens)
    if (testName.toLowerCase().includes('dyrkning') ||
        testName.toLowerCase().includes('resistens') ||
        testName.toLowerCase().includes('bakterie')) {
      return {
        whatIs: `${testName} er en mikrobiologisk undersøgelse der dyrker og identificerer eventuelle bakterier i prøven.`,
        normalRange: fhirRefRange || 'Ingen vækst = Normal',
        highMeaning: 'Hvis der findes bakterier, vil der ofte være information om hvilken type og hvilken antibiotika der virker.',
        lowMeaning: 'Ingen vækst eller normal flora er typisk et godt tegn.',
        doctorQuestions: [
          'Er der fundet noget der kræver behandling?',
          'Hvilken antibiotika anbefales hvis nødvendigt?',
          'Skal prøven gentages?'
        ],
        relatedTests: ['CRP', 'Leukocytter'],
        isFromFHIR: !!fhirRefRange
      };
    }

    // Default explanation med FHIR reference range
    return {
      whatIs: `${testName} er en laboratorietest. Spørg din læge om hvad denne specifikke test måler.`,
      normalRange: fhirRefRange || 'Referenceværdi ikke tilgængelig',
      highMeaning: 'En høj eller afvigende værdi kan have forskellige betydninger. Din læge kan forklare hvad det betyder for dig.',
      lowMeaning: 'En lav værdi kan have forskellige betydninger. Din læge kan forklare hvad det betyder for dig.',
      doctorQuestions: [
        'Hvad måler denne test præcist?',
        'Hvad betyder resultatet for mig?',
        'Er der behov for yderligere undersøgelser?'
      ],
      relatedTests: [],
      isFromFHIR: !!fhirRefRange
    };
  };

  // Hent værdi fra observation - håndterer både Quantity og String typer
  const getObservationValue = (observation) => {
    // Numerisk værdi (valueQuantity)
    if (observation.valueQuantity?.value !== undefined) {
      return {
        value: observation.valueQuantity.value,
        unit: observation.valueQuantity.unit || observation.valueQuantity.code || '',
        isNumeric: true
      };
    }

    // Tekst værdi (valueString)
    if (observation.valueString) {
      return {
        value: observation.valueString,
        unit: '',
        isNumeric: false
      };
    }

    // CodeableConcept værdi (valueCodeableConcept)
    if (observation.valueCodeableConcept) {
      return {
        value: observation.valueCodeableConcept.text ||
               observation.valueCodeableConcept.coding?.[0]?.display ||
               observation.valueCodeableConcept.coding?.[0]?.code || '',
        unit: '',
        isNumeric: false
      };
    }

    // Boolean værdi
    if (observation.valueBoolean !== undefined) {
      return {
        value: observation.valueBoolean ? 'Positiv' : 'Negativ',
        unit: '',
        isNumeric: false
      };
    }

    // Integer værdi
    if (observation.valueInteger !== undefined) {
      return {
        value: observation.valueInteger,
        unit: '',
        isNumeric: true
      };
    }

    return null;
  };

  // Bestem status baseret på værdi og referenceområde
  const getStatus = (observation) => {
    const interpretation = observation.interpretation?.[0]?.coding?.[0]?.code;

    if (interpretation) {
      if (interpretation === 'H' || interpretation === 'HH') return 'high';
      if (interpretation === 'L' || interpretation === 'LL') return 'low';
      if (interpretation === 'N') return 'normal';
    }

    // Check referenceRange - kun for numeriske værdier
    const obsValue = getObservationValue(observation);
    const refRange = observation.referenceRange?.[0];

    if (obsValue?.isNumeric && typeof obsValue.value === 'number' && refRange) {
      if (refRange.high?.value && obsValue.value > refRange.high.value) return 'high';
      if (refRange.low?.value && obsValue.value < refRange.low.value) return 'low';
      return 'normal';
    }

    // For tekst-værdier, tjek om det indikerer noget abnormt
    if (obsValue && !obsValue.isNumeric) {
      const valueStr = String(obsValue.value).toLowerCase();

      // VIGTIGT: Tjek "ikke påvist" FØR "påvist" for at undgå falsk positiv
      if (valueStr.includes('ikke påvist') || valueStr.includes('negativ') || valueStr.includes('normal')) {
        return 'normal'; // Grøn - alt er godt
      }
      // Kun hvis det IKKE er "ikke påvist", tjek for positive fund
      if (valueStr.includes('positiv') || valueStr.includes('påvist') || valueStr.includes('abnorm')) {
        return 'high'; // Rød - opmærksomhed påkrævet
      }
    }

    return 'unknown';
  };

  const statusConfig = {
    high: {
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: AlertTriangle,
      label: 'Opmærksomhed påkrævet',
      iconColor: 'text-red-500'
    },
    low: {
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: AlertTriangle,
      label: 'Under normalområde',
      iconColor: 'text-amber-500'
    },
    normal: {
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: CheckCircle2,
      label: 'Normal',
      iconColor: 'text-green-500'
    },
    unknown: {
      color: 'text-slate-600',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      icon: HelpCircle,
      label: 'Status ukendt',
      iconColor: 'text-slate-500'
    }
  };

  // Få kontekst-specifik label baseret på værdien
  const getStatusLabel = (observation, status) => {
    const obsValue = getObservationValue(observation);
    if (!obsValue || obsValue.isNumeric) {
      // Numeriske værdier bruger standard labels
      if (status === 'normal') return 'Inden for normalområde';
      if (status === 'high') return 'Over normalområde';
      if (status === 'low') return 'Under normalområde';
      return statusConfig[status].label;
    }

    // Tekst-værdier (smitteprøver etc.)
    const valueStr = String(obsValue.value).toLowerCase();
    if (valueStr.includes('ikke påvist') || valueStr.includes('negativ')) {
      return 'Ikke påvist';
    }
    if (valueStr.includes('påvist') || valueStr.includes('positiv')) {
      return 'Påvist';
    }
    return statusConfig[status].label;
  };

  // Hent analysekode fra observation notes
  const getAnalyseKode = (observation) => {
    const notes = observation.note || [];
    for (const note of notes) {
      const text = note.text || '';
      if (text.startsWith('Analysekode:')) {
        return text.replace('Analysekode:', '').trim();
      }
    }
    // Fald tilbage til coding system
    return observation.code?.coding?.[0]?.code || null;
  };

  const renderLabResult = (observation, index) => {
    const testName = observation.code?.coding?.[0]?.display || observation.code?.text || 'Ukendt test';
    const analyseKode = getAnalyseKode(observation);
    const obsValue = getObservationValue(observation);
    const date = observation.effectiveDateTime || observation.effectivePeriod?.start;
    const status = getStatus(observation);
    const config = statusConfig[status];
    const isExpanded = expandedResult === index;
    const explanation = getExplanation(observation);
    const fhirRefRange = getReferenceRangeFromFHIR(observation);

    return (
      <div
        key={index}
        className={`rounded-2xl border ${config.border} overflow-hidden transition-all duration-300
                   ${isExpanded ? 'shadow-lg' : 'hover:shadow-md'}`}
      >
        {/* Header - always visible */}
        <button
          onClick={() => setExpandedResult(isExpanded ? null : index)}
          className={`w-full p-5 ${config.bg} flex items-start gap-4 text-left transition-colors`}
        >
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600
                         flex items-center justify-center flex-shrink-0`}>
            <FlaskConical className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-800 text-lg">{testName}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                              ${status === 'normal' ? 'bg-green-100 text-green-700' :
                                status === 'high' ? 'bg-red-100 text-red-700' :
                                status === 'low' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-700'}`}>
                {getStatusLabel(observation, status)}
              </span>
            </div>

            {/* Analysekode under navnet */}
            {analyseKode && (
              <p className="text-xs text-slate-400 mt-0.5">
                Analysekode: {analyseKode}
              </p>
            )}

            {obsValue && (
              <div className="mt-2">
                <p className={`${obsValue.isNumeric ? 'text-2xl' : 'text-lg'} font-bold ${config.color}`}>
                  {obsValue.value} {obsValue.unit}
                </p>
                {fhirRefRange && (
                  <p className="text-sm text-slate-500 mt-0.5">
                    Ref: {fhirRefRange}
                  </p>
                )}
              </div>
            )}
            {!obsValue && (
              <p className="text-sm text-slate-400 mt-1 italic">
                Ingen værdi tilgængelig
              </p>
            )}

            {date && (
              <p className="text-sm text-slate-500 mt-1">
                {new Date(date).toLocaleDateString('da-DK', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <config.icon className={`w-6 h-6 ${config.iconColor}`} />
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </button>

        {/* Expanded explanation */}
        {isExpanded && (
          <div className="p-6 bg-white border-t border-slate-100 space-y-6 animate-fade-in">
            {/* Hvad er det */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">Hvad betyder det?</h4>
                <p className="text-slate-600">{explanation.whatIs}</p>
              </div>
            </div>

            {/* Normalområde / Reference Range */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-slate-800">Referenceområde</h4>
                  {explanation.isFromFHIR && (
                    <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full font-medium">
                      Fra dit prøvesvar
                    </span>
                  )}
                </div>
                <p className={`${explanation.isFromFHIR ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>
                  {explanation.normalRange}
                </p>
                {!explanation.isFromFHIR && explanation.normalRange !== 'Referenceværdi ikke tilgængelig' && (
                  <p className="text-xs text-slate-400 mt-1">
                    Generel vejledende værdi - dit specifikke referenceområde kan variere
                  </p>
                )}
              </div>
            </div>

            {/* Tolkning baseret på status */}
            <div className="flex gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                            ${status === 'high' ? 'bg-red-100' :
                              status === 'low' ? 'bg-amber-100' : 'bg-green-100'}`}>
                <Lightbulb className={`w-5 h-5
                                     ${status === 'high' ? 'text-red-600' :
                                       status === 'low' ? 'text-amber-600' : 'text-green-600'}`} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">
                  {status === 'high' ? 'Vær opmærksom på:' :
                   status === 'low' ? 'Vær opmærksom på:' :
                   'Dit resultat:'}
                </h4>
                <p className="text-slate-600">
                  {status === 'high' ? explanation.highMeaning :
                   status === 'low' ? explanation.lowMeaning :
                   'Din værdi ligger inden for normalområdet. Det er godt!'}
                </p>
              </div>
            </div>

            {/* Spørgsmål til lægen */}
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 mb-2">Spørgsmål til lægen</h4>
                <ul className="space-y-2">
                  {explanation.doctorQuestions.map((q, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-600">
                      <MessageSquare className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                      <span>"{q}"</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Relaterede tests */}
            {explanation.relatedTests && explanation.relatedTests.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-500 mb-2">Relaterede værdier at holde øje med:</p>
                <div className="flex flex-wrap gap-2">
                  {explanation.relatedTests.map((test, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
                      {test}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <span className="ml-3 text-slate-600">Henter labsvar...</span>
      </div>
    );
  }

  if (labResults.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
        <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Ingen labsvar fundet</h3>
        <p className="text-slate-600 mb-4">
          Kunne ikke hente labsvar fra serveren.
        </p>
        <button
          onClick={fetchLabResults}
          className="px-4 py-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg
                   hover:shadow-lg transition-all"
        >
          Prøv igen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-slate-600">
          Klik på et resultat for at se forklaring
        </p>
        <span className="text-sm text-slate-500">
          {labResults.length} resultater
        </span>
      </div>

      {labResults.map((obs, index) => renderLabResult(obs, index))}
    </div>
  );
};

export default LabResultExplainer;
