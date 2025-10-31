CREATE DEFINER=`root`@`%` PROCEDURE `sp_estadisticaMeasDia`(
  IN nodo varchar(10),
	IN dfechaini varchar(10),
  OUT outconsumo_energia varchar(10),
  OUT outpromedio_potencia varchar(10),
  OUT fechas datetime
)
BEGIN

DECLARE dfecha date;
DECLARE promedioenergy int(10);
SET dfecha = (SELECT STR_TO_DATE(dfechaini, '%Y-%m-%d'));

SET  promedioenergy = (
	SELECT avg(energy)
	FROM medicionenergia
		where YEAR(fechameas) = YEAR(dfecha)
		and  MONTH(fechameas) = MONTH(dfecha)
		and  DAY(fechameas) = DAY(dfecha)
		and nombrenodo = nodo
);

SELECT (max(energy) - min(energy)) as consumo_energia  , ROUND(avg(power),2) as promedio_potencia, max(fechameas) as fecha INTO outconsumo_energia, outpromedio_potencia, fechas
FROM medicionenergia
	where YEAR(fechameas) = YEAR(dfecha)
	and  MONTH(fechameas) = MONTH(dfecha)
    and  DAY(fechameas) = DAY(dfecha)
    and nombrenodo = nodo
    and CAST(power AS DECIMAL(10,2)) < 6000.0
    and CAST(energy AS DECIMAL(10,2)) > 0.0
    and CAST(volts AS DECIMAL(10,2)) >= 200.0
    and CAST(volts AS DECIMAL(10,2)) <= 250.0
    and CAST(current AS DECIMAL(10,2)) >= 0.0
    and CAST(current AS DECIMAL(10,2)) <= 20.0;

    #and energy between  (promedioenergy - 20000) and (promedioenergy + 20000) ; #toma muestras que no se alejen de 50 kwatts del promedio

END
