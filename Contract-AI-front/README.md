# ContratAi Frontend (Vite + React)

Bu klasör, sözleşme yükleme + analiz sonuçlarını gösteren React arayüzünü içerir.

## Gereksinimler

- Node.js (projede kullanılan paketlerle uyumlu güncel bir LTS önerilir)
- Backend API’nin çalışıyor olması (frontend `Services` üzerinden istek atar)

## Kurulum

```bash
cd frontend
npm install
```

## Geliştirme

```bash
cd frontend
npm run dev
```

## Backend bağlantısı (API)

`src/Services.js` içinde API tabanı şu şekilde belirlenir:

- Varsayılan: `VITE_API_BASE_URL` tanımlı değilse **`/api`**
- Özelleştirme: `frontend/.env` içine örneğin:
  - `VITE_API_BASE_URL=http://127.0.0.1:8000`

`vite.config.js` dev server için `/api` isteklerini **`http://127.0.0.1:8000`** adresine proxy’ler (path’ten `/api` prefix’i kaldırarak).

## Production build

```bash
cd frontend
npm run build
npm run preview
```

## Proje yapısı (özet)

- `src/main.jsx`: React giriş noktası
- `src/App.jsx`: Ana uygulama akışı (ana sayfa + detay sayfası routing’i)
- `src/App.css`: Global stiller ve tema değişkenleri
- `src/Services.js`: Backend çağrıları
- `src/components/Detail/*`: Detay sayfası bileşenleri (`ClauseList`, `ClauseItem`, `RiskSummary`)
- `src/components/animations/*`: Animasyon bileşenleri (`DarkVeil`, `AnimatedList`, `PillNav`, …)

## Routing / sayfalar

Uygulama “router kütüphanesi” yerine `window.history.pushState` + `popstate` ile iki sayfa modu kullanır:

- `/` → ana sayfa (upload + sonuç özeti)
- `/maddeler` → detay sayfası (meta + madde listesi + risk paneli)

Detay sayfasına geçildiğinde sayfa üstten başlatılması için `App.jsx` içinde `currentPage === "clauses"` durumunda `window.scrollTo({ top: 0 })` tetiklenir.

## Tema (Light / Dark)

- Tema `document.documentElement` üzerinde `data-theme="light|dark"` attribute’u ile yönetilir.
- Seçim `localStorage` içinde `theme` anahtarıyla saklanır.
- Stil tarafında `App.css` içinde:
  - `:root` → dark tema değişkenleri
  - `[data-theme="light"]` → light tema değişkenleri
  - Ayrıca DarkVeil paleti için `--dv-*` değişkenleri tanımlanır (DarkVeil + tema butonu aynı renk dilini paylaşır)

### Header / PillNav

- `PillNav` light temada `pillColor` olarak `#EEEEEE` kullanır (hover rengine dokunulmadan).
- Light/Dark butonu `PillNav`’ın sağında yer alır.

## DarkVeil arka plan animasyonu

`DarkVeil` katmanları `src/components/animations/DarkVeil.css` içinde `var(--dv-glow-*)` ve `var(--dv-deep-*)` ile boyanır. Bu değişkenler `App.css` içinde temaya göre set edilir; böylece light/dark geçişlerinde arka plan animasyonu da paletle uyumlu kalır.

## Detay sayfası UX notları

### “Riskli Maddeler” paneli (`RiskSummary`)

- Başlık: **Riskli Maddeler**
- Liste: “Top 5” değil; kriterlere uyan **tüm** maddeler listelenir.
- Bir maddeye tıklanınca `ClauseList` içinde ilgili maddeye kaydırma + açma davranışı tetiklenir.

Kapsama (özet):

- **Risk** tarafı: `overall_status === "violation"` veya `ml_risk_level === "high"` veya `ml_risk_score >= 0.7` veya kural severity’si `high/critical/violation`
- **Uyarı** tarafı: `ml_risk_level` medium/warning veya `0.45 <= ml_risk_score < 0.7` veya `overall_status === "warning"` veya kural severity’si `warning/medium`

> Not: `src/Services.js` içinde `normalizeAnalysisResponse` hâlâ `top_risks` üretir; UI tarafında `RiskSummary` bu alanı kullanmak zorunda değildir.

### `AnimatedList` + madde aç/kapa

`AnimatedList` içinde `useInView(..., { once: true })` kullanılır. Böylece accordion açılınca layout kayması sonrası alttaki maddelerin “kaybolması” (tekrar opacity animasyonuna düşmesi) engellenir.

## Ana sayfa layout notları

Ana sayfadaki iki kolonlu gridde (`App.jsx` + `App.css`), “Sonuç Görünümü” içindeki **Sözleşme maddelerine ulaşın** butonu; “Sözleşmeyi Yükle ve Analiz Et” ile aynı alt hizaya gelmesi için `homeGridPanel` / `homePanelBody` flex düzenine alınmıştır.

## Stil geliştirme notları

- Çoğu renk `App.css` içindeki CSS değişkenleri üzerinden yönetilir.
- Light temada bazı bileşenler (ör. liste gradient overlay’leri) `AnimatedList.css` içinde `[data-theme="light"]` override’ları ile koyu temadan arındırılır.
