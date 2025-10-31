-- SP modificado para consultar desde la tabla cache
CREATE DEFINER=`root`@`%` PROCEDURE `sp_estadisticaMeasDia_v2`(
    IN nodo VARCHAR(10),
    IN dfechaini VARCHAR(10),
    OUT outconsumo_energia VARCHAR(10),
    OUT outpromedio_potencia VARCHAR(10),
    OUT fechas DATETIME
)
BEGIN
    DECLARE dfecha DATE;
    SET dfecha = STR_TO_DATE(dfechaini, '%Y-%m-%d');

    -- Si es el día actual, eliminar el registro de cache para forzar recálculo
    IF dfecha = CURDATE() THEN
        DELETE FROM estadisticas_energia_dia
        WHERE nombrenodo = nodo
          AND fecha = dfecha;
    END IF;

    -- Consultar desde la tabla cache (mucho más rápido)
    SELECT
        CAST(consumo_energia AS CHAR) AS consumo_energia,
        CAST(promedio_potencia AS CHAR) AS promedio_potencia,
        ultima_medicion AS fecha
    INTO
        outconsumo_energia,
        outpromedio_potencia,
        fechas
    FROM estadisticas_energia_dia
    WHERE nombrenodo = nodo
      AND fecha = dfecha;

    -- Si no existe en cache, calcular y guardar
    IF outconsumo_energia IS NULL THEN
        CALL sp_recalcular_estadisticas_dia(nodo, dfecha);

        -- Volver a consultar después de calcular
        SELECT
            CAST(consumo_energia AS CHAR),
            CAST(promedio_potencia AS CHAR),
            ultima_medicion
        INTO
            outconsumo_energia,
            outpromedio_potencia,
            fechas
        FROM estadisticas_energia_dia
        WHERE nombrenodo = nodo
          AND fecha = dfecha;
    END IF;

END;
