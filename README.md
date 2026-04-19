# ContratAi Frontend

React + Vite tabanli sozlesme analiz arayuzu.  
Bu proje, yuklenen sozlesmeleri backend'e gonderir, yeni API semasina gore normalize eder ve madde bazli risk/uyum analizini UI'da gosterir.

## Ozellikler

- Dosya yukleme (`.pdf`, `.doc`, `.docx`, `.txt`)
- 8 adimli yukleme/analiz sureci gostergesi
- Executive Summary paneli
  - Toplam madde
  - Ihlal sayisi
  - Uyari sayisi
  - Ortalama ML risk skoru
- Madde listesi (accordion + sayfalama)
- Madde detaylari:
  - Siniflandirma (`clause_type`)
  - Yapisal alanlar (`extracted_fields`)
  - Belirsiz ifadeler (`ambiguous_terms`)
  - Kural sonuclari (`rule_results`)
- Durum bazli dinamik renkler:
  - `violation` -> kirmizi vurgu
  - `warning` -> sari vurgu
  - `ok` -> yesil vurgu

## Teknoloji

- React
- Vite
- CSS
- GSAP (metin/nav animasyonlari)
- Motion (`motion/react`) bazi sayisal/akici animasyonlar

## Proje Yapisi (Ozet)

- `src/App.jsx`: Ana sayfa, yukleme akisi, summary ve sayfa yonetimi
- `src/Services.js`: API cagrilari + response normalization
- `src/components/Detail/ClauseList.jsx`: Madde listeleme ve sayfalama
- `src/components/Detail/ClauseItem.jsx`: Madde karti/detay paneli
- `src/mockData.js`: Gelistirme icin mock analiz cevabi

## API Entegrasyonu

`Services.js` uzerinden iki endpoint kullanilir:

- `POST /upload-contract`
- `POST /analyze-contract`

Gonderim tipi: `multipart/form-data` (`file` alani)

Base URL `.env` dosyasindan gelir:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Tam URL olusumu:

- `POST {VITE_API_BASE_URL}/upload-contract`
- `POST {VITE_API_BASE_URL}/analyze-contract`

## Beklenen Response Semasi

`normalizeAnalysisResponse` bu semayi bekler:

```json
{
  "summary": {
    "violation_count": 0,
    "warning_count": 0,
    "average_ml_risk_score": 0.0
  },
  "clauses": [
    {
      "order_index": 1,
      "clause_text": "...",
      "clause_type": "...",
      "ml_risk_score": 0.0,
      "ml_risk_level": "low | medium | high",
      "overall_status": "violation | warning | ok",
      "ambiguous_terms": ["..."],
      "extracted_fields": {},
      "rule_results": [
        {
          "rule_name": "...",
          "severity": "low | medium | high | warning | critical",
          "matched_phrases": ["..."],
          "recommendation": "..."
        }
      ]
    }
  ]
}
```

Notlar:

- Veri dogrulama strict'tir (tip ve zorunlu alan kontrolleri var).
- `toArray` ve `toNumber` kontrolleri bilincli olarak gevsetilmemistir.

## Gelistirme

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Mock Veri Davranisi

- Uygulama acilisinda mock veri otomatik yuklenmez.
- `Mock Veri Getir` butonuna basildiginda `mockData.js` verisi normalize edilip ekrana basilir.
