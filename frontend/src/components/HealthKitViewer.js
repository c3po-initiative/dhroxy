import React, { useState, useEffect } from 'react';
import { Watch, Heart, Footprints, Activity, Moon, Scale, Thermometer, Droplets, TrendingUp, RefreshCw, AlertCircle, Check, ChevronDown, ChevronUp, Sun } from 'lucide-react';
import SleepChart from './SleepChart';

const HealthKitViewer = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [expandedType, setExpandedType] = useState(null);
  const [serverUrl, setServerUrl] = useState(window.location.origin);

  // Fetch HealthKit status
  const fetchStatus = async () => {
    try {
      const response = await fetch(`${serverUrl}/api/healthkit/status`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setError(null);
      } else {
        setError('Kunne ikke forbinde til HealthKit server');
      }
    } catch (err) {
      setError('Server ikke tilgængelig. Sørg for at dhroxy kører med HealthKit integration.');
    }
  };

  // Fetch all observations
  const fetchObservations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${serverUrl}/api/healthkit/observations`);
      if (response.ok) {
        const data = await response.json();
        setHealthData(data);
        setError(null);
      } else {
        setError('Kunne ikke hente HealthKit data');
      }
    } catch (err) {
      setError('Fejl ved hentning af data');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, [serverUrl]);

  // Group observations by type
  const groupedObservations = React.useMemo(() => {
    if (!healthData?.entry) return {};

    const groups = {};
    healthData.entry.forEach(item => {
      const obs = item.resource;
      const code = obs.code?.coding?.find(c => c.system?.includes('apple.com'))?.code ||
                   obs.code?.coding?.[0]?.code ||
                   'unknown';
      const displayName = obs.code?.text || obs.code?.coding?.[0]?.display || code;

      if (!groups[code]) {
        groups[code] = {
          displayName,
          observations: [],
          icon: getIconForType(code)
        };
      }
      groups[code].observations.push(obs);
    });

    // Sort observations by date within each group
    Object.values(groups).forEach(group => {
      group.observations.sort((a, b) =>
        new Date(b.effectiveDateTime || b.effectivePeriod?.start) - new Date(a.effectiveDateTime || a.effectivePeriod?.start)
      );
    });

    return groups;
  }, [healthData]);

  // Get sleep data for the last 7 days
  const sleepWeekData = React.useMemo(() => {
    const sleepGroup = groupedObservations['HKCategoryTypeIdentifierSleepAnalysis'];
    if (!sleepGroup) return null;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Group sleep sessions by night (date of sleep start)
    const sleepByNight = {};

    sleepGroup.observations.forEach(obs => {
      const startDate = new Date(obs.effectivePeriod?.start || obs.effectiveDateTime);
      const endDate = new Date(obs.effectivePeriod?.end || obs.effectiveDateTime);

      if (startDate < weekAgo) return;

      // Use the date when sleep started as the key (adjusted for late night sleep)
      const sleepDate = new Date(startDate);
      if (sleepDate.getHours() < 12) {
        // If sleep started before noon, it's likely from the previous night
        sleepDate.setDate(sleepDate.getDate() - 1);
      }
      const dateKey = sleepDate.toISOString().split('T')[0];

      if (!sleepByNight[dateKey]) {
        sleepByNight[dateKey] = {
          date: dateKey,
          totalMinutes: 0,
          sessions: [],
          stages: {
            asleep: 0,
            awake: 0,
            inBed: 0,
            core: 0,
            deep: 0,
            rem: 0
          }
        };
      }

      const durationMinutes = (endDate - startDate) / (1000 * 60);

      // Get sleep type from valueCodeableConcept (FHIR format) or fallback
      const sleepTypeText = obs.valueCodeableConcept?.text ||
                           obs.valueCodeableConcept?.coding?.[0]?.display ||
                           obs.valueQuantity?.unit ||
                           obs.code?.text ||
                           'Sleep';

      sleepByNight[dateKey].totalMinutes += durationMinutes;
      sleepByNight[dateKey].sessions.push({
        start: startDate,
        end: endDate,
        duration: durationMinutes,
        type: sleepTypeText
      });

      // Categorize sleep stages
      const sleepType = sleepTypeText.toLowerCase();
      if (sleepType.includes('deep')) {
        sleepByNight[dateKey].stages.deep += durationMinutes;
      } else if (sleepType.includes('rem')) {
        sleepByNight[dateKey].stages.rem += durationMinutes;
      } else if (sleepType.includes('core') || sleepType.includes('light')) {
        sleepByNight[dateKey].stages.core += durationMinutes;
      } else if (sleepType.includes('awake')) {
        sleepByNight[dateKey].stages.awake += durationMinutes;
      } else if (sleepType.includes('bed')) {
        sleepByNight[dateKey].stages.inBed += durationMinutes;
      } else {
        sleepByNight[dateKey].stages.asleep += durationMinutes;
      }
    });

    // Convert to sorted array and fill in missing days
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];

      if (sleepByNight[dateKey]) {
        result.push(sleepByNight[dateKey]);
      } else {
        result.push({
          date: dateKey,
          totalMinutes: 0,
          sessions: [],
          stages: { asleep: 0, awake: 0, inBed: 0, core: 0, deep: 0, rem: 0 }
        });
      }
    }

    return result;
  }, [groupedObservations]);

  // Get icon for observation type
  function getIconForType(code) {
    const iconMap = {
      'HKQuantityTypeIdentifierHeartRate': Heart,
      'HKQuantityTypeIdentifierStepCount': Footprints,
      'HKQuantityTypeIdentifierActiveEnergyBurned': Activity,
      'HKQuantityTypeIdentifierDistanceWalkingRunning': TrendingUp,
      'HKCategoryTypeIdentifierSleepAnalysis': Moon,
      'HKQuantityTypeIdentifierBodyMass': Scale,
      'HKQuantityTypeIdentifierBodyTemperature': Thermometer,
      'HKQuantityTypeIdentifierBloodGlucose': Droplets,
      'HKQuantityTypeIdentifierOxygenSaturation': Droplets,
      'HKQuantityTypeIdentifierBloodPressureSystolic': Heart,
      'HKQuantityTypeIdentifierBloodPressureDiastolic': Heart,
    };
    return iconMap[code] || Activity;
  }

  // Format value with unit
  const formatValue = (obs) => {
    if (obs.valueQuantity) {
      const value = obs.valueQuantity.value;
      const unit = obs.valueQuantity.unit || obs.valueQuantity.code || '';
      return `${typeof value === 'number' ? value.toFixed(1) : value} ${unit}`;
    }
    // For sleep, show duration
    if (obs.effectivePeriod?.start && obs.effectivePeriod?.end) {
      const start = new Date(obs.effectivePeriod.start);
      const end = new Date(obs.effectivePeriod.end);
      const durationMinutes = (end - start) / (1000 * 60);
      const hours = Math.floor(durationMinutes / 60);
      const minutes = Math.round(durationMinutes % 60);
      return `${hours}t ${minutes}m`;
    }
    return '-';
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format minutes to hours and minutes
  const formatDuration = (minutes) => {
    if (!minutes || minutes === 0) return '0t';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}t`;
    return `${hours}t ${mins}m`;
  };

  // Get day name in Danish
  const getDayName = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('da-DK', { weekday: 'short' });
  };

  // Calculate max sleep for scaling the chart
  const maxSleepMinutes = React.useMemo(() => {
    if (!sleepWeekData) return 480; // default 8 hours
    const max = Math.max(...sleepWeekData.map(d => d.totalMinutes));
    return Math.max(max, 480); // minimum 8 hours scale
  }, [sleepWeekData]);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-teal-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center">
              <Watch className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">
                Apple HealthKit Data
              </h2>
              <p className="text-slate-500 text-sm">
                Synkroniseret fra iOS HealthKit via dhroxy
              </p>
            </div>
          </div>
          <button
            onClick={() => { fetchStatus(); fetchObservations(); }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Opdater
          </button>
        </div>

        {/* Server URL Config */}
        <div className="mb-6 p-4 bg-slate-50 rounded-xl">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            HealthKit Server URL
          </label>
          <input
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://localhost:8080"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">
            Sørg for at dhroxy kører med HealthKit integration aktiveret
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm text-red-900 font-medium">{error}</p>
              <p className="text-xs text-red-700 mt-1">
                Start serveren med: java -jar build/libs/dhroxy-0.1.0-SNAPSHOT.jar
              </p>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-700 font-medium">Status</span>
              </div>
              <p className="text-lg font-semibold text-green-800 capitalize">
                {stats.status}
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-700 font-medium">Total Resources</span>
              </div>
              <p className="text-lg font-semibold text-blue-800">
                {stats.totalResources?.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-purple-700 font-medium">Observations</span>
              </div>
              <p className="text-lg font-semibold text-purple-800">
                {stats.resourceCounts?.Observation?.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Watch className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-amber-700 font-medium">Datatyper</span>
              </div>
              <p className="text-lg font-semibold text-amber-800">
                {Object.keys(groupedObservations).length}
              </p>
            </div>
          </div>
        )}

        {/* Load Data Button */}
        {!healthData && stats?.totalResources > 0 && (
          <button
            onClick={fetchObservations}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Henter data...' : `Hent ${stats.totalResources.toLocaleString()} observationer`}
          </button>
        )}
      </div>

      {/* Sleep Chart - SleepChartKit style */}
      {sleepWeekData && sleepWeekData.some(d => d.totalMinutes > 0) && (
        <SleepChart sleepData={sleepWeekData} />
      )}

      {/* Grouped Observations */}
      {healthData && Object.keys(groupedObservations).length > 0 && (
        <div className="space-y-4">
          {Object.entries(groupedObservations).map(([code, group]) => {
            const Icon = group.icon;
            const isExpanded = expandedType === code;
            const latestObs = group.observations[0];

            return (
              <div
                key={code}
                className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-100 overflow-hidden"
              >
                {/* Header - Always visible */}
                <button
                  onClick={() => setExpandedType(isExpanded ? null : code)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-slate-800">{group.displayName}</h3>
                    <p className="text-sm text-slate-500">
                      {group.observations.length} målinger
                      {latestObs && ` • Seneste: ${formatValue(latestObs)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-pink-600">
                        {formatValue(latestObs)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(latestObs?.effectiveDateTime || latestObs?.effectivePeriod?.start)}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50">
                    <div className="max-h-80 overflow-y-auto space-y-2">
                      {group.observations.slice(0, 50).map((obs, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-pink-500" />
                            <span className="text-sm text-slate-600">
                              {formatDate(obs.effectiveDateTime || obs.effectivePeriod?.start)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-semibold text-slate-800">
                              {formatValue(obs)}
                            </span>
                            {obs.device?.display && (
                              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                {obs.device.display}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {group.observations.length > 50 && (
                        <p className="text-center text-sm text-slate-500 py-2">
                          Viser 50 af {group.observations.length} målinger
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {healthData && Object.keys(groupedObservations).length === 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-12 shadow-xl border border-slate-100 text-center">
          <Watch className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            Ingen HealthKit data endnu
          </h3>
          <p className="text-slate-500 mb-6">
            Synkroniser data fra din iOS enhed med HealthKitSync appen
          </p>
          <a
            href="https://github.com/boldagechris/HealthKitSync-Dhroxy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <Watch className="w-4 h-4" />
            Se HealthKitSync på GitHub
          </a>
        </div>
      )}
    </div>
  );
};

export default HealthKitViewer;
