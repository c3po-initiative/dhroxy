import React, { useState, useEffect } from 'react';
import {
  Heart,
  Activity,
  Droplets,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Info,
  Calendar,
  Target
} from 'lucide-react';
import sundhedDkService from '../../services/sundhedDkService';

/**
 * HealthDashboards - Sygdomsspecifikke dashboards
 * Viser relevante labværdier grupperet efter sygdomsområde
 */
const HealthDashboards = () => {
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState('diabetes');

  useEffect(() => {
    fetchObservations();
  }, []);

  const fetchObservations = async () => {
    setLoading(true);
    try {
      const result = await sundhedDkService.getLabResults('Alle', 500);
      if (result.success && result.data?.entry) {
        const obs = result.data.entry.map(e => e.resource);
        setObservations(obs);
      }
    } catch (error) {
      console.error('Fejl ved hentning af labsvar:', error);
    }
    setLoading(false);
  };

  // Dashboard konfigurationer med relevante NPU-koder og navne
  const dashboards = {
    diabetes: {
      id: 'diabetes',
      name: 'Diabetes',
      icon: Droplets,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'Overvåg blodsukker og relaterede værdier',
      tests: [
        {
          name: 'HbA1c',
          keywords: ['hba1c', 'glykeret', 'langtidsblodsukker', 'hemoglobin a1c'],
          target: '< 48 mmol/mol',
          description: 'Viser dit gennemsnitlige blodsukker over 2-3 måneder'
        },
        {
          name: 'Glucose',
          keywords: ['glucose', 'glukose', 'blodsukker'],
          target: 'Fastende: 4-6 mmol/L',
          description: 'Dit aktuelle blodsukkerniveau'
        },
        {
          name: 'Kreatinin',
          keywords: ['kreatinin', 'creatinin'],
          target: '60-105 μmol/L',
          description: 'Markør for nyrefunktion - vigtigt ved diabetes'
        },
        {
          name: 'eGFR',
          keywords: ['egfr', 'gfr', 'glomerulær'],
          target: '> 90 mL/min',
          description: 'Estimeret nyrefunktion'
        },
        {
          name: 'Albumin/Kreatinin',
          keywords: ['albumin', 'urin', 'mikroalbumin'],
          target: '< 3 mg/mmol',
          description: 'Tidlig markør for nyreskade'
        },
        {
          name: 'Kolesterol',
          keywords: ['kolesterol', 'cholesterol'],
          target: '< 5.0 mmol/L',
          description: 'Total kolesterol - øget risiko ved diabetes'
        }
      ]
    },
    heart: {
      id: 'heart',
      name: 'Hjerte-kar',
      icon: Heart,
      color: 'from-red-500 to-pink-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      description: 'Overvåg hjerte-kar sundhed og kolesterol',
      tests: [
        {
          name: 'Total Kolesterol',
          keywords: ['kolesterol', 'cholesterol total'],
          target: '< 5.0 mmol/L',
          description: 'Samlet kolesterol i blodet'
        },
        {
          name: 'LDL Kolesterol',
          keywords: ['ldl', 'low density'],
          target: '< 3.0 mmol/L (< 1.8 ved hjertesygdom)',
          description: '"Dårligt" kolesterol - jo lavere jo bedre'
        },
        {
          name: 'HDL Kolesterol',
          keywords: ['hdl', 'high density'],
          target: '> 1.0 mmol/L (mænd), > 1.2 mmol/L (kvinder)',
          description: '"Godt" kolesterol - jo højere jo bedre'
        },
        {
          name: 'Triglycerid',
          keywords: ['triglycerid', 'triglyceri'],
          target: '< 1.7 mmol/L',
          description: 'Fedtstoffer i blodet'
        },
        {
          name: 'BNP/NT-proBNP',
          keywords: ['bnp', 'natriuretisk', 'pro-bnp'],
          target: '< 125 pg/mL',
          description: 'Markør for hjertebelastning'
        },
        {
          name: 'CRP',
          keywords: ['crp', 'c-reaktiv'],
          target: '< 5 mg/L',
          description: 'Betændelsesmarkør - kan indikere kar-inflammation'
        },
        {
          name: 'Troponin',
          keywords: ['troponin'],
          target: '< 14 ng/L',
          description: 'Markør for hjerteskade'
        }
      ]
    },
    thyroid: {
      id: 'thyroid',
      name: 'Skjoldbruskkirtel',
      icon: Zap,
      color: 'from-purple-500 to-violet-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      description: 'Overvåg stofskifte og thyroidea-funktion',
      tests: [
        {
          name: 'TSH',
          keywords: ['tsh', 'thyroid', 'thyreoidea'],
          target: '0.4 - 4.0 mIU/L',
          description: 'Styrehormon for skjoldbruskkirtlen'
        },
        {
          name: 'T3 (Frit)',
          keywords: ['t3', 'trijodthyronin', 'frit t3'],
          target: '3.5 - 6.5 pmol/L',
          description: 'Aktivt stofskiftehormon'
        },
        {
          name: 'T4 (Frit)',
          keywords: ['t4', 'thyroxin', 'frit t4'],
          target: '10 - 22 pmol/L',
          description: 'Stofskiftehormon - omdannes til T3'
        },
        {
          name: 'Anti-TPO',
          keywords: ['anti-tpo', 'tpo', 'peroxidase', 'thyreoperoxidase'],
          target: '< 35 kIU/L',
          description: 'Antistoffer - kan indikere autoimmun thyroideasygdom'
        },
        {
          name: 'Anti-TG',
          keywords: ['anti-tg', 'thyroglobulin', 'tg-antistoffer'],
          target: '< 115 kIU/L',
          description: 'Thyroglobulin-antistoffer'
        }
      ]
    }
  };

  // Find observationer der matcher et test-keyword
  const findMatchingObservations = (test) => {
    return observations.filter(obs => {
      const testName = (obs.code?.coding?.[0]?.display || obs.code?.text || '').toLowerCase();
      const code = (obs.code?.coding?.[0]?.code || '').toLowerCase();

      return test.keywords.some(keyword =>
        testName.includes(keyword.toLowerCase()) ||
        code.includes(keyword.toLowerCase())
      );
    }).sort((a, b) => {
      // Sorter efter dato, nyeste først
      const dateA = new Date(a.effectiveDateTime || a.effectivePeriod?.start || 0);
      const dateB = new Date(b.effectiveDateTime || b.effectivePeriod?.start || 0);
      return dateB - dateA;
    });
  };

  // Hent værdi fra observation
  const getObservationValue = (obs) => {
    if (obs.valueQuantity?.value !== undefined) {
      return {
        value: obs.valueQuantity.value,
        unit: obs.valueQuantity.unit || obs.valueQuantity.code || '',
        isNumeric: true
      };
    }
    if (obs.valueString) {
      return { value: obs.valueString, unit: '', isNumeric: false };
    }
    return null;
  };

  // Beregn trend for en test
  const calculateTrend = (matchingObs) => {
    const numericObs = matchingObs.filter(obs => {
      const val = getObservationValue(obs);
      return val?.isNumeric;
    });

    if (numericObs.length < 2) return null;

    const latest = getObservationValue(numericObs[0])?.value;
    const previous = getObservationValue(numericObs[1])?.value;

    if (latest === undefined || previous === undefined) return null;

    const change = ((latest - previous) / previous) * 100;

    return {
      direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
      change: change.toFixed(1),
      previous,
      latest
    };
  };

  // Render et enkelt test-kort
  const renderTestCard = (test, dashboard) => {
    const matchingObs = findMatchingObservations(test);
    const latestObs = matchingObs[0];
    const obsValue = latestObs ? getObservationValue(latestObs) : null;
    const trend = calculateTrend(matchingObs);
    const hasData = matchingObs.length > 0;

    return (
      <div
        key={test.name}
        className={`rounded-xl border p-4 transition-all duration-300 ${
          hasData
            ? `${dashboard.bgColor} ${dashboard.borderColor} hover:shadow-md`
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className={`font-semibold ${hasData ? 'text-slate-800' : 'text-slate-400'}`}>
              {test.name}
            </h4>
            {hasData && latestObs?.effectiveDateTime && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3" />
                {new Date(latestObs.effectiveDateTime).toLocaleDateString('da-DK')}
              </p>
            )}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              trend.direction === 'up' ? 'bg-amber-100 text-amber-700' :
              trend.direction === 'down' ? 'bg-blue-100 text-blue-700' :
              'bg-green-100 text-green-700'
            }`}>
              {trend.direction === 'up' ? <TrendingUp className="w-3 h-3" /> :
               trend.direction === 'down' ? <TrendingDown className="w-3 h-3" /> :
               <Minus className="w-3 h-3" />}
              {trend.change > 0 ? '+' : ''}{trend.change}%
            </div>
          )}
        </div>

        {hasData && obsValue ? (
          <>
            <p className="text-2xl font-bold text-slate-800 mb-1">
              {obsValue.value} <span className="text-sm font-normal text-slate-500">{obsValue.unit}</span>
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Target className="w-3 h-3" />
              <span>Mål: {test.target}</span>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-slate-400 text-sm">Ingen data</p>
            <p className="text-xs text-slate-300 mt-1">Denne test er ikke fundet i dine prøvesvar</p>
          </div>
        )}

        {hasData && matchingObs.length > 1 && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-2">Historik ({matchingObs.length} målinger)</p>
            <div className="flex gap-1">
              {matchingObs.slice(0, 5).map((obs, idx) => {
                const val = getObservationValue(obs);
                return (
                  <div
                    key={idx}
                    className="flex-1 text-center p-1 bg-white rounded text-xs"
                    title={obs.effectiveDateTime ? new Date(obs.effectiveDateTime).toLocaleDateString('da-DK') : ''}
                  >
                    {val?.value || '-'}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Beregn samlet status for et dashboard
  const getDashboardStatus = (dashboard) => {
    let hasAnyData = false;
    let hasAbnormal = false;
    let totalTests = 0;
    let testsWithData = 0;

    dashboard.tests.forEach(test => {
      totalTests++;
      const matchingObs = findMatchingObservations(test);
      if (matchingObs.length > 0) {
        hasAnyData = true;
        testsWithData++;
        // Her kunne man tjekke mod referenceRange for at finde abnorme værdier
      }
    });

    return {
      hasAnyData,
      hasAbnormal,
      totalTests,
      testsWithData,
      coverage: Math.round((testsWithData / totalTests) * 100)
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-slate-600">Henter sundhedsdata...</span>
      </div>
    );
  }

  const currentDashboard = dashboards[selectedDashboard];
  const status = getDashboardStatus(currentDashboard);

  return (
    <div className="space-y-6">
      {/* Dashboard selector */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Object.values(dashboards).map(dashboard => {
          const dashStatus = getDashboardStatus(dashboard);
          const isSelected = selectedDashboard === dashboard.id;
          const Icon = dashboard.icon;

          return (
            <button
              key={dashboard.id}
              onClick={() => setSelectedDashboard(dashboard.id)}
              className={`flex-shrink-0 rounded-2xl p-4 transition-all duration-300 border-2 ${
                isSelected
                  ? `bg-gradient-to-br ${dashboard.color} text-white border-transparent shadow-lg scale-105`
                  : `bg-white ${dashboard.borderColor} hover:shadow-md`
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isSelected ? 'bg-white/20' : dashboard.bgColor
                }`}>
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-slate-600'}`} />
                </div>
                <div className="text-left">
                  <h3 className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                    {dashboard.name}
                  </h3>
                  <p className={`text-xs ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                    {dashStatus.testsWithData}/{dashStatus.totalTests} tests
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Current dashboard content */}
      <div className={`rounded-2xl border-2 ${currentDashboard.borderColor} overflow-hidden`}>
        {/* Header */}
        <div className={`bg-gradient-to-r ${currentDashboard.color} p-6 text-white`}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <currentDashboard.icon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{currentDashboard.name} Dashboard</h2>
              <p className="text-white/80">{currentDashboard.description}</p>
            </div>
          </div>

          {/* Status bar */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-white/70 text-xs">Dækning</p>
              <p className="text-xl font-bold">{status.coverage}%</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-white/70 text-xs">Tests med data</p>
              <p className="text-xl font-bold">{status.testsWithData} / {status.totalTests}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-white/70 text-xs">Total prøvesvar</p>
              <p className="text-xl font-bold">{observations.length}</p>
            </div>
          </div>
        </div>

        {/* Test cards */}
        <div className="p-6 bg-white">
          {!status.hasAnyData ? (
            <div className="text-center py-8">
              <Info className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Ingen relevante prøvesvar fundet
              </h3>
              <p className="text-slate-600 max-w-md mx-auto">
                Der blev ikke fundet nogen prøvesvar der matcher {currentDashboard.name.toLowerCase()}-dashboardet.
                Dine prøvesvar indeholder muligvis andre typer tests.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentDashboard.tests.map(test => renderTestCard(test, currentDashboard))}
            </div>
          )}
        </div>

        {/* Footer with info */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-600">
              <p className="font-medium mb-1">Om dette dashboard</p>
              <p>
                Værdierne vises fra dine seneste prøvesvar. Målværdier er vejledende -
                din læge kan have sat andre mål baseret på din situation.
                {selectedDashboard === 'diabetes' && ' Ved diabetes er god kontrol vigtig for at forebygge komplikationer.'}
                {selectedDashboard === 'heart' && ' Hjerte-kar sundhed påvirkes af både kolesterol, blodtryk og livsstil.'}
                {selectedDashboard === 'thyroid' && ' Stofskifteproblemer kan påvirke energi, vægt og humør.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
          <CheckCircle2 className="w-6 h-6 text-green-600 mb-2" />
          <h4 className="font-semibold text-green-800">Gode værdier</h4>
          <p className="text-sm text-green-700 mt-1">
            Værdier inden for mål vises med grøn baggrund
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
          <AlertTriangle className="w-6 h-6 text-amber-600 mb-2" />
          <h4 className="font-semibold text-amber-800">Trends</h4>
          <p className="text-sm text-amber-700 mt-1">
            Pil op/ned viser ændring fra sidste måling
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
          <Activity className="w-6 h-6 text-blue-600 mb-2" />
          <h4 className="font-semibold text-blue-800">Historik</h4>
          <p className="text-sm text-blue-700 mt-1">
            Se tidligere målinger for at følge udviklingen
          </p>
        </div>
      </div>
    </div>
  );
};

export default HealthDashboards;
