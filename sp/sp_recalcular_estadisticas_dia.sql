CREATE DEFINER=`root`@`%` PROCEDURE `sp_recalcular_estadisticas_dia`(
    IN p_nodo VARCHAR(10),
    IN p_fecha DATE
)
recalculo_proc: BEGIN
    -- Recalcula las estadísticas de un día específico y las almacena en la tabla cache
    -- Solo procesa fechas hasta hoy (no calcula fechas futuras)
    -- Si es fecha pasada y ya existe registro, no recalcula (salvo que sea hoy)

    DECLARE v_consumo_energia DECIMAL(10,2);
    DECLARE v_promedio_potencia DECIMAL(10,2);
    DECLARE v_ultima_medicion DATETIME;
    DECLARE v_promedioenergy INT(10);
    DECLARE v_registro_existe INT DEFAULT 0;

    -- Validar que la fecha no sea futura
    IF p_fecha > CURDATE() THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No se pueden calcular estadísticas de fechas futuras';
    END IF;

    -- Si la fecha es anterior a hoy (no es hoy), verificar si ya existe el registro
    -- Para el día actual (hoy), siempre recalcular aunque exista registro
    IF p_fecha < CURDATE() THEN
        SELECT COUNT(*) INTO v_registro_existe
        FROM estadisticas_energia_dia
        WHERE nombrenodo = p_nodo
          AND fecha = p_fecha;

        -- Si ya existe registro y no es hoy, no recalcular
        IF v_registro_existe > 0 THEN
            -- Salir sin hacer nada
            LEAVE recalculo_proc;
        END IF;
    END IF;
    -- Si p_fecha = CURDATE() (es hoy), continuar con el recálculo sin verificar si existe
    
    -- Si es el día actual, eliminar el registro existente para forzar recálculo
    IF p_fecha = CURDATE() THEN
        DELETE FROM estadisticas_energia_dia
        WHERE nombrenodo = p_nodo
          AND fecha = p_fecha;
    END IF;

    -- Calcular promedio de energía del día (para futuro uso si lo necesitas)
    SET v_promedioenergy = (
        SELECT AVG(energy)
        FROM medicionenergia
        WHERE DATE(fechameas) = p_fecha
          AND nombrenodo = p_nodo
    );

    -- Calcular estadísticas del día
    SELECT
        (MAX(energy) - MIN(energy)) AS consumo_energia,
        ROUND(AVG(power), 2) AS promedio_potencia,
        MAX(fechameas) AS ultima_medicion
    INTO
        v_consumo_energia,
        v_promedio_potencia,
        v_ultima_medicion
    FROM medicionenergia
    WHERE DATE(fechameas) = p_fecha
      AND nombrenodo = p_nodo
      AND CAST(power AS DECIMAL(10,2)) < 6000.0
      AND CAST(energy AS DECIMAL(10,2)) > 0.0
      AND CAST(volts AS DECIMAL(10,2)) >= 200.0
      AND CAST(volts AS DECIMAL(10,2)) <= 250.0
      AND CAST(current AS DECIMAL(10,2)) >= 0.0
      AND CAST(current AS DECIMAL(10,2)) <= 20.0;

    -- Insertar o actualizar en la tabla cache
    INSERT INTO estadisticas_energia_dia
        (nombrenodo, fecha, consumo_energia, promedio_potencia, ultima_medicion, fecha_calculo)
    VALUES
        (p_nodo, p_fecha, v_consumo_energia, v_promedio_potencia, v_ultima_medicion, NOW())
    ON DUPLICATE KEY UPDATE
        consumo_energia = v_consumo_energia,
        promedio_potencia = v_promedio_potencia,
        ultima_medicion = v_ultima_medicion,
        fecha_calculo = NOW();

END;
