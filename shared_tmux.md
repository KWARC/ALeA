# Shared tmux Infrastructure

This document defines the configuration for a multi-user shared `tmux` environment. It
allows a central service account (`alea-service-account`) to host persistent sessions
accessible by members of the `alea-ops` group without requiring `sudo` privileges for
the end users.

## 1. Prerequisites

* **tmux 3.3 or higher**: Required for the `server-access` feature.
* **Service Account**: `alea-service-account` (UID: 998).
* **Linux Group**: `alea-ops` (all authorized users must be members).

## 2. Infrastructure Setup

Run these commands once as a system administrator to prepare the persistent socket directory:

```bash
# Create the persistent directory
sudo mkdir -p /var/lib/alea-ops/

# Set ownership and permissions
# 2770: SetGID bit ensures new files inherit the 'alea-ops' group
sudo chown alea-service-account:alea-ops /var/lib/alea-ops/
sudo chmod 2770 /var/lib/alea-ops/

```

## 3. The Launcher Script

Create the file `/var/lib/alea-ops/launch-shared-tmux.sh` and paste the following content into it using `vim`:

### File Content: `launch-shared-tmux.sh`

```bash
#!/bin/bash
# Usage: ./launch-shared-tmux.sh <session_name>

SESSION_NAME=$1
SOCKET_PATH="/var/lib/alea-ops/shared-socket-${SESSION_NAME}"

if [ -z "$SESSION_NAME" ]; then
    echo "Usage: $0 <session_name>"
    exit 1
fi

# 1. Start the detached session
tmux -S "$SOCKET_PATH" new-session -s "$SESSION_NAME" -d

# 2. Force the socket to have group read/write permissions
# This allows 'alea-ops' group members to reach the socket
chmod 660 "$SOCKET_PATH"

# 3. Grant internal tmux access to users in the 'alea-ops' group (ACL)
# Dynamically fetch users from the group to avoid manual updates
USERS=$(getent group alea-ops | awk -F: '{print $4}' | tr ',' ' ')

for USERNAME in $USERS; do
    tmux -S "$SOCKET_PATH" server-access -a "$USERNAME"
done

echo "Shared tmux session '$SESSION_NAME' started at $SOCKET_PATH"

```

### Apply Script Permissions

```bash
# Make script executable and owned by the service account
sudo chown alea-service-account:alea-ops /var/lib/alea-ops/launch-shared-tmux.sh
sudo chmod 750 /var/lib/alea-ops/launch-shared-tmux.sh

```

## 4. Operational Workflow

### Starting New Sessions

To start or restart a session, switch to the service account and pass the desired session name:

```bash
sudo su - alea-service-account -s /bin/bash
/var/lib/alea-ops/launch-shared-tmux.sh alea-prod
/var/lib/alea-ops/launch-shared-tmux.sh alea-staging
/var/lib/alea-ops/launch-shared-tmux.sh manage
exit

```

## 5. Security Architecture

This setup bypasses the standard "Access Not Allowed" error (UID mismatch) by utilizing:

1. **Linux Permissions**: `chmod 660` on the socket file allows group members to communicate with the Unix domain socket.
2. **Tmux ACLs**: `server-access -a` allows the `tmux` server to permit connections from different UIDs.

## 6. Maintenance & Troubleshooting

### Check Active Sockets

```bash
ls -la /var/lib/alea-ops/shared-socket-*

```

### Kill a Specific Session

```bash
sudo -u alea-service-account tmux -S /var/lib/alea-ops/shared-socket-alea-prod kill-server

```

### Complete System Reset

```bash
# 1. Kill all tmux processes owned by the service account
sudo pkill -u alea-service-account tmux
# 2. Remove the entire directory
sudo rm -rf /var/lib/alea-ops/

```

## 7. Deep Dive: The "Why"

* **The Filesystem Barrier**: `tmux` creates sockets with `600` permissions. We use `chmod 660` to allow the `alea-ops` group to access the socket file.
* **The Application Barrier**: `tmux` 3.0+ rejects UID mismatches. We use `server-access` (introduced in 3.3) to explicitly trust group members.
* **Persistence**: Moving the socket to `/var/lib/` prevents system cleanup scripts from deleting sockets in `/tmp`.

## 8. User Configuration (Shortcut)

To simplify the connection command, every user in the `alea-ops` group should add the following function to their `~/.bashrc` file:

### Steps for each user:

1. Open the file: `vim ~/.bashrc`
2. Paste the following function at the end of the file:

```bash
# Function to join shared Alea tmux sessions
alea-ops-tmux() {
    if [ -z "$1" ]; then
        echo "Usage: alea-ops-tmux <session_name>"
        echo "Example: alea-ops-tmux alea-prod"
        return 1
    fi
    tmux -S "/var/lib/alea-ops/shared-socket-$1" attach -t "$1"
}

```

3. Reload the configuration: `source ~/.bashrc`

### Usage

Once configured, users can attach to any session using the session name:

```bash
alea-ops-tmux alea-prod
alea-ops-tmux manage

```
