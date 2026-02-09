import React, { useState, useMemo } from 'react';
import { Moon, Sun, ChevronLeft, ChevronRight } from 'lucide-react';

// Sleep stage colors matching Apple Health style
const STAGE_COLORS = {
  deep: '#1e3a5f',      // Dark blue
  rem: '#7c3aed',       // Purple
  core: '#6366f1',      // Indigo
  light: '#6366f1',     // Indigo (alias)
  awake: '#f59e0b',     // Amber
  inBed: '#94a3b8',     // Slate
  asleep: '#818cf8',    // Light indigo
};

const STAGE_LABELS = {
  deep: 'Dyb søvn',
  rem: 'REM',
  core: 'Let søvn',
  light: 'Let søvn',
  awake: 'Vågen',
  inBed: 'I sengen',
  asleep: 'Sovende',
};

// Format time as HH:MM
const formatTime = (date) => {
  return date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
};

// Format duration
const formatDuration = (minutes) => {
  if (!minutes || minutes === 0) return '0t';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}t`;
  return `${hours}t ${mins}m`;
};

// Get stage from sleep type text
const getStageFromText = (text) => {
  const lower = (text || '').toLowerCase();
  if (lower.includes('deep')) return 'deep';
  if (lower.includes('rem')) return 'rem';
  if (lower.includes('core') || lower.includes('light')) return 'core';
  if (lower.includes('awake')) return 'awake';
  if (lower.includes('bed')) return 'inBed';
  return 'asleep';
};

// Timeline Chart Component - shows sleep stages over time
const SleepTimelineChart = ({ sessions, date }) => {
  const [hoveredSession, setHoveredSession] = useState(null);

  // Sort sessions by start time
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [sessions]);

  // Calculate time bounds
  const timeBounds = useMemo(() => {
    if (sortedSessions.length === 0) return null;

    const starts = sortedSessions.map(s => new Date(s.start).getTime());
    const ends = sortedSessions.map(s => new Date(s.end).getTime());

    const minTime = Math.min(...starts);
    const maxTime = Math.max(...ends);

    return { minTime, maxTime, duration: maxTime - minTime };
  }, [sortedSessions]);

  // Generate time axis labels (every 2 hours)
  const timeLabels = useMemo(() => {
    if (!timeBounds) return [];
    const labels = [];
    const startDate = new Date(timeBounds.minTime);
    const endDate = new Date(timeBounds.maxTime);

    // Round start to nearest hour
    startDate.setMinutes(0, 0, 0);

    let current = new Date(startDate);
    while (current <= endDate) {
      labels.push(new Date(current));
      current.setHours(current.getHours() + 2);
    }

    return labels;
  }, [timeBounds]);

  if (!timeBounds || sortedSessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400">
        Ingen søvndata
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Timeline container */}
      <div className="relative h-24 bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl overflow-hidden">
        {/* Stars background effect */}
        <div className="absolute inset-0 opacity-30">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* Moon icon at start */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
          <Moon className="w-5 h-5 text-indigo-300" />
        </div>

        {/* Sun icon at end */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
          <Sun className="w-5 h-5 text-amber-300" />
        </div>

        {/* Sleep stage bars */}
        <div className="absolute inset-0 flex items-center px-10">
          <div className="relative w-full h-12 rounded-lg overflow-hidden">
            {sortedSessions.map((session, idx) => {
              const start = new Date(session.start).getTime();
              const end = new Date(session.end).getTime();

              const leftPercent = ((start - timeBounds.minTime) / timeBounds.duration) * 100;
              const widthPercent = ((end - start) / timeBounds.duration) * 100;

              const stage = getStageFromText(session.type);
              const color = STAGE_COLORS[stage] || STAGE_COLORS.asleep;

              return (
                <div
                  key={idx}
                  className="absolute h-full transition-all duration-200 cursor-pointer hover:brightness-110"
                  style={{
                    left: `${leftPercent}%`,
                    width: `${Math.max(widthPercent, 0.5)}%`,
                    backgroundColor: color,
                  }}
                  onMouseEnter={() => setHoveredSession({ ...session, stage })}
                  onMouseLeave={() => setHoveredSession(null)}
                />
              );
            })}
          </div>
        </div>

        {/* Hover tooltip */}
        {hoveredSession && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg z-20">
            <p className="text-xs font-medium text-slate-800">
              {STAGE_LABELS[hoveredSession.stage] || hoveredSession.type}
            </p>
            <p className="text-xs text-slate-500">
              {formatTime(new Date(hoveredSession.start))} - {formatTime(new Date(hoveredSession.end))}
            </p>
            <p className="text-xs text-indigo-600 font-medium">
              {formatDuration(hoveredSession.duration)}
            </p>
          </div>
        )}
      </div>

      {/* Time axis */}
      <div className="relative h-6 px-10">
        {timeLabels.map((time, idx) => {
          const percent = ((time.getTime() - timeBounds.minTime) / timeBounds.duration) * 100;
          if (percent < 0 || percent > 100) return null;

          return (
            <div
              key={idx}
              className="absolute text-xs text-slate-500 -translate-x-1/2"
              style={{ left: `${percent}%` }}
            >
              {formatTime(time)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Stage duration summary
const StageSummary = ({ stages }) => {
  const stageList = [
    { key: 'deep', label: 'Dyb søvn', color: STAGE_COLORS.deep },
    { key: 'rem', label: 'REM', color: STAGE_COLORS.rem },
    { key: 'core', label: 'Let søvn', color: STAGE_COLORS.core },
    { key: 'awake', label: 'Vågen', color: STAGE_COLORS.awake },
  ];

  const total = Object.values(stages).reduce((sum, v) => sum + v, 0);

  return (
    <div className="grid grid-cols-4 gap-3">
      {stageList.map(({ key, label, color }) => {
        const minutes = stages[key] || 0;
        const percent = total > 0 ? (minutes / total) * 100 : 0;

        return (
          <div key={key} className="text-center">
            <div
              className="w-full h-2 rounded-full mb-2"
              style={{ backgroundColor: `${color}30` }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${percent}%`, backgroundColor: color }}
              />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              {formatDuration(minutes)}
            </p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        );
      })}
    </div>
  );
};

// Main Sleep Chart Component
const SleepChart = ({ sleepData, onDateChange }) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState(
    sleepData ? sleepData.length - 1 : 0
  );

  const selectedDay = sleepData?.[selectedDayIndex];

  const navigateDay = (direction) => {
    const newIndex = selectedDayIndex + direction;
    if (newIndex >= 0 && newIndex < sleepData.length) {
      setSelectedDayIndex(newIndex);
      if (onDateChange) {
        onDateChange(sleepData[newIndex]);
      }
    }
  };

  const formatDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'I nat';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'I går nat';
    }

    return date.toLocaleDateString('da-DK', {
      weekday: 'long',
      day: 'numeric',
      month: 'short'
    });
  };

  if (!sleepData || sleepData.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-indigo-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Moon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-800">Søvnanalyse</h3>
            <p className="text-sm text-slate-500">Ingen søvndata tilgængelig</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-indigo-100">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Moon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-800">Søvnanalyse</h3>
            <p className="text-sm text-slate-500">Detaljeret søvnoversigt</p>
          </div>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDay(-1)}
            disabled={selectedDayIndex === 0}
            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>

          <div className="text-center min-w-[140px]">
            <p className="font-medium text-slate-800">
              {selectedDay ? formatDateLabel(selectedDay.date) : '-'}
            </p>
            {selectedDay && (
              <p className="text-xs text-slate-500">
                {new Date(selectedDay.date).toLocaleDateString('da-DK')}
              </p>
            )}
          </div>

          <button
            onClick={() => navigateDay(1)}
            disabled={selectedDayIndex === sleepData.length - 1}
            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {selectedDay && selectedDay.sessions.length > 0 ? (
        <>
          {/* Total sleep time */}
          <div className="text-center mb-6">
            <p className="text-4xl font-bold text-indigo-600">
              {formatDuration(selectedDay.totalMinutes)}
            </p>
            <p className="text-sm text-slate-500">Total søvn</p>
          </div>

          {/* Timeline chart */}
          <div className="mb-8">
            <SleepTimelineChart
              sessions={selectedDay.sessions}
              date={selectedDay.date}
            />
          </div>

          {/* Stage summary */}
          <div className="pt-6 border-t border-slate-100">
            <h4 className="text-sm font-medium text-slate-700 mb-4">Søvnfaser</h4>
            <StageSummary stages={selectedDay.stages} />
          </div>

          {/* Sleep times */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Sengetid</p>
                  <p className="font-semibold text-slate-800">
                    {selectedDay.sessions.length > 0
                      ? formatTime(new Date(selectedDay.sessions[0].start))
                      : '-'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <p className="text-xs text-slate-500 text-right">Vågnet</p>
                  <p className="font-semibold text-slate-800">
                    {selectedDay.sessions.length > 0
                      ? formatTime(new Date(selectedDay.sessions[selectedDay.sessions.length - 1].end))
                      : '-'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Sun className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <Moon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Ingen søvndata for denne nat</p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-slate-100">
        <div className="flex flex-wrap gap-4 justify-center">
          {[
            { color: STAGE_COLORS.deep, label: 'Dyb søvn' },
            { color: STAGE_COLORS.rem, label: 'REM' },
            { color: STAGE_COLORS.core, label: 'Let søvn' },
            { color: STAGE_COLORS.awake, label: 'Vågen' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-slate-600">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SleepChart;
