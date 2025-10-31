-- Crear tabla de configuraciones
CREATE TABLE IF NOT EXISTS configuraciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(100) NOT NULL UNIQUE,
    valor VARCHAR(255) NOT NULL,
    descripcion VARCHAR(500),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insertar valor inicial del kilowatt
INSERT INTO configuraciones (clave, valor, descripcion) 
VALUES ('valorkilowatt', '180', 'Valor en pesos chilenos del kilowatt/hora para calcular el costo de energía')
ON DUPLICATE KEY UPDATE valor = '180';

-- Consultar la configuración
SELECT * FROM configuraciones WHERE clave = 'valorkilowatt';
