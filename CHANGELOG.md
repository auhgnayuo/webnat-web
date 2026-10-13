# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.0] - 2026-10-13

### Changed

- **A message that cannot be serialized now fails with `SERIALIZATION_FAILED` (-1012).** A BigInt or a circular structure in `param`, or a value the iOS bridge cannot clone (`DataCloneError`), used to surface as a raw `TypeError` / `DOMException`. Now `method` rejects with a `WebnatError` carrying that code, and a handler whose result cannot be serialized is answered with an error reply carrying the same code (it was -1). Same semantics as the native ports, which now fail a send visibly instead of swallowing it.

## [1.2.0] - 2026-07-02

### Changed

- **Version alignment**: bumped to `1.2.0` to keep a single, unified version across all four platforms (web, darwin, android, ohos). There are **no functional changes on the web side** in this release — the new native-side `method` broadcast (calling all frames when no connection is specified, first meaningful response wins) is fully transparent to the web responder and requires no web changes.

## [1.0.4] - 2026-05-12

### Fixed

- **`MethodWebnat.method`**: If `options.signal` is already `aborted`, reject immediately with `WebnatError.cancelled()` instead of hanging until timeout or reply (the `abort` event does not fire again on an already-aborted signal).
- **`WebnatImpl` (mainframe → iframe)**: When forwarding to an iframe fails (`event.source` is null or `postMessage` throws, e.g. iframe removed without `unload`), mainframe now removes the transmit entry and sends `Message.close(iframeId)` to Native on the iframe’s behalf so connections do not leak.

### Changed

- **Lifecycle teardown**: Prefer `pagehide` over `unload` for cleanup (better behavior with back/forward cache; `unload` is deprecated in modern browsers). After sending close messages for all iframe transmits, `transmits` is cleared to drop stale `WindowProxy` references.

## [1.0.3] and earlier

See [git history](https://github.com/auhgnayuo/webnat-web/commits/main) for changes in prior releases.
