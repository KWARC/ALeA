#!/usr/bin/env python3
"""
Monitor API endpoints and send alerts on failure.
Retries failed requests up to N times before sending an alert.
Implements time-based exponential backoff for alerts.
"""

import os
import sys
import requests
import time
import json
from typing import Tuple, Optional, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

VOLL_KI_ALERTS_CHANNEL_ID = os.getenv("VOLL_KI_ALERTS_CHANNEL_ID")
VOLL_KI_ALERTS_BOT_TOKEN = os.getenv("VOLL_KI_ALERTS_BOT_TOKEN")
MONITOR_STATUS_FILE = os.getenv("MONITOR_STATUS_FILE", "./tmp/monitor-status.json")


# Endpoints to monitor
ENDPOINTS = [
    {"name": "Mathhub", "url": "http://mathhub.info"},
    {"name": "LMP", "url": "https://lms.voll-ki.fau.de/lmp/activity"},
    {"name": "ALeA", "url": "https://courses.voll-ki.fau.de"},
]


class StatusTracker:
    """Tracks endpoint status and manages alert timings."""

    def __init__(self, status_file: str):
        self.status_file = Path(status_file)
        self.status_data = self._load_status()

    def _load_status(self) -> Dict[str, Any]:
        """Load status from file or create empty structure."""
        if self.status_file.exists():
            try:
                with open(self.status_file, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                print(f"WARNING: Could not load status file: {e}. Starting fresh.")

        return {"endpoints": {}}

    def _save_status(self):
        """Save status to file."""
        try:
            self.status_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.status_file, "w") as f:
                json.dump(self.status_data, f, indent=2)
        except IOError as e:
            print(f"WARNING: Could not save status file: {e}")

    def update_status(
        self, endpoint_name: str, success: bool, error_msg: Optional[str] = None
    ):
        """Update status for an endpoint."""
        if "endpoints" not in self.status_data:
            self.status_data["endpoints"] = {}

        if endpoint_name not in self.status_data["endpoints"]:
            self.status_data["endpoints"][endpoint_name] = {
                "last_success_time": None,
                "last_failure_time": None,
                "last_alert_time": None,
                "current_error": None,
            }

        now = time.time()
        endpoint_status = self.status_data["endpoints"][endpoint_name]

        if success:
            endpoint_status["last_success_time"] = now
            endpoint_status["current_error"] = None
        else:
            endpoint_status["last_failure_time"] = now
            endpoint_status["current_error"] = error_msg

        self._save_status()

    def is_down(self, endpoint_name: str) -> Tuple[bool, int]:
        """Return (is_down, outage_minutes) based on last known state."""
        endpoint_status = self.status_data.get("endpoints", {}).get(endpoint_name)
        if endpoint_status is None:
            return False, 0
        last_success_time = endpoint_status.get("last_success_time")
        last_failure_time = endpoint_status.get("last_failure_time")
        if (
            last_success_time is not None
            and last_failure_time is not None
            and last_success_time < last_failure_time
        ):
            minutes = int(round((time.time() - last_success_time) / 60))
            return True, minutes
        return False, 0

    def should_send_alert(self, endpoint_name: str) -> Tuple[bool, str]:
        """
        Determine if an alert should be sent based on time-based exponential backoff.

        Returns:
            Tuple of (should_send: bool, reason: str)
        """
        if endpoint_name not in self.status_data["endpoints"]:
            return False, "No status data"

        endpoint_status = self.status_data["endpoints"][endpoint_name]
        last_alert_time = endpoint_status.get("last_alert_time")
        last_failure_time = endpoint_status.get("last_failure_time")
        last_success_time = endpoint_status.get("last_success_time")

        # If we don't have alert or failure time, send alert immediately on failure
        if (
            last_alert_time is None
            or last_failure_time is None
            or last_alert_time < last_success_time
        ):
            return True, ""

        time_since_alert = time.time() - last_alert_time
        time_between_success_and_alert = last_alert_time - last_success_time
        down_since = time.time() - last_success_time

        remaining = min(time_between_success_and_alert - time_since_alert, 3600 - time_since_alert)
        if remaining <= 0:
            return (True, f"Last seen up {round((down_since)/60)} min ago")
        print(f"Waiting {round(remaining)}s for sending next alert")
        return False, ""

    def record_alert_sent(self, endpoint_name: str):
        self.status_data["endpoints"][endpoint_name]["last_alert_time"] = time.time()
        self._save_status()


def send_alert(message: str) -> bool:
    """Send an alert message to Matrix room (usually "ALeA - Notifications")."""
    print(f"Sending alert: {message}")
    if not VOLL_KI_ALERTS_CHANNEL_ID or not VOLL_KI_ALERTS_BOT_TOKEN:
        print("WARNING: Matrix credentials not configured. Alert not sent.")
        return False

    url = f"https://matrix-client.matrix.org/_matrix/client/r0/rooms/{VOLL_KI_ALERTS_CHANNEL_ID}/send/m.room.message"

    payload = {"msgtype": "m.text", "body": message}

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {VOLL_KI_ALERTS_BOT_TOKEN}",
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        print(f"Alert sent successfully: {message[:50]}...")
        return True
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Failed to send Matrix alert: {e}")
        return False


def check_endpoint(endpoint: dict, retries: int = 3) -> Tuple[bool, Optional[str]]:
    """
    Check an endpoint with retry logic.

    Args:
        endpoint: Dictionary with 'name' and 'url' keys
        retries: Number of times to retry on failure

    Returns:
        Tuple of (success: bool, error_message: Optional[str])
    """
    for attempt in range(retries):
        try:
            response = requests.get(url=endpoint["url"], timeout=10)

            if 200 <= response.status_code < 300:
                print(f"✓ {endpoint['name']}: OK (Status {response.status_code})")
                return True, None
            else:
                error_msg = f"Expected status 2XX, got {response.status_code}"
                if attempt < retries - 1:
                    print(
                        f"✗ {endpoint['name']}: {error_msg} (Attempt {attempt + 1}/{retries})"
                    )
                    time.sleep(1)  # Wait before retry
                else:
                    print(f"✗ {endpoint['name']}: {error_msg} (All retries exhausted)")
                    return False, error_msg

        except requests.exceptions.Timeout:
            error_msg = "Request timed out"
            if attempt < retries - 1:
                print(
                    f"✗ {endpoint['name']}: {error_msg} (Attempt {attempt + 1}/{retries})"
                )
                time.sleep(1)
            else:
                print(f"✗ {endpoint['name']}: {error_msg} (All retries exhausted)")
                return False, error_msg

        except requests.exceptions.ConnectionError:
            error_msg = "Connection error"
            if attempt < retries - 1:
                print(
                    f"✗ {endpoint['name']}: {error_msg} (Attempt {attempt + 1}/{retries})"
                )
                time.sleep(1)
            else:
                print(f"✗ {endpoint['name']}: {error_msg} (All retries exhausted)")
                return False, error_msg

        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            print(f"✗ {endpoint['name']}: {error_msg}")
            return False, error_msg

    return False, "All retries exhausted"


def main():
    """Main monitoring function."""

    status_tracker = StatusTracker(MONITOR_STATUS_FILE)
    failures = []
    alerts_to_send = []
    recoveries_to_send = []
    for endpoint in ENDPOINTS:
        success, error_msg = check_endpoint(endpoint)
        name, url = endpoint["name"], endpoint["url"]
        # Check prior state before updating
        was_down, outage_minutes = status_tracker.is_down(name)

        status_tracker.update_status(name, success, error_msg)
        if not success:
            failures.append((name, url, error_msg))
            should_send, reason = status_tracker.should_send_alert(name)
            if should_send:
                alerts_to_send.append((name, url, error_msg, reason))
        elif was_down:
            recover_reason = f"Recovered after about {outage_minutes} min down"
            recoveries_to_send.append((name, url, recover_reason))

    # Send alerts if needed
    for name, url, error, reason in alerts_to_send:
        alert_message = f"🚨 MONITOR ALERT: {name} is down with error: {error}\n"
        alert_message += f"  URL: {url}\n  {reason}\n"

        alert_sent = send_alert(alert_message)
        if alert_sent:
            status_tracker.record_alert_sent(name)
        else:
            print(f"WARNING: Failed to send alert for {name}")

    # Send recovery alerts if needed
    for name, url, reason in recoveries_to_send:
        recovery_message = f"✅ MONITOR RECOVERY: {name} is back up\n"
        recovery_message += f"  URL: {url}\n  {reason}\n"

        recovery_sent = send_alert(recovery_message)
        if not recovery_sent:
            print(f"WARNING: Failed to send recovery alert for {name}")


if __name__ == "__main__":
    main()
