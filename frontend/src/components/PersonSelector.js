import React, { useState, useEffect } from 'react';
import { Users, ChevronDown, Check } from 'lucide-react';
import sundhedDkService from '../services/sundhedDkService';

/**
 * PersonSelector - Vælg hvilken person der skal vises data for
 * Henter patient liste fra sundhed.dk og lader brugeren vælge
 */
const PersonSelector = ({ onPersonSelected, selectedPerson }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const result = await sundhedDkService.getPatient();
      if (result.success && result.data?.entry) {
        const patientList = result.data.entry
          .map(entry => entry.resource)
          .filter(patient => patient?.resourceType === 'Patient');
        setPatients(patientList);

        // Auto-vælg første patient hvis ingen er valgt
        if (patientList.length > 0 && !selectedPerson) {
          onPersonSelected(patientList[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRelationLabel = (patient) => {
    const relationType = patient.extension?.find(
      ext => ext.url === 'https://www.sundhed.dk/fhir/StructureDefinition/relationType'
    )?.valueCode;

    const labels = {
      'MigSelv': 'Mig selv',
      'Foraelder': 'Barn',
      'Barn': 'Barn',
      'Aegtefaelle': 'Ægtefælle'
    };

    return labels[relationType] || relationType || 'Relateret';
  };

  const getPatientName = (patient) => {
    const name = patient.name?.[0];
    if (!name) return 'Ukendt';
    const given = name.given?.join(' ') || '';
    const family = name.family || '';
    return `${given} ${family}`.trim();
  };

  const getPatientCPR = (patient) => {
    return patient.identifier?.find(id => id.system === 'urn:dk:cpr')?.value || '';
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200">
        <Users className="w-5 h-5 text-slate-400 animate-pulse" />
        <span className="text-sm text-slate-500">Henter personer...</span>
      </div>
    );
  }

  if (patients.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all min-w-64"
      >
        <Users className="w-5 h-5 text-teal-600" />
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-slate-800">
            {selectedPerson ? getPatientName(selectedPerson) : 'Vælg person'}
          </div>
          {selectedPerson && (
            <div className="text-xs text-slate-500">
              {getRelationLabel(selectedPerson)}
            </div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl z-20 overflow-hidden">
            {patients.map((patient, index) => {
              const isSelected = selectedPerson?.id === patient.id;
              return (
                <button
                  key={patient.id || index}
                  onClick={() => {
                    onPersonSelected(patient);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-50 transition-colors ${
                    isSelected ? 'bg-teal-50' : ''
                  }`}
                >
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-slate-800">
                      {getPatientName(patient)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {getRelationLabel(patient)} • CPR: {getPatientCPR(patient).replace(/(\d{6})(\d{4})/, '$1-****')}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-teal-600" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default PersonSelector;
