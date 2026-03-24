#!/bin/bash
cd /home/ubuntu/docker/my-dashboard/my-dashboard
git remote set-url origin git@github.com:wyliebutler/my-dashboard.git
echo "Set git origin to SSH."

if [ ! -f ~/.ssh/id_ed25519 ]; then
    echo "Generating new SSH key..."
    ssh-keygen -t ed25519 -C "ubuntu@my-dashboard-vps" -f ~/.ssh/id_ed25519 -N ""
else
    echo "SSH key already exists."
fi

echo "--- PUBLIC KEY START ---"
cat ~/.ssh/id_ed25519.pub
echo "--- PUBLIC KEY END ---"
