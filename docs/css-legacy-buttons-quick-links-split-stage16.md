# Stage 16 — Legacy Buttons / Quick Links split

Source file removed:

```txt
styles/legacy/05-legacy-buttons-quick-links-hardening.css
```

Replacement files, imported in the same cascade order:

```txt
styles/legacy/05a-legacy-button-icon-baseline.css
styles/legacy/05b-legacy-quick-link-cards.css
styles/legacy/05c-legacy-unified-button-hardening.css
styles/legacy/05d-legacy-report-filter-sales-mobile-buttons.css
```

## Safety validation

- Byte-for-byte reconstruction: PASS
- Original SHA256: `c939124d770c53d6ee0af009eccf2e0c417d87180612b4acb9856f890e157ec2`
- Reconstructed SHA256: `c939124d770c53d6ee0af009eccf2e0c417d87180612b4acb9856f890e157ec2`
- Selectors/declaration values changed intentionally: No
- Split boundaries: complete CSS block boundaries
- Local CSS import check: PASS
- Brace balance check: PASS
- tinycss2 parse check: PASS

## Notes

This stage only separates the legacy button and quick-link hardening CSS into smaller domain files. It does not remove or rewrite visual rules.
