# 🔍 Cómo Monitorear Memoria en Chrome DevTools

## Método 1: Performance Monitor (Recomendado - Tiempo Real)

### Pasos:
1. Abre **Chrome DevTools** (`F12`)
2. Presiona `Ctrl + Shift + P` (Command Palette)
3. Escribe `Show Performance Monitor`
4. Verás un panel flotante con métricas en tiempo real:
   - **JS heap size**: Memoria usada por JavaScript
   - **DOM Nodes**: Cantidad de elementos HTML
   - **JS event listeners**: Eventos registrados
   - **Documents**: Cantidad de documentos
   - **Frames**: Cantidad de iframes

### Qué observar:
- ✅ **JS heap size estable**: ~50-200MB es normal
- ❌ **JS heap size creciendo**: 500MB+ indica memory leak
- ❌ **DOM Nodes creciendo**: Miles de nodos sin liberar
- ❌ **Event listeners creciendo**: Listeners no removidos

---

## Método 2: Memory Profiler (Análisis Detallado)

### Pasos:
1. Abre **Chrome DevTools** → Pestaña **Memory**
2. Selecciona **Heap snapshot**
3. Click en **Take snapshot** (foto inicial)
4. Usa la aplicación por 2-3 minutos
5. Toma otro **snapshot**
6. En el dropdown, selecciona **Comparison** entre snapshots
7. Ordena por **Size Delta** (diferencia de tamaño)

### Qué buscar:
- **Arrays grandes** que crecen entre snapshots
- **Objects** con cientos de instancias
- **Detached DOM trees** (elementos eliminados pero aún en memoria)

---

## Método 3: Task Manager de Chrome

### Pasos:
1. En Chrome, presiona `Shift + Esc`
2. Busca tu pestaña en la lista
3. Observa las columnas:
   - **Memory footprint**: RAM total usada
   - **JavaScript memory**: Heap de JS

### Qué observar:
- ✅ **Memoria estable**: 200-500MB normal para SPA con gráficos
- ❌ **Memoria creciendo**: +50MB por minuto = leak severo

---

## 🎯 Diagnóstico específico para tu caso:

### Valores esperados (NORMALES):
```
Carga inicial: 150-300MB
Después de 5 min: 200-400MB
Después de 10 min: 250-500MB
```

### Valores problemáticos (LEAK):
```
Carga inicial: 21GB (!!)  ← ANORMAL, algo más está consumiendo RAM
Después de 10 min: 26GB   ← +5GB en 10 min = leak severo
```

---

## 🐛 Problema detectado en tus logs:

```
✅ WebSocket conectado
✅ Suscrito: /topic/estadistica/T163
✅ Suscrito: /topic/estadistica/T221
... (6 suscripciones)
[Violation] 'requestAnimationFrame' handler took 76ms
[Violation] 'setTimeout' handler took 60ms
[Violation] Forced reflow while executing JavaScript took 55ms
```

**Problemas identificados:**
1. ❌ WebSocket se reconecta automáticamente al cambiar de pestaña
2. ❌ `requestAnimationFrame` bloqueando 76ms (ngx-charts renderizando)
3. ❌ `Forced reflow` 55ms (cambios DOM masivos)

---

## ✅ Solución aplicada:

1. **WebSocket deshabilitado permanentemente** en reconexión de pestaña
2. **ChangeDetection deshabilitado** temporalmente
3. **Limpieza agresiva cada 2 minutos**
4. **30 puntos máximo** por gráfico
5. **2 series visibles** por defecto

---

## 📊 Prueba ahora:

1. **Cierra TODAS las pestañas de Chrome**
2. **Abre Task Manager de Windows** (`Ctrl+Shift+Esc`)
3. **Anota la RAM usada por Chrome** antes de abrir la app
4. **Abre la app de energía**
5. **Monitorea con Performance Monitor** durante 10 minutos
6. **Reporta los valores**

### Preguntas clave:
- ¿Cuánta RAM usa Chrome en Task Manager ANTES de abrir la app?
- ¿Cuánta RAM usa DESPUÉS de abrir solo la página de energía?
- ¿Los 21GB son de Chrome o de TODO el sistema?
