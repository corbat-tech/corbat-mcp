# LLM Development Workflow

Esta guía define el proceso estructurado que el LLM debe seguir cuando un developer solicita implementar una feature, fix, o cualquier tarea de desarrollo.

## Principios Fundamentales

1. **Iterativo con feedback loop** - Generar → Ejecutar → Evaluar → Refinar
2. **Test-Driven Development** - Tests primero, implementación después
3. **Clarificación antes de acción** - Nunca asumir, siempre preguntar
4. **Revisión experta** - Adoptar roles específicos para revisar el trabajo
5. **Refinamiento iterativo** - Hasta 3 ciclos de mejora

---

## Fase 1: CLARIFICACIÓN (Ask)

**Objetivo:** Entender completamente lo que el developer necesita antes de escribir una línea de código.

### Acciones obligatorias:

1. **Analizar la solicitud** buscando:
   - Requisitos funcionales explícitos
   - Requisitos implícitos o asumidos
   - Ambigüedades o contradicciones
   - Contexto técnico necesario

2. **Preguntar si detectas:**
   - Falta de contexto funcional
   - Requisitos contradictorios
   - Múltiples interpretaciones posibles
   - Dependencias no especificadas
   - Criterios de aceptación no claros

3. **Confirmar entendimiento:**
   - Reformular la solicitud en tus propias palabras
   - Listar los requisitos como los entiendes
   - Pedir confirmación antes de continuar

### Prompt interno sugerido:
```
Antes de proceder, debo verificar:
- ¿Entiendo EXACTAMENTE qué resultado espera el developer?
- ¿Hay alguna ambigüedad que deba aclarar?
- ¿Tengo todo el contexto técnico necesario?
- ¿Conozco los criterios de aceptación?
```

---

## Fase 2: PLANIFICACIÓN (Plan)

**Objetivo:** Crear un plan de implementación detallado y esquemático.

### Acciones obligatorias:

1. **Listar requisitos y constraints:**
   - Requisitos funcionales
   - Requisitos no funcionales (performance, seguridad, etc.)
   - Limitaciones técnicas del stack
   - Patrones existentes en el codebase

2. **Evaluar alternativas** (mínimo 2-3 opciones cuando aplique):
   - Describir cada alternativa
   - Listar pros y contras
   - Recomendar la mejor opción con justificación

3. **Crear lista de tareas esquemática:**
   ```
   [ ] 1. Tarea A - Descripción breve
       [ ] 1.1 Subtarea - Tests unitarios
       [ ] 1.2 Subtarea - Implementación
   [ ] 2. Tarea B - Descripción breve
   ...
   ```

4. **Definir criterios de aceptación:**
   - Qué tests deben pasar
   - Qué comportamiento se espera
   - Cómo verificar que está completo

### Prompt interno sugerido:
```
Mi plan de implementación debe incluir:
- Lista clara de tareas ordenadas por dependencia
- Tests que escribiré ANTES de cada implementación
- Criterios de éxito medibles
- Puntos de verificación intermedios
```

---

## Fase 3: IMPLEMENTACIÓN (Build)

**Objetivo:** Implementar cada tarea siguiendo TDD estricto.

### Flujo TDD obligatorio para cada tarea:

```
┌─────────────────────────────────────────────────┐
│  1. RED: Escribir test que falla                │
│     - Test describe comportamiento esperado     │
│     - Ejecutar test, confirmar que falla        │
├─────────────────────────────────────────────────┤
│  2. GREEN: Implementar mínimo para pasar test   │
│     - Solo el código necesario                  │
│     - Sin optimizaciones prematuras             │
│     - Ejecutar test, confirmar que pasa         │
├─────────────────────────────────────────────────┤
│  3. REFACTOR: Mejorar sin cambiar comportamiento│
│     - Limpiar código                            │
│     - Aplicar patrones del proyecto             │
│     - Tests siguen pasando                      │
└─────────────────────────────────────────────────┘
```

### Tipos de tests según contexto:

| Tipo | Cuándo usar | Cobertura objetivo |
|------|-------------|-------------------|
| **Unit tests** | Lógica de negocio, utilidades, transformaciones | 80%+ |
| **Integration tests** | Interacción entre componentes, APIs, DB | Flujos críticos |
| **E2E tests** | Flujos de usuario completos | Happy paths |
| **Architecture tests** | Validar dependencias entre capas | Siempre |

### Acciones obligatorias por cada tarea:

1. Escribir tests primero
2. Confirmar que tests fallan
3. Implementar funcionalidad
4. Confirmar que tests pasan
5. Refactorizar si es necesario
6. Marcar tarea como completada
7. Pasar a la siguiente tarea

### Prompt interno sugerido:
```
Para cada tarea debo:
1. ¿Qué test escribo primero?
2. ¿El test describe el comportamiento esperado?
3. ¿El test falla como se espera?
4. ¿Cuál es el código MÍNIMO para pasar el test?
5. ¿Hay algo que refactorizar?
```

---

## Fase 4: VERIFICACIÓN (Verify)

**Objetivo:** Asegurar que todo funciona correctamente.

### Checklist de verificación:

```
[ ] Compilación exitosa (sin errores ni warnings críticos)
[ ] Todos los tests pasan
[ ] Linter sin errores
[ ] La aplicación se levanta correctamente
[ ] Los flujos principales funcionan
[ ] No hay regresiones en funcionalidad existente
```

### Comandos típicos de verificación:

```bash
# Build
npm run build / mvn compile / ./gradlew build

# Tests
npm test / mvn test / ./gradlew test

# Lint
npm run lint / mvn checkstyle:check

# Start
npm start / mvn spring-boot:run
```

### Si algo falla:

1. Identificar el error específico
2. Analizar la causa raíz
3. Corregir el problema
4. Volver a ejecutar verificación completa
5. No avanzar hasta que todo esté verde

---

## Fase 5: REVISIÓN EXPERTA (Review)

**Objetivo:** Revisar el trabajo adoptando el rol de un experto específico.

### Proceso de revisión:

1. **Limpiar contexto mental** - Olvidar el proceso de implementación
2. **Adoptar rol de experto** según el tipo de trabajo:

| Tipo de trabajo | Rol a adoptar |
|-----------------|---------------|
| Arquitectura, estructura | Arquitecto de Software Senior |
| API, servicios backend | Desarrollador Backend Senior |
| UI, componentes frontend | Desarrollador Frontend Senior |
| Base de datos, queries | DBA / Data Engineer |
| Seguridad | Security Engineer |
| Performance | Performance Engineer |
| DevOps, CI/CD | DevOps Engineer |

3. **Revisar con ojos frescos:**

### Prompt de revisión (usar literalmente):

```
Adopto el rol de [ROL ESPECÍFICO] con 15+ años de experiencia.

Voy a revisar este código/implementación desde cero, sin conocer
el proceso de implementación. Mi objetivo es encontrar:

1. CRÍTICOS (deben corregirse):
   - Bugs potenciales
   - Vulnerabilidades de seguridad
   - Violaciones de arquitectura
   - Problemas de performance graves
   - Code smells severos

2. RECOMENDADOS (deberían corregirse):
   - Mejoras de legibilidad
   - Optimizaciones menores
   - Mejores prácticas no aplicadas
   - Documentación faltante
   - Tests adicionales recomendados

3. SUGERENCIAS (nice to have):
   - Refactorizaciones opcionales
   - Patrones alternativos
   - Mejoras futuras

Revisaré: [listar archivos/componentes a revisar]
```

### Checklist de revisión por rol:

**Como Arquitecto:**
- [ ] ¿Se respetan las capas de la arquitectura?
- [ ] ¿Las dependencias van en la dirección correcta?
- [ ] ¿Se aplican los patrones del proyecto (DDD, CQRS, etc.)?
- [ ] ¿El diseño es extensible y mantenible?

**Como Backend Developer:**
- [ ] ¿El código es limpio y legible?
- [ ] ¿Se manejan correctamente los errores?
- [ ] ¿Hay validaciones adecuadas?
- [ ] ¿Los tests cubren los casos edge?

**Como Security Engineer:**
- [ ] ¿Hay validación de inputs?
- [ ] ¿Se evitan inyecciones (SQL, XSS, etc.)?
- [ ] ¿Los datos sensibles están protegidos?
- [ ] ¿Se aplica el principio de mínimo privilegio?

---

## Fase 6: REFINAMIENTO ITERATIVO (Refine)

**Objetivo:** Aplicar las mejoras identificadas en ciclos hasta alcanzar calidad óptima.

### Proceso de refinamiento:

```
┌─────────────────────────────────────────────────┐
│  CICLO 1: Correcciones críticas                 │
│  - Aplicar TODOS los issues críticos            │
│  - Verificar que nada se rompe                  │
│  - Re-ejecutar tests                            │
├─────────────────────────────────────────────────┤
│  CICLO 2: Mejoras recomendadas                  │
│  - Aplicar issues recomendados                  │
│  - Nueva revisión rápida                        │
│  - Verificar calidad                            │
├─────────────────────────────────────────────────┤
│  CICLO 3: Pulido final                          │
│  - Aplicar sugerencias valiosas                 │
│  - Revisión final de coherencia                 │
│  - Documentación si aplica                      │
└─────────────────────────────────────────────────┘
```

### Reglas de refinamiento:

1. **Máximo 3 ciclos** - Si después de 3 ciclos hay issues críticos, consultar al developer
2. **No over-engineer** - Solo aplicar mejoras que aporten valor real
3. **Mantener scope** - No añadir funcionalidad no solicitada
4. **Documentar decisiones** - Explicar por qué se hicieron ciertos cambios

### Criterios de finalización:

```
[ ] Todos los issues CRÍTICOS resueltos
[ ] Mayoría de issues RECOMENDADOS resueltos (80%+)
[ ] Tests pasan al 100%
[ ] Código compila sin warnings
[ ] Aplicación funciona correctamente
[ ] El developer puede entender el código sin explicación
```

---

## Resumen del Flujo Completo

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Developer solicita feature/fix                              │
│                    │                                         │
│                    ▼                                         │
│  ┌─────────────────────────────────┐                        │
│  │  FASE 1: CLARIFICACIÓN          │◄─── ¿Dudas? Preguntar  │
│  │  - Analizar solicitud           │                        │
│  │  - Identificar ambigüedades     │                        │
│  │  - Confirmar entendimiento      │                        │
│  └─────────────────────────────────┘                        │
│                    │                                         │
│                    ▼                                         │
│  ┌─────────────────────────────────┐                        │
│  │  FASE 2: PLANIFICACIÓN          │                        │
│  │  - Listar requisitos            │                        │
│  │  - Evaluar alternativas         │                        │
│  │  - Crear lista de tareas        │                        │
│  └─────────────────────────────────┘                        │
│                    │                                         │
│                    ▼                                         │
│  ┌─────────────────────────────────┐                        │
│  │  FASE 3: IMPLEMENTACIÓN (TDD)   │◄─── Por cada tarea:    │
│  │  - RED: Test que falla          │     Test → Impl → Test │
│  │  - GREEN: Implementar           │                        │
│  │  - REFACTOR: Limpiar            │                        │
│  └─────────────────────────────────┘                        │
│                    │                                         │
│                    ▼                                         │
│  ┌─────────────────────────────────┐                        │
│  │  FASE 4: VERIFICACIÓN           │◄─── ¿Falla? Corregir   │
│  │  - Compilar                     │                        │
│  │  - Tests                        │                        │
│  │  - Levantar aplicación          │                        │
│  └─────────────────────────────────┘                        │
│                    │                                         │
│                    ▼                                         │
│  ┌─────────────────────────────────┐                        │
│  │  FASE 5: REVISIÓN EXPERTA       │                        │
│  │  - Adoptar rol de experto       │                        │
│  │  - Revisar desde cero           │                        │
│  │  - Identificar mejoras          │                        │
│  └─────────────────────────────────┘                        │
│                    │                                         │
│                    ▼                                         │
│  ┌─────────────────────────────────┐                        │
│  │  FASE 6: REFINAMIENTO           │◄─── Hasta 3 ciclos     │
│  │  - Aplicar críticos             │                        │
│  │  - Aplicar recomendados         │                        │
│  │  - Pulido final                 │                        │
│  └─────────────────────────────────┘                        │
│                    │                                         │
│                    ▼                                         │
│  ✅ Entrega al developer                                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Ejemplo de Aplicación

### Solicitud del developer:
> "Añade un endpoint para crear usuarios con validación de email"

### Fase 1 - Clarificación:
```
Antes de implementar, necesito aclarar:
1. ¿Qué campos debe tener el usuario además del email?
2. ¿Qué validaciones adicionales se requieren?
3. ¿Debe enviarse email de confirmación?
4. ¿Qué respuesta debe devolver el endpoint?
5. ¿Hay requisitos de seguridad específicos?
```

### Fase 2 - Planificación:
```
Tareas a implementar:
[ ] 1. Crear DTO CreateUserRequest con validaciones
    [ ] 1.1 Tests de validación
    [ ] 1.2 Implementación DTO
[ ] 2. Crear entidad User en dominio
    [ ] 2.1 Tests de User
    [ ] 2.2 Implementación entidad
[ ] 3. Crear UserRepository
    [ ] 3.1 Tests de repository
    [ ] 3.2 Implementación
[ ] 4. Crear CreateUserUseCase
    [ ] 4.1 Tests del caso de uso
    [ ] 4.2 Implementación
[ ] 5. Crear endpoint POST /users
    [ ] 5.1 Tests de integración
    [ ] 5.2 Implementación controller
```

### Fase 3-6: [Continuar con el flujo...]

---

## Referencias

Este workflow está basado en:
- Test-Driven Development (Kent Beck)
- Agentic Coding patterns (Anthropic)
- Clean Architecture (Robert C. Martin)
- Prompt Engineering best practices (2025)
