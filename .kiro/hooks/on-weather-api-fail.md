// src/hooks/on-weather-api-fail.ts
// Trigger: NOAA Weather MCP fails
// Action: Fallback to a cached database (mocked)

// Mock function for cache
const getWeatherFromCache = (location: string) => {
  console.log(`HOOK: Weather API failed. Checking cache for ${location}...`);
  return { location: location, event: "Sunny", fromCache: true };
};

export function onWeatherApiFail(location: string) {
  console.log(`HOOK: Triggering weather API fallback.`);
  return getWeatherFromCache(location);
}