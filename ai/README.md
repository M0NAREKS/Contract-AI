# Contract AI - Microservice

Bu dizin, sistemin sözleşmeleri analiz eden (Clause Extraction, Risk Scoring, MLOps, LLM Rewrite) ana AI (Yapay Zeka) mikroservisini barındırır. Backend'den bağımsız olarak Docker veya FastAPI üzerinden çalışacak şekilde tasarlanmıştır.

## Özellikler
- **FastAPI Entegrasyonu:** `/api/v1/analyze` ve `/api/v1/chat` uç noktaları.
- **Çoklu LLM:** `gpt-oss-120b` (Groq) ve `gpt-4o-mini` (OpenAI) otomatik fallback desteği.
- **ML Tabanlı Risk Skorlama:** Yerel Scikit-Learn `joblib` modelleri üzerinden hibrit mimari.

## Kurulum
1. Gerekli bağımlılıkları yükleyin:
```bash
pip install -r requirements.txt
```

2. Ortam değişkenlerini ayarlayın (Ana dizinde bir `.env` dosyası oluşturun):
```env
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-... (Opsiyonel)
```

## Çalıştırma (Lokal)
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Çalıştırma (Docker)
```bash
docker build -t contract-ai-service .
docker run -p 8000:8000 --env-file .env contract-ai-service
```

## Geliştirici Testleri
Tüm birim (unit) testlerini çalıştırmak için:
```bash
PYTHONPATH=. pytest tests/
```
