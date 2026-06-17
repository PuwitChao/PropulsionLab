"""Free a TCP port across platforms.

Usage:
    python scripts/kill_port_8000.py [port]

Defaults to port 8000. Works on Windows (netstat/taskkill) and POSIX
(lsof, with an fuser fallback) so the same command works in every dev
environment, not just Windows.
"""
import os
import subprocess
import sys
import signal


def _pids_windows(port):
    out = subprocess.run(
        f'netstat -ano | findstr :{port}',
        shell=True, capture_output=True, text=True,
    ).stdout
    pids = set()
    for line in out.strip().splitlines():
        parts = line.split()
        if len(parts) > 4 and parts[-1].isdigit():
            pids.add(parts[-1])
    return pids


def _pids_posix(port):
    # Prefer lsof; fall back to fuser if lsof is unavailable.
    out = subprocess.run(
        ["lsof", "-ti", f"tcp:{port}"], capture_output=True, text=True,
    )
    if out.returncode == 0:
        return {p for p in out.stdout.split() if p.isdigit()}
    fuser = subprocess.run(
        ["fuser", f"{port}/tcp"], capture_output=True, text=True,
    )
    return {p for p in fuser.stdout.split() if p.isdigit()}


def kill_port(port):
    print(f"Checking for processes on port {port}...")
    try:
        pids = _pids_windows(port) if os.name == "nt" else _pids_posix(port)
    except FileNotFoundError as e:
        print(f"Port-scan tool not found ({e}); skipping.")
        return
    except Exception as e:  # noqa: BLE001 - utility script, report and exit cleanly
        print(f"Critical error during port clearance: {e}")
        return

    if not pids:
        print(f"No processes found on port {port}.")
        return

    for pid in pids:
        print(f"Terminating process ID: {pid}")
        try:
            if os.name == "nt":
                subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
            else:
                os.kill(int(pid), signal.SIGKILL)
            print(f"Process {pid} terminated.")
        except (ProcessLookupError, PermissionError, ValueError) as e:
            print(f"Could not terminate {pid}: {e}")


if __name__ == "__main__":
    target = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    kill_port(target)
