import { useEffect, useMemo, useRef, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Circle,
    useMap,
    useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import API from "../api";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

const METERS_TO_FEET = 3.28084;
const FEET_PER_MILE = 5280;
const MOBILE_BREAKPOINT = 900;
const DEFAULT_START_LOCATION = [47.589259, -122.38043];

const DefaultIcon = L.icon({
    iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).href,
    shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).href,
    iconAnchor: [12, 41],
});

const UserIcon = L.divIcon({
    className: "user-location-icon",
    html: `<div class="user-location-dot"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
});

L.Marker.prototype.options.icon = DefaultIcon;

function FitBounds({ stops, selectedStop }) {
    const map = useMap();
    const hasFitRef = useRef(false);

    useEffect(() => {
        if (!stops.length) return;
        if (selectedStop) return;
        if (hasFitRef.current) return;

        const bounds = L.latLngBounds(stops.map((stop) => stop.position));
        map.fitBounds(bounds, { padding: [40, 40] });
        hasFitRef.current = true;
    }, [map, stops, selectedStop]);

    return null;
}

function MapController({
    selectedStop,
    selectedStopIndex,
    userLocation,
    followUser,
    isNavigating,
}) {
    const map = useMap();
    const lastSelectedStopIndexRef = useRef(null);

    useEffect(() => {
        if (isNavigating && userLocation) {
            map.panTo(userLocation, { animate: true });
            return;
        }

        if (selectedStop) {
            map.setView(selectedStop.position, 15, { animate: true });
            return;
        }

        if (followUser && userLocation) {
            map.setView(userLocation, 16, { animate: true });
        }
    }, [map, selectedStop, userLocation, followUser, isNavigating]);

    return null;
}

function MapTapHandler({ setIsPanelOpen }) {
    useMapEvents({
        click() {
            setIsPanelOpen(false);
        },
    });

    return null;
}

function RoutingMachine({ userLocation, selectedStop, showRoute }) {
    const map = useMap();
    const routingControlRef = useRef(null);

    useEffect(() => {
        if (!map) return;

        if (routingControlRef.current) {
            map.removeControl(routingControlRef.current);
            routingControlRef.current = null;
        }

        if (!showRoute || !userLocation || !selectedStop) return;

        routingControlRef.current = L.Routing.control({
            waypoints: [
                L.latLng(userLocation[0], userLocation[1]),
                L.latLng(selectedStop.position[0], selectedStop.position[1]),
            ],
            routeWhileDragging: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            showAlternatives: false,
            lineOptions: {
                styles: [{ color: "#1E73BE", weight: 5, opacity: 0.85 }],
            },
            createMarker: () => null,
        }).addTo(map);

        return () => {
            if (routingControlRef.current) {
                map.removeControl(routingControlRef.current);
                routingControlRef.current = null;
            }
        };
    }, [map, userLocation, selectedStop, showRoute]);

    return null;
}

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371000;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function findNearestStop(userLocation, stops) {
    if (!userLocation || !stops.length) return null;

    let nearest = null;

    for (const stop of stops) {
        const distance = getDistanceInMeters(
            userLocation[0],
            userLocation[1],
            stop.position[0],
            stop.position[1]
        );

        if (!nearest || distance < nearest.distance) {
            nearest = { ...stop, distance };
        }
    }

    return nearest;
}

function speakText(text) {
    if (!("speechSynthesis" in window)) return false;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
    return true;
}

function triggerArrivalFeedback() {
    if ("vibrate" in navigator) {
        navigator.vibrate([120, 60, 120]);
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;

    try {
        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);

        gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.08,
            audioContext.currentTime + 0.02
        );
        gainNode.gain.exponentialRampToValueAtTime(
            0.0001,
            audioContext.currentTime + 0.35
        );

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.35);

        oscillator.onended = () => {
            audioContext.close();
        };

        return true;
    } catch {
        return false;
    }
}

function parseClosingDate(closeTimeString) {
    const [hours, minutes] = closeTimeString.split(":").map(Number);
    const now = new Date();
    const closing = new Date();
    closing.setHours(hours, minutes, 0, 0);

    if (closing < now) {
        closing.setDate(closing.getDate() + 1);
    }

    return closing;
}

export default function RiderApp() {
    const [started, setStarted] = useState(false);
    const [stops, setStops] = useState([]);
    const [settings, setSettings] = useState(null);

    const [selectedStopIndex, setSelectedStopIndex] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [locationAccuracy, setLocationAccuracy] = useState(null);
    const [locationError, setLocationError] = useState("");
    const [followUser, setFollowUser] = useState(false);
    const [unlockedStops, setUnlockedStops] = useState({});
    const [arrivalStopName, setArrivalStopName] = useState("");
    const [audioNotice, setAudioNotice] = useState("");
    const [expandedStoryStopName, setExpandedStoryStopName] = useState("");
    const [expandedImagesStopName, setExpandedImagesStopName] = useState("");
    const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [returnReminder, setReturnReminder] = useState("");

    const [showRoute, setShowRoute] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [navigatingStopIndex, setNavigatingStopIndex] = useState(null);

    const introAudioRef = useRef(null);
    const [introPlayed, setIntroPlayed] = useState(false);
    const [showIntroModal, setShowIntroModal] = useState(false);
    const [introStarting, setIntroStarting] = useState(false);

    const markerRefs = useRef([]);
    const watchIdRef = useRef(null);

    const playIntroAudio = async () => {
        if (!introAudioRef.current || introPlayed) return;

        try {
            introAudioRef.current.currentTime = 0;
            await introAudioRef.current.play();
            setIntroPlayed(true);
        } catch (err) {
            console.log("Intro audio blocked or failed:", err);
        }
    };

    const selectedStop =
        selectedStopIndex !== null ? stops[selectedStopIndex] : null;

    const nearestStop = useMemo(
        () => findNearestStop(userLocation, stops),
        [userLocation, stops]
    );

    const sortReferenceLocation = userLocation || DEFAULT_START_LOCATION;

    const sortedStops = useMemo(() => {
        if (!stops.length) return [];

        const withMeta = stops.map((stop, originalIndex) => {
            const distanceMeters = getDistanceInMeters(
                sortReferenceLocation[0],
                sortReferenceLocation[1],
                stop.position[0],
                stop.position[1]
            );

            const visited = Boolean(unlockedStops[stop.name]);

            return {
                ...stop,
                originalIndex,
                distanceMeters,
                distanceFeet: Math.round(distanceMeters * METERS_TO_FEET),
                visited,
            };
        });

        const unvisited = withMeta
            .filter((stop) => !stop.visited)
            .sort((a, b) => a.distanceMeters - b.distanceMeters);

        const visited = withMeta
            .filter((stop) => stop.visited)
            .sort((a, b) => a.distanceMeters - b.distanceMeters);

        return [...unvisited, ...visited];
    }, [stops, sortReferenceLocation, unlockedStops]);

    const effectiveUnlockRadiusFeet = settings?.unlockRadiusFeet || 20;
    const effectiveUnlockRadiusMeters = Math.max(
        effectiveUnlockRadiusFeet / METERS_TO_FEET,
        locationAccuracy || 0
    );

    const effectiveUnlockRadiusFeetDisplay = Math.round(
        effectiveUnlockRadiusMeters * METERS_TO_FEET
    );

    const nearbyStop =
        nearestStop && nearestStop.distance <= effectiveUnlockRadiusMeters
            ? nearestStop
            : null;

    const selectedStopUnlocked = selectedStop
        ? Boolean(unlockedStops[selectedStop.name])
        : false;

    const showSelectedStory = selectedStop
        ? expandedStoryStopName === selectedStop.name
        : false;

    const showSelectedImages = selectedStop
        ? expandedImagesStopName === selectedStop.name
        : false;

    useEffect(() => {
        async function loadPublicData() {
            const [stopsRes, settingsRes] = await Promise.all([
                API.get("/api/public/stops"),
                API.get("/api/public/settings"),
            ]);
            setStops(stopsRes.data);
            setSettings(settingsRes.data);
        }

        loadPublicData();
    }, []);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
            setIsMobile(mobile);

            if (!mobile) {
                setIsPanelOpen(true);
            }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (!started) return;

        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported on this device.");
            return;
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                setUserLocation([position.coords.latitude, position.coords.longitude]);
                setLocationAccuracy(position.coords.accuracy ?? null);
                setLocationError("");
            },
            () => {
                setLocationError(
                    "Location access was denied or unavailable. You can still use the map manually."
                );
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 10000,
            }
        );

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
            if ("speechSynthesis" in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, [started]);

    useEffect(() => {
        if (!userLocation || !stops.length) return;

        stops.forEach((stop, index) => {
            const distance = getDistanceInMeters(
                userLocation[0],
                userLocation[1],
                stop.position[0],
                stop.position[1]
            );

            const isUnlocked = Boolean(unlockedStops[stop.name]);

            if (distance <= effectiveUnlockRadiusMeters && !isUnlocked) {
                setUnlockedStops((prev) => ({
                    ...prev,
                    [stop.name]: true,
                }));

                setArrivalStopName(stop.name);
                setSelectedStopIndex(index);
                setExpandedStoryStopName(stop.name);
                setExpandedImagesStopName("");
                setFollowUser(false);

                const marker = markerRefs.current[index];
                if (marker) {
                    marker.openPopup();
                }

                if (isNavigating && navigatingStopIndex === index) {
                    setShowRoute(false);
                    setIsNavigating(false);
                    setNavigatingStopIndex(null);
                }

                triggerArrivalFeedback();

                const intro = `You've arrived at ${stop.name}. ${stop.extendedDescription}`;
                const spoke = speakText(intro);

                setAudioNotice(
                    spoke
                        ? "Arrival feedback played and voiceover started for this stop."
                        : "Arrival feedback played. Audio is not supported on this device."
                );
            }
        });
    }, [
        userLocation,
        stops,
        unlockedStops,
        effectiveUnlockRadiusMeters,
        isNavigating,
        navigatingStopIndex,
    ]);

    useEffect(() => {
        if (!userLocation || !settings) return;

        const closingDate = parseClosingDate(settings.closingTime);
        const now = new Date();

        const minutesUntilClosing =
            (closingDate.getTime() - now.getTime()) / 1000 / 60;

        const returnDistanceMeters = getDistanceInMeters(
            userLocation[0],
            userLocation[1],
            settings.returnLocation[0],
            settings.returnLocation[1]
        );

        const returnDistanceMiles =
            (returnDistanceMeters * METERS_TO_FEET) / FEET_PER_MILE;

        const estimatedMinutesBack =
            (returnDistanceMiles / settings.averageBikeSpeedMph) * 60;

        if (
            minutesUntilClosing <= settings.reminderLeadMinutes ||
            estimatedMinutesBack >= minutesUntilClosing - 5
        ) {
            setReturnReminder(
                `Reminder: bikes should be returned by ${settings.closingTime}. You are about ${returnDistanceMiles.toFixed(
                    1
                )} miles from the return location.`
            );
        } else {
            setReturnReminder("");
        }
    }, [userLocation, settings]);

    const startNavigationToStop = (index) => {
        setSelectedStopIndex(index);
        setNavigatingStopIndex(index);
        setShowRoute(true);
        setIsNavigating(true);

        // 🔥 keeps panel open (better UX)
    };

    const stopNavigation = () => {
        setShowRoute(false);
        setIsNavigating(false);
        setNavigatingStopIndex(null);
    };

    const handleStopClick = (index) => {
        const stop = stops[index];

        setSelectedStopIndex(index);
        setFollowUser(false);
        setArrivalStopName("");
        setAudioNotice("");
        setExpandedStoryStopName("");
        setExpandedImagesStopName("");

        if (unlockedStops[stop.name]) {
            setExpandedStoryStopName(stop.name);
        }

        const marker = markerRefs.current[index];
        if (marker) {
            marker.openPopup();
        }
    };

    const handleMarkerClick = (index) => {
        const stop = stops[index];

        setSelectedStopIndex(index);
        setFollowUser(false);
        setArrivalStopName("");
        setAudioNotice("");

        if (unlockedStops[stop.name]) {
            setExpandedStoryStopName(stop.name);
        } else {
            setExpandedStoryStopName("");
        }

        setExpandedImagesStopName("");
        setIsPanelOpen(true);
    };

    const handlePlayAudio = (stop) => {
        const spoke = speakText(stop.extendedDescription);
        setAudioNotice(
            spoke
                ? `Playing voiceover for ${stop.name}.`
                : "Audio is not supported on this device."
        );
    };

    const handleResetTour = () => {
        setUnlockedStops({});
        setArrivalStopName("");
        setAudioNotice("");
        setExpandedStoryStopName("");
        setExpandedImagesStopName("");
        stopNavigation();
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
    };

    if (!settings) {
        return <div className="center-screen">Loading tour...</div>;
    }

    if (!started) {
        return (
            <div className="start-screen">
                <h1 className="start-title">{settings.companyName}</h1>
                <p className="start-description">
                    Explore Alki Beach at your own pace. Discover history, landmarks, and
                    scenic viewpoints along the way.
                </p>
                <p className="start-time">
                    <strong>Recommended ride time: 60–90 minutes</strong>
                </p>

                <button
                    onClick={() => setShowIntroModal(true)}
                    className="start-button"
                >
                    Start Tour
                </button>

                {showIntroModal && (
                    <div className="intro-modal-overlay">
                        <div className="intro-modal">
                            <h2 className="intro-modal-title">Welcome to the Tour</h2>
                            <p className="intro-modal-text">
                                You’re about to hear a short welcome message before the tour begins.
                            </p>
                            <p className="intro-modal-subtext">
                                Make sure your volume is on.
                            </p>

                            <div className="intro-modal-actions">
                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => {
                                        setShowIntroModal(false);
                                        setStarted(true);
                                    }}
                                >
                                    Skip Intro
                                </button>

                                <button
                                    type="button"
                                    className="start-button"
                                    onClick={async () => {
                                        setIntroStarting(true);
                                        await playIntroAudio();

                                        if (introAudioRef.current) {
                                            introAudioRef.current.onended = () => {
                                                setShowIntroModal(false);
                                                setStarted(true);
                                                setIntroStarting(false);
                                            };
                                        }
                                    }}
                                >
                                    {introStarting ? "Starting..." : "Play Intro & Begin"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <audio ref={introAudioRef} preload="auto">
                    <source src="/audio/owner-intro.m4a" type="audio/mp4" />
                </audio>
            </div>
        );
    }

    return (
        <div className="tour-layout">
            {isNavigating && selectedStop && (
                <div className="navigation-card">
                    <div>
                        <div className="navigation-label">Navigating to</div>
                        <div className="navigation-title">{selectedStop.name}</div>
                    </div>

                    <button
                        type="button"
                        className="navigation-stop-button"
                        onClick={stopNavigation}
                    >
                        End
                    </button>
                </div>
            )}

            <button
                type="button"
                className={`panel-toggle-button ${isPanelOpen ? "panel-toggle-open" : "panel-toggle-closed"
                    }`}
                onClick={() => setIsPanelOpen((prev) => !prev)}
            >
                {isPanelOpen ? "Hide Stops" : "Show Stops"}
            </button>

            {isPanelOpen && (
                <div className="panel-backdrop" onClick={() => setIsPanelOpen(false)} />
            )}

            <aside
                className={`stop-panel ${isMobile ? "stop-panel-mobile" : ""} ${isPanelOpen ? "stop-panel-open" : "stop-panel-closed"
                    }`}
            >
                <div className="stop-panel-header">
                    <h2 className="stop-panel-title">Tour Stops</h2>
                </div>

                <div className="gps-panel">
                    <div className="gps-panel-row">
                        <button
                            className="gps-button"
                            onClick={() => {
                                setSelectedStopIndex(null);
                                setFollowUser(true);
                            }}
                            disabled={!userLocation}
                            type="button"
                        >
                            Center on Me
                        </button>
                    </div>

                    {userLocation && <p className="gps-status">Your location is active.</p>}

                    {locationAccuracy !== null && (
                        <p className="gps-status">
                            GPS accuracy: about {Math.round(locationAccuracy * METERS_TO_FEET)} feet.
                        </p>
                    )}

                    {!userLocation && !locationError && (
                        <p className="gps-status">Waiting for your location...</p>
                    )}

                    {locationError && <p className="gps-error">{locationError}</p>}

                    {returnReminder && <p className="warning-text">{returnReminder}</p>}

                    {nearbyStop && (
                        <div className="nearby-alert">
                            <div className="nearby-alert-title">
                                You’re near {nearbyStop.name}
                            </div>
                            <div className="nearby-alert-text">
                                About {Math.round(nearbyStop.distance * METERS_TO_FEET)} feet away.
                            </div>
                        </div>
                    )}
                </div>

                {arrivalStopName && (
                    <div className="arrival-panel">
                        <div className="arrival-title">You’ve arrived</div>
                        <div className="arrival-name">{arrivalStopName}</div>
                        {audioNotice && (
                            <div className="arrival-audio-note">{audioNotice}</div>
                        )}
                    </div>
                )}

                {selectedStop && (
                    <div className="selected-stop-panel">
                        <div className="selected-stop-label">Selected Stop</div>
                        <div className="selected-stop-name">{selectedStop.name}</div>
                        <div className="selected-stop-description">
                            {selectedStop.description}
                        </div>

                        {selectedStopUnlocked ? (
                            <>
                                <div className="selected-stop-actions">
                                    <button
                                        className="audio-button"
                                        onClick={() => handlePlayAudio(selectedStop)}
                                        type="button"
                                    >
                                        Play Audio
                                    </button>

                                    <button
                                        className="audio-button"
                                        onClick={() =>
                                            setExpandedStoryStopName((prev) =>
                                                prev === selectedStop.name ? "" : selectedStop.name
                                            )
                                        }
                                        type="button"
                                    >
                                        {showSelectedStory ? "Hide Full Story" : "View Full Story"}
                                    </button>

                                    {selectedStop.imageUrls?.length > 0 && (
                                        <button
                                            className="audio-button"
                                            onClick={() =>
                                                setExpandedImagesStopName((prev) =>
                                                    prev === selectedStop.name ? "" : selectedStop.name
                                                )
                                            }
                                            type="button"
                                        >
                                            {showSelectedImages ? "Hide Images" : "View Images"}
                                        </button>
                                    )}
                                </div>

                                {showSelectedStory && (
                                    <div className="extended-stop-content">
                                        {selectedStop.extendedDescription}
                                    </div>
                                )}

                                {showSelectedImages && selectedStop.imageUrls?.length > 0 && (
                                    <div className="stop-image-grid">
                                        {selectedStop.imageUrls.map((imageUrl, index) => (
                                            <img
                                                key={index}
                                                src={imageUrl}
                                                alt={`${selectedStop.name} view ${index + 1}`}
                                                className="stop-image"
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="locked-stop-message">
                                    Get within {effectiveUnlockRadiusFeetDisplay} feet of this stop to unlock.
                                </div>

                                <div className="selected-stop-actions">
                                    <button
                                        type="button"
                                        className="navigate-button"
                                        onClick={() => startNavigationToStop(selectedStopIndex)}
                                    >
                                        Start Route
                                    </button>
                                </div>
                            </>
                        )}

                    </div>
                )}

                <div className="panel-actions">
                    <button className="reset-button" onClick={handleResetTour} type="button">
                        Reset Unlocks
                    </button>
                </div>

                <div className="stop-list">
                    {sortedStops.map((stop) => {
                        const index = stop.originalIndex;
                        const isUnlocked = Boolean(unlockedStops[stop.name]);
                        const isSelected = selectedStopIndex === index;

                        return (
                            <button
                                key={stop.id || index}
                                type="button"
                                className={`stop-card ${isSelected ? "stop-card-active" : ""}`}
                                onClick={() => handleStopClick(index)}
                            >
                                <div className="stop-card-top">
                                    <div className="stop-card-name">{stop.name}</div>
                                    <div
                                        className={`stop-badge ${isUnlocked ? "stop-badge-unlocked" : "stop-badge-locked"
                                            }`}
                                    >
                                        {isUnlocked ? "Unlocked" : "Locked"}
                                    </div>
                                </div>

                                <div className="stop-card-description">{stop.description}</div>

                                <div className="stop-card-distance">
                                    {stop.distanceFeet} ft away
                                </div>
                            </button>
                        );
                    })}
                </div>
            </aside>

            <div className="map-section">
                <MapContainer
                    center={[47.58, -122.4]}
                    zoom={13}
                    className="map-container"
                >
                    <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <FitBounds stops={stops} selectedStop={selectedStop} />
                    <MapController
                        selectedStop={selectedStop}
                        selectedStopIndex={selectedStopIndex}
                        userLocation={userLocation}
                        followUser={followUser}
                        isNavigating={isNavigating}
                    />
                    <RoutingMachine
                        userLocation={userLocation}
                        selectedStop={selectedStop}
                        showRoute={showRoute}
                    />
                    <MapTapHandler setIsPanelOpen={setIsPanelOpen} />

                    {stops.map((stop, index) => {
                        const isUnlocked = Boolean(unlockedStops[stop.name]);
                        const isSelected = selectedStop?.name === stop.name;
                        const showPopupStory =
                            isUnlocked &&
                            isSelected &&
                            expandedStoryStopName === stop.name;
                        const showPopupImages =
                            isUnlocked &&
                            isSelected &&
                            expandedImagesStopName === stop.name;

                        return (
                            <Marker
                                key={stop.id || index}
                                position={stop.position}
                                ref={(ref) => {
                                    markerRefs.current[index] = ref;
                                }}
                                eventHandlers={{
                                    click: () => handleMarkerClick(index),
                                }}
                            >
                                <Popup autoPan={false}>
                                    <div className="popup-content">
                                        <h3 className="popup-title">{stop.name}</h3>
                                        <p className="popup-text">{stop.description}</p>

                                        {isUnlocked ? (
                                            <>
                                                <div className="popup-action-group">
                                                    <button
                                                        className="popup-action-button"
                                                        onClick={() => handlePlayAudio(stop)}
                                                        type="button"
                                                    >
                                                        Play Audio
                                                    </button>

                                                    <button
                                                        className="popup-action-button"
                                                        onClick={() => {
                                                            handleMarkerClick(index);
                                                            setExpandedStoryStopName((prev) =>
                                                                prev === stop.name ? "" : stop.name
                                                            );
                                                        }}
                                                        type="button"
                                                    >
                                                        {showPopupStory ? "Hide Story" : "View Story"}
                                                    </button>

                                                    {stop.imageUrls?.length > 0 && (
                                                        <button
                                                            className="popup-action-button"
                                                            onClick={() => {
                                                                handleMarkerClick(index);
                                                                setExpandedImagesStopName((prev) =>
                                                                    prev === stop.name ? "" : stop.name
                                                                );
                                                            }}
                                                            type="button"
                                                        >
                                                            {showPopupImages ? "Hide Images" : "View Images"}
                                                        </button>
                                                    )}
                                                </div>

                                                {showPopupStory && (
                                                    <p className="popup-expanded-text">
                                                        {stop.extendedDescription}
                                                    </p>
                                                )}

                                                {showPopupImages && stop.imageUrls?.length > 0 && (
                                                    <div className="popup-image-grid">
                                                        {stop.imageUrls.map((imageUrl, imageIndex) => (
                                                            <img
                                                                key={imageIndex}
                                                                src={imageUrl}
                                                                alt={`${stop.name} view ${imageIndex + 1}`}
                                                                className="popup-image"
                                                            />
                                                        ))}
                                                    </div>
                                                )}

                                                <p className="popup-unlocked">Full story unlocked.</p>
                                            </>
                                        ) : isNavigating && navigatingStopIndex === index ? (
                                            <p className="popup-locked">
                                                Navigating to this stop. The story will unlock when you get close enough.
                                            </p>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    className="popup-go-button"
                                                    onClick={() => startNavigationToStop(index)}
                                                >
                                                    Go Now
                                                </button>
                                                <p className="popup-locked">
                                                    Move closer to unlock the full story.
                                                </p>
                                            </>
                                        )}

                                        <p className="popup-coordinates">
                                            {stop.position[0]}, {stop.position[1]}
                                        </p>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {userLocation && (
                        <>
                            <Circle
                                center={userLocation}
                                radius={35}
                                pathOptions={{
                                    color: "#2563eb",
                                    fillColor: "#60a5fa",
                                    fillOpacity: 0.2,
                                }}
                            />
                            <Marker position={userLocation} icon={UserIcon}>
                                <Popup autoPan={false}>You are here</Popup>
                            </Marker>
                        </>
                    )}
                </MapContainer>
            </div>
        </div>
    );
}
