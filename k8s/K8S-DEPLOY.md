# Running on a kubeadm cluster

This assumes a real kubeadm-provisioned cluster (one or more nodes, `kubectl`
already configured to talk to it — `kubectl get nodes` should work).

## 0. Prerequisites the manifests assume

**A container registry.** Kubernetes pulls images from a registry — it can't
use images that only exist in your local Docker on your laptop. The simplest
path is a free Docker Hub account. (If you'd rather run a private registry or
use GHCR, the steps are the same, just swap the image prefix.)

**A default StorageClass** (needed for MySQL's PersistentVolumeClaim). Check:
```bash
kubectl get storageclass
```
If that's empty, install Rancher's local-path-provisioner (works well on bare
kubeadm clusters, stores data on a node's local disk):
```bash
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.30/deploy/local-path-storage.yaml
kubectl patch storageclass local-path -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

## 1. Build and push the images

From the project top level, on a machine with Docker installed and logged in
(`docker login`):
```bash
DOCKERHUB_USER=yourusername ./k8s/build-and-push.sh
```
This builds all 5 images (auth-service, task-service, notification-service,
api-gateway, frontend) using the existing Dockerfiles and pushes them.

## 2. Point the manifests at your images

```bash
sed -i "s|YOURUSER|yourusername|g" k8s/*.yaml
```
(On macOS, `sed` needs `sed -i ''` instead of `sed -i`.)

## 3. Fill in secrets

Edit `k8s/02-secret.yaml` with a real `DB_PASSWORD`, a real random
`JWT_SECRET`, and real SMTP credentials — or skip editing the file and create
the Secret imperatively instead (see the commented command at the top of that
file), which avoids ever writing secrets to disk in your repo.

## 4. Set your frontend's API_BASE_URL

In `k8s/09-frontend.yaml`, replace `<NODE_IP>` with a real, reachable IP of
any node in your cluster:
```bash
kubectl get nodes -o wide
```
This has to be an address your **browser** can reach — not a cluster-internal
DNS name.

## 5. Apply everything

```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap.yaml
kubectl apply -f k8s/02-secret.yaml
kubectl apply -f k8s/03-mysql-init-configmap.yaml
kubectl apply -f k8s/04-mysql.yaml
kubectl apply -f k8s/05-auth-service.yaml
kubectl apply -f k8s/06-task-service.yaml
kubectl apply -f k8s/07-notification-service.yaml
kubectl apply -f k8s/08-api-gateway.yaml
kubectl apply -f k8s/09-frontend.yaml
```
(Or just `kubectl apply -f k8s/` to apply the whole folder — the `00-`, `01-`…
prefixes make it apply in the right order even then, since Kubernetes mostly
tolerates out-of-order application anyway for these resource types.)

## 6. Watch it come up

```bash
kubectl get pods -n todo -w
```
`mysql` needs to reach Ready before auth-service/task-service will pass their
own probes reliably (their pool doesn't retry startup gracefully — see the
"Known limitations" note in the main README). Give it 30–60 seconds.

## 7. Access it

- Frontend: `http://<any-node-ip>:30080`
- API Gateway directly: `http://<any-node-ip>:30300`

## Troubleshooting

**Pods stuck in `ImagePullBackOff`** — either the image name/tag doesn't
exist on your registry, or the registry is private and nodes need
`imagePullSecrets`. Check with:
```bash
kubectl describe pod -n todo <pod-name>
```

**Pods `CrashLoopBackOff` on auth-service/task-service** — almost always means
MySQL wasn't reachable/ready yet when the app started. Check:
```bash
kubectl logs -n todo <pod-name>
kubectl get pods -n todo -l app=mysql
```

**Frontend loads but login/API calls fail** — open the browser console. If
you see a CORS or connection-refused error, double check `API_BASE_URL` in
`k8s/09-frontend.yaml` actually matches a real node IP and NodePort you can
reach from your browser (not from inside the cluster).

## Optional: Ingress instead of NodePorts

`k8s/10-ingress.yaml` unifies the frontend and API gateway under a single
hostname using an Ingress, instead of two separate NodePorts. It requires
installing an Ingress controller first — for a bare kubeadm cluster:
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.2/deploy/static/provider/baremetal/deploy.yaml
```
Then check which NodePort ingress-nginx itself is using for HTTP:
```bash
kubectl get svc -n ingress-nginx
```
and hit that port with the `Host: todo.local` header (or add `todo.local` to
your local `/etc/hosts` pointing at a node IP), after switching
`api-gateway`/`frontend` Services to `type: ClusterIP` and setting the
frontend's `API_BASE_URL` to `""` (empty string — same-origin requests).
