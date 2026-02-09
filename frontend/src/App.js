import React, { useState, useEffect, useRef } from 'react';
import { Heart, Activity, User, MessageSquare, Pill, Calendar, FileText, TrendingUp, Lock, Home, Send, Loader2, ChevronRight, Apple, Cigarette, Wine, Dumbbell, Users, Wallet, AlertCircle, Check, X, FlaskConical, ClipboardList, StickyNote, Database, Beaker, Watch } from 'lucide-react';
import DataViewer from './components/DataViewer';
import DemoMenu from './components/demos/DemoMenu';
import HeaderConfig from './components/HeaderConfig';
import HealthKitViewer from './components/HealthKitViewer';
import sundhedDkService from './services/sundhedDkService';

// Minimalistisk, tillidsfuld dansk sundhedsplatform
const SundhedsAgent = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const [kramData, setKramData] = useState({
    kost: { score: 0, notes: '' },
    rygning: { status: 'aldrig', notes: '' },
    alkohol: { units: 0, notes: '' },
    motion: { minutes: 0, notes: '' }
  });
  const [socioData, setSocioData] = useState({
    uddannelse: '',
    beskæftigelse: '',
    boligforhold: '',
    økonomi: '',
    netværk: ''
  });
  const [familyHistory, setFamilyHistory] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef(null);
  const [dhroxyUrl, setDhroxyUrl] = useState('/fhir');
  const [dhroxyConnected, setDhroxyConnected] = useState(false);
  const [selectedNotat, setSelectedNotat] = useState(null);
  const [selectedEpikrise, setSelectedEpikrise] = useState(null);

  // Load data from persistent storage
  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      const kramResult = localStorage.getItem('kram-data');
      if (kramResult) setKramData(JSON.parse(kramResult));

      const socioResult = localStorage.getItem('socio-data');
      if (socioResult) setSocioData(JSON.parse(socioResult));

      const familyResult = localStorage.getItem('family-history');
      if (familyResult) setFamilyHistory(JSON.parse(familyResult));

      const messagesResult = localStorage.getItem('chat-messages');
      if (messagesResult) setMessages(JSON.parse(messagesResult));

      const urlResult = localStorage.getItem('dhroxy-url');
      if (urlResult) setDhroxyUrl(urlResult);
    } catch (error) {
      console.log('First time loading - no stored data yet');
    }
  };

  const saveToStorage = async (key, data) => {
    try {
      localStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data));
    } catch (error) {
      console.error('Storage error:', error);
    }
  };

  // Fetch patient data from dhroxy
  const fetchPatientData = async () => {
    setLoading(true);
    try {
      // Ensure URL starts with / for proxy to work, or use full URL
      const url = dhroxyUrl.startsWith('http') ? dhroxyUrl :
                  dhroxyUrl.startsWith('/') ? dhroxyUrl : `/${dhroxyUrl}`;
      console.log('Fetching data from:', url);

      // Get custom headers from service (Cookie, X-XSRF-Token, Conversation-UUID)
      const customHeaders = sundhedDkService.getCustomHeaders();
      console.log('Using custom headers:', Object.keys(customHeaders));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...customHeaders
        },
        body: JSON.stringify({
          resourceType: 'Bundle',
          type: 'transaction',
          entry: [
            { request: { method: 'GET', url: 'Patient' } },
            { request: { method: 'GET', url: 'Observation?_count=1000' } },
            { request: { method: 'GET', url: 'Condition' } },
            { request: { method: 'GET', url: 'MedicationStatement' } },
            { request: { method: 'GET', url: 'Immunization' } },
            { request: { method: 'GET', url: 'Appointment' } }
          ]
        })
      });

      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Received data:', data);
        console.log('Entry structure:', data.entry);
        if (data.entry && data.entry[1]) {
          console.log('Observations bundle:', data.entry[1].resource);
        }
        if (data.entry && data.entry[5]) {
          console.log('Appointments:', data.entry[5].resource);
        }
        if (data.entry && data.entry[6]) {
          console.log('Epikriser:', data.entry[6].resource);
        }
        if (data.entry && data.entry[7]) {
          console.log('Notater:', data.entry[7].resource);
        }
        setPatientData(data);
        setDhroxyConnected(true);
      } else {
        const errorText = await response.text().catch(() => '');
        console.error('Response not OK:', response.status, response.statusText);
        console.error('Error body:', errorText);
        if (response.status === 400 && url.startsWith('/')) {
          console.warn('⚠️ 400 error with relative URL. Make sure:');
          console.warn('1. The React dev server was restarted after package.json proxy changes');
          console.warn('2. The backend is running on http://localhost:8081');
          console.warn('3. Try using full URL: http://localhost:8081/fhir');
        }
        setDhroxyConnected(false);
      }
    } catch (error) {
      console.error('Dhroxy connection error:', error);
      console.error('Error details:', error.message);
      if (error.message.includes('Failed to fetch') || error.message.includes('No host')) {
        console.warn('⚠️ Network error. Make sure:');
        console.warn('1. The backend is running on http://localhost:8081');
        console.warn('2. The proxy in package.json is set to "http://localhost:8081"');
        console.warn('3. The React dev server was restarted after proxy changes');
        console.warn('4. Try using full URL: http://localhost:8081/fhir');
      }
      setDhroxyConnected(false);
    }
    setLoading(false);
  };

  // Send message to Claude
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = { role: 'user', content: inputMessage };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsThinking(true);

    try {
      // Build context from all available data
      const context = `
Du er en dansk sundhedsagent der hjælper patienten med at forstå deres helbred.

PATIENTDATA FRA SUNDHED.DK (FHIR):
${patientData ? JSON.stringify(patientData, null, 2) : 'Ikke hentet endnu'}

KRAM-FAKTORER:
- Kost: Score ${kramData.kost.score}/10. ${kramData.kost.notes}
- Rygning: ${kramData.rygning.status}. ${kramData.rygning.notes}
- Alkohol: ${kramData.alkohol.units} genstande/uge. ${kramData.alkohol.notes}
- Motion: ${kramData.motion.minutes} min/uge. ${kramData.motion.notes}

SOCIOØKONOMISKE FORHOLD:
${Object.entries(socioData).map(([key, value]) => `${key}: ${value}`).join('\n')}

FAMILIESYGDOMSHISTORIK:
${familyHistory.map(h => `${h.relation}: ${h.condition} (alder: ${h.age})`).join('\n')}

Giv personlige, kontekstbaserede sundhedsråd på dansk. Vær empatisk og professionel.
`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1000,
          system: context,
          messages: newMessages
        })
      });

      const data = await response.json();
      const assistantMessage = {
        role: 'assistant',
        content: data.content[0].text
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      saveToStorage('chat-messages', updatedMessages);
    } catch (error) {
      console.error('Claude API error:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Beklager, jeg kunne ikke behandle din besked. Prøv venligst igen.'
      };
      setMessages([...newMessages, errorMessage]);
    }

    setIsThinking(false);
  };

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-teal-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-800 tracking-tight">
                  Min Sundhedsagent
                </h1>
                <p className="text-xs text-slate-500">Privat & Sikker</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-teal-600" />
              <span className="text-sm text-slate-600">Krypteret lokalt</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar Navigation */}
          <div className="col-span-3">
            <nav className="space-y-2 sticky top-24">
              {[
                { id: 'dashboard', icon: Home, label: 'Overblik' },
                { id: 'healthkit', icon: Watch, label: 'Apple HealthKit' },
                { id: 'demos', icon: Beaker, label: 'Labsvar Demo' },
                { id: 'dataviewer', icon: Database, label: 'Data Viewer' },
                { id: 'kram', icon: Activity, label: 'KRAM-faktorer' },
                { id: 'socio', icon: Wallet, label: 'Socioøkonomi' },
                { id: 'family', icon: Users, label: 'Familiehistorik' },
                { id: 'chat', icon: MessageSquare, label: 'Sundhedsagent' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                    activeTab === item.id
                      ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-lg shadow-teal-200'
                      : 'bg-white/60 text-slate-600 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            {/* Dashboard */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-teal-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-slate-800">
                      Sundhedsoverblik
                    </h2>
                    <button
                      onClick={fetchPatientData}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Activity className="w-4 h-4" />
                      )}
                      Hent data fra Sundhed.dk
                    </button>
                  </div>

                  {/* Authentication Headers */}
                  <div className="mb-6">
                    <HeaderConfig
                      onHeadersChanged={(headers) => {
                        console.log('Headers opdateret:', headers);
                      }}
                    />
                  </div>

                  {!dhroxyConnected && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-amber-900 font-medium">
                            Dhroxy ikke tilsluttet
                          </p>
                          <p className="text-xs text-amber-700 mt-1">
                            Indtast din FHIR server URL nedenfor og klik "Hent data" (Brug /fhir for localhost:8081)
                          </p>
                          <input
                            type="text"
                            value={dhroxyUrl}
                            onChange={(e) => {
                              setDhroxyUrl(e.target.value);
                              saveToStorage('dhroxy-url', e.target.value);
                            }}
                            placeholder="/fhir"
                            className="mt-2 w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {patientData ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <StatCard
                          icon={FileText}
                          label="Observationer"
                          value={patientData.entry?.[1]?.resource?.total || patientData.entry?.[1]?.resource?.entry?.length || 0}
                          color="blue"
                        />
                        <StatCard
                          icon={AlertCircle}
                          label="Diagnoser"
                          value={patientData.entry?.[2]?.resource?.total || patientData.entry?.[2]?.resource?.entry?.length || 0}
                          color="red"
                        />
                        <StatCard
                          icon={Pill}
                          label="Medicin"
                          value={patientData.entry?.[3]?.resource?.total || patientData.entry?.[3]?.resource?.entry?.length || 0}
                          color="purple"
                        />
                        <StatCard
                          icon={Activity}
                          label="Vaccinationer"
                          value={patientData.entry?.[4]?.resource?.total || patientData.entry?.[4]?.resource?.entry?.length || 0}
                          color="green"
                        />
                        <StatCard
                          icon={Calendar}
                          label="Aftaler"
                          value={patientData.entry?.[5]?.resource?.total || patientData.entry?.[5]?.resource?.entry?.length || 0}
                          color="orange"
                        />
                      </div>

                      {/* Observationer / Labsvar */}
                      {patientData.entry?.[1]?.resource?.entry && patientData.entry[1].resource.entry.length > 0 && (
                        <div className="mt-8">
                          <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <FlaskConical className="w-5 h-5 text-teal-600" />
                            Seneste laboratoriesvar
                          </h3>
                          <div className="space-y-3">
                            {patientData.entry[1].resource.entry.map((obs, index) => {
                              const observation = obs.resource;
                              const code = observation.code?.coding?.[0]?.display || observation.code?.text || 'Ukendt test';
                              const value = observation.valueQuantity?.value;
                              const unit = observation.valueQuantity?.unit || observation.valueQuantity?.code;
                              const date = observation.effectiveDateTime || observation.effectivePeriod?.start;
                              const status = observation.status;

                              return (
                                <div
                                  key={index}
                                  className="flex items-start gap-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200 hover:shadow-md transition-all"
                                >
                                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                                    <FlaskConical className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-start justify-between mb-1">
                                      <h4 className="font-semibold text-slate-800">{code}</h4>
                                      {status && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                          status === 'final' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                          {status === 'final' ? 'Færdig' : status}
                                        </span>
                                      )}
                                    </div>
                                    {value && (
                                      <p className="text-xl font-bold text-teal-600 mb-0.5">
                                        {value} {unit}
                                      </p>
                                    )}
                                    {date && (
                                      <p className="text-xs text-slate-500">
                                        {new Date(date).toLocaleDateString('da-DK', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric'
                                        })}
                                      </p>
                                    )}
                                    {observation.interpretation?.[0]?.coding?.[0]?.display && (
                                      <p className="text-xs text-slate-600 mt-1">
                                        {observation.interpretation[0].coding[0].display}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Epikriser */}
                      {patientData.entry?.[5]?.resource?.entry && patientData.entry[5].resource.entry.length > 0 && (
                        <div className="mt-8">
                          <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-purple-600" />
                            Epikriser ({patientData.entry[5].resource.entry.length})
                          </h3>
                          <div className="space-y-3">
                            {patientData.entry[5].resource.entry.map((item, index) => {
                              const epikrise = item.resource;
                              // DocumentReference structure: type, description, content.attachment.data
                              const epikriseType = epikrise.type?.coding?.[0]?.display || epikrise.type?.text || 'Epikrise';
                              const overskrift = epikrise.description || epikriseType;
                              const date = epikrise.date || epikrise.created || epikrise.indexed;
                              const author = epikrise.author?.[0]?.display || epikrise.custodian?.display || '';

                              return (
                                <div
                                  key={index}
                                  onClick={() => setSelectedEpikrise(epikrise)}
                                  className="flex items-start gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 hover:shadow-lg transition-all cursor-pointer"
                                >
                                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                                    <ClipboardList className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-slate-800">{overskrift}</h4>
                                    <p className="text-xs text-purple-600 mt-0.5">{epikriseType}</p>
                                    {date && (
                                      <p className="text-xs text-slate-500 mt-1">
                                        {new Date(date).toLocaleDateString('da-DK', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric'
                                        })}
                                      </p>
                                    )}
                                    {author && (
                                      <p className="text-xs text-purple-700 mt-1">{author}</p>
                                    )}
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-slate-400" />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Notater */}
                      {patientData.entry?.[6]?.resource?.entry && patientData.entry[6].resource.entry.length > 0 && (
                        <div className="mt-8">
                          <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <StickyNote className="w-5 h-5 text-amber-600" />
                            Notater ({patientData.entry[6].resource.entry.length})
                          </h3>
                          <div className="space-y-3">
                            {patientData.entry[6].resource.entry.map((item, index) => {
                              const notat = item.resource;
                              // DocumentReference structure: type, description, content.attachment.data
                              const notatType = notat.type?.coding?.[0]?.display || notat.type?.text || 'Notat';
                              const overskrift = notat.description || notatType;
                              const date = notat.date || notat.created || notat.indexed;
                              const author = notat.author?.[0]?.display || notat.custodian?.display || '';

                              return (
                                <div
                                  key={index}
                                  onClick={() => setSelectedNotat(notat)}
                                  className="flex items-start gap-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 hover:shadow-lg transition-all cursor-pointer"
                                >
                                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center flex-shrink-0">
                                    <StickyNote className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-slate-800">{overskrift}</h4>
                                    <p className="text-xs text-amber-600 mt-0.5">{notatType}</p>
                                    {date && (
                                      <p className="text-xs text-slate-500 mt-1">
                                        {new Date(date).toLocaleDateString('da-DK', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric'
                                        })}
                                      </p>
                                    )}
                                    {author && (
                                      <p className="text-xs text-amber-700 mt-1">{author}</p>
                                    )}
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-slate-400" />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Aftaler / Appointments */}
                      {patientData.entry?.[5]?.resource?.entry && patientData.entry[5].resource.entry.length > 0 && (
                        <div className="mt-8">
                          <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-orange-600" />
                            Aftaler ({patientData.entry[5].resource.entry.length})
                          </h3>
                          <div className="space-y-3">
                            {patientData.entry[5].resource.entry.map((item, index) => {
                              const appointment = item.resource;
                              const title = appointment.description || appointment.serviceType?.[0]?.text || appointment.serviceType?.[0]?.coding?.[0]?.display || 'Aftale';
                              const startDate = appointment.start;
                              const endDate = appointment.end;
                              const status = appointment.status;
                              const participant = appointment.participant?.find(p => p.actor?.display)?.actor?.display || '';
                              const location = appointment.participant?.find(p => p.actor?.display && p.actor?.display.includes('-'))?.actor?.display || '';

                              // Format date
                              const formatDate = (dateStr) => {
                                if (!dateStr) return '';
                                const date = new Date(dateStr);
                                return date.toLocaleDateString('da-DK', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                });
                              };

                              // Determine if appointment is upcoming or past
                              const isUpcoming = startDate && new Date(startDate) > new Date();

                              return (
                                <div
                                  key={index}
                                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                                    isUpcoming
                                      ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 hover:shadow-lg'
                                      : 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200'
                                  }`}
                                >
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                    isUpcoming
                                      ? 'bg-gradient-to-br from-orange-500 to-amber-600'
                                      : 'bg-gradient-to-br from-slate-400 to-gray-500'
                                  }`}>
                                    <Calendar className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-start justify-between mb-1">
                                      <h4 className="font-semibold text-slate-800">{title}</h4>
                                      {status && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                          status === 'booked' || status === 'arrived'
                                            ? 'bg-green-100 text-green-700'
                                            : status === 'cancelled'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-slate-100 text-slate-700'
                                        }`}>
                                          {status === 'booked' ? 'Bekræftet' : status === 'arrived' ? 'Ankommet' : status === 'cancelled' ? 'Aflyst' : status}
                                        </span>
                                      )}
                                    </div>
                                    {startDate && (
                                      <p className="text-sm text-slate-700 font-medium">
                                        {formatDate(startDate)}
                                        {endDate && ` - ${formatDate(endDate)}`}
                                      </p>
                                    )}
                                    {participant && (
                                      <p className="text-xs text-slate-600 mt-1">
                                        {participant}
                                      </p>
                                    )}
                                    {location && (
                                      <p className="text-xs text-orange-600 mt-1">
                                        📍 {location}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">
                        Klik "Hent data" for at se dine sundhedsoplysninger
                      </p>
                    </div>
                  )}
                </div>

                {/* KRAM Quick View */}
                <div className="grid grid-cols-4 gap-4">
                  <KRAMQuickCard
                    icon={Apple}
                    label="Kost"
                    value={`${kramData.kost.score}/10`}
                    color="green"
                  />
                  <KRAMQuickCard
                    icon={Cigarette}
                    label="Rygning"
                    value={kramData.rygning.status}
                    color="red"
                  />
                  <KRAMQuickCard
                    icon={Wine}
                    label="Alkohol"
                    value={`${kramData.alkohol.units} gst/uge`}
                    color="amber"
                  />
                  <KRAMQuickCard
                    icon={Dumbbell}
                    label="Motion"
                    value={`${kramData.motion.minutes} min/uge`}
                    color="blue"
                  />
                </div>
              </div>
            )}

            {/* HealthKit Tab */}
            {activeTab === 'healthkit' && (
              <div className="animate-fade-in">
                <HealthKitViewer />
              </div>
            )}

            {/* Demo Menu Tab */}
            {activeTab === 'demos' && (
              <div className="animate-fade-in">
                <DemoMenu />
              </div>
            )}

            {/* Data Viewer Tab */}
            {activeTab === 'dataviewer' && (
              <div className="animate-fade-in">
                <DataViewer />
              </div>
            )}

            {/* KRAM Tab */}
            {activeTab === 'kram' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-teal-100">
                  <h2 className="text-2xl font-semibold text-slate-800 mb-6">
                    KRAM-faktorer
                  </h2>
                  <p className="text-slate-600 mb-8">
                    Del dine livsstilsfaktorer for personlige sundhedsråd
                  </p>

                  <div className="space-y-8">
                    {/* Kost */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-slate-700 font-medium">
                        <Apple className="w-5 h-5 text-green-600" />
                        Kost - Hvor sundt spiser du?
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={kramData.kost.score}
                        onChange={(e) => {
                          const updated = {
                            ...kramData,
                            kost: { ...kramData.kost, score: parseInt(e.target.value) }
                          };
                          setKramData(updated);
                          saveToStorage('kram-data', updated);
                        }}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                      />
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Usundt</span>
                        <span className="font-semibold text-green-600 text-lg">
                          {kramData.kost.score}
                        </span>
                        <span>Meget sundt</span>
                      </div>
                      <textarea
                        value={kramData.kost.notes}
                        onChange={(e) => {
                          const updated = {
                            ...kramData,
                            kost: { ...kramData.kost, notes: e.target.value }
                          };
                          setKramData(updated);
                          saveToStorage('kram-data', updated);
                        }}
                        placeholder="Beskriv dine kostvaner..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        rows="2"
                      />
                    </div>

                    {/* Rygning */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-slate-700 font-medium">
                        <Cigarette className="w-5 h-5 text-red-600" />
                        Rygning
                      </label>
                      <select
                        value={kramData.rygning.status}
                        onChange={(e) => {
                          const updated = {
                            ...kramData,
                            rygning: { ...kramData.rygning, status: e.target.value }
                          };
                          setKramData(updated);
                          saveToStorage('kram-data', updated);
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="aldrig">Aldrig røget</option>
                        <option value="tidligere">Tidligere ryger</option>
                        <option value="daglig">Daglig ryger</option>
                        <option value="lejlighedsvis">Lejlighedsvis</option>
                      </select>
                      <textarea
                        value={kramData.rygning.notes}
                        onChange={(e) => {
                          const updated = {
                            ...kramData,
                            rygning: { ...kramData.rygning, notes: e.target.value }
                          };
                          setKramData(updated);
                          saveToStorage('kram-data', updated);
                        }}
                        placeholder="Hvor mange cigaretter, e-cigaretter, mv.?"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        rows="2"
                      />
                    </div>

                    {/* Alkohol */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-slate-700 font-medium">
                        <Wine className="w-5 h-5 text-amber-600" />
                        Alkohol - Genstande per uge
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={kramData.alkohol.units}
                        onChange={(e) => {
                          const updated = {
                            ...kramData,
                            alkohol: { ...kramData.alkohol, units: parseInt(e.target.value) || 0 }
                          };
                          setKramData(updated);
                          saveToStorage('kram-data', updated);
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                      <textarea
                        value={kramData.alkohol.notes}
                        onChange={(e) => {
                          const updated = {
                            ...kramData,
                            alkohol: { ...kramData.alkohol, notes: e.target.value }
                          };
                          setKramData(updated);
                          saveToStorage('kram-data', updated);
                        }}
                        placeholder="Hvilke dage drikker du typisk?"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        rows="2"
                      />
                    </div>

                    {/* Motion */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-slate-700 font-medium">
                        <Dumbbell className="w-5 h-5 text-blue-600" />
                        Motion - Minutter per uge
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={kramData.motion.minutes}
                        onChange={(e) => {
                          const updated = {
                            ...kramData,
                            motion: { ...kramData.motion, minutes: parseInt(e.target.value) || 0 }
                          };
                          setKramData(updated);
                          saveToStorage('kram-data', updated);
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <textarea
                        value={kramData.motion.notes}
                        onChange={(e) => {
                          const updated = {
                            ...kramData,
                            motion: { ...kramData.motion, notes: e.target.value }
                          };
                          setKramData(updated);
                          saveToStorage('kram-data', updated);
                        }}
                        placeholder="Hvilken type motion? (løb, cykling, gym, etc.)"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows="2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Socioøkonomi Tab */}
            {activeTab === 'socio' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-teal-100">
                  <h2 className="text-2xl font-semibold text-slate-800 mb-6">
                    Socioøkonomiske forhold
                  </h2>
                  <p className="text-slate-600 mb-8">
                    Disse faktorer påvirker dit helbred og hjælper mig med at give relevante råd
                  </p>

                  <div className="space-y-6">
                    <InputField
                      label="Uddannelsesniveau"
                      value={socioData.uddannelse}
                      onChange={(value) => {
                        const updated = { ...socioData, uddannelse: value };
                        setSocioData(updated);
                        saveToStorage('socio-data', updated);
                      }}
                      placeholder="F.eks. Folkeskole, Gymnasium, Bachelor, Master"
                    />
                    <InputField
                      label="Beskæftigelse"
                      value={socioData.beskæftigelse}
                      onChange={(value) => {
                        const updated = { ...socioData, beskæftigelse: value };
                        setSocioData(updated);
                        saveToStorage('socio-data', updated);
                      }}
                      placeholder="F.eks. Fuldtid, Deltid, Ledig, Pensionist, Studerende"
                    />
                    <InputField
                      label="Boligforhold"
                      value={socioData.boligforhold}
                      onChange={(value) => {
                        const updated = { ...socioData, boligforhold: value };
                        setSocioData(updated);
                        saveToStorage('socio-data', updated);
                      }}
                      placeholder="F.eks. Ejer, Lejer, Bor hos forældre"
                    />
                    <InputField
                      label="Økonomisk situation"
                      value={socioData.økonomi}
                      onChange={(value) => {
                        const updated = { ...socioData, økonomi: value };
                        setSocioData(updated);
                        saveToStorage('socio-data', updated);
                      }}
                      placeholder="F.eks. God, Stram, Udfordret"
                    />
                    <InputField
                      label="Socialt netværk"
                      value={socioData.netværk}
                      onChange={(value) => {
                        const updated = { ...socioData, netværk: value };
                        setSocioData(updated);
                        saveToStorage('socio-data', updated);
                      }}
                      placeholder="F.eks. Stor familie, Få venner, Isoleret"
                      textarea
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Familie Tab */}
            {activeTab === 'family' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-teal-100">
                  <h2 className="text-2xl font-semibold text-slate-800 mb-6">
                    Familiesygdomshistorik
                  </h2>
                  <p className="text-slate-600 mb-8">
                    Kendskab til familiens sygdomme hjælper med forebyggelse og tidlig opsporing
                  </p>

                  <div className="space-y-4 mb-6">
                    {familyHistory.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl"
                      >
                        <Users className="w-5 h-5 text-slate-400" />
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{item.relation}</p>
                          <p className="text-sm text-slate-600">
                            {item.condition} (alder: {item.age})
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const updated = familyHistory.filter((_, i) => i !== index);
                            setFamilyHistory(updated);
                            saveToStorage('family-history', updated);
                          }}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <FamilyHistoryForm
                    onAdd={(item) => {
                      const updated = [...familyHistory, item];
                      setFamilyHistory(updated);
                      saveToStorage('family-history', updated);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-teal-100 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
                <div className="p-6 border-b border-teal-100 bg-gradient-to-r from-teal-50 to-blue-50">
                  <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                    Din personlige sundhedsagent
                  </h2>
                  <p className="text-slate-600 text-sm">
                    Stil spørgsmål og få AI-drevne indsigter baseret på dine data
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-12">
                      <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 mb-2">
                        Hej! Jeg er din personlige sundhedsagent
                      </p>
                      <p className="text-sm text-slate-400">
                        Stil mig spørgsmål om dit helbred, livsstil eller forebyggelse
                      </p>
                    </div>
                  )}

                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  ))}

                  {isThinking && (
                    <div className="flex justify-start animate-fade-in">
                      <div className="bg-slate-100 rounded-2xl px-5 py-3">
                        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <div className="p-6 border-t border-teal-100 bg-slate-50">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Skriv dit spørgsmål..."
                      className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      disabled={isThinking}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={isThinking || !inputMessage.trim()}
                      className="px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for Notat */}
      {selectedNotat && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setSelectedNotat(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-amber-500 to-yellow-600 p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <StickyNote className="w-8 h-8" />
                  <div>
                    <h2 className="text-2xl font-semibold">
                      {selectedNotat.description || selectedNotat.type?.text || 'Notat'}
                    </h2>
                    <p className="text-amber-100 text-sm mt-1">
                      {selectedNotat.type?.coding?.[0]?.display || selectedNotat.type?.text || ''}
                    </p>
                    {(selectedNotat.date || selectedNotat.created || selectedNotat.indexed) && (
                      <p className="text-amber-100 text-sm mt-1">
                        {new Date(selectedNotat.date || selectedNotat.created || selectedNotat.indexed).toLocaleDateString('da-DK', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNotat(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {(selectedNotat.author?.[0]?.display || selectedNotat.custodian?.display) && (
                <div className="mb-4 pb-4 border-b border-slate-200">
                  <p className="text-sm text-slate-500">Forfatter</p>
                  <p className="text-slate-800 font-medium">
                    {selectedNotat.author?.[0]?.display || selectedNotat.custodian?.display}
                  </p>
                </div>
              )}

              {selectedNotat.content?.[0]?.attachment?.data && (
                <div className="prose prose-slate max-w-none">
                  <div className="whitespace-pre-wrap text-slate-800 leading-relaxed">
                    {atob(selectedNotat.content[0].attachment.data)}
                  </div>
                </div>
              )}

              {selectedNotat.text?.div && (
                <div
                  className="prose prose-slate max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedNotat.text.div }}
                />
              )}

              {selectedNotat.section && selectedNotat.section.map((section, idx) => (
                <div key={idx} className="mb-6">
                  {section.title && (
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      {section.title}
                    </h3>
                  )}
                  {section.text?.div && (
                    <div
                      className="prose prose-slate max-w-none"
                      dangerouslySetInnerHTML={{ __html: section.text.div }}
                    />
                  )}
                </div>
              ))}

              {!selectedNotat.content?.[0]?.attachment?.data && !selectedNotat.text?.div && !selectedNotat.section && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <pre className="text-xs text-slate-700 overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedNotat, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal for Epikrise */}
      {selectedEpikrise && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setSelectedEpikrise(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <ClipboardList className="w-8 h-8" />
                  <div>
                    <h2 className="text-2xl font-semibold">
                      {selectedEpikrise.description || selectedEpikrise.type?.text || 'Epikrise'}
                    </h2>
                    <p className="text-purple-100 text-sm mt-1">
                      {selectedEpikrise.type?.coding?.[0]?.display || selectedEpikrise.type?.text || ''}
                    </p>
                    {(selectedEpikrise.date || selectedEpikrise.created || selectedEpikrise.indexed) && (
                      <p className="text-purple-100 text-sm mt-1">
                        {new Date(selectedEpikrise.date || selectedEpikrise.created || selectedEpikrise.indexed).toLocaleDateString('da-DK', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEpikrise(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {(selectedEpikrise.author?.[0]?.display || selectedEpikrise.custodian?.display) && (
                <div className="mb-4 pb-4 border-b border-slate-200">
                  <p className="text-sm text-slate-500">Forfatter</p>
                  <p className="text-slate-800 font-medium">
                    {selectedEpikrise.author?.[0]?.display || selectedEpikrise.custodian?.display}
                  </p>
                </div>
              )}

              {selectedEpikrise.content?.[0]?.attachment?.data && (
                <div className="prose prose-slate max-w-none">
                  <div className="whitespace-pre-wrap text-slate-800 leading-relaxed">
                    {atob(selectedEpikrise.content[0].attachment.data)}
                  </div>
                </div>
              )}

              {selectedEpikrise.text?.div && (
                <div
                  className="prose prose-slate max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedEpikrise.text.div }}
                />
              )}

              {selectedEpikrise.section && selectedEpikrise.section.map((section, idx) => (
                <div key={idx} className="mb-6">
                  {section.title && (
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      {section.title}
                    </h3>
                  )}
                  {section.text?.div && (
                    <div
                      className="prose prose-slate max-w-none"
                      dangerouslySetInnerHTML={{ __html: section.text.div }}
                    />
                  )}
                </div>
              ))}

              {!selectedEpikrise.content?.[0]?.attachment?.data && !selectedEpikrise.text?.div && !selectedEpikrise.section && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <pre className="text-xs text-slate-700 overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedEpikrise, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
          font-family: 'Inter', sans-serif;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }

        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #14b8a6, #3b82f6);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(20, 184, 166, 0.3);
        }

        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #14b8a6, #3b82f6);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(20, 184, 166, 0.3);
          border: none;
        }
      `}</style>
    </div>
  );
};

// Helper Components
const StatCard = ({ icon: Icon, label, value, color }) => {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600'
  };

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-6 border border-slate-100">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  );
};

const KRAMQuickCard = ({ icon: Icon, label, value, color }) => {
  const colors = {
    green: 'from-green-100 to-emerald-100 border-green-200',
    red: 'from-red-100 to-rose-100 border-red-200',
    amber: 'from-amber-100 to-orange-100 border-amber-200',
    blue: 'from-blue-100 to-cyan-100 border-blue-200'
  };

  const iconColors = {
    green: 'text-green-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600'
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-4 border`}>
      <Icon className={`w-6 h-6 ${iconColors[color]} mb-2`} />
      <p className="text-lg font-semibold text-slate-800">{value}</p>
      <p className="text-xs text-slate-600">{label}</p>
    </div>
  );
};

const InputField = ({ label, value, onChange, placeholder, textarea = false }) => {
  const Component = textarea ? 'textarea' : 'input';
  return (
    <div>
      <label className="block text-slate-700 font-medium mb-2">{label}</label>
      <Component
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        rows={textarea ? 3 : undefined}
      />
    </div>
  );
};

const FamilyHistoryForm = ({ onAdd }) => {
  const [relation, setRelation] = useState('');
  const [condition, setCondition] = useState('');
  const [age, setAge] = useState('');

  const handleAdd = () => {
    if (relation && condition && age) {
      onAdd({ relation, condition, age });
      setRelation('');
      setCondition('');
      setAge('');
    }
  };

  return (
    <div className="p-6 bg-teal-50 rounded-2xl border border-teal-200">
      <h3 className="font-medium text-slate-800 mb-4">Tilføj familiemedlem</h3>
      <div className="grid grid-cols-3 gap-3">
        <input
          type="text"
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
          placeholder="Relation (f.eks. Mor)"
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
        />
        <input
          type="text"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          placeholder="Sygdom"
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
        />
        <input
          type="text"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="Alder ved diagnose"
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
        />
      </div>
      <button
        onClick={handleAdd}
        className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <Check className="w-4 h-4" />
        Tilføj
      </button>
    </div>
  );
};

export default SundhedsAgent;