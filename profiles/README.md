# Corbat MCP Profiles

Los perfiles definen los estándares de código y mejores prácticas que el LLM aplicará durante el desarrollo.

## Estructura de Carpetas

```
profiles/
├── templates/           # Perfiles oficiales (NO editar)
│   ├── java-spring-backend.yaml  # Java + Spring Boot enterprise
│   ├── nodejs.yaml               # Node.js + TypeScript
│   ├── python.yaml               # Python + FastAPI/Django
│   ├── frontend.yaml             # React/Vue/Angular
│   ├── minimal.yaml              # Configuración mínima
│   └── _template.yaml            # Plantilla para crear nuevos perfiles
│
├── custom/              # TUS perfiles personalizados
│   └── (tus archivos .yaml)
│
└── README.md            # Esta guía
```

## Uso Rápido

### 1. Usar un perfil existente

```bash
# En tu cliente MCP, especifica el perfil:
get_coding_standards(profile: "java-spring-backend")
get_coding_standards(profile: "nodejs")
get_coding_standards(profile: "frontend")
```

### 2. Crear un perfil personalizado

```bash
# 1. Copia la plantilla
cp profiles/templates/_template.yaml profiles/custom/mi-proyecto.yaml

# 2. Edita con tu configuración
code profiles/custom/mi-proyecto.yaml

# 3. Usa tu perfil
get_coding_standards(profile: "mi-proyecto")
```

## Perfiles Disponibles

| Perfil | Descripción | Stack |
|--------|-------------|-------|
| `java-spring-backend` | Enterprise backend con arquitectura hexagonal, DDD, CQRS | Java 21, Spring Boot 3.x |
| `nodejs` | Backend/fullstack con TypeScript | Node.js, TypeScript, Express/Nest |
| `python` | Backend con tipado estricto | Python 3.11+, FastAPI/Django |
| `frontend` | Aplicaciones web modernas | React/Vue/Angular, TypeScript |
| `minimal` | Configuración mínima para empezar | Cualquiera |

## Estructura de un Perfil

```yaml
# Metadatos
name: "Nombre del perfil"
description: "Descripción breve"

# Arquitectura
architecture:
  type: hexagonal | clean | layered | onion
  layers: [...]

# DDD (opcional)
ddd:
  enabled: true
  patterns: {...}

# Calidad de código
codeQuality:
  maxMethodLines: 20
  minimumTestCoverage: 80

# Convenciones de nombrado
naming:
  general: {...}
  suffixes: {...}

# Testing
testing:
  framework: "JUnit5"
  types: {...}

# Tecnologías específicas
technologies:
  - name: java
    version: "21"
    specificRules: {...}
```

## Secciones Disponibles

| Sección | Propósito |
|---------|-----------|
| `architecture` | Patrón arquitectónico y capas |
| `ddd` | Patrones Domain-Driven Design |
| `cqrs` | Command Query Responsibility Segregation |
| `eventDriven` | Arquitectura basada en eventos |
| `codeQuality` | Métricas y principios de calidad |
| `naming` | Convenciones de nombrado |
| `testing` | Frameworks y tipos de tests |
| `httpClients` | Clientes HTTP y APIs |
| `observability` | Logging, métricas, tracing |
| `security` | Autenticación, autorización |
| `errorHandling` | Manejo de errores |
| `database` | Migraciones, auditoría |
| `technologies` | Stack tecnológico específico |

## Ejemplos de Personalización

### Proyecto microservicio simple

```yaml
# profiles/custom/order-service.yaml
name: "Order Service"
description: "Microservicio de órdenes"

architecture:
  type: hexagonal
  enforceLayerDependencies: true

ddd:
  enabled: true
  patterns:
    aggregates: true
    domainEvents: true

codeQuality:
  minimumTestCoverage: 85

technologies:
  - name: java
    version: "21"
  - name: spring-boot
    version: "3.2"
```

### Proyecto frontend React

```yaml
# profiles/custom/admin-dashboard.yaml
name: "Admin Dashboard"
description: "Panel de administración React"

architecture:
  type: clean
  layers:
    - name: ui
      description: "Componentes visuales"
      packages: ["components/*"]
    - name: features
      description: "Lógica de features"
      packages: ["features/*"]
    - name: shared
      description: "Código compartido"
      packages: ["shared/*"]

codeQuality:
  maxMethodLines: 30
  minimumTestCoverage: 70

technologies:
  - name: react
    version: "18"
  - name: typescript
    version: "5"
```

## Tips

1. **Empieza con `minimal.yaml`** si no estás seguro de qué necesitas
2. **Copia `_template.yaml`** para crear perfiles desde cero
3. **No modifiques `templates/`** - usa `custom/` para tus cambios
4. **Solo incluye secciones que uses** - el resto usará defaults sensatos
5. **Un perfil por proyecto** es la recomendación para equipos

## Contribuir Perfiles

Si creas un perfil útil que podría beneficiar a otros:

1. Asegúrate de que sea genérico (no específico de tu empresa)
2. Documenta las decisiones de diseño
3. Abre un PR añadiéndolo a `templates/`

---

Para más información sobre el workflow de desarrollo, usa:
```
get_development_workflow()
```
