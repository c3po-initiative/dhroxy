import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Loader2,
  FlaskConical,
  Sparkles,
  User,
  Bot,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import sundhedDkService from '../../services/sundhedDkService';

/**
 * LabChat - AI chat specifikt om labsvar
 * Giver brugeren mulighed for at stille spørgsmål om deres resultater
 */
const LabChat = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [labData, setLabData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const messagesEndRef = useRef(null);

  // Hent labdata ved mount
  useEffect(() => {
    fetchLabData();
  }, []);

  // Auto-scroll til bunden
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchLabData = async () => {
    setLoadingData(true);
    try {
      const result = await sundhedDkService.getLabResults('Alle', 30);
      if (result.success && result.data?.entry) {
        setLabData(result.data);

        // Tilføj velkomstbesked
        setMessages([{
          role: 'assistant',
          content: `Hej! Jeg har hentet ${result.data.entry?.length || 0} labsvar fra din sundhedsprofil.\n\nJeg kan hjælpe dig med at forstå:\n• Hvad dine værdier betyder\n• Forskellen mellem forskellige tests\n• Hvad der er normalt/unormalt\n• Hvad du kan gøre ved afvigende værdier\n\nStil mig et spørgsmål om dine labsvar!`
        }]);
      } else {
        setMessages([{
          role: 'assistant',
          content: 'Jeg kunne ikke hente dine labsvar. Du kan stadig stille generelle spørgsmål om blodprøver og laboratorieundersøgelser.'
        }]);
      }
    } catch (error) {
      console.error('Fejl ved hentning af labdata:', error);
      setMessages([{
        role: 'assistant',
        content: 'Der opstod en fejl ved hentning af dine data. Prøv at genindlæse siden.'
      }]);
    }
    setLoadingData(false);
  };

  // Formatér labdata til kontekst
  const formatLabContext = () => {
    if (!labData?.entry) return 'Ingen labdata tilgængelig';

    const observations = labData.entry.map(e => e.resource);
    const formatted = observations.map(obs => {
      const name = obs.code?.coding?.[0]?.display || obs.code?.text || 'Ukendt';
      const value = obs.valueQuantity?.value;
      const unit = obs.valueQuantity?.unit || obs.valueQuantity?.code || '';
      const date = obs.effectiveDateTime;
      const interpretation = obs.interpretation?.[0]?.coding?.[0]?.code;
      const refLow = obs.referenceRange?.[0]?.low?.value;
      const refHigh = obs.referenceRange?.[0]?.high?.value;

      let status = 'Normal';
      if (interpretation === 'H' || interpretation === 'HH') status = 'Forhøjet';
      if (interpretation === 'L' || interpretation === 'LL') status = 'For lav';

      return `- ${name}: ${value !== undefined ? `${value} ${unit}` : 'Ingen værdi'} (${status})${
        refLow || refHigh ? ` [Ref: ${refLow || '?'}-${refHigh || '?'}]` : ''
      }${date ? ` - ${new Date(date).toLocaleDateString('da-DK')}` : ''}`;
    }).join('\n');

    return formatted;
  };

  // Send besked
  const sendMessage = async () => {
    if (!inputMessage.trim() || isThinking) return;

    const userMessage = { role: 'user', content: inputMessage };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsThinking(true);

    try {
      // Byg system prompt med kontekst
      const systemPrompt = `Du er en dansk sundhedsassistent der hjælper patienter med at forstå deres laboratoriesvar (blodprøver).

VIGTIGE REGLER:
1. Svar ALTID på dansk
2. Brug et enkelt, forståeligt sprog (8. klasses niveau)
3. Forklar fagudtryk i parentes når du bruger dem
4. Giv konkrete, handlingsrettede råd
5. Henvis ALTID til læge ved alvorlige spørgsmål
6. Vær empatisk og beroligende
7. Du må IKKE stille diagnoser - kun forklare hvad værdierne generelt betyder

PATIENTENS LABSVAR:
${formatLabContext()}

Når patienten spørger:
- Om en specifik test: Forklar hvad den måler, hvad normale værdier er, og hvad afvigelser kan betyde
- Om sammenhænge: Forklar hvordan forskellige tests relaterer til hinanden
- Om hvad de skal gøre: Giv generelle råd og henvis til læge for specifikke anbefalinger
- Om bekymringer: Vær beroligende men ærlig, og anbefal at tale med læge`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1000,
          system: systemPrompt,
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      const data = await response.json();

      if (data.content?.[0]?.text) {
        const assistantMessage = {
          role: 'assistant',
          content: data.content[0].text
        };
        setMessages([...newMessages, assistantMessage]);
      } else {
        throw new Error('Intet svar fra API');
      }
    } catch (error) {
      console.error('Chat fejl:', error);
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Beklager, jeg kunne ikke behandle din besked. Prøv venligst igen, eller tjek at API-forbindelsen er konfigureret korrekt.'
      }]);
    }

    setIsThinking(false);
  };

  // Foreslåede spørgsmål
  const suggestedQuestions = [
    'Hvad er forskellen på LDL og HDL kolesterol?',
    'Hvad betyder det hvis mit CRP er forhøjet?',
    'Hvorfor måler man kreatinin?',
    'Er mine værdier normale?',
    'Hvad kan jeg gøre for at forbedre mit kolesterol?'
  ];

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
        <span className="ml-3 text-slate-600">Henter dine labsvar...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl
                          flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Lab-assistent</h3>
              <p className="text-xs text-slate-500">
                {labData?.entry?.length || 0} labsvar indlæst
              </p>
            </div>
          </div>
          <button
            onClick={fetchLabData}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Genindlæs data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div className={`flex items-start gap-2 max-w-[85%]`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg
                              flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
              )}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start animate-fade-in">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg
                            flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-slate-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  <span className="text-sm text-slate-500">Tænker...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
            <HelpCircle className="w-3 h-3" />
            Prøv at spørge:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.slice(0, 3).map((q, i) => (
              <button
                key={i}
                onClick={() => setInputMessage(q)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600
                         text-xs rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Stil et spørgsmål om dine labsvar..."
            className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl
                     focus:ring-2 focus:ring-green-500 focus:border-transparent
                     text-sm"
            disabled={isThinking}
          />
          <button
            onClick={sendMessage}
            disabled={isThinking || !inputMessage.trim()}
            className="px-5 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl
                     hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-2 text-center">
          AI kan lave fejl. Tal altid med din læge om specifikke sundhedsspørgsmål.
        </p>
      </div>
    </div>
  );
};

export default LabChat;
