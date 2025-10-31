-- Tabla para almacenar las boletas emitidas
CREATE TABLE IF NOT EXISTS boletas_emitidas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idventa INT NOT NULL,
    numero_folio VARCHAR(50),
    boleta_url VARCHAR(500),
    fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
    monto DECIMAL(10,2),
    estado VARCHAR(20) DEFAULT 'emitido',
    INDEX idx_idventa (idventa),
    FOREIGN KEY (idventa) REFERENCES venta(idcorrelativo) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Ver registros
SELECT * FROM boletas_emitidas;
