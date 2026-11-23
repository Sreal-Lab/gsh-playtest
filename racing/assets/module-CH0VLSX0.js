import{B as e,Dt as t,In as n,O as r,U as i,Un as a,gt as o,or as s,p as c,q as l}from"./three.core-sz0DSGvA.js";import{t as u}from"./palette-D8YhyAJH.js";var d=`
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,f=`
precision highp float;
uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uFogColor;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform float uStars;
uniform float uTime;
uniform float uDaylight;
uniform float uCloud;
uniform float uMoonGlow;
varying vec3 vDir;

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -1.0, 1.0);

  // 地平线 → 中段 → 天顶的两到三色渐变
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.36, h));
  col = mix(col, uZenith, smoothstep(0.28, 0.95, h));
  // 地平线以下接到雾色，海天相接处不出现色带
  col = mix(col, uFogColor * 0.96, smoothstep(0.035, -0.16, h));
  // 近地平线的空气透视
  float haze = smoothstep(0.28, 0.0, abs(h)) * 0.35;
  col = mix(col, uFogColor, haze);

  // 太阳：日轮 + 两层辉光
  vec3 sun = normalize(uSunDir);
  float sd = max(dot(d, sun), 0.0);
  float dayVis = smoothstep(-0.12, 0.06, sun.y);
  col += uSunColor * (pow(sd, 3600.0) * 7.0 + pow(sd, 90.0) * 0.55 + pow(sd, 6.0) * 0.12) * dayVis;
  // 低角度时把地平线染暖
  float lowSun = smoothstep(0.22, 0.0, abs(h)) * smoothstep(0.35, 0.0, sun.y) * smoothstep(-0.06, 0.05, sun.y);
  col += uSunColor * lowSun * pow(sd, 2.0) * 0.5;

  // 暮光与晨光：太阳在地平线附近和地平线以下时，朝太阳的那半边贴着地平线留一道暖色，
  // 背着太阳的那半边让位给中段的紫蓝——金橙不是绕着地平线一整圈，天黑下来时暖色从东往西收。
  float tw = smoothstep(0.14, -0.02, sun.y) * smoothstep(-0.42, -0.08, sun.y);
  vec2 sunH = normalize(sun.xz + vec2(1e-5, 0.0));
  vec2 dirH = normalize(d.xz + vec2(1e-5, 0.0));
  float toSun = dot(sunH, dirH) * 0.5 + 0.5;
  float lowBand = smoothstep(0.45, 0.0, abs(h));
  col = mix(col, uMid, (1.0 - toSun) * (1.0 - toSun) * tw * lowBand * 0.6);
  col += uSunColor * pow(toSun, 3.0) * tw * smoothstep(0.32, 0.0, h) * smoothstep(-0.08, 0.02, h) * 0.3;

  // 月亮：一轮满月（有一点明暗）+ 一圈偏蓝的晕；贴着地平线升起来时不画到地平线以下
  vec3 moon = normalize(uMoonDir);
  float md = dot(d, moon);
  float moonUp = smoothstep(-0.03, 0.02, h);
  float moonDisk = smoothstep(0.99940, 0.99972, md) * moonUp;
  float moonMask = mix(0.4, 1.0, uMoonGlow);
  vec3 mt = normalize(cross(moon, vec3(0.0, 1.0, 0.0)));
  vec3 mb = cross(moon, mt);
  vec2 mp = vec2(dot(d, mt), dot(d, mb)) * 30.0;
  float maria = 0.5 + 0.5 * sin(mp.x * 3.1 + 0.8) * sin(mp.y * 2.3 + 1.9) + 0.25 * sin(mp.x * 7.3 - mp.y * 5.1);
  vec3 moonCol = vec3(1.04, 1.01, 0.93) * (0.84 + 0.16 * clamp(maria, 0.0, 1.0));
  col = mix(col, moonCol * 1.25, moonDisk * moonMask);
  col += vec3(0.55, 0.66, 0.95) * (pow(max(md, 0.0), 160.0) * 0.32 + pow(max(md, 0.0), 14.0) * 0.05) * uMoonGlow * moonUp;

  // 夜空：星星 + 一条斜着的银河
  if (uStars > 0.01) {
    vec3 sp = d * 320.0;
    vec3 cell = floor(sp);
    float n = hash13(cell);
    float star = smoothstep(0.9973, 0.9999, n);
    vec3 f = fract(sp) - 0.5;
    float dotMask = smoothstep(0.32, 0.02, length(f));
    float twinkle = 0.72 + 0.28 * sin(uTime * 1.7 + n * 96.0);
    col += vec3(0.86, 0.92, 1.0) * star * dotMask * twinkle * uStars * 2.2 * smoothstep(-0.05, 0.25, d.y) * (1.0 - moonDisk);

    vec3 galaxyNormal = normalize(vec3(0.36, 0.5, -0.79));
    float band = exp(-pow(dot(d, galaxyNormal) / 0.19, 2.0));
    float dust = 0.45 + 0.55 * sin(d.x * 46.0 + d.y * 17.0) * sin(d.z * 39.0 - d.y * 23.0);
    col += vec3(0.52, 0.58, 0.84) * band * (0.55 + 0.45 * dust) * 0.085 * uStars * smoothstep(-0.1, 0.2, d.y);
  }

  // 阴天/雨：把天空压匀（云量越大越灰）
  col = mix(col, uFogColor * 0.94 + vec3(0.03, 0.035, 0.04), uCloud * 0.35);

  gl_FragColor = vec4(col, 1.0);
}
`;function p(e){let t=Math.sin(e*127.1+311.7)*43758.5453;return t-Math.floor(t)}function m(){let m=null,h=null,g=null,_=null,v=null,y=0,b=0,x=[],S=new t;function C(){x.length=0;for(let e=0;e<9;e++){let t=e/9*Math.PI*2+p(e*3.1)*.7,n=900+p(e*5.3)*1400,r=Math.cos(t)*n,i=Math.sin(t)*n,a=420+p(e*7.7)*360,o=5+Math.floor(p(e*11.9)*7);for(let t=0;t<o;t++){let n=70+p(e*17+t*4.1)*150;x.push({ox:r+(p(e*23+t*2.3)-.5)*420,oy:a+(p(e*29+t*5.7)-.5)*90,oz:i+(p(e*31+t*8.1)-.5)*300,sx:n*1.35,sy:n*.62,sz:n,spin:p(e*37+t*1.9)*Math.PI})}}}function w(t){C(),b=x.length;let n=new i(1,1),a=t.materials.stylized({color:`#FFFFFF`,vertexColors:!1,flatShading:!0,fogAmount:.5,grain:0,ambientScale:.72,specular:.02,rim:.55,emissive:`#2A3550`,emissiveIntensity:.12,nightGlow:.3}),o=new l(n,a,b);o.instanceMatrix.setUsage(r),o.castShadow=!1,o.receiveShadow=!1,o.frustumCulled=!1;let s=new c;for(let e=0;e<b;e++){let t=.9+p(e*3.3)*.1;s.setRGB(t,t,t*1.01),o.setColorAt(e,s)}o.instanceColor&&(o.instanceColor.needsUpdate=!0),_=o,v=new e,v.name=`clouds`,v.add(o),t.scene.add(v)}function T(e,t){if(!_||!v)return;let n=e.camera.position;v.position.set(n.x,0,n.z);for(let e=0;e<b;e++){let n=x[e];n.ox+=t*.6*22,n.ox>2600&&(n.ox-=5200),S.position.set(n.ox,n.oy,n.oz),S.rotation.set(0,n.spin,0),S.scale.set(n.sx,n.sy,n.sz),S.updateMatrix(),_.setMatrixAt(e,S.matrix)}_.instanceMatrix.needsUpdate=!0}return{id:`render.sky`,init(e){m=e;let t=e.services.render;if(!t)return;let r={uZenith:{value:t.skyState.zenith.clone()},uMid:{value:t.skyState.mid.clone()},uHorizon:{value:t.skyState.horizon.clone()},uFogColor:{value:t.skyState.fog.clone()},uSunColor:{value:t.skyState.sunColor.clone()},uSunDir:{value:new s(.4,.7,.3)},uMoonDir:{value:new s(-.4,-.7,-.3)},uStars:{value:0},uTime:{value:0},uDaylight:{value:1},uCloud:{value:0},uMoonGlow:{value:0}};g=new n({uniforms:r,vertexShader:d,fragmentShader:f,side:1,depthTest:!1,depthWrite:!1,fog:!1,toneMapped:!1}),h=new o(new a(1,32,20),g),h.frustumCulled=!1,h.renderOrder=-1e3,h.name=`skyDome`,t.scene.add(h),w(t),e.loading.report(`画上云和星`,.6)},update(e){let t=m?.services.render;if(!t||!h||!g)return;y+=e;let n=t.skyState,r=g.uniforms;r.uZenith.value.copy(n.zenith),r.uMid.value.copy(n.mid),r.uHorizon.value.copy(n.horizon),r.uFogColor.value.copy(n.fog),r.uSunColor.value.copy(n.sunColor),r.uSunDir.value.copy(n.sunDir),r.uMoonDir.value.copy(n.moonDir),r.uStars.value=n.stars,r.uTime.value=y,r.uDaylight.value=n.daylight,r.uCloud.value=n.cloud,r.uMoonGlow.value=n.moonLight/u,h.position.copy(t.camera.position);let i=Math.max(600,t.camera.far*.5);h.scale.setScalar(i*.9),T(t,e)},dispose(){let e=m?.services.render;e&&(h&&e.scene.remove(h),v&&e.scene.remove(v)),h?.geometry.dispose(),g?.dispose(),_?.geometry.dispose(),h=null,g=null,_=null,v=null,m=null}}}export{m as createSkyModule};