# Archivo de Sonido para Notificaciones

## notification-bell.mp3

Este archivo debe ser un sonido de campanita para las notificaciones de ventas.

## Opciones para obtener el archivo:

### Opción 1: Descargar sonido gratuito
1. Visitar: https://pixabay.com/sound-effects/search/bell/
2. Descargar un sonido de campanita corto (1-2 segundos)
3. Convertir a MP3 si es necesario
4. Renombrar a `notification-bell.mp3`
5. Colocar en esta carpeta

### Opción 2: Usar generador online
1. Visitar: https://onlinetonegenerator.com/
2. Configurar frecuencia: 800-1200 Hz
3. Duración: 0.5-1 segundo
4. Descargar como MP3
5. Colocar en esta carpeta

### Opción 3: Crear con Audacity (software gratuito)
1. Descargar Audacity: https://www.audacityteam.org/
2. Generar tono: Generar → Tono
3. Frecuencia: 880 Hz
4. Duración: 0.5 segundos
5. Aplicar efecto de fade in/out
6. Exportar como MP3

### Opción 4: Comando ffmpeg (si tienes instalado)
```bash
# Generar tono simple de campanita
ffmpeg -f lavfi -i "sine=frequency=880:duration=0.5" -f lavfi -i "sine=frequency=1320:duration=0.3" -filter_complex "[0][1]amix=inputs=2:duration=shortest" notification-bell.mp3
```

## Nota Importante
Si no colocas el archivo, la aplicación seguirá funcionando pero sin sonido. El código maneja el error silenciosamente.

## Alternativa: Sin archivo de audio
Si no deseas usar sonido, puedes comentar o eliminar la llamada en el archivo TypeScript:

```typescript
// Comentar esta línea en home.component.ts
// this.reproducirSonido();
```

## Características recomendadas del archivo:
- Formato: MP3
- Duración: 0.5 - 2 segundos
- Volumen: Moderado (se ajusta al 50% en código)
- Calidad: 128kbps es suficiente
- Tamaño: Menos de 50KB
