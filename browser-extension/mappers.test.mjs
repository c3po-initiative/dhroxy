import test from 'node:test';
import assert from 'node:assert/strict';
import { cprFrom, normalizeCpr, mapPatient, mapLabs } from './mappers.js';

test('CPR uses clinical sources, preserves zeroes and never picks a delegate', () => {
  assert.equal(normalizeCpr(' 010101-0000 '), '0101010000');
  assert.equal(normalizeCpr('3102000000'), undefined);
  assert.equal(cprFrom({ persons: { personDelegationData: [{ cpr: '0202020000' }] } }), undefined);
  assert.equal(cprFrom({ forloeb: { personNummer: '010101-0000' } }), '0101010000');
  const patient = mapPatient({ cpr: '010101-0000', persons: { personDelegationData: [
    { cpr: '0202020000', name: 'Delegate' }, { cpr: '0101010000', name: 'Synthetic Patient' }
  ] } });
  assert.equal(patient.identifier[0].system, 'urn:oid:1.2.208.176.1.2');
  assert.equal(patient.name[0].text, 'Synthetic Patient');
});

test('conflicting clinical identities abort collection', () => {
  const labs = { Svaroversigt: { Rekvisitioner: [{ PatientCpr: '0202020000' }] } };
  assert.throws(() => cprFrom({ forloeb: { personNummer: '0101010000' }, labs }), /different patients/);
});

test('laboratory UCUM is conservative and unitless numbers remain text', () => {
  for (const [unit, expected] of [['mmol/L', 'mmol/L'], ['mmHg', 'mm[Hg]'], ['local unit', undefined], ['constructor', undefined], ['', undefined]]) {
    const labs = { Svaroversigt: { Laboratorieresultater: [{ RekvisitionsId: 'synthetic', Undersoegelser: [{
      UndersoegelsesNavn: 'Synthetic test', QuantitativeFindings: { Data: [[], [...Array(9).fill(null), '5.2', unit]] }
    }] }] } };
    const observation = mapLabs(labs, 'Patient/synthetic')[0];
    if (unit) {
      assert.equal(observation.valueQuantity.code, expected);
      assert.equal(observation.valueQuantity.system, expected ? 'http://unitsofmeasure.org' : undefined);
    } else {
      assert.equal(observation.valueQuantity, undefined);
      assert.equal(observation.valueString, '5.2');
    }
  }
});
