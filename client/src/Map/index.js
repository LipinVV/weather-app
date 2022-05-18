import {MapContainer, TileLayer, useMapEvents} from "react-leaflet";
import * as L from 'leaflet';
import 'leaflet.markercluster';
import {useEffect, useState} from "react";
import cities from "../data/cities.json";
import './map.scss';

export const Map = () => {
    const center = {
        lat: 60,
        lng: 70,
    };

    const minimumZoom = 3;
    const initialZoom = 4;
    const zoomWhenCitiesAppearing = 5;
    const southWest = L.latLng(-89.98155760646617, -190);
    const northEast = L.latLng(89.99346179538875, 190);
    const bounds = L.latLngBounds(southWest, northEast);
    const [currentZoom, setCurrentZoom] = useState(initialZoom);

    const markers = L.markerClusterGroup();

    const [loadedMarkers, setLoaderMarkers] = useState([]);
    const millionairePopulation = 1000000;
    const bigCities = cities.filter(city => city.population > millionairePopulation);
    const bigCitiesLength = bigCities.length;

    const LocationMarker = () => {
        const map = useMapEvents({
            async click (event) {
                const response = fetch(
                    `https://weather-app-leaflet.herokuapp.com/forecast?lat=` +
                    `${event.latlng.lat}` +
                    `&lon=` +
                    `${event.latlng.lng}` +
                    `&lang=ru_RU`
                );
                await response.then(data => data.json()).then(response => {
                    const marker = L.marker([event.latlng.lat, event.latlng.lng]);
                    markers.addLayer(marker);
                    markers.addTo(map);
                    const popUpContent = `${'<div class="weather__pop-up-target">'}
                               <div class="weather__pop-up-target-info">Condition: ${response.fact.condition.replace('-', ' ')}</div>
                               <div class="weather__pop-up-target-info">Pressure: ${response.fact.pressure_mm} mm</div>
                               <div class="weather__pop-up-target-info">Temp: ${response.fact.temp > 0 && '+'}${response.fact.temp} &degC</div>
                               <div class="weather__pop-up-target-info">Feels like: ${response.fact.temp > 0 && '+'}${response.fact.feels_like} &degC</div>
                               <div class="weather__pop-up-target-info">Humidity: ${response.fact.humidity}%</div>
                               <div class="weather__pop-up-target-info">Wind: ${response.fact.wind_speed} m/s</div>
                       </div>`;
                    marker.bindPopup(popUpContent, {autoClose: false}).openPopup();
                    marker.on('contextmenu', () => {
                        markers.removeLayer(marker);
                    });
                });
            },
            zoomend: (event) => {
                map.panInsideBounds(bounds, {animate: false});
                setCurrentZoom(event.target._zoom);
            },
            zoomstart: async (event) => {
                if (event.target._zoom === zoomWhenCitiesAppearing) {
                    const markerGroup = L.featureGroup();
                    setLoaderMarkers([]);
                    const citiesToAdd = await bigCities.map(city => {
                        const coordinates = city.coords;
                        const response = fetch(
                            `https://weather-app-leaflet.herokuapp.com/forecast?lat=` +
                            `${coordinates.lat}` +
                            `&lon=` +
                            `${coordinates.lon}` +
                            `&lang=ru_RU`
                        );
                        response.then(data => data.json()).then(response => {
                            const marker = L.marker([coordinates.lat, coordinates.lon]);
                            markers.addLayer(marker);
                            const popUpContent = `${'<div class="weather-pop-up">'}
                                    <div class="weather-pop-up__info">
                                         <img alt=${response.fact.condition} src="https://yastatic.net/weather/i/icons/funky/dark/${response.fact.icon}.svg">${response.fact.condition.toUpperCase()}
                                    </div>
                                   <div class="weather-pop-up__info">Temp: ${response.fact.temp > 0 && '+'}${response.fact.temp} &degC</div>
                                   <div class="weather-pop-up__info">Humidity: ${response.fact.humidity}%</div>
                                   <div class="weather-pop-up__info">Wind: ${response.fact.wind_speed} m/s</div>
                               </div>`;
                            marker.bindPopup(popUpContent, {autoClose: false, closeOnClick: false, autoPan: false});
                            setLoaderMarkers(prevState => {
                                return [...prevState, marker];
                            });
                            return response;
                        });
                        markerGroup.addLayer(markers);
                        return city;
                    });
                    markerGroup.addTo(map);
                    return citiesToAdd;
                }
            }
        });
    };


    useEffect(() => {
        if (loadedMarkers.length === bigCitiesLength || currentZoom < zoomWhenCitiesAppearing) {
            loadedMarkers.map(x => !x.isPopupOpen() ? x.openPopup() : x.closePopup());
        }
    }, [bigCitiesLength, currentZoom, loadedMarkers]);

    return (
        <MapContainer center={center} zoom={initialZoom} scrollWheelZoom={true} minZoom={minimumZoom} maxBounds={bounds}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker/>
        </MapContainer>
    )
}