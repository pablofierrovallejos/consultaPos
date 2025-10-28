-- Script completo de implementación de cache para estadísticas de energía

-- ===========================================================================
-- PASO 1: Crear tabla de cache
-- ===========================================================================
CREATE TABLE IF NOT EXISTS estadisticas_energia_dia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombrenodo VARCHAR(10) NOT NULL,
    fecha DATE NOT NULL,
    consumo_energia DECIMAL(10,2),
    promedio_potencia DECIMAL(10,2),
    ultima_medicion DATETIME,
    fecha_calculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_nodo_fecha (nombrenodo, fecha),
    INDEX idx_nodo_fecha (nombrenodo, fecha),
    INDEX idx_fecha (fecha)
) ENGINE=InnoDB;

-- ===========================================================================
-- PASO 2: Crear índices en tabla original para mejorar performance
-- ===========================================================================
-- Índice compuesto optimizado para las consultas más comunes
-- Si ya existen, estos comandos darán error y puedes ignorarlos

DROP INDEX idx_medicion_nodo_fecha ON medicionenergia;
DROP INDEX idx_medicion_filtros ON medicionenergia;
DROP INDEX idx_medicion_power ON medicionenergia;
DROP INDEX idx_medicion_energy ON medicionenergia;

-- Índice principal para filtrar por nodo y fecha
CREATE INDEX idx_medicion_nodo_fecha
    ON medicionenergia(nombrenodo, fechameas);

-- Índice para las columnas de filtro numérico
CREATE INDEX idx_medicion_power
    ON medicionenergia(power);

CREATE INDEX idx_medicion_energy
    ON medicionenergia(energy);

-- ===========================================================================
-- PASO 3: Poblar tabla cache con datos históricos (ejecutar una sola vez)
-- ===========================================================================
-- Este script popula los últimos 90 días para cada nodo
-- Ajusta las fechas según tus necesidades
-- IMPORTANTE: Ejecutar todo el bloque completo desde INSERT hasta el punto y coma final

INSERT INTO estadisticas_energia_dia
    (nombrenodo, fecha, consumo_energia, promedio_potencia, ultima_medicion)
SELECT
    nombrenodo,
    DATE(fechameas) AS fecha,
    (MAX(energy) - MIN(energy)) AS consumo_energia,
    ROUND(AVG(power), 2) AS promedio_potencia,
    MAX(fechameas) AS ultima_medicion
FROM medicionenergia
WHERE fechameas >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
  AND CAST(power AS DECIMAL(10,2)) < 6000.0
  AND CAST(energy AS DECIMAL(10,2)) > 0.0
  AND CAST(volts AS DECIMAL(10,2)) >= 200.0
  AND CAST(volts AS DECIMAL(10,2)) <= 250.0
  AND CAST(current AS DECIMAL(10,2)) >= 0.0
  AND CAST(current AS DECIMAL(10,2)) <= 20.0
GROUP BY nombrenodo, DATE(fechameas)
ON DUPLICATE KEY UPDATE
    consumo_energia = VALUES(consumo_energia),
    promedio_potencia = VALUES(promedio_potencia),
    ultima_medicion = VALUES(ultima_medicion),
    fecha_calculo = NOW();

-- ===========================================================================
-- PASO 4: Crear evento para actualización automática diaria
-- ===========================================================================
-- Habilitar event scheduler si no está activo
SET GLOBAL event_scheduler = ON;

-- Crear evento que se ejecuta cada día a las 00:30 AM
DELIMITER $$

CREATE EVENT IF NOT EXISTS evt_actualizar_estadisticas_diarias
ON SCHEDULE EVERY 1 DAY
STARTS (CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 30 MINUTE)
DO
BEGIN
    -- Actualizar el día anterior para todos los nodos
    INSERT INTO estadisticas_energia_dia
        (nombrenodo, fecha, consumo_energia, promedio_potencia, ultima_medicion)
    SELECT
        nombrenodo,
        DATE(fechameas) AS fecha,
        (MAX(energy) - MIN(energy)) AS consumo_energia,
        ROUND(AVG(power), 2) AS promedio_potencia,
        MAX(fechameas) AS ultima_medicion
    FROM medicionenergia
    WHERE DATE(fechameas) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
      AND CAST(power AS DECIMAL(10,2)) < 6000.0
      AND CAST(energy AS DECIMAL(10,2)) > 0.0
      AND CAST(volts AS DECIMAL(10,2)) >= 200.0
      AND CAST(volts AS DECIMAL(10,2)) <= 250.0
      AND CAST(current AS DECIMAL(10,2)) >= 0.0
      AND CAST(current AS DECIMAL(10,2)) <= 20.0
    GROUP BY nombrenodo, DATE(fechameas)
    ON DUPLICATE KEY UPDATE
        consumo_energia = VALUES(consumo_energia),
        promedio_potencia = VALUES(promedio_potencia),
        ultima_medicion = VALUES(ultima_medicion),
        fecha_calculo = NOW();
END$$

DELIMITER ;

-- ===========================================================================
-- VERIFICACIONES ÚTILES
-- ===========================================================================

-- Ver el estado del event scheduler
SHOW VARIABLES LIKE 'event_scheduler';

-- Ver los eventos creados
SHOW EVENTS;

-- Ver registros en cache
SELECT COUNT(*), MIN(fecha), MAX(fecha) FROM estadisticas_energia_dia;

-- Comparar performance (ejecutar ambos y comparar tiempo)
-- Original (lento):
-- CALL sp_estadisticaMeasDia('Meas1', '2025-10-01', @consumo, @potencia, @fecha);

-- Con cache (rápido):
-- SELECT consumo_energia, promedio_potencia, ultima_medicion
-- FROM estadisticas_energia_dia
-- WHERE nombrenodo = 'Meas1' AND fecha = '2025-10-01';


OJO Esto se hace para mejorar el rendimiento dado que la máquina virtual colapsó por consultas a
la base de datos por I/O de disco+

el sp_estadisticaMeasDia es el sp original que se pisa sin cambiar el nombre por el sp_estadisticaMeasDia_v2
se crea igualmente el sp_recalcular_estadisticas_dia
y lo indicado por 01_crear_cache_estadisticas.sql

el sp_recalcular_mes_completo no se usa, no es necesario crear
