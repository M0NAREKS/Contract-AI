import requests
import json
import time

API_URL = "http://localhost:8000/api/v1"

def run_showcase():
    print("======================================================")
    print("🚀 CONTRACT AI - CANLI TEST SENARYOSU 🚀")
    print("======================================================\n")

    # 1. GENERATE TEST
    print("📝 TEST 1: SIFIRDAN SÖZLEŞME ÜRETİMİ (GENERATE)")
    scenario = "Ankara mahkemelerinin yetkili olduğu, 50.000 TL bedelli, 6 aylık ve %5 cezai şart içeren bir freelance yazılım sözleşmesi hazırla."
    print(f"👉 SENARYO: {scenario}")
    print("⏳ AI Sözleşmeyi yazıyor... (Groq kullanılıyor)")
    
    try:
        gen_res = requests.post(f"{API_URL}/generate", json={"scenario": scenario, "provider": "groq"})
        if gen_res.status_code == 200:
            draft = gen_res.json().get("drafted_contract", "")
            print("\n✅ ÜRETİLEN SÖZLEŞME ÖZETİ (İlk 500 karakter):")
            print("------------------------------------------------------")
            print(draft[:500] + "...\n[Devamı var...]")
            print("------------------------------------------------------\n")
        else:
            print(f"Hata: {gen_res.text}")
    except Exception as e:
        print(f"Bağlantı hatası: {e}")

    time.sleep(2)

    # 2. REVISE TEST
    print("🔍 TEST 2: ŞİRKET POLİTİKASINA GÖRE REVİZE (REVISE)")
    bad_contract = "Madde 4: Müşteri ödemeyi 60 gün içinde yapacaktır. Gecikme durumunda herhangi bir faiz uygulanmaz."
    policy = "Şirket politikamız gereği maksimum ödeme süresi 15 gündür ve gecikmelerde mutlaka aylık %2 gecikme faizi uygulanmalıdır."
    
    print("❌ ESKİ SÖZLEŞME MADDESİ:")
    print(f'"{bad_contract}"')
    print(f"\n📋 ŞİRKET POLİTİKASI:\n'{policy}'")
    print("\n⏳ AI Politikaya göre metni düzeltiyor...")

    try:
        rev_res = requests.post(f"{API_URL}/revise", json={
            "contract_text": bad_contract,
            "company_policy": policy,
            "provider": "groq"
        })
        if rev_res.status_code == 200:
            revised = rev_res.json().get("revised_text", "")
            print("\n✅ DÜZELTİLMİŞ YENİ MADDE:")
            print("------------------------------------------------------")
            print(revised)
            print("------------------------------------------------------\n")
        else:
            print(f"Hata: {rev_res.text}")
    except Exception as e:
        print(f"Bağlantı hatası: {e}")

if __name__ == "__main__":
    run_showcase()
