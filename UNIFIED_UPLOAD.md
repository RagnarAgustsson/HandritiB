# Sameinuð upload leið

## Hvað breyttist

Tvö upload-viðmót (≤24MB + ≤100MB EXPERIMENTAL) sameinuð í eitt.
Allar skrár fara nú í gegnum ffmpeg klipping + `/api/hljod-stort`.

### Skrár breytt
- `app/[locale]/upload/UploadClient.tsx` — nýr sameinaður component
- `app/[locale]/upload/UploadTabs.tsx` — tab toggle fjarlægt
- `tests/client-components.test.ts` — path uppfært
- `tests/sse-consistency.test.ts` — client listi uppfærður

### Skrár eyddar
- `app/[locale]/upload/HlaðaUppClient.tsx`
- `app/[locale]/upload/StorSkraClient.tsx`

### Óbreytt
- `/api/hljod-skra/route.ts` — enn til staðar, ónotað frá upload
- `/api/hljod-stort/route.ts` — óbreytt
- `lib/ffmpeg/split.ts` — óbreytt

## Hvernig á að bakka

Git tag `pre-unified-upload` vistar stöðu áður en breytingar voru gerðar.

```bash
# Endurheimta gamlar skrár:
git checkout pre-unified-upload -- "app/[locale]/upload/"

# Eða bakka alla commit:
git revert <commit-hash>
```
