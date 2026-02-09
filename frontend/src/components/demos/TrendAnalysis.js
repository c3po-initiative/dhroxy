import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FlaskConical,
  Calendar,
  ArrowUp,
  ArrowDown,
  Activity
} from 'lucide-react';
import sundhedDkService from '../../services/sundhedDkService';

/**
 * TrendAnalysis - Viser udvikling i labsvar over tid
 * Grupperer samme type tests og viser trends med grafer
 */
const TrendAnalysis = () => {
  const [groupedResults, setGroupedResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  useEffect(() => {
    fetchAndGroupResults();
  }, []);

  const fetchAndGroupResults = async () => {
    setLoading(true);
    try {
      const result = await sundhedDkService.getLabResults('Alle', 100);
      if (result.success && result.data?.entry) {
        const observations = result.data.entry.map(e => e.resource);
        const grouped = groupByTestType(observations);
        setGroupedResults(grouped);
      }
    } catch (error) {
      console.error('Fejl ved hentning af labsvar:', error);
    }
    setLoading(false);
  };

  // Grupper observationer efter testtype
  const groupByTestType = (observations) => {
    const groups = {};

    observations.forEach(obs => {
      const code = obs.code?.coding?.[0]?.code || obs.code?.text || 'unknown';
      const display = obs.code?.coding?.[0]?.display || obs.code?.text || 'Ukendt test';

      if (!groups[code]) {
        groups[code] = {
          code,
          display,
          unit: obs.valueQuantity?.unit || obs.valueQuantity?.code || '',
          measurements: []
        };
      }

      if (obs.valueQuantity?.value !== undefined) {
        groups[code].measurements.push({
          value: obs.valueQuantity.value,
          date: obs.effectiveDateTime || obs.effectivePeriod?.start,
          status: obs.interpretation?.[0]?.coding?.[0]?.code,
          refLow: obs.referenceRange?.[0]?.low?.value,
          refHigh: obs.referenceRange?.[0]?.high?.value
        });
      }
    });

    // Sorter målinger efter dato og filtrer grupper med mindst 2 målinger
    Object.keys(groups).forEach(key => {
      groups[key].measurements.sort((a, b) =>
        new Date(a.date) - new Date(b.date)
      );
    });

    // Beregn trend for hver gruppe
    Object.keys(groups).forEach(key => {
      groups[key].trend = calculateTrend(groups[key].measurements);
    });

    return groups;
  };

  // Beregn trend baseret på målinger
  const calculateTrend = (measurements) => {
    if (measurements.length < 2) {
      return { direction: 'stable', change: 0, significance: 'none' };
    }

    const recent = measurements.slice(-3); // Seneste 3 målinger
    const first = recent[0]?.value;
    const last = recent[recent.length - 1]?.value;

    if (!first || !last) {
      return { direction: 'stable', change: 0, significance: 'none' };
    }

    const change = ((last - first) / first) * 100;
    const absChange = Math.abs(change);

    let direction = 'stable';
    if (change > 5) direction = 'rising';
    if (change < -5) direction = 'falling';

    let significance = 'none';
    if (absChange > 20) significance = 'high';
    else if (absChange > 10) significance = 'medium';
    else if (absChange > 5) significance = 'low';

    return { direction, change: change.toFixed(1), significance };
  };

  const getTrendConfig = (trend) => {
    switch (trend.direction) {
      case 'rising':
        return {
          icon: TrendingUp,
          color: trend.significance === 'high' ? 'text-red-600' : 'text-amber-600',
          bg: trend.significance === 'high' ? 'bg-red-50' : 'bg-amber-50',
          border: trend.significance === 'high' ? 'border-red-200' : 'border-amber-200',
          label: 'Stigende'
        };
      case 'falling':
        return {
          icon: TrendingDown,
          color: trend.significance === 'high' ? 'text-red-600' : 'text-amber-600',
          bg: trend.significance === 'high' ? 'bg-red-50' : 'bg-amber-50',
          border: trend.significance === 'high' ? 'border-red-200' : 'border-amber-200',
          label: 'Faldende'
        };
      default:
        return {
          icon: Minus,
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          label: 'Stabil'
        };
    }
  };

  // Simple SVG mini-graph
  const MiniGraph = ({ measurements, maxHeight = 40 }) => {
    if (measurements.length < 2) return null;

    const values = measurements.map(m => m.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const width = 150;
    const points = measurements.map((m, i) => {
      const x = (i / (measurements.length - 1)) * width;
      const y = maxHeight - ((m.value - min) / range) * maxHeight;
      return `${x},${y}`;
    }).join(' ');

    const lastPoint = measurements[measurements.length - 1];
    const firstPoint = measurements[0];
    const isRising = lastPoint.value > firstPoint.value;

    return (
      <svg width={width} height={maxHeight + 10} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke={isRising ? '#f59e0b' : '#10b981'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {measurements.map((m, i) => {
          const x = (i / (measurements.length - 1)) * width;
          const y = maxHeight - ((m.value - min) / range) * maxHeight;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              fill={i === measurements.length - 1 ? (isRising ? '#f59e0b' : '#10b981') : '#94a3b8'}
            />
          );
        })}
      </svg>
    );
  };

  // Detailed graph for selected test
  const DetailedGraph = ({ group }) => {
    const { measurements, display, unit } = group;
    if (measurements.length < 2) return null;

    const values = measurements.map(m => m.value);
    const min = Math.min(...values) * 0.9;
    const max = Math.max(...values) * 1.1;
    const range = max - min || 1;

    const width = 400;
    const height = 150;
    const padding = 40;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding;

    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h4 className="font-semibold text-slate-800 mb-4">{display} over tid</h4>

        <svg width={width} height={height} className="overflow-visible">
          {/* Y-axis labels */}
          <text x={padding - 5} y={padding} fontSize="10" textAnchor="end" fill="#64748b">
            {max.toFixed(1)}
          </text>
          <text x={padding - 5} y={height - 10} fontSize="10" textAnchor="end" fill="#64748b">
            {min.toFixed(1)}
          </text>
          <text x={padding - 5} y={height / 2} fontSize="10" textAnchor="end" fill="#64748b">
            {unit}
          </text>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <line
              key={i}
              x1={padding}
              y1={padding + graphHeight * ratio}
              x2={width - padding}
              y2={padding + graphHeight * ratio}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          ))}

          {/* Reference range if available */}
          {measurements[0]?.refLow && measurements[0]?.refHigh && (
            <rect
              x={padding}
              y={padding + graphHeight - ((measurements[0].refHigh - min) / range) * graphHeight}
              width={graphWidth}
              height={((measurements[0].refHigh - measurements[0].refLow) / range) * graphHeight}
              fill="#10b98120"
            />
          )}

          {/* Data line */}
          <polyline
            points={measurements.map((m, i) => {
              const x = padding + (i / (measurements.length - 1)) * graphWidth;
              const y = padding + graphHeight - ((m.value - min) / range) * graphHeight;
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke="#0d9488"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points with values */}
          {measurements.map((m, i) => {
            const x = padding + (i / (measurements.length - 1)) * graphWidth;
            const y = padding + graphHeight - ((m.value - min) / range) * graphHeight;
            const isLast = i === measurements.length - 1;

            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r={isLast ? 5 : 4}
                  fill={isLast ? '#0d9488' : '#94a3b8'}
                />
                {/* Value label for last point */}
                {isLast && (
                  <text
                    x={x}
                    y={y - 10}
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                    fill="#0d9488"
                  >
                    {m.value}
                  </text>
                )}
                {/* Date labels */}
                {m.date && (
                  <text
                    x={x}
                    y={height}
                    fontSize="9"
                    textAnchor="middle"
                    fill="#64748b"
                    transform={`rotate(-45 ${x} ${height})`}
                  >
                    {new Date(m.date).toLocaleDateString('da-DK', { month: 'short', year: '2-digit' })}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Summary */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-slate-500">Første måling</p>
            <p className="font-semibold text-slate-800">{measurements[0]?.value} {unit}</p>
            <p className="text-xs text-slate-400">
              {measurements[0]?.date && new Date(measurements[0].date).toLocaleDateString('da-DK')}
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-slate-500">Seneste måling</p>
            <p className="font-semibold text-slate-800">
              {measurements[measurements.length - 1]?.value} {unit}
            </p>
            <p className="text-xs text-slate-400">
              {measurements[measurements.length - 1]?.date &&
                new Date(measurements[measurements.length - 1].date).toLocaleDateString('da-DK')}
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-slate-500">Ændring</p>
            <p className={`font-semibold ${
              group.trend.change > 0 ? 'text-amber-600' :
              group.trend.change < 0 ? 'text-blue-600' : 'text-green-600'
            }`}>
              {group.trend.change > 0 ? '+' : ''}{group.trend.change}%
            </p>
            <p className="text-xs text-slate-400">
              over {measurements.length} målinger
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-slate-600">Analyserer trends...</span>
      </div>
    );
  }

  const testsWithTrends = Object.values(groupedResults)
    .filter(g => g.measurements.length >= 2)
    .sort((a, b) => {
      // Sort by significance first, then by absolute change
      const sigOrder = { high: 0, medium: 1, low: 2, none: 3 };
      if (sigOrder[a.trend.significance] !== sigOrder[b.trend.significance]) {
        return sigOrder[a.trend.significance] - sigOrder[b.trend.significance];
      }
      return Math.abs(b.trend.change) - Math.abs(a.trend.change);
    });

  // Vis alle tests (også dem med kun 1 måling)
  const allTests = Object.values(groupedResults).sort((a, b) => {
    // Sorter efter antal målinger (flest først), derefter efter navn
    if (b.measurements.length !== a.measurements.length) {
      return b.measurements.length - a.measurements.length;
    }
    return a.display.localeCompare(b.display);
  });

  if (allTests.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
        <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Ingen numeriske labsvar fundet</h3>
        <p className="text-slate-600">
          Trendanalyse kræver labsvar med numeriske værdier.
        </p>
      </div>
    );
  }

  if (testsWithTrends.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 bg-white rounded-2xl border border-slate-200">
          <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Ikke nok data til trendanalyse</h3>
          <p className="text-slate-600 mb-4">
            Der kræves mindst 2 målinger af samme type for at vise trends.
          </p>
        </div>

        {/* Vis tests med kun 1 måling */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h4 className="font-semibold text-slate-800 mb-4">Dine tests (1 måling hver)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allTests.map(group => (
              <div key={group.code} className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-700">{group.display}</p>
                {group.measurements[0] && (
                  <p className="text-sm text-slate-500">
                    {group.measurements[0].value} {group.unit}
                    {group.measurements[0].date && (
                      <span className="ml-2">
                        ({new Date(group.measurements[0].date).toLocaleDateString('da-DK')})
                      </span>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trend alerts */}
      {testsWithTrends.filter(t => t.trend.significance === 'high' || t.trend.significance === 'medium').length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-900">Bemærkelsesværdige ændringer opdaget</h3>
              <p className="text-sm text-amber-700 mt-1">
                Nogle af dine værdier har ændret sig markant over tid. Det kan være værd at tale med din læge om.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected test detailed view */}
      {selectedTest && groupedResults[selectedTest] && (
        <DetailedGraph group={groupedResults[selectedTest]} />
      )}

      {/* Test cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {testsWithTrends.map((group) => {
          const trendConfig = getTrendConfig(group.trend);
          const isSelected = selectedTest === group.code;

          return (
            <button
              key={group.code}
              onClick={() => setSelectedTest(isSelected ? null : group.code)}
              className={`text-left rounded-2xl border ${trendConfig.border} ${trendConfig.bg}
                         p-5 hover:shadow-lg transition-all duration-300
                         ${isSelected ? 'ring-2 ring-purple-500' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-800">{group.display}</h3>
                  <p className="text-sm text-slate-500">{group.measurements.length} målinger</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full
                               ${group.trend.direction === 'rising' ? 'bg-amber-100' :
                                 group.trend.direction === 'falling' ? 'bg-blue-100' : 'bg-green-100'}`}>
                  <trendConfig.icon className={`w-4 h-4 ${trendConfig.color}`} />
                  <span className={`text-sm font-medium ${trendConfig.color}`}>
                    {group.trend.change > 0 ? '+' : ''}{group.trend.change}%
                  </span>
                </div>
              </div>

              {/* Mini graph */}
              <div className="mb-3">
                <MiniGraph measurements={group.measurements} />
              </div>

              {/* Latest vs first */}
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-slate-500">Seneste: </span>
                  <span className="font-semibold text-slate-800">
                    {group.measurements[group.measurements.length - 1]?.value} {group.unit}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {group.trend.direction === 'rising' ? (
                    <ArrowUp className="w-4 h-4 text-amber-500" />
                  ) : group.trend.direction === 'falling' ? (
                    <ArrowDown className="w-4 h-4 text-blue-500" />
                  ) : (
                    <Minus className="w-4 h-4 text-green-500" />
                  )}
                  <span className={trendConfig.color}>{trendConfig.label}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <h4 className="font-medium text-slate-700 mb-3">Sådan læser du trends</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-slate-600">Stigende tendens</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-slate-600">Faldende tendens</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-slate-600">Stabil</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendAnalysis;
