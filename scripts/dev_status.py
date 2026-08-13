import urllib.request
import urllib.error
import json
import sys

def check_url(url: str, name: str) -> dict:
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=2.0) as response:
            status = response.getcode()
            if status == 200:
                return {"name": name, "url": url, "status": "✅ Online"}
            else:
                return {"name": name, "url": url, "status": f"⚠️ HTTP {status}"}
    except urllib.error.URLError:
        return {"name": name, "url": url, "status": "❌ Offline"}
    except Exception:
        return {"name": name, "url": url, "status": "❌ Error"}

def main():
    print("\n" + "="*50)
    print("🚀 ActorFactory Dev Environment Status")
    print("="*50)

    services = [
        {"name": "Frontend UI", "url": "http://localhost:3000"},
        {"name": "FastAPI Health", "url": "http://localhost:8000/health"},
        {"name": "Swagger UI", "url": "http://localhost:8000/docs"},
        {"name": "Ollama Daemon", "url": "http://localhost:11434/"},
    ]

    for svc in services:
        result = check_url(svc["url"], svc["name"])
        print(f"{result['status']:<15} | {result['name']:<15} | {result['url']}")

    print("="*50 + "\n")

if __name__ == "__main__":
    main()
