import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Key,
  Shield,
  MessageSquare
} from 'lucide-react';
import sundhedDkService from '../services/sundhedDkService';

/**
 * HeaderConfig - Konfigurer authentication headers til dhroxy
 * Sætter Cookie, X-XSRF-Token og Conversation-UUID headers
 */
const HeaderConfig = ({ onHeadersChanged }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [cookie, setCookie] = useState('');
  const [xsrfToken, setXsrfToken] = useState('');
  const [conversationUUID, setConversationUUID] = useState('');
  const [savedMessage, setSavedMessage] = useState(null);

  // Header konfigurationer
  // Note: We use X-Sundhed-* prefixed headers because browsers block sending
  // the 'Cookie' header via JavaScript fetch(). dhroxy maps these back to
  // the standard header names when forwarding to Sundhed.dk.
  const headerFields = [
    {
      key: 'X-Sundhed-Cookie',
      value: cookie,
      setter: setCookie,
      icon: Key,
      color: 'amber',
      description: 'Session cookie fra Sundhed.dk',
      placeholder: 'JSESSIONID=xxx; XSRF-TOKEN=xxx; ...'
    },
    {
      key: 'X-Sundhed-XSRF-Token',
      value: xsrfToken,
      setter: setXsrfToken,
      icon: Shield,
      color: 'red',
      description: 'XSRF/CSRF token til sikkerhed',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    },
    {
      key: 'X-Sundhed-Conversation-UUID',
      value: conversationUUID,
      setter: setConversationUUID,
      icon: MessageSquare,
      color: 'blue',
      description: 'Unik samtale ID',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    }
  ];

  // Load saved headers fra localStorage
  useEffect(() => {
    const savedHeaders = localStorage.getItem('dhroxy-auth-headers');
    if (savedHeaders) {
      try {
        const parsed = JSON.parse(savedHeaders);
        // Support both old (Cookie) and new (X-Sundhed-Cookie) header names
        if (parsed['X-Sundhed-Cookie']) setCookie(parsed['X-Sundhed-Cookie']);
        else if (parsed.Cookie) setCookie(parsed.Cookie);

        if (parsed['X-Sundhed-XSRF-Token']) setXsrfToken(parsed['X-Sundhed-XSRF-Token']);
        else if (parsed['X-XSRF-Token']) setXsrfToken(parsed['X-XSRF-Token']);

        if (parsed['X-Sundhed-Conversation-UUID']) setConversationUUID(parsed['X-Sundhed-Conversation-UUID']);
        else if (parsed['Conversation-UUID']) setConversationUUID(parsed['Conversation-UUID']);

        // Convert to new header names and apply
        const newHeaders = {
          'X-Sundhed-Cookie': parsed['X-Sundhed-Cookie'] || parsed.Cookie || '',
          'X-Sundhed-XSRF-Token': parsed['X-Sundhed-XSRF-Token'] || parsed['X-XSRF-Token'] || '',
          'X-Sundhed-Conversation-UUID': parsed['X-Sundhed-Conversation-UUID'] || parsed['Conversation-UUID'] || ''
        };
        applyHeaders(newHeaders);
      } catch (e) {
        console.error('Fejl ved parsing af gemte headers:', e);
      }
    }
  }, []);

  // Anvend headers til service
  const applyHeaders = (headerObj) => {
    sundhedDkService.clearCustomHeaders();
    const activeHeaders = {};
    Object.entries(headerObj).forEach(([key, value]) => {
      if (value && value.trim()) {
        activeHeaders[key] = value.trim();
      }
    });
    if (Object.keys(activeHeaders).length > 0) {
      sundhedDkService.setCustomHeaders(activeHeaders);
    }
  };

  // Gem headers til localStorage og service
  const saveHeaders = () => {
    const headerObj = {
      'X-Sundhed-Cookie': cookie,
      'X-Sundhed-XSRF-Token': xsrfToken,
      'X-Sundhed-Conversation-UUID': conversationUUID
    };

    localStorage.setItem('dhroxy-auth-headers', JSON.stringify(headerObj));
    applyHeaders(headerObj);

    setSavedMessage('Headers gemt og aktiveret!');
    setTimeout(() => setSavedMessage(null), 2000);

    if (onHeadersChanged) {
      onHeadersChanged(headerObj);
    }
  };

  // Tæl aktive headers
  const activeCount = [cookie, xsrfToken, conversationUUID].filter(v => v && v.trim()).length;

  const colorClasses = {
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'from-amber-500 to-orange-600',
      text: 'text-amber-700'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'from-red-500 to-rose-600',
      text: 'text-red-700'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'from-blue-500 to-indigo-600',
      text: 'text-blue-700'
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl
                        flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-slate-800">Authentication Headers</h3>
            <p className="text-sm text-slate-500">
              {activeCount > 0
                ? `${activeCount}/3 headers konfigureret`
                : 'Konfigurer Cookie, XSRF-Token & UUID'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
              activeCount === 3
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {activeCount}/3
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-4 border-t border-slate-100 space-y-4">
          {/* Info */}
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-blue-800 font-medium">Authentication headers til Sundhed.dk</p>
                <p className="text-blue-700 mt-1">
                  Disse headers bruges til at autentificere requests mod Sundhed.dk via dhroxy.
                  Kopiér værdierne fra din browser's developer tools.
                </p>
              </div>
            </div>
          </div>

          {/* Header fields */}
          <div className="space-y-3">
            {headerFields.map((field) => {
              const colors = colorClasses[field.color];
              const hasValue = field.value && field.value.trim();

              return (
                <div
                  key={field.key}
                  className={`p-4 rounded-xl border transition-all ${
                    hasValue ? colors.bg + ' ' + colors.border : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 bg-gradient-to-br ${colors.icon} rounded-lg
                                  flex items-center justify-center`}>
                      <field.icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-800">{field.key}</span>
                        {hasValue && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{field.description}</p>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => field.setter(e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm
                             font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              );
            })}
          </div>

          {/* Save button */}
          <div className="flex items-center justify-between pt-2">
            {savedMessage && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                {savedMessage}
              </span>
            )}
            <button
              onClick={saveHeaders}
              className="ml-auto px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white
                       rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Gem og aktiver
            </button>
          </div>

          {/* Instructions */}
          <div className="text-xs text-slate-500 border-t border-slate-100 pt-3">
            <p className="font-medium mb-1">Sådan finder du værdierne:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Log ind på sundhed.dk i din browser</li>
              <li>Åbn Developer Tools (F12) → Network tab</li>
              <li>Find en request til sundhed.dk og kopier header-værdierne</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeaderConfig;
