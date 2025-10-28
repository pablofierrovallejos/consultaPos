-- SP para recalcular todo un mes (todos los días)
CREATE DEFINER=`root`@`%` PROCEDURE `sp_recalcular_mes_completo`(
    IN p_nodo VARCHAR(10),
    IN p_anio INT,
    IN p_mes INT
)
BEGIN
    DECLARE v_dia INT DEFAULT 1;
    DECLARE v_ultimo_dia INT;
    DECLARE v_fecha_actual DATE;
    DECLARE v_hoy DATE;

    SET v_hoy = CURDATE();

    -- Obtener el último día del mes
    SET v_ultimo_dia = DAY(LAST_DAY(CONCAT(p_anio, '-', LPAD(p_mes, 2, '0'), '-01')));

    -- Loop por cada día del mes (solo hasta hoy)
    WHILE v_dia <= v_ultimo_dia DO
        SET v_fecha_actual = CONCAT(p_anio, '-', LPAD(p_mes, 2, '0'), '-', LPAD(v_dia, 2, '0'));

        -- Solo procesar si la fecha no es futura
        IF v_fecha_actual <= v_hoy THEN
            -- Llamar al SP que recalcula un día
            CALL sp_recalcular_estadisticas_dia(p_nodo, v_fecha_actual);
        END IF;

        SET v_dia = v_dia + 1;
    END WHILE;

END;
