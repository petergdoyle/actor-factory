import urllib.request
import urllib.error
import socket

def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def check_url(url: str, name: str) -> dict:
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=2.0) as response:
            status = response.getcode()
            if status == 200:
                return {"name": name, "url": url, "status": "✅ Online"}
            else:
                return {"name": name, "url": url, "status": f"⚠️ HTTP {status}"}
    except Exception:
        return {"name": name, "url": url, "status": "❌ Offline"}

def main():
    local_ip = get_local_ip()
    print("\n" + "="*65)
    print("🚀 ActorFactory Dev Environment Status (Bound to 0.0.0.0)")
    print("="*65)

    services = [
        {"name": "Frontend UI (Local)", "url": "http://localhost:3002"},
        {"name": "Frontend UI (VLAN)",  "url": f"http://{local_ip}:3002"},
        {"name": "FastAPI Health",     "url": "http://localhost:8082/health"},
        {"name": "FastAPI Docs",       "url": "http://localhost:8082/docs"},
        {"name": "Ollama Daemon",      "url": "http://localhost:11434/"},
    ]

    for svc in services:
        result = check_url(svc["url"], svc["name"])
        print(f"{result['status']:<15} | {result['name']:<22} | {result['url']}")

    print("="*65 + "\n")

if __name__ == "__main__":
    main()
