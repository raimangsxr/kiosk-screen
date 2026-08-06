# Requirements Quality Checklist: Runtime performance and stability

**Purpose**: Review whether CHG-053 is precise enough to gate implementation and release without relying on subjective visual judgement
**Created**: 2026-08-06
**Feature**: [spec.md](../spec.md)
**Audience**: PR reviewer and release operator

## Production profile

- [x] CHK001 Is the reference browser workload stated with image dimensions, compressed size, rotation cadence, transition duration, and sponsor density? [Completeness, Spec §Assumptions]
- [x] CHK002 Is the baseline version named so performance comparisons are reproducible? [Traceability, Context pack §Production evidence]
- [x] CHK003 Are the duration and responsiveness thresholds quantified? [Measurability, SC-001]
- [x] CHK004 Is sustained CPU improvement expressed as a measurable comparison rather than “feels faster”? [Measurability, SC-002]
- [x] CHK005 Does the specification distinguish automated accelerated coverage from the longer manual release soak? [Clarity, TQ-003]

## Rendering bounds

- [x] CHK006 Is the maximum number of original-resolution photo representations explicit? [Clarity, FR-003]
- [x] CHK007 Is the decorative backdrop constrained independently from the visible foreground? [Completeness, FR-002, FR-003]
- [x] CHK008 Is preservation of full-photo framing required? [Coverage, FR-001]
- [x] CHK009 Are reduced-motion expectations defined for both content and sponsors? [Coverage, FR-011]
- [x] CHK010 Are transparent, panoramic, square, vertical, and EXIF-oriented media covered as edge cases? [Coverage, Spec §Edge Cases]

## Cache and lifecycle bounds

- [x] CHK011 Is the retained top-media window quantified? [Measurability, FR-005]
- [x] CHK012 Are queued, in-flight, successful, and failed out-of-window operations all covered? [Completeness, FR-006, FR-007]
- [x] CHK013 Is bounded retention verified after repeated rotations rather than only one transition? [Coverage, SC-004]
- [x] CHK014 Does the announced-ten-candidates scenario define the expected retained result? [Measurability, SC-005]
- [x] CHK015 Are navigation, iframe, pause, and mode changes represented in lifecycle edge cases? [Coverage, Spec §Edge Cases]

## Reactive work and recovery

- [x] CHK016 Is sponsor equivalence based on visible data and style rather than command identity? [Clarity, FR-008]
- [x] CHK017 Is command-effect isolation required independently of a particular Angular implementation? [Clarity, FR-009]
- [x] CHK018 Is the SSE-to-polling-to-SSE handoff bounded by an observable cycle? [Measurability, SC-006]
- [x] CHK019 Are the server-owned orchestration, readiness gate, novelty, and video invariants preserved? [Consistency, FR-012]

## Release evidence

- [x] CHK020 Are automated test and production-build gates explicit? [Completeness, SC-007]
- [x] CHK021 Does the specification prohibit claiming unexecuted manual validation? [Traceability, TQ-003]
- [x] CHK022 Is contract and manifest synchronization required? [Traceability, TQ-001, TQ-004]

## Notes

- The performance checklist is complete. The 10-minute reference run and longer soak remain execution evidence, not specification-quality items, and must be recorded separately when actually run.
