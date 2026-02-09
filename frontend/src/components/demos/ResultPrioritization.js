import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  FlaskConical,
  Eye,
  Shield,
  Zap
} from 'lucide-react';
import sundhedDkService from '../../services/sundhedDkService';

/**
 * ResultPrioritization - Prioriterer labsvar efter vigtighed
 * Kategoriserer resultater i: Kræver handling, Hold øje med, Alt OK
 */
const ResultPrioritization = () => {
  const [results, setResults] = useState({ action: [], watch: [], ok: [] });
  const [loading, setLoading] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState('action');

  useEffect(() => {
    fetchAndPrioritize();
  }, []);

  const fetchAndPrioritize = async () => {
    setLoading(true);
    try {
      const result = await sundhedDkService.getLabResults('Alle', 500);
      if (result.success && result.data?.entry) {
        const observations = result.data.entry.map(e => e.resource);
        const prioritized = prioritizeResults(observations);
        setResults(prioritized);
      }
    } catch (error) {
      console.error('Fejl ved hentning af labsvar:', error);
    }
    setLoading(false);
  };

  // Prioriter resultater baseret på interpretation og referenceområde
  const prioritizeResults = (observations) => {
    const action = []; // Kræver handling
    const watch = [];  // Hold øje med
    const ok = [];     // Alt OK

    observations.forEach(obs => {
      const priority = calculatePriority(obs);

      const result = {
        observation: obs,
        name: obs.code?.coding?.[0]?.display || obs.code?.text || 'Ukendt test',
        value: obs.valueQuantity?.value,
        unit: obs.valueQuantity?.unit || obs.valueQuantity?.code || '',
        date: obs.effectiveDateTime || obs.effectivePeriod?.start,
        status: priority.status,
        reason: priority.reason,
        recommendation: priority.recommendation
      };

      if (priority.level === 'action') {
        action.push(result);
      } else if (priority.level === 'watch') {
        watch.push(result);
      } else {
        ok.push(result);
      }
    });

    // Sorter efter dato (nyeste først)
    [action, watch, ok].forEach(arr => {
      arr.sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    return { action, watch, ok };
  };

  // Beregn prioritet for et enkelt resultat
  const calculatePriority = (obs) => {
    const interpretation = obs.interpretation?.[0]?.coding?.[0]?.code;
    const value = obs.valueQuantity?.value;
    const refRange = obs.referenceRange?.[0];
    const testName = obs.code?.coding?.[0]?.display?.toLowerCase() || '';

    // Kritiske tests der altid kræver handling ved afvigelse
    const criticalTests = ['hæmoglobin', 'glucose', 'kalium', 'natrium', 'kreatinin', 'troponin'];
    const isCritical = criticalTests.some(t => testName.includes(t));

    // Check for meget høje/lave værdier (HH/LL)
    if (interpretation === 'HH' || interpretation === 'LL') {
      return {
        level: 'action',
        status: interpretation === 'HH' ? 'Kritisk høj' : 'Kritisk lav',
        reason: 'Værdien ligger langt uden for normalområdet',
        recommendation: 'Kontakt din læge snarest'
      };
    }

    // Check for høje/lave værdier (H/L)
    if (interpretation === 'H' || interpretation === 'L') {
      if (isCritical) {
        return {
          level: 'action',
          status: interpretation === 'H' ? 'Forhøjet' : 'For lav',
          reason: `${interpretation === 'H' ? 'Forhøjet' : 'For lav'} værdi af vigtig parameter`,
          recommendation: 'Tal med din læge ved næste besøg'
        };
      }
      return {
        level: 'watch',
        status: interpretation === 'H' ? 'Let forhøjet' : 'Let lav',
        reason: 'Værdien er uden for normalområdet',
        recommendation: 'Hold øje med ved næste blodprøve'
      };
    }

    // Check referenceRange hvis interpretation ikke er sat
    if (value !== undefined && refRange) {
      const low = refRange.low?.value;
      const high = refRange.high?.value;

      if (high && value > high * 1.5) {
        return {
          level: 'action',
          status: 'Betydeligt forhøjet',
          reason: 'Værdien er markant over normalområdet',
          recommendation: 'Kontakt din læge'
        };
      }

      if (low && value < low * 0.5) {
        return {
          level: 'action',
          status: 'Betydeligt lav',
          reason: 'Værdien er markant under normalområdet',
          recommendation: 'Kontakt din læge'
        };
      }

      if ((high && value > high) || (low && value < low)) {
        return {
          level: 'watch',
          status: value > high ? 'Let forhøjet' : 'Let lav',
          reason: 'Værdien er lige uden for normalområdet',
          recommendation: 'Hold øje med ved næste blodprøve'
        };
      }

      // Tæt på grænsen (inden for 10%)
      if (high && value > high * 0.9) {
        return {
          level: 'watch',
          status: 'Tæt på grænsen',
          reason: 'Værdien er i den høje ende af normalt',
          recommendation: 'Ingen handling nødvendig, men vær opmærksom'
        };
      }
    }

    // Normal
    return {
      level: 'ok',
      status: 'Normal',
      reason: 'Værdien er inden for normalområdet',
      recommendation: 'Ingen handling nødvendig'
    };
  };

  const categories = [
    {
      id: 'action',
      label: 'Kræver handling',
      icon: AlertCircle,
      color: 'red',
      bgGradient: 'from-red-500 to-rose-600',
      bgLight: 'from-red-50 to-rose-50',
      border: 'border-red-200',
      count: results.action.length,
      description: 'Disse resultater bør du tale med din læge om'
    },
    {
      id: 'watch',
      label: 'Hold øje med',
      icon: Eye,
      color: 'amber',
      bgGradient: 'from-amber-500 to-orange-600',
      bgLight: 'from-amber-50 to-orange-50',
      border: 'border-amber-200',
      count: results.watch.length,
      description: 'Værdier der er lidt uden for det normale'
    },
    {
      id: 'ok',
      label: 'Alt OK',
      icon: CheckCircle2,
      color: 'green',
      bgGradient: 'from-green-500 to-emerald-600',
      bgLight: 'from-green-50 to-emerald-50',
      border: 'border-green-200',
      count: results.ok.length,
      description: 'Disse værdier er helt fine'
    }
  ];

  const renderResult = (result, category) => {
    const colorClasses = {
      action: 'border-red-200 bg-red-50',
      watch: 'border-amber-200 bg-amber-50',
      ok: 'border-green-200 bg-green-50'
    };

    const statusClasses = {
      action: 'bg-red-100 text-red-700',
      watch: 'bg-amber-100 text-amber-700',
      ok: 'bg-green-100 text-green-700'
    };

    return (
      <div
        key={`${result.name}-${result.date}`}
        className={`p-4 rounded-xl border ${colorClasses[category]} transition-all hover:shadow-md`}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <h4 className="font-semibold text-slate-800">{result.name}</h4>
            {result.date && (
              <p className="text-xs text-slate-500">
                {new Date(result.date).toLocaleDateString('da-DK', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses[category]}`}>
            {result.status}
          </span>
        </div>

        {result.value !== undefined && (
          <p className="text-2xl font-bold text-slate-800 mb-2">
            {result.value} <span className="text-sm font-normal text-slate-500">{result.unit}</span>
          </p>
        )}

        <div className="space-y-1 text-sm">
          <p className="text-slate-600">
            <span className="font-medium">Årsag:</span> {result.reason}
          </p>
          <p className={`font-medium ${
            category === 'action' ? 'text-red-700' :
            category === 'watch' ? 'text-amber-700' : 'text-green-700'
          }`}>
            {result.recommendation}
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
        <span className="ml-3 text-slate-600">Analyserer resultater...</span>
      </div>
    );
  }

  const totalResults = results.action.length + results.watch.length + results.ok.length;

  if (totalResults === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
        <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Ingen labsvar fundet</h3>
        <p className="text-slate-600">
          Kunne ikke hente labsvar fra serveren.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
            className={`rounded-2xl p-5 text-left transition-all duration-300
                       ${expandedCategory === cat.id
                         ? `bg-gradient-to-br ${cat.bgGradient} text-white shadow-lg scale-105`
                         : `bg-gradient-to-br ${cat.bgLight} border ${cat.border} hover:shadow-md`
                       }`}
          >
            <div className="flex items-center justify-between mb-3">
              <cat.icon className={`w-8 h-8 ${
                expandedCategory === cat.id ? 'text-white' : `text-${cat.color}-600`
              }`} />
              <span className={`text-3xl font-bold ${
                expandedCategory === cat.id ? 'text-white' : 'text-slate-800'
              }`}>
                {cat.count}
              </span>
            </div>
            <h3 className={`font-semibold ${
              expandedCategory === cat.id ? 'text-white' : 'text-slate-800'
            }`}>
              {cat.label}
            </h3>
            <p className={`text-sm mt-1 ${
              expandedCategory === cat.id ? 'text-white/80' : 'text-slate-500'
            }`}>
              {cat.description}
            </p>
          </button>
        ))}
      </div>

      {/* Priority message */}
      {results.action.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-red-900">
              {results.action.length} resultat{results.action.length > 1 ? 'er' : ''} kræver din opmærksomhed
            </h3>
            <p className="text-sm text-red-700 mt-1">
              Disse værdier ligger uden for det normale område. Vi anbefaler at du kontakter din læge.
            </p>
          </div>
        </div>
      )}

      {results.action.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-900">
              Ingen kritiske fund
            </h3>
            <p className="text-sm text-green-700 mt-1">
              Ingen af dine resultater kræver akut handling. Fortsæt med at holde øje med dine værdier.
            </p>
          </div>
        </div>
      )}

      {/* Expanded category results */}
      {expandedCategory && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className={`p-4 bg-gradient-to-r ${
            categories.find(c => c.id === expandedCategory)?.bgLight
          } border-b ${
            categories.find(c => c.id === expandedCategory)?.border
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {React.createElement(
                  categories.find(c => c.id === expandedCategory)?.icon,
                  { className: `w-6 h-6 text-${categories.find(c => c.id === expandedCategory)?.color}-600` }
                )}
                <h3 className="font-semibold text-slate-800">
                  {categories.find(c => c.id === expandedCategory)?.label}
                </h3>
                <span className="text-sm text-slate-500">
                  ({results[expandedCategory].length} resultater)
                </span>
              </div>
              <button
                onClick={() => setExpandedCategory(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-4">
            {results[expandedCategory].length === 0 ? (
              <p className="text-center text-slate-500 py-4">
                Ingen resultater i denne kategori
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results[expandedCategory].map((result) =>
                  renderResult(result, expandedCategory)
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <h4 className="font-medium text-slate-700 mb-3">Samlet oversigt</h4>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-slate-800">{totalResults}</p>
            <p className="text-xs text-slate-500">Resultater i alt</p>
          </div>
          <div className="flex-1 bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">
              {((results.ok.length / totalResults) * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-slate-500">Normale værdier</p>
          </div>
          <div className="flex-1 bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {results.action.length + results.watch.length}
            </p>
            <p className="text-xs text-slate-500">Kræver opmærksomhed</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultPrioritization;
