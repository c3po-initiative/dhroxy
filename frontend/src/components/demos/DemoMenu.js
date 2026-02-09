import React, { useState } from 'react';
import {
  FlaskConical,
  TrendingUp,
  ListOrdered,
  MessageSquare,
  Heart,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Lightbulb
} from 'lucide-react';
import LabResultExplainer from './LabResultExplainer';
import TrendAnalysis from './TrendAnalysis';
import ResultPrioritization from './ResultPrioritization';
import LabChat from './LabChat';
import HealthDashboards from './HealthDashboards';
import PersonalRecommendations from './PersonalRecommendations';

/**
 * DemoMenu - Menu til at vælge mellem forskellige demo-eksempler
 * for "Labsvar til Mennesker" produktet
 */
const DemoMenu = () => {
  const [activeDemo, setActiveDemo] = useState(null);

  const demos = [
    {
      id: 'explainer',
      title: 'Intelligent Labsvar-forklaring',
      description: 'Få dine blodprøver forklaret på almindeligt dansk med anbefalinger og spørgsmål til lægen',
      icon: FlaskConical,
      color: 'from-teal-500 to-blue-600',
      bgColor: 'from-teal-50 to-blue-50',
      borderColor: 'border-teal-200',
      status: 'ready',
      component: LabResultExplainer
    },
    {
      id: 'trends',
      title: 'Trend-analyse',
      description: 'Se udviklingen i dine værdier over tid og få advarsler om stigende eller faldende tendenser',
      icon: TrendingUp,
      color: 'from-purple-500 to-pink-600',
      bgColor: 'from-purple-50 to-pink-50',
      borderColor: 'border-purple-200',
      status: 'ready',
      component: TrendAnalysis
    },
    {
      id: 'priority',
      title: 'Simpel prioritering',
      description: 'Få overblik over hvilke resultater der kræver handling, hvilke du skal holde øje med, og hvilke der er OK',
      icon: ListOrdered,
      color: 'from-orange-500 to-red-600',
      bgColor: 'from-orange-50 to-red-50',
      borderColor: 'border-orange-200',
      status: 'ready',
      component: ResultPrioritization
    },
    {
      id: 'chat',
      title: 'AI Chat om labsvar',
      description: 'Stil spørgsmål om dine resultater og få forklaringer på fagudtryk, sammenhænge og anbefalinger',
      icon: MessageSquare,
      color: 'from-green-500 to-emerald-600',
      bgColor: 'from-green-50 to-emerald-50',
      borderColor: 'border-green-200',
      status: 'ready',
      component: LabChat
    },
    {
      id: 'dashboards',
      title: 'Sygdoms-dashboards',
      description: 'Se dine værdier samlet for diabetes, hjerte og skjoldbruskkirtel med trends og målområder',
      icon: Activity,
      color: 'from-rose-500 to-red-600',
      bgColor: 'from-rose-50 to-red-50',
      borderColor: 'border-rose-200',
      status: 'ready',
      component: HealthDashboards
    },
    {
      id: 'recommendations',
      title: 'Personlige anbefalinger',
      description: 'Få livsstilsråd baseret på dine labværdier, KRAM-faktorer og familiehistorik',
      icon: Lightbulb,
      color: 'from-amber-500 to-yellow-600',
      bgColor: 'from-amber-50 to-yellow-50',
      borderColor: 'border-amber-200',
      status: 'ready',
      component: PersonalRecommendations
    }
  ];

  const futureFeatures = [
    {
      title: 'Personaliseret risiko-analyse',
      description: 'Beregn din risiko for hjertekarsygdom, diabetes m.m. baseret på dine værdier',
      icon: Heart,
      timeline: 'Måned 4-6'
    },
    {
      title: 'Livsstils-kobling',
      description: 'Se hvordan træning, kost og søvn påvirker dine laboratorieværdier',
      icon: Sparkles,
      timeline: 'Måned 6-9'
    }
  ];

  // Hvis en demo er aktiv, vis den
  if (activeDemo) {
    const demo = demos.find(d => d.id === activeDemo);
    const DemoComponent = demo.component;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Tilbage-knap */}
        <button
          onClick={() => setActiveDemo(null)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Tilbage til demo-menu</span>
        </button>

        {/* Demo header */}
        <div className={`bg-gradient-to-r ${demo.color} rounded-3xl p-8 text-white`}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <demo.icon className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{demo.title}</h2>
              <p className="text-white/80 mt-1">{demo.description}</p>
            </div>
          </div>
        </div>

        {/* Demo component */}
        <DemoComponent />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 via-blue-500 to-purple-600 rounded-3xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <FlaskConical className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Labsvar til Mennesker</h1>
            <p className="text-white/80 mt-1">
              Din personlige laboratorium-tolk
            </p>
          </div>
        </div>
        <p className="text-white/90 text-lg max-w-2xl">
          Forstå dine blodprøver på almindeligt dansk - og få at vide hvad du skal gøre ved det.
        </p>
      </div>

      {/* Demo cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-600" />
          MVP Features (tilgængelige nu)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {demos.map((demo) => (
            <button
              key={demo.id}
              onClick={() => setActiveDemo(demo.id)}
              className={`bg-gradient-to-br ${demo.bgColor} rounded-2xl p-6 border ${demo.borderColor}
                         hover:shadow-xl transition-all duration-300 text-left group`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 bg-gradient-to-br ${demo.color} rounded-xl
                               flex items-center justify-center flex-shrink-0
                               group-hover:scale-110 transition-transform`}>
                  <demo.icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-800 text-lg">
                      {demo.title}
                    </h3>
                    {demo.status === 'ready' && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        Klar
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">
                    {demo.description}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600
                                        group-hover:translate-x-1 transition-all flex-shrink-0 mt-2" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Future features */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-600" />
          Kommende features
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {futureFeatures.map((feature, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6
                        border border-slate-200 opacity-70"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-slate-300 to-slate-400 rounded-xl
                               flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-600 text-lg">
                      {feature.title}
                    </h3>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs rounded-full font-medium">
                      {feature.timeline}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Problem statement */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Problemet vi løser
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-2xl font-bold text-amber-700 mb-1">78%</p>
            <p className="text-slate-600">af danskere forstår ikke deres labsvar</p>
          </div>
          <div className="p-4 bg-red-50 rounded-xl border border-red-200">
            <p className="text-2xl font-bold text-red-700 mb-1">41%</p>
            <p className="text-slate-600">bliver unødvendigt bekymrede af normale afvigelser</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-2xl font-bold text-blue-700 mb-1">8 min</p>
            <p className="text-slate-600">gennemsnitlig konsultationstid - for lidt til forklaringer</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoMenu;
