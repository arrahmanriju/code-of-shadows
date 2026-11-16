import assert from 'node:assert/strict';
import test from 'node:test';
import {DEFAULT_WEATHER_SETTINGS,resolveWeather} from '../components/weather.ts';

test('Rainy Night is the gentle default weather mode',()=>{
 assert.equal(DEFAULT_WEATHER_SETTINGS.mode,'rainy');
 const weather=resolveWeather(DEFAULT_WEATHER_SETTINGS,false,false);
 assert.ok(weather.rainCount>0);
 assert.equal(weather.lightning,false);
 assert.ok(weather.mistOpacity>0);
});

test('Thunderstorm increases rain and enables optional lightning',()=>{
 const rainy=resolveWeather({mode:'rainy',fog:true,lightning:true},false,false);
 const storm=resolveWeather({mode:'storm',fog:true,lightning:true},false,false);
 assert.ok(storm.rainCount>rainy.rainCount);
 assert.ok(storm.rainSpeed>rainy.rainSpeed);
 assert.equal(storm.lightning,true);
 assert.equal(resolveWeather({mode:'storm',fog:true,lightning:false},false,false).lightning,false);
});

test('Clear Night and reduced motion disable animated weather',()=>{
 const clear=resolveWeather({mode:'clear',fog:true,lightning:true},false,false);
 assert.equal(clear.rainCount,0);
 assert.equal(clear.lightning,false);
 assert.ok(clear.mistOpacity<.02);
 const reduced=resolveWeather({mode:'storm',fog:true,lightning:true},false,true);
 assert.equal(reduced.rainCount,0);
 assert.equal(reduced.cloudSpeed,0);
 assert.equal(reduced.lightning,false);
});

test('mobile mode lowers particle and cloud counts and fog can be disabled',()=>{
 const desktop=resolveWeather({mode:'storm',fog:true,lightning:true},false,false);
 const mobile=resolveWeather({mode:'storm',fog:true,lightning:true},true,false);
 assert.ok(mobile.rainCount<desktop.rainCount);
 assert.ok(mobile.cloudCount<desktop.cloudCount);
 const noFog=resolveWeather({mode:'rainy',fog:false,lightning:true},false,false);
 assert.equal(noFog.mistOpacity,0);
 assert.ok(noFog.fogNear>170);
});
