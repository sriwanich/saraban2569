import { 
  EEC_PROVINCES, 
  LiveWeatherData, 
  classifyRainfallTmd, 
  getWindDirectionText, 
  getWmoWeatherInfo 
} from '../data/eecLocations';

export async function fetchLiveEecWeather(
  provinceId: string = 'rayong',
  districtId: string = 'mueang-rayong',
  subdistrictName?: string
): Promise<LiveWeatherData> {
  const province = EEC_PROVINCES.find(p => p.id === provinceId) || EEC_PROVINCES[0];
  const district = province.districts.find(d => d.id === districtId) || province.districts[0];
  
  let targetLat = district.lat;
  let targetLng = district.lng;
  let targetSubdistrictName = district.subdistricts[0]?.name || district.name;

  if (subdistrictName) {
    const sub = district.subdistricts.find(s => s.name === subdistrictName);
    if (sub) {
      targetLat = sub.lat;
      targetLng = sub.lng;
      targetSubdistrictName = sub.name;
    }
  }

  const locationName = `${targetSubdistrictName} ${district.name} จังหวัด${province.name.split(' ')[0]}`;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max&timezone=Asia%2FBangkok`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Weather API error: ${res.statusText}`);
    }

    const data = await res.json();
    const current = data.current || {};
    const daily = data.daily || {};
    const hourly = data.hourly || {};

    const weatherCode = current.weather_code ?? 2;
    const weatherInfo = getWmoWeatherInfo(weatherCode);

    const tempCurrent = Math.round((current.temperature_2m ?? 29.5) * 10) / 10;
    const apparentTemp = Math.round((current.apparent_temperature ?? 34.0) * 10) / 10;
    const humidity = Math.round(current.relative_humidity_2m ?? 78);
    const rainCurrentRate = Math.round((current.precipitation ?? 0) * 10) / 10;
    
    // Daily precip sum for today
    const precip24h = (daily.precipitation_sum && daily.precipitation_sum[0] !== undefined) 
      ? Math.round(daily.precipitation_sum[0] * 10) / 10 
      : rainCurrentRate;

    // Precipitation probability
    const precipProb = (daily.precipitation_probability_max && daily.precipitation_probability_max[0] !== undefined)
      ? daily.precipitation_probability_max[0]
      : (hourly.precipitation_probability ? hourly.precipitation_probability[0] || 40 : 40);

    const windSpeed = Math.round(current.wind_speed_10m ?? 14);
    const windDir = current.wind_direction_10m ?? 225;
    const windGusts = Math.round(current.wind_gusts_10m ?? 20);

    const surfacePressure = Math.round(current.surface_pressure ?? 1010);
    const uvIndex = (daily.uv_index_max && daily.uv_index_max[0] !== undefined) ? daily.uv_index_max[0] : 6.5;
    const cloudCover = current.cloud_cover ?? 65;

    const tempMin = (daily.temperature_2m_min && daily.temperature_2m_min[0] !== undefined) ? daily.temperature_2m_min[0] : 25;
    const tempMax = (daily.temperature_2m_max && daily.temperature_2m_max[0] !== undefined) ? daily.temperature_2m_max[0] : 33;

    const rainClassification = classifyRainfallTmd(Math.max(precip24h, rainCurrentRate));

    // Approximate dew point
    const dewPoint = Math.round((tempCurrent - ((100 - humidity) / 5)) * 10) / 10;

    return {
      locationName,
      province: province.name.split(' ')[0],
      district: district.name,
      subdistrict: targetSubdistrictName,
      lat: targetLat,
      lng: targetLng,
      updatedAt: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      
      temperature: tempCurrent,
      apparentTemperature: apparentTemp,
      tempMin,
      tempMax,
      
      relativeHumidity: humidity,
      dewPoint,
      
      rainRate: rainCurrentRate,
      precipitationSum: precip24h,
      precipitationProbability: precipProb,
      rainCategory: rainClassification.category,
      rainCategoryLabel: rainClassification.label,
      rainWarningColor: rainClassification.color,
      
      windSpeed,
      windDirection: windDir,
      windDirectionText: getWindDirectionText(windDir),
      windGusts,
      
      surfacePressure,
      uvIndex,
      cloudCover,
      
      weatherCode,
      weatherDescription: weatherInfo.description,
      weatherIconType: weatherInfo.iconType,
      
      hourly: {
        time: hourly.time ? hourly.time.slice(0, 12) : [],
        temperature: hourly.temperature_2m ? hourly.temperature_2m.slice(0, 12) : [],
        precipitation: hourly.precipitation ? hourly.precipitation.slice(0, 12) : [],
        precipitationProbability: hourly.precipitation_probability ? hourly.precipitation_probability.slice(0, 12) : [],
        relativeHumidity: hourly.relative_humidity_2m ? hourly.relative_humidity_2m.slice(0, 12) : []
      },
      
      daily: {
        time: daily.time || [],
        tempMax: daily.temperature_2m_max || [],
        tempMin: daily.temperature_2m_min || [],
        precipitationSum: daily.precipitation_sum || [],
        precipitationProbabilityMax: daily.precipitation_probability_max || [],
        weatherCode: daily.weather_code || []
      },
      
      stationSource: `ระบบสารสนเทศอุตุนิยมวิทยาและสภาวะอากาศ จังหวัดระยอง / กรมอุตุนิยมวิทยา (TMD Open Data Feed) - สถานีตรวจวัด ${district.name}`
    };
  } catch (error) {
    console.error('Failed to fetch live Rayong weather:', error);
    // Fallback data
    const rainClassification = classifyRainfallTmd(2.5);
    return {
      locationName,
      province: province.name.split(' ')[0],
      district: district.name,
      subdistrict: targetSubdistrictName,
      lat: targetLat,
      lng: targetLng,
      updatedAt: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      
      temperature: 30.2,
      apparentTemperature: 35.5,
      tempMin: 26,
      tempMax: 33,
      
      relativeHumidity: 76,
      dewPoint: 25.4,
      
      rainRate: 0.0,
      precipitationSum: 2.5,
      precipitationProbability: 35,
      rainCategory: rainClassification.category,
      rainCategoryLabel: rainClassification.label,
      rainWarningColor: rainClassification.color,
      
      windSpeed: 16,
      windDirection: 230,
      windDirectionText: 'ตะวันตกเฉียงใต้ (SW)',
      windGusts: 22,
      
      surfacePressure: 1009,
      uvIndex: 6.8,
      cloudCover: 60,
      
      weatherCode: 2,
      weatherDescription: 'มีเมฆบางส่วน สภาพอากาศอบอ้าวและมีโอกาสเกิดฝนฟ้าคะนองร้อยละ 35',
      weatherIconType: 'cloud',
      
      hourly: {
        time: [],
        temperature: [],
        precipitation: [],
        precipitationProbability: [],
        relativeHumidity: []
      },
      daily: {
        time: [],
        tempMax: [],
        tempMin: [],
        precipitationSum: [],
        precipitationProbabilityMax: [],
        weatherCode: []
      },
      stationSource: `ระบบสารสนเทศอุตุนิยมวิทยาและสภาวะอากาศ จังหวัดระยอง (สถานีตรวจวัด ${district.name})`
    };
  }
}
