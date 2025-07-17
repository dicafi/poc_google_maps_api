# Calculadora de Millas por Estado - Google Maps

Una aplicación Ruby on Rails 8 que utiliza la API de Google Maps para calcular las millas recorridas totales y por estado en rutas dentro de Estados Unidos.

## Funcionalidades

- 🗺️ **Cálculo de rutas**: Obtiene rutas entre dos ubicaciones usando Google Maps Directions API
- 📊 **Análisis por estado**: Calcula las millas recorridas en cada estado de USA
- 🎨 **Visualización del mapa**: Muestra la ruta en un mapa interactivo con diferentes colores por estado
- 📱 **Interfaz responsiva**: Funciona en desktop y móvil con Tailwind CSS
- 💾 **Historial de viajes**: Guarda los cálculos en la base de datos

## Configuración

### 1. Obtener API Key de Google Maps

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita las siguientes APIs:
   - Maps JavaScript API
   - Directions API
   - Geocoding API
4. Crea credenciales (API Key)
5. Configura las restricciones de la API Key según sea necesario

### 2. Configurar Variables de Entorno

Copia el archivo `.env.example` a `.env` y agrega tu API Key:

```bash
cp .env.example .env
```

Edita `.env` y agrega tu API Key:
```
GOOGLE_MAPS_API_KEY=tu_api_key_aqui
```

### 3. Instalar Dependencias

```bash
bundle install
```

### 4. Configurar Base de Datos

```bash
bin/rails db:create
bin/rails db:migrate
```

### 5. Ejecutar la Aplicación

```bash
bin/rails server
```

Visita `http://localhost:3000` en tu navegador.

## Uso

1. **Ingresar ubicaciones**: Escribe la ubicación de origen y destino en el formulario
2. **Calcular ruta**: Haz clic en "Calcular Ruta"
3. **Ver resultados**: La aplicación mostrará:
   - Mapa interactivo con la ruta
   - Distancia total en millas
   - Tabla con millas por estado
   - Porcentaje de la ruta en cada estado

## Tecnologías Utilizadas

- **Ruby on Rails 8**: Framework principal
- **Google Maps APIs**: Directions, Geocoding, y Maps JavaScript API
- **Tailwind CSS**: Estilos y diseño responsivo
- **PostgreSQL**: Base de datos
- **HTTParty**: Cliente HTTP para APIs
- **Turbo/Stimulus**: Funcionalidad JavaScript moderna

## Estructura del Proyecto

```
app/
├── controllers/
│   └── trips_controller.rb      # Maneja las rutas y cálculos
├── models/
│   └── trip.rb                  # Modelo para guardar viajes
├── services/
│   └── google_maps_service.rb   # Integración con Google Maps API
├── views/
│   └── trips/
│       └── index.html.erb       # Vista principal con formulario y mapa
└── javascript/
    └── trips.js                 # JavaScript para el mapa y UI
```

## Limitaciones y Consideraciones

1. **Precisión de estados**: La detección de estados se basa en geocodificación reversa de puntos específicos en la ruta
2. **Límites de API**: Google Maps tiene límites en las llamadas a la API
3. **Costos**: El uso intensivo puede generar costos en Google Cloud
4. **Solo USA**: Actualmente configurado para rutas dentro de Estados Unidos

## Mejoras Futuras

- [ ] Implementar cache para rutas calculadas
- [ ] Agregar soporte para más países
- [ ] Mejorar la precisión del cálculo de fronteras estatales
- [ ] Agregar autenticación de usuarios
- [ ] Exportar resultados a PDF/Excel
- [ ] Agregar más opciones de visualización del mapa

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.
