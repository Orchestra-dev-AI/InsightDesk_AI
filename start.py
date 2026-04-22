#!/usr/bin/env python3
# ──────────────────────────────────────────────────────────────────────────────
# InsightDesk AI — Local Environment Runner
# This script starts the entire InsightDesk AI platform locally.
# It launches:
#   1. Core Intelligence (FastAPI on Port 8000)
#   2. Platform Infrastructure (FastAPI on Port 8001)
#   3. Web Client (Next.js on Port 3000)
# ──────────────────────────────────────────────────────────────────────────────

import os
import sys
import time
import signal
import subprocess
import webbrowser
from pathlib import Path

# ANSI colors for nice logging
class Colors:
    BLUE = "\033[94m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    RESET = "\033[0m"
    BOLD = "\033[1m"

def print_header(msg: str):
    print(f"\n{Colors.BOLD}{Colors.BLUE}=== {msg} ==={Colors.RESET}")

def print_success(msg: str):
    print(f"{Colors.GREEN}✔ {msg}{Colors.RESET}")

def print_warning(msg: str):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.RESET}")

def print_error(msg: str):
    print(f"{Colors.RED}✖ {msg}{Colors.RESET}")

def check_dependencies():
    """Ensure npm and uvicorn are available before starting."""
    print_header("Checking Dependencies")
    
    try:
        subprocess.run(["npm", "-v"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print_success("npm is installed")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print_error("npm is not installed or not in PATH. Please install Node.js.")
        sys.exit(1)

    try:
        import uvicorn
        print_success("uvicorn is installed")
    except ImportError:
        print_error("uvicorn is not installed. Please run: pip install uvicorn")
        sys.exit(1)

def main():
    check_dependencies()
    
    root_dir = Path(__file__).parent.resolve()
    processes = []

    print_header("Starting InsightDesk AI Platform")

    try:
        # 1. Start Core Intelligence
        print_success("Starting Core Intelligence Service (Port 8000)...")
        core_proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--reload", "--port", "8000"],
            cwd=root_dir / "core-intelligence",
        )
        processes.append(core_proc)
        
        # 2. Start Platform Infrastructure
        print_success("Starting Platform Infrastructure Service (Port 8001)...")
        infra_proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--reload", "--port", "8001"],
            cwd=root_dir / "platform-infra",
        )
        processes.append(infra_proc)
        
        # 3. Start Web Client (Next.js)
        # On Windows, npm commands need shell=True or '.cmd' suffix
        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
        print_success("Starting Web Client (Port 3000)...")
        web_proc = subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd=root_dir / "web-client",
        )
        processes.append(web_proc)

        # Wait a few seconds for services to boot up
        time.sleep(4)
        
        print_header("All Services Launched")
        print(f"  {Colors.BOLD}Frontend:{Colors.RESET} http://localhost:3000")
        print(f"  {Colors.BOLD}Core AI:{Colors.RESET}  http://localhost:8000/docs")
        print(f"  {Colors.BOLD}Infra:{Colors.RESET}    http://localhost:8001/docs")
        print(f"\n{Colors.YELLOW}Press Ctrl+C to stop all services.{Colors.RESET}\n")

        # Automatically open the browser to the dashboard
        webbrowser.open("http://localhost:3000")

        # Keep the script running until the user presses Ctrl+C
        for p in processes:
            p.wait()

    except KeyboardInterrupt:
        print_header("Shutting Down")
        for p in processes:
            print_warning(f"Terminating PID {p.pid}...")
            p.terminate()
            
        # Give them a second to terminate gracefully
        time.sleep(1)
        
        for p in processes:
            if p.poll() is None:
                p.kill()
                
        print_success("All services stopped. Goodbye!")
        sys.exit(0)

if __name__ == "__main__":
    main()
