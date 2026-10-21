#!/usr/bin/env bash
# Install root-owned as /usr/local/sbin/impossible-penalty-deploy.
# Receives a gzip-compressed `docker save` archive on stdin.
set -Eeuo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
sha=${1:-}
[[ $sha =~ ^[0-9a-f]{40}$ ]] || { echo 'Expected a full commit SHA' >&2; exit 2; }
[[ $EUID == 0 ]] || { echo 'Run through the restricted sudo rule' >&2; exit 2; }
exec 9>/run/lock/impossible-penalty-deploy.lock
flock -w 300 9
image="impossible-penalty:$sha"
name=impossible-penalty
candidate="impossible-penalty-check-$sha"
previous=impossible-penalty-previous
cleanup() { docker rm -f "$candidate" >/dev/null 2>&1 || true; }
trap cleanup EXIT
gzip -dc | docker load
docker image inspect "$image" >/dev/null

start() {
  docker run -d --name "$1" --restart unless-stopped --read-only \
    --tmpfs /tmp:rw,mode=1777,size=32m --cap-drop=ALL \
    --security-opt no-new-privileges --log-opt max-size=10m --log-opt max-file=3 \
    -p "$2" "$image" >/dev/null
}
healthy() {
  local container=$1
  for ((attempt=0; attempt<30; attempt++)); do
    if docker exec "$container" wget -q -O /dev/null http://127.0.0.1:8080/healthz; then
      return 0
    fi
    sleep 1
  done
  return 1
}

# Validate before interrupting the currently serving container.
start "$candidate" '127.0.0.1::8080'
healthy "$candidate"
actual=$(docker exec "$candidate" wget -q -O - http://127.0.0.1:8080/version.txt)
[[ $actual == "$sha" ]] || { echo 'Image version does not match the requested commit' >&2; exit 1; }
cleanup
docker rm -f "$previous" >/dev/null 2>&1 || true
had_previous=false
if docker container inspect "$name" >/dev/null 2>&1; then
  docker stop -t 10 "$name" >/dev/null
  docker rename "$name" "$previous"
  had_previous=true
fi
if start "$name" '127.0.0.1:8088:8080' && healthy "$name"; then
  printf 'Deployed %s\n' "$sha"
else
  docker rm -f "$name" >/dev/null 2>&1 || true
  if "$had_previous"; then
    docker rename "$previous" "$name"
    docker start "$name" >/dev/null
    healthy "$name"
  fi
  echo 'New release failed; previous container restored' >&2
  exit 1
fi
