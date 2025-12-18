DELIMITER $$

DROP PROCEDURE IF EXISTS sp_actualizarVenta$$

CREATE PROCEDURE sp_actualizarVenta(
    IN p_idcorrelativo BIGINT,
    IN p_fechaventa DATETIME,
    IN p_totalarticulos INT,
    IN p_subtotalventa INT,
    IN p_iva INT,
    IN p_totalimporte INT,
    IN p_tipopago VARCHAR(50),
    IN p_estadotransbank VARCHAR(100)
)
BEGIN
    -- Actualizar la venta
    UPDATE ventas
    SET 
        fechaventa = p_fechaventa,
        totalarticulos = p_totalarticulos,
        subtotalventa = p_subtotalventa,
        iva = p_iva,
        totalimporte = p_totalimporte,
        tipopago = p_tipopago,
        estadotransbank = p_estadotransbank
    WHERE idcorrelativo = p_idcorrelativo;
    
    -- Recalcular estadísticas del día (si existe el SP)
    -- Descomentar si quieres que recalcule automáticamente
    -- CALL sp_recalcular_estadisticas_dia(DATE(p_fechaventa));
    
END$$

DELIMITER ;
