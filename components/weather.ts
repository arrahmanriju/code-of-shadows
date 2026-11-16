export type WeatherMode='rainy'|'storm'|'clear';

export type WeatherSettings={
 mode:WeatherMode;
 fog:boolean;
 lightning:boolean;
};

export const DEFAULT_WEATHER_SETTINGS:WeatherSettings={mode:'rainy',fog:true,lightning:true};

export const WEATHER_MODES:[WeatherMode,string,string][]=[
 ['rainy','Rainy Night','Gentle rain and drifting mist'],
 ['storm','Thunderstorm','Heavy rain and occasional lightning'],
 ['clear','Clear Night','A crisp view of the skyline'],
];

export function resolveWeather(settings:WeatherSettings,mobile:boolean,reduced:boolean){
 const storm=settings.mode==='storm';
 const clear=settings.mode==='clear';
 const fogEnabled=settings.fog;
 return {
  rainCount:reduced||clear?0:mobile?(storm?620:360):(storm?1500:900),
  rainSpeed:storm?22:13,
  rainOpacity:storm?.58:.36,
  fogNear:fogEnabled?(clear?90:storm?38:46):175,
  fogFar:fogEnabled?(clear?190:storm?126:145):260,
  mistOpacity:fogEnabled?(clear?.018:storm?.12:.075):0,
  cloudOpacity:clear?.035:storm?.16:.095,
  cloudSpeed:reduced?0:storm?.75:.35,
  cloudCount:mobile?3:5,
  lightning:storm&&settings.lightning&&!reduced,
  roadRoughness:clear?.42:storm?.16:.22,
  reflectionOpacity:clear?.025:storm?.12:.08,
 };
}
