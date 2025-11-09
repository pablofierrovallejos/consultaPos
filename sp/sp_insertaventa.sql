CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_insertarVenta`(
 IN `idventa` bigint unsigned,
 IN `fechaventa_in` timestamp,
 IN `secuencia_in` varchar(45),
 IN `nroboleta_in` varchar(45),
 IN `totalarticulos_in` int,
 IN `subtotalventa_in` int,
 IN `iva_in` int,
 IN `totalimporte_in` int,
 IN `tipopago_in` varchar(10),
 IN `comisiontbk_in` int,
 IN `comunicacionpos_in` varchar(45),
 IN `estadotransbank_in` varchar(45),
 IN `trazastattransbk_in` varchar(45), 
 IN `longmsgtransbank_in` varchar(45)
 )
BEGIN

INSERT INTO `db_springboot_cloud`.`ventas`(
  `idventa`,
  `fechaventa`,
  `secuencia`,
  `nroboleta`,
  `totalarticulos`,
  `subtotalventa`,
  `iva` ,
  `totalimporte` ,
  `tipopago`,
  `comisiontbk`,
  `comunicacionpos`,
  `estadotransbank`,
  `trazastattransbk`, 
  `longmsgtransbank`)
VALUES (
  idventa,
  NOW(), 
  secuencia_in,
  nroboleta_in,
  totalarticulos_in,
  subtotalventa_in,
  iva_in,
  totalimporte_in,
  tipopago_in,
  comisiontbk_in,
  comunicacionpos_in,
  estadotransbank_in,
  trazastattransbk_in,
  longmsgtransbank_in
);
commit;
END