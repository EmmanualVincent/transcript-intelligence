# Deployment Guide

How to run this app in a container and on Kubernetes, in plain English.

## What this app is (why deployment is simple)

One container does everything:

- The **Express server** (`server/`) serves the API **and** the built React
  frontend (`client/dist`), and reads the `dataset/` folder for its data.
- So there's **one image, one thing to run**. No separate frontend/backend to
  wire together.

Server listens on **port 3001**. Health check: `GET /health`.

---

## The files

| File | What it is |
|------|-----------|
| [`Dockerfile`](Dockerfile) | Recipe to package the app into a container image |
| [`.dockerignore`](.dockerignore) | Stuff to leave out of the image (node_modules, .git, etc.) |
| [`k8s/deployment.yaml`](k8s/deployment.yaml) | Tells Kubernetes what to run |

---

## Part 1 — Build the image

```bash
docker build -t transcript-intelligence:latest .
```

**What happens:** Docker reads the `Dockerfile` and produces a local image
named `transcript-intelligence:latest`. It runs in two stages:

1. **Build the frontend** — installs client deps and runs `npm run build`,
   producing the static site (`client/dist`). This stage is throwaway.
2. **Build the runtime image** — installs only the server's production deps,
   copies in the server code, the built frontend, and the `dataset/` folder,
   and sets the start command (`node src/index.js`).

Two stages = the final image is small (no build tools like vite/tailwind left
inside).

**Note:** a locally-built image lives only on your machine. A cloud cluster
can't see it — for cloud you'd `docker push` it to a registry first. For local
Kubernetes (below) you copy it in instead.

---

## Part 2 — Run it locally with Kubernetes (kind)

`kind` = **K**ubernetes **IN **D**ocker. It runs a whole Kubernetes cluster
inside Docker containers on your laptop. Free, local, disposable.

Analogy used below: **Kubernetes is a restaurant manager**, your app is a dish.

```bash
cd /path/to/transcript-intelligence

# 1. Create the cluster (build the kitchen)
kind create cluster
```
Creates the local Kubernetes cluster. **You must do this first** — without it
you get `no nodes found for cluster "kind"` because there's nowhere to deploy.

```bash
# 2. Build the image (see Part 1)
docker build -t transcript-intelligence:latest .
```

```bash
# 3. Load the image into the cluster (stock the kitchen)
kind load docker-image transcript-intelligence:latest
```
A kind cluster has its **own** image store, separate from your machine's
Docker. Your freshly-built image is invisible to it until you load it in.
(Docker Desktop's built-in Kubernetes shares Docker's images and does NOT need
this step.)

```bash
# 4. Deploy (hand the manager the recipe card)
kubectl apply -f k8s/deployment.yaml
```
Sends `deployment.yaml` to the cluster. Kubernetes reads it and makes it real:
starts 1 copy (a "pod") of your app, and creates a stable internal address
(a "Service") to reach it.

```bash
# 5. Wait until it's ready (is my food cooked?)
kubectl rollout status deploy/transcript-intelligence
```
Blocks until the app is running and its `/health` check passes. If the app
crashed, this is where you'll see it fail instead of silently having a dead pod.

```bash
# 6. Open a window to reach it
kubectl port-forward svc/transcript-intelligence 3001:3001
```
Inside Kubernetes the app is sealed off from the outside. This opens a tunnel
from your laptop's `localhost:3001` into the cluster. **Leave this terminal
open**, then visit:

- App:    http://localhost:3001
- Health: http://localhost:3001/health

Ctrl-C closes the tunnel (the app keeps running inside the cluster).

**The whole flow:** build kitchen → package dish → stock kitchen → hand over
recipe → wait til cooked → open a serving window.

### Tear down when done
```bash
kind delete cluster
```

---

## Part 3 — Cloud (one-day demo on DigitalOcean)

DigitalOcean isn't free but gives new accounts a **$200 / 60-day credit**. A
one-day demo cluster costs ~$1 against that.

Differences from local:
- Push the image to a registry (Docker Hub or DO's registry) instead of
  `kind load`.
- In `k8s/deployment.yaml`, change the `image:` to your registry path and remove
  `imagePullPolicy: IfNotPresent` so it pulls from the registry.
- To get a public URL, change the Service to `type: LoadBalancer`.

```bash
doctl kubernetes cluster create demo --count 1 --size s-1vcpu-2gb
doctl kubernetes cluster kubeconfig save demo
kubectl apply -f k8s/deployment.yaml
```

**Delete everything when done or it keeps billing** (especially the load
balancer):
```bash
doctl kubernetes cluster delete demo
```

---

## Simpler alternative (no Kubernetes)

If you just want a public link for a day and don't specifically need
Kubernetes, **Render** or **Railway** are far simpler: connect the repo, they
build the `Dockerfile`, you get a URL in a few minutes. No `kubectl`, no
cluster, no manifests.
