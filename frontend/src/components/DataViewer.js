import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  Pill,
  FileText,
  Calendar,
  Building,
  Syringe,
  Image,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import sundhedDkService from '../services/sundhedDkService';
import PersonSelector from './PersonSelector';
import HeaderConfig from './HeaderConfig';

/**
 * DataViewer komponent til at teste og vise data fra Sundhed.dk via dhroxy
 */
const DataViewer = () => {
  const [loading, setLoading] = useState({});
  const [data, setData] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [selectedPerson, setSelectedPerson] = useState(null);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const fetchData = async (key, fetchFunction) => {
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      const result = await fetchFunction();
      setData(prev => ({ ...prev, [key]: result }));
    } catch (error) {
      console.error(`Error fetching ${key}:`, error);
      setData(prev => ({
        ...prev,
        [key]: { success: false, error: error.message }
      }));
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const fetchAllData = async () => {
    setLoading({ all: true });
    try {
      const result = await sundhedDkService.getAllPatientData({
        includeLabResults: true,
        labCount: 1000,
        includeConditions: true,
        includeEncounters: true,
        includeDocuments: true,
        includeMedication: true,
        includeImmunizations: true,
        includeImaging: true,
        includeAppointments: false,
        includeOrganizations: true
      });
      setData({ allData: result });

      // Expand all sections når vi har hentet alt
      setExpandedSections({
        allData: true
      });
    } catch (error) {
      console.error('Error fetching all data:', error);
    } finally {
      setLoading({ all: false });
    }
  };

  const dataCategories = [
    {
      key: 'patient',
      label: 'Patient',
      icon: Activity,
      color: 'blue',
      fetch: () => sundhedDkService.getPatient(),
      description: 'Personoplysninger fra personvælger'
    },
    {
      key: 'labResults',
      label: 'Labsvar',
      icon: Activity,
      color: 'teal',
      fetch: () => sundhedDkService.getLabResults('Alle', 20),
      description: 'Laboratoriesvar (klinisk biokemi, mikrobiologi, patologi)'
    },
    {
      key: 'conditions',
      label: 'Diagnoser',
      icon: AlertCircle,
      color: 'red',
      fetch: () => sundhedDkService.getConditions(),
      description: 'Diagnoser fra e-journal forløbsoversigt'
    },
    {
      key: 'encounters',
      label: 'Kontaktperioder',
      icon: Calendar,
      color: 'purple',
      fetch: () => sundhedDkService.getEncounters(),
      description: 'Hospitalsbesøg og kontaktperioder'
    },
    {
      key: 'epikriser',
      label: 'Epikriser',
      icon: FileText,
      color: 'purple',
      fetch: () => sundhedDkService.getEpikriser(),
      description: 'Epikriser fra e-journal'
    },
    {
      key: 'notater',
      label: 'Notater',
      icon: FileText,
      color: 'amber',
      fetch: () => sundhedDkService.getNotater(),
      description: 'Kliniske notater fra e-journal'
    },
    {
      key: 'medicationStatements',
      label: 'Medicin (aktuel)',
      icon: Pill,
      color: 'pink',
      fetch: () => sundhedDkService.getAllMedicationStatements(),
      description: 'Aktuelle medicin ordinationer'
    },
    {
      key: 'medicationRequests',
      label: 'Recepter',
      icon: Pill,
      color: 'indigo',
      fetch: () => sundhedDkService.getMedicationRequests(),
      description: 'Medicin recepter fra medicinkort'
    },
    {
      key: 'immunizations',
      label: 'Vaccinationer',
      icon: Syringe,
      color: 'green',
      fetch: () => sundhedDkService.getImmunizations(),
      description: 'Registrerede vaccinationer'
    },
    {
      key: 'imaging',
      label: 'Billedbeskrivelser',
      icon: Image,
      color: 'cyan',
      fetch: () => sundhedDkService.getDiagnosticReports(),
      description: 'Røntgen, CT, MR beskrivelser'
    },
    {
      key: 'appointments',
      label: 'Aftaler',
      icon: Calendar,
      color: 'orange',
      fetch: () => sundhedDkService.getAppointments(),
      description: 'Kommende og tidligere aftaler'
    },
    {
      key: 'organizations',
      label: 'Min læge',
      icon: Building,
      color: 'slate',
      fetch: () => sundhedDkService.getMyDoctorOrganization(),
      description: 'Information om praktiserende læge'
    }
  ];

  const renderDataCard = (category) => {
    const isLoading = loading[category.key];
    const categoryData = data[category.key];
    const isExpanded = expandedSections[category.key];

    const colorClasses = {
      blue: 'from-blue-500 to-blue-600',
      teal: 'from-teal-500 to-teal-600',
      red: 'from-red-500 to-red-600',
      purple: 'from-purple-500 to-purple-600',
      amber: 'from-amber-500 to-amber-600',
      pink: 'from-pink-500 to-pink-600',
      indigo: 'from-indigo-500 to-indigo-600',
      green: 'from-green-500 to-green-600',
      cyan: 'from-cyan-500 to-cyan-600',
      orange: 'from-orange-500 to-orange-600',
      slate: 'from-slate-500 to-slate-600'
    };

    return (
      <div
        key={category.key}
        className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all"
      >
        <div className="p-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[category.color]} flex items-center justify-center flex-shrink-0`}
            >
              <category.icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-800 text-lg">
                {category.label}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {category.description}
              </p>
            </div>
            <button
              onClick={() => fetchData(category.key, category.fetch)}
              disabled={isLoading}
              className={`px-4 py-2 bg-gradient-to-r ${colorClasses[category.color]} text-white rounded-lg hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-2 text-sm font-medium flex-shrink-0`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Henter...
                </>
              ) : (
                'Hent data'
              )}
            </button>
          </div>

          {categoryData && (
            <div className="mt-4">
              <button
                onClick={() => toggleSection(category.key)}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {categoryData.success
                  ? `Vis resultat (${
                      categoryData.data?.entry?.length ||
                      categoryData.data?.total ||
                      'data hentet'
                    })`
                  : 'Vis fejl'}
              </button>

              {isExpanded && (
                <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 max-h-96 overflow-auto">
                  {categoryData.success ? (
                    <div>
                      {/* Vis summary hvis det er en Bundle */}
                      {categoryData.data?.resourceType === 'Bundle' && (
                        <div className="mb-3 pb-3 border-b border-slate-300">
                          <p className="text-sm font-medium text-slate-700">
                            Resource Type: {categoryData.data.resourceType}
                          </p>
                          <p className="text-sm text-slate-600">
                            Type: {categoryData.data.type}
                          </p>
                          <p className="text-sm text-slate-600">
                            Total: {categoryData.data.total || categoryData.data.entry?.length || 0}
                          </p>
                        </div>
                      )}

                      {/* Vis rå JSON data */}
                      <pre className="text-xs text-slate-700 whitespace-pre-wrap break-words">
                        {JSON.stringify(categoryData.data, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-red-600 text-sm">
                      <p className="font-medium">Fejl ved hentning:</p>
                      <p className="mt-1">{categoryData.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header med "Hent alt" knap */}
      <div className="bg-gradient-to-r from-teal-500 to-blue-600 rounded-3xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-3">Sundhed.dk Data Viewer</h2>
        <p className="text-teal-100 mb-6">
          Test og se data fra de forskellige Sundhed.dk endpoints via dhroxy FHIR proxy
        </p>

        {/* PersonSelector */}
        <div className="mb-6">
          <PersonSelector
            selectedPerson={selectedPerson}
            onPersonSelected={setSelectedPerson}
          />
        </div>

        {/* Header Config */}
        <div className="mb-6">
          <HeaderConfig
            onHeadersChanged={(headers) => {
              console.log('Headers opdateret:', headers);
            }}
          />
        </div>

        <button
          onClick={fetchAllData}
          disabled={loading.all}
          className="px-6 py-3 bg-white text-teal-600 rounded-xl hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-3 font-semibold"
        >
          {loading.all ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Henter alle data...
            </>
          ) : (
            <>
              <Activity className="w-5 h-5" />
              Hent alle data på én gang
            </>
          )}
        </button>
      </div>

      {/* Vis samlet bundle hvis hentet */}
      {data.allData && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-teal-50 to-blue-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-800">
                  Samlet patient data (Bundle)
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Alle data hentet i en enkelt FHIR transaction bundle
                </p>
              </div>
              <button
                onClick={() => toggleSection('allData')}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                {expandedSections.allData ? (
                  <>
                    <ChevronUp className="w-5 h-5" />
                    Skjul
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-5 h-5" />
                    Vis
                  </>
                )}
              </button>
            </div>
          </div>

          {expandedSections.allData && (
            <div className="p-6">
              {data.allData.success ? (
                <div>
                  {data.allData.data?.entry && (
                    <div className="mb-4 grid grid-cols-3 gap-3">
                      {data.allData.data.entry.map((entry, index) => {
                        const resource = entry.resource;
                        return (
                          <div
                            key={index}
                            className="p-3 bg-slate-50 rounded-lg border border-slate-200"
                          >
                            <p className="text-xs text-slate-500">Entry {index}</p>
                            <p className="font-medium text-slate-800">
                              {resource?.resourceType || 'Bundle'}
                            </p>
                            <p className="text-sm text-slate-600">
                              {resource?.total !== undefined
                                ? `${resource.total} items`
                                : resource?.entry?.length
                                ? `${resource.entry.length} items`
                                : '1 item'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 max-h-96 overflow-auto">
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap break-words">
                      {JSON.stringify(data.allData.data, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-red-600 p-4 bg-red-50 rounded-xl">
                  <p className="font-medium">Fejl ved hentning:</p>
                  <p className="mt-1 text-sm">{data.allData.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Individuelle data kategorier */}
      <div className="grid grid-cols-1 gap-4">
        {dataCategories.map(renderDataCard)}
      </div>
    </div>
  );
};

export default DataViewer;
