import requests
import json
import os

API_URL = "http://localhost:8000/api/v1/chat"

def chat():
    print("========================================")
    print("Contract AI Chatbot'a Hoş Geldiniz! 🤖")
    print("========================================")
    print("Önce test edilecek sözleşmeyi seçmelisiniz.")
    print("Mevcut sözleşme dosyaları (.txt) okunacak.")
    
    contract_text = ""
    file_path = input("\nSözleşme dosyasının tam yolu (Örn: test_contract.json veya sadece metin yapıştırın): ")
    
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            if file_path.endswith(".json"):
                data = json.load(f)
                contract_text = data.get("text", "")
            else:
                contract_text = f.read()
        print(f"Sözleşme yüklendi! Toplam uzunluk: {len(contract_text)} karakter.\n")
    else:
        print("Sözleşme metnini buraya yapıştırın (Bittiğinde Enter'a basıp EOF yazın):")
        lines = []
        while True:
            line = input()
            if line.strip() == "EOF":
                break
            lines.append(line)
        contract_text = "\n".join(lines)
    
    if not contract_text.strip():
        print("Sözleşme metni boş olamaz!")
        return
        
    print("\n----------------------------------------")
    print("Sözleşmeyle ilgili sorularınızı sorabilirsiniz. (Çıkmak için 'q' veya 'quit' yazın)")
    print("----------------------------------------")
    
    while True:
        user_input = input("\nSiz: ")
        if user_input.lower() in ['q', 'quit', 'exit']:
            print("Chatbot kapatılıyor. İyi günler!")
            break
            
        payload = {
            "contract_id": 1,
            "contract_text": contract_text,
            "user_message": user_input
        }
        
        try:
            response = requests.post(API_URL, json=payload)
            if response.status_code == 200:
                data = response.json()
                print(f"\n🤖 AI Avukat: {data.get('answer', 'Yanıt yok.')}")
            else:
                print(f"\nHata: API {response.status_code} döndürdü. ({response.text})")
        except Exception as e:
            print(f"\nBağlantı Hatası: Sunucunun (uvicorn) çalıştığından emin olun. Hata: {e}")

if __name__ == "__main__":
    chat()
