# DK Core alignment

The mapping conventions target DK Core 3.7.0 (FHIR R4). See the implementation-guide
repository for the seven DK Core-derived Dhroxy resource profiles and validated examples.
Production output is not automatically stamped as conformant.

* `DanishFhir` emits normalized CPR under `urn:oid:1.2.208.176.1.2`; malformed CPR is
  omitted. It follows the DK Core format constraint without a modulus-11 check.
* CVR uses `http://cvr.dk`. Upstream organization IDs are not SOR IDs. Missing/invalid
  source identifiers still prevent some Patient/Organization records from conforming.
* Patient/Organization searches recognize their standard and legacy identifier systems.
  New output uses only the standard systems. Update stored identifiers and clients together.
* Clinical services resolve missing patient context through the journal overview using
  the same session headers. Unknown identity uses a Patient reference with the standard
  data-absent-reason extension. No `current` patient identifier is emitted, and a delegation
  list is never treated as evidence of the active patient. Keep the session stable while
  collecting: the upstream calls are not an atomic snapshot.
* `$summary` rejects a URL patient that differs from the clinical-session CPR.
* Lab/home/summary quantities code only explicitly recognized UCUM units. Unknown unit
  text is retained. Numeric lab/summary values with no unit become strings, preserving
  the result without asserting a measurement unit. The browser lab mapper follows this rule.
* Local lab and diagnosis codes remain local until NPU/LOINC/SKS/ICPC-2 identity is
  verified. DocumentReference remains a base R4 target because source author metadata
  and the inherited IHE MHD requirements have not been established. RelatedPerson is not
  inferred from portal delegation labels.

## Verification

Run `./gradlew test` and `npm --prefix browser-extension test`. Kotlin tests include
identifier normalization, namespace filtering, all eight patient-context resource types,
missing/unavailable context, and summary identity mismatch rejection. The browser tests
cover conflicting clinical identities, delegated people, and unit coding.

`DanishFhirTest` also writes eight synthetic **actual mapper outputs** to
`build/dk-core-samples/`. Only those test copies carry DK Core profile assertions.
Validate them with the official HL7 validator:

```sh
java -jar /path/to/validator_cli.jar 'build/dk-core-samples/*.json' \
  -version 4.0.1 -ig 'hl7.fhir.dk.core#3.7.0' -tx n/a \
  -output build/dk-core-validation.json
```

Offline terminology validation (`-tx n/a`) does not prove terminology membership.
These samples do not establish conformance of every source payload or of the IPS summary.
