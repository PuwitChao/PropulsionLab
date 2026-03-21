
import os
import subprocess
import sys

def kill_port(port):
    print(f"Checking for processes on port {port}...")
    try:
        # Get process ID on the port
        result = subprocess.check_output(f'netstat -ano | findstr :{port}', shell=True).decode()
        lines = result.strip().split('\n')
        pids = set()
        for line in lines:
            parts = line.split()
            if len(parts) > 4:
                pids.add(parts[-1])
        
        if not pids:
            print(f"No processes found on port {port}.")
            return

        for pid in pids:
            print(f"Attempting to terminate process ID: {pid}")
            os.system(f"taskkill /F /PID {pid}")
            print(f"Process {pid} terminated.")
            
    except subprocess.CalledProcessError:
        print(f"No active process detected on port {port}.")
    except Exception as e:
        print(f"Critical error during port clearance: {str(e)}")

if __name__ == "__main__":
    kill_port(8000)
