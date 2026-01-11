# Kubernetes Deployment Guidelines

## Overview

Guidelines for deploying Spring Boot applications to Kubernetes following best practices for reliability, security, and observability.

## Directory Structure

```
infrastructure/
├── kubernetes/
│   ├── base/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── configmap.yaml
│   │   ├── hpa.yaml
│   │   └── kustomization.yaml
│   └── overlays/
│       ├── development/
│       │   ├── kustomization.yaml
│       │   └── patches/
│       ├── staging/
│       │   └── kustomization.yaml
│       └── production/
│           ├── kustomization.yaml
│           └── patches/
└── helm/
    └── order-service/
        ├── Chart.yaml
        ├── values.yaml
        └── templates/
```

## Deployment

### Full Deployment Manifest

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  labels:
    app: order-service
    app.kubernetes.io/name: order-service
    app.kubernetes.io/version: "1.0.0"
    app.kubernetes.io/component: backend
spec:
  replicas: 2
  revisionHistoryLimit: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/actuator/prometheus"
    spec:
      serviceAccountName: order-service
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000

      containers:
        - name: order-service
          image: registry.example.com/order-service:1.0.0
          imagePullPolicy: IfNotPresent

          ports:
            - name: http
              containerPort: 8080
              protocol: TCP

          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "kubernetes"
            - name: SERVER_PORT
              value: "8080"
            - name: JAVA_OPTS
              value: "-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

          envFrom:
            - configMapRef:
                name: order-service-config
            - secretRef:
                name: order-service-secrets

          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"

          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: http
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3

          startupProbe:
            httpGet:
              path: /actuator/health/liveness
              port: http
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 30

          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL

          volumeMounts:
            - name: tmp
              mountPath: /tmp

      volumes:
        - name: tmp
          emptyDir: {}

      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: order-service
                topologyKey: kubernetes.io/hostname

      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: order-service
```

## Service

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service
  labels:
    app: order-service
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 80
      targetPort: http
      protocol: TCP
  selector:
    app: order-service
```

## ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: order-service-config
data:
  # Application configuration
  SPRING_APPLICATION_NAME: order-service
  MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE: health,info,metrics,prometheus
  MANAGEMENT_ENDPOINT_HEALTH_PROBES_ENABLED: "true"

  # Kafka configuration
  SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka-cluster-kafka-bootstrap.kafka:9092
  SPRING_KAFKA_CONSUMER_GROUP_ID: order-service

  # Observability
  MANAGEMENT_TRACING_SAMPLING_PROBABILITY: "1.0"
  MANAGEMENT_ZIPKIN_TRACING_ENDPOINT: http://jaeger-collector.observability:9411/api/v2/spans

  # Logging
  LOGGING_LEVEL_ROOT: INFO
  LOGGING_LEVEL_COM_EXAMPLE: DEBUG
```

## Secrets

```yaml
# secret.yaml (use External Secrets Operator in production)
apiVersion: v1
kind: Secret
metadata:
  name: order-service-secrets
type: Opaque
stringData:
  DATABASE_URL: jdbc:postgresql://postgres:5432/orderdb
  DATABASE_USERNAME: postgres
  DATABASE_PASSWORD: changeme
```

### External Secrets (Recommended for Production)

```yaml
# external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: order-service-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: order-service-secrets
    creationPolicy: Owner
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: order-service/database
        property: url
    - secretKey: DATABASE_USERNAME
      remoteRef:
        key: order-service/database
        property: username
    - secretKey: DATABASE_PASSWORD
      remoteRef:
        key: order-service/database
        property: password
```

## Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
```

## Pod Disruption Budget

```yaml
# pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: order-service
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: order-service
```

## Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: order-service
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  tls:
    - hosts:
        - api.example.com
      secretName: order-service-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api/v1/orders
            pathType: Prefix
            backend:
              service:
                name: order-service
                port:
                  name: http
```

## Service Account

```yaml
# serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  annotations:
    # For AWS IRSA
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/order-service
```

## NetworkPolicy

```yaml
# networkpolicy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: order-service
spec:
  podSelector:
    matchLabels:
      app: order-service
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
        - podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - port: 8080
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: database
      ports:
        - port: 5432
    - to:
        - namespaceSelector:
            matchLabels:
              name: kafka
      ports:
        - port: 9092
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - port: 53
          protocol: UDP
```

## Kustomize

### Base

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
  - hpa.yaml
  - pdb.yaml
  - serviceaccount.yaml

commonLabels:
  app.kubernetes.io/name: order-service
  app.kubernetes.io/managed-by: kustomize
```

### Production Overlay

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

resources:
  - ../../base
  - ingress.yaml
  - networkpolicy.yaml
  - external-secret.yaml

images:
  - name: registry.example.com/order-service
    newTag: 1.0.0

replicas:
  - name: order-service
    count: 3

patches:
  - path: patches/deployment-resources.yaml
```

```yaml
# overlays/production/patches/deployment-resources.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    spec:
      containers:
        - name: order-service
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2000m"
              memory: "2Gi"
```

## Deployment Commands

```bash
# Apply with Kustomize
kubectl apply -k infrastructure/kubernetes/overlays/production

# Preview changes
kubectl diff -k infrastructure/kubernetes/overlays/production

# Rollout status
kubectl rollout status deployment/order-service -n production

# Rollback
kubectl rollout undo deployment/order-service -n production

# View history
kubectl rollout history deployment/order-service -n production
```

## Best Practices Checklist

- [ ] Use resource requests and limits
- [ ] Configure liveness, readiness, and startup probes
- [ ] Use PodDisruptionBudget for high availability
- [ ] Configure HPA for auto-scaling
- [ ] Use pod anti-affinity for spreading across nodes
- [ ] Use topology spread constraints for zone distribution
- [ ] Configure NetworkPolicy for security
- [ ] Use External Secrets for credential management
- [ ] Run as non-root user
- [ ] Use read-only root filesystem
- [ ] Configure Prometheus scraping annotations
- [ ] Use namespaces for environment separation
- [ ] Use Kustomize/Helm for environment-specific configs
