// Configuración CORS para Spring Boot
// Agregar esta clase en tu proyecto servicio-productos

package com.tuempresa.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        
        // Permitir localhost:4200 (desarrollo) y tu dominio de producción
        config.setAllowedOrigins(Arrays.asList(
            "http://localhost:4200",
            "http://35.209.63.29:8080",
            "http://35.209.63.29"
        ));
        
        // Permitir todos los métodos HTTP
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        
        // Permitir todos los headers
        config.setAllowedHeaders(Arrays.asList("*"));
        
        // Permitir credenciales
        config.setAllowCredentials(true);
        
        // Aplicar configuración a todas las rutas
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        
        return new CorsFilter(source);
    }
}
