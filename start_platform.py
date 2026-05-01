import subprocess
import sys
import os
import signal
import threading

def stream_output(process, prefix):
    """Her sürecin (process) çıktısını özel bir önekle (prefix) ekrana yazdırır."""
    try:
        for line in iter(process.stdout.readline, b''):
            if line:
                print(f"[{prefix}] {line.decode('utf-8', errors='replace').rstrip()}")
    except BaseException:
        pass

def run_all():
    print("======================================================")
    print("🚀 CONTRACT AI PLATFORM - BİRLEŞTİRİLMİŞ BAŞLATICISI 🚀")
    print("======================================================")
    print("AI Servisi, Backend ve Frontend aynı anda başlatılıyor...\n")
    
    root_dir = os.path.dirname(os.path.abspath(__file__))
    
    ai_dir = os.path.join(root_dir, "ai")
    backend_dir = os.path.join(root_dir, "Contract-AI-backend", "backend")
    frontend_dir = os.path.join(root_dir, "Contract-AI-front")

    processes = []

    try:
        # 1. AI Servisini Başlat (Port 8000)
        ai_process = subprocess.Popen(
            ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
            cwd=ai_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env={**os.environ, "PYTHONPATH": ai_dir}
        )
        processes.append(("AI (Port 8000)", ai_process))

        # 2. Ana Backend'i Başlat (Port 8001 - Çakışmayı önlemek için)
        backend_process = subprocess.Popen(
            ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"],
            cwd=backend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env={**os.environ, "PYTHONPATH": backend_dir}
        )
        processes.append(("BACKEND (Port 8001)", backend_process))

        # 3. Frontend'i Başlat
        frontend_process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=frontend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT
        )
        processes.append(("FRONTEND", frontend_process))

        # Çıktıları eşzamanlı olarak dinlemek için thread'ler başlat
        threads = []
        for name, proc in processes:
            t = threading.Thread(target=stream_output, args=(proc, name), daemon=True)
            t.start()
            threads.append(t)

        print("\n✅ TÜM SERVİSLER BAŞLATILDI! Kapatmak için CTRL+C yapın.\n")
        
        # Ana thread'i açık tut
        for _, proc in processes:
            proc.wait()

    except KeyboardInterrupt:
        print("\nKapatılıyor... Tüm servisler durduruluyor.")
    finally:
        for name, proc in processes:
            try:
                proc.terminate()
            except:
                pass
        sys.exit(0)

if __name__ == "__main__":
    run_showcase = False
    run_all()
