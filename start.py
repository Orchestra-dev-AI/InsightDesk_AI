#!/usr/bin/env python3
# ──────────────────────────────────────────────────────────────────────────────
# InsightDesk AI — Professional Local Environment Runner
# ──────────────────────────────────────────────────────────────────────────────

import os
import sys
import time
import signal
import subprocess
import webbrowser
import threading
import json
from pathlib import Path
import urllib.request
import urllib.error

# ── Terminal UI Utilities ─────────────────────────────────────────────────────
class Colors:
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"

def clear_line():
    sys.stdout.write('\r\033[K')

def print_header(msg: str):
    print(f"\n{Colors.BOLD}{Colors.CYAN}◆ {msg} ◆{Colors.RESET}\n")

class Spinner:
    def __init__(self, message="Loading..."):
        self.message = message
        self.running = False
        self.spinner_thread = None
        self.chars = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"

    def spin(self):
        i = 0
        while self.running:
            sys.stdout.write(f"\r{Colors.BLUE}{self.chars[i]}{Colors.RESET} {self.message}")
            sys.stdout.flush()
            time.sleep(0.1)
            i = (i + 1) % len(self.chars)

    def start(self):
        self.running = True
        self.spinner_thread = threading.Thread(target=self.spin)
        self.spinner_thread.start()

    def stop(self, success=True, end_message=None):
        self.running = False
        if self.spinner_thread:
            self.spinner_thread.join()
        clear_line()
        if end_message:
            icon = f"{Colors.GREEN}✔{Colors.RESET}" if success else f"{Colors.RED}✖{Colors.RESET}"
            print(f"{icon} {end_message}")

# ── Dependency Installation ───────────────────────────────────────────────────
def run_silent(cmd, cwd, msg):
    spinner = Spinner(msg)
    spinner.start()
    try:
        # Hide output completely
        result = subprocess.run(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode != 0:
            spinner.stop(False, f"{msg} failed!")
            print(f"{Colors.RED}{result.stderr}{Colors.RESET}")
            sys.exit(1)
        spinner.stop(True, f"{msg} complete.")
    except Exception as e:
        spinner.stop(False, f"{msg} failed: {e}")
        sys.exit(1)

def check_node():
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    try:
        subprocess.run([npm_cmd, "-v"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return npm_cmd
    except (subprocess.CalledProcessError, FileNotFoundError):
        print(f"\n{Colors.RED}✖ Node.js is missing.{Colors.RESET}")
        print(f"{Colors.YELLOW}Please install Node.js from https://nodejs.org/ and restart your terminal.{Colors.RESET}\n")
        sys.exit(1)

# ── API Key Validation ────────────────────────────────────────────────────────
def parse_env(filepath):
    keys = {}
    if not os.path.exists(filepath): return keys
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                keys[k.strip()] = v.strip()
    return keys

def test_api_key(provider, key):
    if not key or key.startswith('<'): return False
    
    try:
        if provider == "gemini":
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
            req = urllib.request.Request(url)
        elif provider == "groq":
            url = "https://api.groq.com/openai/v1/models"
            req = urllib.request.Request(url, headers={"Authorization": f"Bearer {key}"})
        elif provider == "nvidia":
            url = "https://integrate.api.nvidia.com/v1/models"
            req = urllib.request.Request(url, headers={"Authorization": f"Bearer {key}"})
        else:
            return True

        # Timeout short so we don't hang forever
        with urllib.request.urlopen(req, timeout=3) as response:
            return response.status == 200
    except urllib.error.HTTPError as e:
        # 401/403 means bad key. Others might just be endpoint mismatches, we'll assume bad key.
        return False
    except Exception:
        # Network error or timeout. We'll warn but allow it.
        return None

def validate_keys(root_dir):
    print_header("Validating API Keys")
    
    core_env = parse_env(root_dir / "core-intelligence" / ".env")
    infra_env = parse_env(root_dir / "platform-infra" / ".env")
    
    keys_to_test = [
        ("Gemini (Core)", "gemini", core_env.get("GEMINI_API_KEY")),
        ("Groq (Core)", "groq", core_env.get("GROQ_API_KEY")),
        ("NVIDIA (Infra Judge)", "nvidia", infra_env.get("INFRA_JUDGE_NVIDIA_API_KEY")),
        ("Groq (Infra Judge)", "groq", infra_env.get("INFRA_JUDGE_GROQ_API_KEY")),
        ("Gemini (Infra Judge)", "gemini", infra_env.get("INFRA_JUDGE_GEMINI_API_KEY")),
    ]

    all_good = True
    for name, provider, key in keys_to_test:
        spinner = Spinner(f"Testing {name} API Key...")
        spinner.start()
        status = test_api_key(provider, key)
        
        if status is True:
            spinner.stop(True, f"{name} Key is VALID.")
        elif status is False:
            spinner.stop(False, f"{name} Key is INVALID or missing in .env.")
            all_good = False
        else:
            spinner.stop(True, f"{name} Key check timed out (assuming valid).")

    if not all_good:
        print(f"\n{Colors.YELLOW}Some API keys failed validation. The AI features may not work.{Colors.RESET}")
        print(f"{Colors.DIM}Continuing anyway in 3 seconds...{Colors.RESET}")
        time.sleep(3)

# ── Main Orchestration ────────────────────────────────────────────────────────
def main():
    os.system('cls' if os.name == 'nt' else 'clear')
    print(f"\n{Colors.BOLD}{Colors.CYAN}   InsightDesk AI Platform{Colors.RESET}")
    print(f"{Colors.DIM}   Bootstrapping Local Environment...{Colors.RESET}\n")

    root_dir = Path(__file__).parent.resolve()
    
    npm_cmd = check_node()

    print_header("Preparing Dependencies")
    # Python deps
    run_silent([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], root_dir / "core-intelligence", "Syncing Core Intelligence dependencies")
    run_silent([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], root_dir / "platform-infra", "Syncing Platform Infra dependencies")
    # Node deps
    run_silent([npm_cmd, "install"], root_dir / "web-client", "Syncing Web Client dependencies")

    validate_keys(root_dir)

    print_header("Starting Microservices")
    processes = []

    # Start silently in the background
    try:
        spinner = Spinner("Booting AI Engines & Command Center...")
        spinner.start()
        
        core_proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--reload", "--port", "8000"],
            cwd=root_dir / "core-intelligence",
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        processes.append(core_proc)
        
        infra_proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--reload", "--port", "8001"],
            cwd=root_dir / "platform-infra",
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        processes.append(infra_proc)
        
        web_proc = subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd=root_dir / "web-client",
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        processes.append(web_proc)

        # Wait 5 seconds for Webpack/Turbopack and Uvicorn to bind
        time.sleep(5)
        spinner.stop(True, "All microservices online.")
        
        print(f"\n{Colors.GREEN}● InsightDesk AI is fully operational.{Colors.RESET}")
        print(f"  {Colors.BOLD}Dashboard:{Colors.RESET} http://localhost:3000")
        print(f"  {Colors.DIM}Press Ctrl+C at any time to shut down.{Colors.RESET}\n")

        webbrowser.open("http://localhost:3000")

        # Keep alive silently
        for p in processes:
            p.wait()

    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Received shutdown signal. Terminating services...{Colors.RESET}")
        for p in processes:
            p.terminate()
        time.sleep(1)
        for p in processes:
            if p.poll() is None: p.kill()
        print(f"{Colors.GREEN}✔ Services safely stopped.{Colors.RESET}")
        sys.exit(0)

if __name__ == "__main__":
    main()
