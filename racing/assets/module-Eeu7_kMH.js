import{Gt as e,In as t,Mt as n,S as r,V as i,at as a,f as o,gt as s,p as c,sr as l,x as u}from"./three.core-sz0DSGvA.js";import{n as d,t as f}from"./coords-CrmOJxgo.js";import{t as p}from"./quality-BU-wMOei.js";var m=`
uniform float uTime;
uniform float uSeaLevel;
varying vec3 vWorld;
varying float vWave;
varying float vViewDist;

float swell(vec2 p, float t) {
  return sin(p.x * 0.020 + t * 0.62) * 0.42
       + sin(p.y * 0.0165 - t * 0.51) * 0.34
       + sin((p.x + p.y) * 0.0092 + t * 0.37) * 0.55;
}

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float w = swell(wp.xz, uTime);
  wp.y += w;
  vWorld = wp.xyz;
  vWave = w;
  vec4 mv = viewMatrix * wp;
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`,h=`
precision highp float;
uniform float uTime;
uniform float uSeaLevel;
uniform sampler2D uHeightTex;
uniform vec4 uHeightBounds; // minX, minZ, sizeX, sizeZ
uniform vec3 uShallow;
uniform vec3 uMid;
uniform vec3 uDeep;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uFogColor;
uniform vec3 uFogSunColor;
uniform vec2 uFogRange;
uniform float uDaylight;

varying vec3 vWorld;
varying float vWave;
varying float vViewDist;

float ripple(vec2 p, float t) {
  return sin(p.x * 0.42 + t * 1.9) * 0.055
       + sin(p.y * 0.37 - t * 1.6) * 0.05
       + sin((p.x * 0.71 + p.y * 0.53) + t * 2.4) * 0.032
       + sin((p.x * 0.26 - p.y * 0.61) - t * 1.2) * 0.045;
}

void main() {
  vec2 uv = (vWorld.xz - uHeightBounds.xy) / uHeightBounds.zw;
  float ground = -80.0;
  if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) {
    ground = texture2D(uHeightTex, uv).r;
  }
  float depth = uSeaLevel - ground;
  if (depth < 0.015) discard;

  // 法线：几组不同尺度的波纹
  float e = 1.2;
  vec2 p = vWorld.xz;
  float h0 = ripple(p, uTime) * 4.0;
  float hx = ripple(p + vec2(e, 0.0), uTime) * 4.0;
  float hz = ripple(p + vec2(0.0, e), uTime) * 4.0;
  vec3 N = normalize(vec3(-(hx - h0) / e, 1.0, -(hz - h0) / e));
  // 大浪的坡度
  N.x -= cos(p.x * 0.020 + uTime * 0.62) * 0.05;
  N.z -= cos(p.y * 0.0165 - uTime * 0.51) * 0.045;
  N = normalize(N);

  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 5.0);

  vec3 col = mix(uShallow, uMid, smoothstep(0.0, 3.2, depth));
  col = mix(col, uDeep, smoothstep(6.0, 46.0, depth));

  // 天空反射（与天空同一份颜色）
  vec3 R = reflect(-V, N);
  vec3 skyRefl = mix(uSkyHorizon, uSkyTop, clamp(R.y * 1.6, 0.0, 1.0));
  col = mix(col, skyRefl, clamp(fres * 0.75 + 0.08, 0.0, 0.9));

  // 太阳高光：宽的一道 + 细碎闪点
  vec3 H = normalize(uSunDir + V);
  float ndh = max(dot(N, H), 0.0);
  float spec = pow(ndh, 180.0) * 1.5 + pow(ndh, 1600.0) * 3.0;
  col += uSunColor * spec * mix(0.25, 1.0, uDaylight);

  // 岸线泡沫：水深越浅越白，噪声让边缘不呆板
  float shore = 1.0 - smoothstep(0.0, 2.8, depth);
  float n = sin(p.x * 0.33 + uTime * 1.35) * sin(p.y * 0.29 - uTime * 1.05);
  float bands = 0.5 + 0.5 * sin(depth * 4.2 - uTime * 1.7);
  float foam = shore * (0.35 + 0.55 * smoothstep(-0.2, 0.8, n)) * (0.7 + 0.3 * bands);
  // 浪峰泡沫（外海）
  foam += smoothstep(0.75, 1.05, vWave) * 0.16 * smoothstep(2.0, 12.0, depth);
  foam = clamp(foam, 0.0, 0.92);
  col = mix(col, vec3(0.94, 0.98, 1.0), foam);

  // 远处融进地平线雾色
  vec3 viewDir = normalize(vWorld - cameraPosition);
  float sunScatter = pow(max(dot(viewDir, uSunDir), 0.0), 4.0) * 0.85;
  vec3 fogCol = mix(uFogColor, uFogSunColor, sunScatter);
  // 远处融进地平线雾色；但能见度再低也要留一点海色，否则 3 km 外的海在整个画面里就是一片雾
  // （明信片机位最近的海也在 4.5 km 外，完全融合等于看不见海）。
  float fogT = smoothstep(uFogRange.x, uFogRange.y, vViewDist);
  fogT *= mix(1.0, 0.55, smoothstep(1200.0, 2600.0, uFogRange.y));
  col = mix(col, fogCol, clamp(fogT, 0.0, 1.0));

  float alpha = mix(0.66, 0.97, smoothstep(0.0, 5.0, depth));
  alpha = max(alpha, foam * 0.95);
  alpha *= smoothstep(0.0, 1.6, depth);
  gl_FragColor = vec4(col, alpha);
}
`,g=new l(0,-d,f,d);function _(l={}){let _=null,v=null,y=null,b=null,x=null,S=g.clone(),C=new u(new Uint8Array([0,0,0,0]),1,1,e);C.needsUpdate=!0;function w(t,n,s){let c=new Uint16Array(n*s*4),l=S.z/n,d=S.w/s;for(let e=0;e<s;e++){let i=S.y+(e+.5)*d;for(let a=0;a<n;a++){let o=t(S.x+(a+.5)*l,i),s=(e*n+a)*4;c[s]=r.toHalfFloat(o),c[s+1]=r.toHalfFloat(o),c[s+2]=r.toHalfFloat(o),c[s+3]=r.toHalfFloat(1)}}let f=new u(c,n,s,e,i);return f.minFilter=a,f.magFilter=a,f.wrapS=o,f.wrapT=o,f.colorSpace=``,f.needsUpdate=!0,f}function T(){let t=_?.services.world;if(!t||!t.ready)return!1;let n=t.heightfield;if(!n||n.cols<2||n.rows<2)return!1;let s=l.texWidth??768,c=l.texHeight??600;S.set(n.originX,n.originZ,(n.cols-1)*n.cellSize,(n.rows-1)*n.cellSize);let d=new Uint16Array(s*c*4),f=S.z/s,p=S.w/c;for(let e=0;e<c;e++){let t=S.y+(e+.5)*p,i=Math.max(0,Math.min(n.rows-1,Math.round((t-n.originZ)/n.cellSize)));for(let t=0;t<s;t++){let a=S.x+(t+.5)*f,o=Math.max(0,Math.min(n.cols-1,Math.round((a-n.originX)/n.cellSize))),c=n.heightAt(o,i),l=(e*s+t)*4,u=r.toHalfFloat(c);d[l]=u,d[l+1]=u,d[l+2]=u,d[l+3]=r.toHalfFloat(1)}}b?.dispose();let m=new u(d,s,c,e,i);return m.minFilter=a,m.magFilter=a,m.wrapS=o,m.wrapT=o,m.colorSpace=``,m.needsUpdate=!0,b=m,y&&(y.uniforms.uHeightTex.value=m),!0}function E(){b||(l.heightAt?(S.set(-800,-d-800,f+1600,d+1600),b=w(l.heightAt,l.texWidth??512,l.texHeight??400)):b=C,y&&(y.uniforms.uHeightTex.value=b,y.uniforms.uHeightBounds.value.copy(S)))}function D(e){let r=Math.max(48,p[e.quality].waterSegments),i=new n(26e3,26e3,r,r),a=e.materials.shared;y=new t({uniforms:{uTime:{value:0},uSeaLevel:{value:0},uHeightTex:{value:b??C},uHeightBounds:{value:S.clone()},uShallow:{value:new c(`#7FE0C8`)},uMid:{value:new c(`#1FA7B8`)},uDeep:{value:new c(`#0E5E86`)},uSunDir:a.uSunDir,uSunColor:a.uSunColor,uSkyTop:a.uSkyTop,uSkyHorizon:a.uSkyHorizon,uFogColor:a.uFogColor,uFogSunColor:a.uFogSunColor,uFogRange:a.uFogRange,uDaylight:a.uDaylight},vertexShader:m,fragmentShader:h,transparent:!0,depthWrite:!0,side:0,fog:!1,toneMapped:!1}),v=new s(i,y),v.rotation.x=-Math.PI/2,v.position.set(f/2,0,-d/2),v.frustumCulled=!1,v.name=`sea`,v.renderOrder=5,e.scene.add(v)}return{id:`render.water`,init(e){_=e;let t=e.services.render;t&&(E(),D(t),T()||e.bus.on(`world:loaded`,()=>{x=null}),e.settings.subscribe(t=>{if(t!==`quality`||!v)return;let r=Math.max(48,p[e.settings.get(`quality`)].waterSegments),i=v.geometry;v.geometry=new n(26e3,26e3,r,r),i.dispose()}),e.loading.report(`涨潮`,.66))},update(e){if(!_?.services.render||!y)return;let t=_?.services.world;t&&t.ready&&t!==x&&(x=t,T(),y.uniforms.uHeightBounds.value.copy(S));let n=_?.services.env;y.uniforms.uTime.value=(y.uniforms.uTime.value+Math.min(.1,e))%1e3,y.uniforms.uSeaLevel.value=n?.seaLevelY??0},dispose(){v&&_?.services.render?.scene.remove(v),v?.geometry.dispose(),y?.dispose(),b&&b!==C&&b.dispose(),C.dispose(),v=null,y=null,b=null,_=null}}}export{_ as createWaterModule};