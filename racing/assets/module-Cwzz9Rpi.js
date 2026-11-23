import{n as e,r as t}from"./three.module-FMUA6c_l.js";import{At as n,B as r,Ct as i,D as a,Dn as o,Fn as s,Gt as c,H as l,I as ee,In as u,Lt as d,Mt as f,Nn as te,Nt as ne,Un as p,V as m,Wn as re,Wt as h,Zn as g,ar as _,at as v,bt as y,ct as b,gt as x,ht as S,kt as C,o as ie,or as w,ot as T,p as E,sr as D,ur as O,vt as k,x as A}from"./three.core-sz0DSGvA.js";import{x as j,y as ae}from"./modules-D9nE9iTO.js";import{n as oe,r as se,t as ce}from"./palette-D8YhyAJH.js";import{n as le,r as ue,t as M}from"./quality-BU-wMOei.js";var N=`
uniform float uTime;
uniform float uWindStrength;
uniform float uSwayAmount;

#ifdef USE_SWAY
attribute float sway;
#endif
#ifdef AO_ATTRIBUTE
attribute float ao;
#endif

varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vColor;
varying vec2 vUv;
varying float vAO;
varying float vViewDist;

void main() {
  vec3 p = position;
  vec3 n = normal;

  vColor = vec3(1.0);
  #ifdef USE_COLOR
    vColor = color;
  #endif
  #ifdef USE_INSTANCING_COLOR
    vColor *= instanceColor;
  #endif

  vAO = 1.0;
  #ifdef AO_ATTRIBUTE
    vAO = ao;
  #endif
  #ifdef AO_ALPHA
    vAO = color.a;
  #endif

  #ifdef USE_INSTANCING
    vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
    n = mat3(instanceMatrix) * n;
  #else
    vec4 wp = modelMatrix * vec4(p, 1.0);
  #endif

  #ifdef USE_SWAY
    float w = sway * uSwayAmount;
    float ph = wp.x * 0.05 + wp.z * 0.045 + uTime * 1.5;
    wp.x += sin(ph) * w * uWindStrength;
    wp.z += cos(ph * 0.83 + 0.7) * w * uWindStrength * 0.7;
    wp.y += sin(ph * 1.7) * w * uWindStrength * 0.2;
  #endif

  vWorld = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * n);
  vUv = uv;

  vec4 mv = viewMatrix * wp;
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`,P=`
precision highp float;

uniform vec3 uColor;
uniform vec3 uEmissive;
uniform float uEmissiveIntensity;
uniform float uNightGlow;
uniform float uSpecular;
uniform float uShininess;
uniform float uRim;
uniform float uOpacity;
uniform float uWettable;
uniform float uSnowable;
uniform float uWetness;
uniform float uSnow;
uniform float uSnowLine;
uniform float uDaylight;
uniform float uFogAmount;
uniform float uGrain;
uniform float uAmbientScale;

uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform vec3 uSunColor;
uniform vec3 uMoonColor;
uniform float uSunIntensity;
uniform float uMoonIntensity;
uniform vec3 uSkyTop;
uniform vec3 uSkyGround;
uniform float uAmbient;
uniform vec3 uShadowTint;
uniform vec3 uFogColor;
uniform vec3 uFogSunColor;
uniform vec2 uFogRange;
uniform float uShadowStrength;
uniform vec4 uShadowSplit;
uniform vec4 uHeadPos;
uniform vec4 uHeadDir;
uniform vec3 uHeadColor;
uniform float uHeadFalloff;

#ifdef USE_DETAIL
uniform sampler2D uDetailMap;
uniform vec2 uDetailScale;
uniform float uDetailStrength;
#endif

#ifdef SHADOW_CASCADES
uniform sampler2D uShadowMap0;
uniform mat4 uShadowMat0;
uniform float uShadowTexel0;
#if SHADOW_CASCADES > 1
uniform sampler2D uShadowMap1;
uniform mat4 uShadowMat1;
uniform float uShadowTexel1;
#endif
#if SHADOW_CASCADES > 2
uniform sampler2D uShadowMap2;
uniform mat4 uShadowMat2;
uniform float uShadowTexel2;
#endif
#endif

varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vColor;
varying vec2 vUv;
varying float vAO;
varying float vViewDist;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// 两个尺度的值噪声：打散大片单色平涂，不产生高频闪光
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

#ifdef SHADOW_CASCADES
// 与 three 的 packDepthToRGBA / unpackRGBAToDepth 完全一致（这是阴影能不能对上的关键）
float unpackDepth(vec4 v) {
  return dot(v, vec4(255.0 / 256.0, (255.0 / 256.0) / 256.0, (255.0 / 256.0) / 65536.0, 1.0 / 16777216.0));
}

float shadowTap(sampler2D map, mat4 mat, float texel, vec3 wp, vec3 n) {
  vec4 sp = mat * vec4(wp + n * 0.25, 1.0);
  vec3 proj = sp.xyz / sp.w;
  if (proj.x < 0.003 || proj.x > 0.997 || proj.y < 0.003 || proj.y > 0.997 || proj.z > 0.999) return 1.0;
  float d = proj.z - 0.0008;
  float sum = 0.0;
  sum += d <= unpackDepth(texture2D(map, proj.xy + vec2(-0.35, -0.35) * texel)) ? 1.0 : 0.0;
  sum += d <= unpackDepth(texture2D(map, proj.xy + vec2( 0.35, -0.35) * texel)) ? 1.0 : 0.0;
  sum += d <= unpackDepth(texture2D(map, proj.xy + vec2(-0.35,  0.35) * texel)) ? 1.0 : 0.0;
  sum += d <= unpackDepth(texture2D(map, proj.xy + vec2( 0.35,  0.35) * texel)) ? 1.0 : 0.0;
  return sum * 0.25;
}

float sunShadow(vec3 wp, vec3 n, float depth) {
  float s;
  if (depth < uShadowSplit.x) {
    s = shadowTap(uShadowMap0, uShadowMat0, uShadowTexel0, wp, n);
  }
  #if SHADOW_CASCADES > 1
  else if (depth < uShadowSplit.y) {
    s = shadowTap(uShadowMap1, uShadowMat1, uShadowTexel1, wp, n);
  }
  #endif
  #if SHADOW_CASCADES > 2
  else if (depth < uShadowSplit.z) {
    s = shadowTap(uShadowMap2, uShadowMat2, uShadowTexel2, wp, n);
  }
  #endif
  else {
    return 1.0;
  }
  return mix(1.0, s, uShadowStrength);
}
#endif

void main() {
  vec3 base = uColor * vColor;

  #ifdef USE_DETAIL
    vec3 detail = texture2D(uDetailMap, vUv * uDetailScale).rgb;
    base *= mix(vec3(1.0), detail * 1.55, uDetailStrength);
  #endif

  // 世界里的大尺度色斑：避免大面积平涂
  float grain = vnoise(vWorld.xz * 0.035) * 0.62 + vnoise(vWorld.xz * 0.13) * 0.38;
  base *= 1.0 + (grain - 0.5) * uGrain * vec3(1.0, 0.96, 0.9);

  vec3 N = normalize(vNormalW);
  #ifdef FLAT_SHADED
    vec3 faceN = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    if (dot(faceN, N) < 0.0) faceN = -faceN;
    N = faceN;
  #endif
  #ifdef DOUBLE_SIDED
    if (!gl_FrontFacing) N = -N;
  #endif

  vec3 V = normalize(cameraPosition - vWorld);
  float ao = clamp(vAO, 0.0, 1.0);

  #ifdef SHADOW_CASCADES
    float shadow = sunShadow(vWorld, N, vViewDist);
  #else
    float shadow = 1.0;
  #endif

  // 雨：地面变深、出反光
  float wet = uWetness * uWettable;
  base = mix(base, base * vec3(0.56, 0.60, 0.68), wet * 0.8);

  // 雪线以上、朝上的面盖一层雪
  float snowMask = uSnow * uSnowable
    * smoothstep(uSnowLine, uSnowLine + 45.0, vWorld.y)
    * smoothstep(0.32, 0.78, N.y);
  base = mix(base, vec3(0.92, 0.955, 0.99), snowMask * 0.92);

  // 半球天空光：法线朝上取天顶色，朝下取地面反射色
  float up = clamp(N.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 sky = mix(uSkyGround, uSkyTop, up);

  // 阴影里的环境光是柔和的蓝紫，不是黑色
  vec3 ambientLit = sky * uAmbient * ao * uAmbientScale;
  vec3 ambientShadow = uShadowTint * uAmbient * (0.62 + 0.38 * ao) * uAmbientScale;
  vec3 ambient = mix(ambientShadow, ambientLit, shadow);

  // 太阳：软 wrapped 漫反射，背光面也不会全黑
  float toward = max(dot(N, uSunDir), 0.0);
  float wrap = pow(toward * 0.55 + 0.45, 2.0);
  vec3 sun = uSunColor * uSunIntensity * wrap * shadow * mix(0.68, 1.0, ao);

  // 月光：夜里给轮廓
  float moon = max(dot(N, uMoonDir), 0.0);
  sun += uMoonColor * uMoonIntensity * (moon * 0.5 + 0.5) * shadow;

  // 玩家车灯：一束朝前略朝下的锥光。中心 ±10° 最亮，到 ±27° 渐暗；近处另有一圈更宽的散光照到两侧路肩。
  // 路面几乎是擦着光看的，按真实的余弦算会全黑，所以给一个不随入射角变的底（0.4），迎着灯的立面更亮。
  if (uHeadPos.w > 0.001) {
    vec3 toP = vWorld - uHeadPos.xyz;
    float along = dot(toP, uHeadDir.xyz);
    if (along > 0.2 && along < uHeadDir.w) {
      float dist = max(length(toP), 0.2);
      float cosA = along / dist;
      float cone = smoothstep(0.89, 0.985, cosA);
      float spill = smoothstep(0.45, 0.89, cosA) * 0.32 * (1.0 - smoothstep(5.0, 24.0, dist));
      float fall = 1.0 / (1.0 + (dist * dist) / (uHeadFalloff * uHeadFalloff));
      float reach = 1.0 - smoothstep(uHeadDir.w * 0.55, uHeadDir.w, along);
      float facing = clamp(dot(N, -toP / dist), 0.0, 1.0);
      sun += uHeadColor * (uHeadPos.w * max(cone, spill) * fall * reach * (0.4 + 0.6 * facing));
    }
  }

  vec3 col = base * (ambient + sun);

  // 高光（湿路面、金属边、灯罩）
  vec3 H = normalize(uSunDir + V);
  float spec = pow(max(dot(N, H), 0.0), max(uShininess, 2.0)) * uSpecular * (0.35 + 0.65 * shadow);
  col += uSunColor * spec * uSunIntensity * 0.35;
  col += sky * wet * pow(1.0 - max(dot(N, V), 0.0), 4.0) * 0.55;

  // 边缘光：把剪影从背景里分出来
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += sky * rim * uRim * 0.45;

  // 自发光（窗、霓虹、灯罩）：夜里更亮
  col += uEmissive * uEmissiveIntensity * mix(1.0 + uNightGlow, 0.7, uDaylight);

  // 距离雾：朝太阳方向带散射色，地平线因此和天空接得上
  float fogT = smoothstep(uFogRange.x, uFogRange.y, vViewDist) * uFogAmount;
  vec3 viewDir = normalize(vWorld - cameraPosition);
  float sunScatter = pow(max(dot(viewDir, uSunDir), 0.0), 4.0) * 0.85;
  vec3 fogCol = mix(uFogColor, uFogSunColor, sunScatter);
  col = mix(col, fogCol, clamp(fogT, 0.0, 1.0));

  gl_FragColor = vec4(col, uOpacity);
}
`;function F(e,t=64){let n=new Uint8Array(t*t*4),r=0;for(let t=0;t<e.length;t++)r=r*31+e.charCodeAt(t)|0;let i=()=>(r=r*1664525+1013904223|0,(r>>>8&65535)/65535);for(let r=0;r<t;r++)for(let a=0;a<t;a++){let o;switch(e){case`wood`:o=.72+(Math.sin(a*.55+Math.sin(r*.09)*2.2)*.5+.5)*.22+i()*.06;break;case`brick`:{let e=Math.floor(r/8)%2==0?0:8,t=(a+e)%16<1.5||r%8<1.5?.62:1;o=(.82+i()*.18)*t;break}case`grass`:o=.78+(Math.sin(a*1.7)*Math.sin(r*1.3)*.5+.5)*.16+i()*.14;break;case`sand`:o=.85+Math.sin(a*2.3+r*1.1)*.04+i()*.12;break;default:o=.8+i()*.36}let s=Math.min(255,Math.max(0,Math.round(o*160))),c=(r*t+a)*4;n[c]=s,n[c+1]=s,n[c+2]=s,n[c+3]=255}let a=new A(n,t,t,c);return a.wrapS=o,a.wrapT=o,a.minFilter=T,a.magFilter=v,a.generateMipmaps=!0,a.colorSpace=``,a.needsUpdate=!0,a.anisotropy=4,a}function de(e){let t=new Map,n=new Map,r=new Set,i=2,a=null,o=e=>{let t=n.get(e);return t||(t=F(e),n.set(e,t)),t};function s(t){let n={};t.vertexColors!==!1&&(n.USE_COLOR=``),i>0&&(n.SHADOW_CASCADES=i),t.flatShading!==!1&&(n.FLAT_SHADED=``),t.doubleSided&&(n.DOUBLE_SIDED=``),t.detailMap&&(n.USE_DETAIL=``),t.windSway&&(n.USE_SWAY=``),t.vertexAO===`attribute`&&(n.AO_ATTRIBUTE=``),t.vertexAO===`alpha`&&(n.AO_ALPHA=``);let r={...e};r.uColor={value:new E(t.color===void 0?16777215:t.color)},r.uEmissive={value:new E(t.emissive===void 0?0:t.emissive)},r.uEmissiveIntensity={value:t.emissiveIntensity??1},r.uNightGlow={value:t.nightGlow??1.2},r.uSpecular={value:t.specular??.12},r.uShininess={value:t.shininess??18},r.uRim={value:t.rim??.35},r.uOpacity={value:t.transparent?t.opacity??1:1},r.uWettable={value:+!!t.wettable},r.uSnowable={value:+!!t.snowable},r.uFogAmount={value:t.fogAmount??1},r.uGrain={value:t.grain??.16},r.uAmbientScale={value:t.ambientScale??1},r.uSwayAmount={value:t.windSway??0},t.detailMap&&(r.uDetailMap={value:t.detailMap},r.uDetailScale={value:new _(t.detailScale??8,t.detailScale??8)},r.uDetailStrength={value:t.detailStrength??.45});let a=new u({uniforms:r,vertexShader:N,fragmentShader:P,defines:n,side:t.doubleSided?2:0,transparent:t.transparent??!1,depthWrite:!(t.transparent??!1),vertexColors:t.vertexColors!==!1,fog:!1,lights:!1,toneMapped:!1,name:`gradient`});return t.transparent&&(a.blending=1),a}function c(e){let t=e.detailMap?e.detailMap.uuid:``;return[e.color??`#fff`,e.vertexColors===!1?0:1,e.flatShading===!1?0:1,+!!e.doubleSided,+!!e.transparent,e.opacity??1,e.emissive??``,e.emissiveIntensity??1,e.nightGlow??1.2,+!!e.wettable,+!!e.snowable,e.windSway??0,e.vertexAO??`none`,e.specular??.12,e.shininess??18,e.rim??.35,e.fogAmount??1,e.grain??.16,e.ambientScale??1,e.detailScale??8,e.detailStrength??.45,t,i].join(`|`)}let l={shared:e,stylized(e={}){let n={...e};n.detailMap===void 0&&e.detail&&(n.detailMap=o(e.detail));let r=c(n),i=t.get(r);if(i)return i;let a=s(n);return t.set(r,a),a},adopt(e){e.fog=!0;let t=e;return t.isMeshStandardMaterial&&(r.add(t),a&&!t.envMap&&(t.envMap=a),t.envMapIntensity===void 0&&(t.envMapIntensity=1),t.needsUpdate=!0),e},carPaintBase(){let e=new y({color:16777215,vertexColors:!0,roughness:.3,metalness:.14,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.05,fog:!0,name:`carPaintBase`});return a&&(e.envMap=a),r.add(e),e},setShadowCascades(e){let n=Math.max(0,Math.min(3,e));if(n!==i){i=n;for(let e of t.values()){let t={...e.defines};delete t.SHADOW_CASCADES,n>0&&(t.SHADOW_CASCADES=n),e.defines=t,e.needsUpdate=!0}}},refreshEnv(e){a=e;for(let t of r)t.envMap!==e&&(t.envMap=e,t.needsUpdate=!0)},detail:o,warmupVariants(){return[l.stylized({flatShading:!0}),l.stylized({wettable:!0,specular:.35,shininess:40}),l.stylized({snowable:!0}),l.stylized({windSway:.6,doubleSided:!0}),l.stylized({emissive:`#FFD9A0`,emissiveIntensity:1.6}),l.stylized({detail:`grain`})]},dispose(){for(let e of t.values())e.dispose();t.clear();for(let e of n.values())e.dispose();n.clear();for(let e of r)e.dispose();r.clear()}};return l}function I(){let e=new A(new Uint8Array([255,255,255,255]),1,1,c);return e.minFilter=i,e.magFilter=i,e.needsUpdate=!0,e}function fe(){let e=I();return{uTime:{value:0},uWindDir:{value:new _(1,0)},uWindStrength:{value:1},uSunDir:{value:new w(.4,.7,.3)},uMoonDir:{value:new w(-.4,-.7,-.3)},uSunColor:{value:new E(`#FFF1D6`)},uMoonColor:{value:new E(`#9FB6E8`)},uSunIntensity:{value:2.4},uMoonIntensity:{value:.12},uSkyTop:{value:new E(`#BFE6F5`)},uSkyHorizon:{value:new E(`#BFE6F5`)},uSkyGround:{value:new E(`#7C8A6E`)},uAmbient:{value:1.1},uShadowTint:{value:new E(`#5A6FA8`)},uFogColor:{value:new E(`#C6E2EF`)},uFogSunColor:{value:new E(`#FFE8C0`)},uFogRange:{value:new _(260,3600)},uWetness:{value:0},uSnow:{value:0},uSnowLine:{value:600},uDaylight:{value:1},uShadowStrength:{value:1},uHeadPos:{value:new D(0,0,0,0)},uHeadDir:{value:new D(0,0,1,90)},uHeadColor:{value:new E(`#FFF0D2`)},uHeadFalloff:{value:22},uShadowSplit:{value:new D(40,160,520,1)},uShadowMap0:{value:e},uShadowMat0:{value:new S},uShadowTexel0:{value:1/2048},uShadowMap1:{value:e},uShadowMat1:{value:new S},uShadowTexel1:{value:1/2048},uShadowMap2:{value:e},uShadowMat2:{value:new S},uShadowTexel2:{value:1/2048}}}function pe(e,t,n,r,i,a){let o=[`uShadowMap0`,`uShadowMap1`,`uShadowMap2`],s=[`uShadowMat0`,`uShadowMat1`,`uShadowMat2`],c=[`uShadowTexel0`,`uShadowTexel1`,`uShadowTexel2`];for(let i=0;i<3;i++)i<a&&(e[o[i]].value=t[i].texture,e[s[i]].value.copy(n[i]),e[c[i]].value=r[i]??1/2048);e.uShadowSplit.value.set(i[0]??40,i[1]??160,i[2]??520,1)}var L=new w(0,1,0),R=new S().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),me=class{renderer;scene;maps=[];matrices=[];texels=[];splits=[0,0,0];count=0;radii=[0,0,0];lastCastCount=0;cameras=[];depthMat=new k({depthPacking:h});size=2048;scanTimer=0;parity=0;parityReady=!1;lightDir=new w(0,1,0);center=new w;right=new w;up=new w;tmp=new w;mat=new S;clearColor=new E;constructor(e,t){this.renderer=e,this.scene=t;for(let e=0;e<3;e++){let e=new C(-30,30,30,-30,1,2400);e.layers.set(3),e.matrixAutoUpdate=!0,this.cameras.push(e),this.maps.push(this.createTarget(2048)),this.matrices.push(new S)}this.count=0}createTarget(e){let t=new O(e,e,{minFilter:i,magFilter:i,format:c,type:g,depthBuffer:!0,stencilBuffer:!1,generateMipmaps:!1});return t.texture.colorSpace=``,t}configure(e,t,n,r){let i=Math.max(0,Math.min(3,e)),a=t!==this.size;this.count=i,this.size=t;for(let e=0;e<3;e++){this.radii[e]=n[e]??60,this.splits[e]=r[e]??1e5,a&&e<i&&(this.maps[e].dispose(),this.maps[e]=this.createTarget(t)),this.texels[e]=1/t;let o=this.cameras[e],s=this.radii[e];o.left=-s,o.right=s,o.top=s,o.bottom=-s,o.near=1,o.far=2400,o.updateProjectionMatrix()}}scan(){let e=0;this.scene.traverse(t=>{let n=t;n.castShadow&&n.isMesh&&(t.layers.mask&8||t.layers.enable(3),e++)}),this.lastCastCount=e}render(e,t,n){if(this.count===0)return;this.scanTimer-=e,this.scanTimer<=0&&(this.scanTimer=.5,this.scan()),this.parity^=1,this.lightDir.copy(n).normalize(),this.right.crossVectors(L,this.lightDir),this.right.lengthSq()<1e-6&&this.right.set(1,0,0),this.right.normalize(),this.up.crossVectors(this.lightDir,this.right).normalize();let r=this.renderer,i=r.getRenderTarget(),a=this.scene.overrideMaterial,o=r.shadowMap.enabled;r.getClearColor(this.clearColor);let s=r.getClearAlpha();r.shadowMap.enabled=!1,this.scene.overrideMaterial=this.depthMat,r.setClearColor(16777215,1);for(let e=0;e<this.count;e++){if(e>0&&this.parity===1&&this.parityReady)continue;let n=this.radii[e]*2/this.size,i=t.dot(this.right),a=t.dot(this.up),o=Math.round(i/n)*n,s=Math.round(a/n)*n;this.center.copy(t),this.tmp.copy(this.right).multiplyScalar(o-i),this.center.add(this.tmp),this.tmp.copy(this.up).multiplyScalar(s-a),this.center.add(this.tmp);let c=this.cameras[e];c.position.copy(this.center).addScaledVector(this.lightDir,1e3),c.up.copy(this.up),c.lookAt(this.center),c.updateMatrixWorld(),this.matrices[e].copy(R).multiply(c.projectionMatrix).multiply(c.matrixWorldInverse),r.setRenderTarget(this.maps[e]),r.clear(!0,!0,!1),r.render(this.scene,c)}this.parityReady=!0,r.setRenderTarget(i),this.scene.overrideMaterial=a,r.shadowMap.enabled=o,r.setClearColor(this.clearColor,s)}dispose(){for(let e of this.maps)e.dispose();this.depthMat.dispose()}},z=128,B=`
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,V=`
precision highp float;
uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uFog;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform vec3 uMoonDir;
uniform vec3 uSea;
uniform float uStars;
uniform float uMoonGlow;
uniform float uCloud;
varying vec3 vDir;

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col;
  if (h >= 0.0) {
    col = mix(uHorizon, uMid, smoothstep(0.0, 0.36, h));
    col = mix(col, uZenith, smoothstep(0.28, 0.95, h));
    float sd = max(dot(d, normalize(uSunDir)), 0.0);
    col += uSunColor * (pow(sd, 260.0) * 5.0 + pow(sd, 16.0) * 0.5) * smoothstep(-0.1, 0.05, uSunDir.y);
    float md = max(dot(d, normalize(uMoonDir)), 0.0);
    col += vec3(0.6, 0.7, 1.0) * (pow(md, 80.0) * 0.35 + pow(md, 900.0) * 1.6) * uMoonGlow;
    if (uStars > 0.02) {
      float n = hash13(floor(d * 260.0));
      col += vec3(0.8, 0.86, 1.0) * smoothstep(0.9965, 1.0, n) * uStars * 0.9;
    }
    col = mix(col, uFog, uCloud * 0.3);
  } else {
    // 下半球：海面，带一点天光反射
    float k = clamp(-h * 2.6, 0.0, 1.0);
    col = mix(uHorizon * 0.9, uSea, k);
  }
  gl_FragColor = vec4(col, 1.0);
}
`,he=class{renderer;texture;lastUpdate=-1e9;target;scene=new s;dome;mat;cameras=[];pendingFace=-1;constructor(t){this.renderer=t,this.target=new e(z,{type:m,generateMipmaps:!0,minFilter:T,magFilter:v}),this.target.texture.colorSpace=b,this.texture=this.target.texture,this.mat=new u({uniforms:{uZenith:{value:new E(`#3F8FE0`)},uMid:{value:new E(`#86C6F0`)},uHorizon:{value:new E(`#BFE6F5`)},uFog:{value:new E(`#C6E2EF`)},uSunColor:{value:new E(`#FFF1D6`)},uSunDir:{value:new w(.4,.7,.3)},uMoonDir:{value:new w(-.4,-.7,-.3)},uMoonGlow:{value:0},uSea:{value:new E(`#0E5E86`)},uStars:{value:0},uCloud:{value:0}},vertexShader:B,fragmentShader:V,side:1,depthTest:!1,depthWrite:!1,fog:!1,toneMapped:!1}),this.dome=new x(new p(50,24,16),this.mat),this.dome.frustumCulled=!1,this.scene.add(this.dome);for(let[e,t,r]of[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){let i=new n(90,1,.1,200);i.position.set(0,0,0),i.up.set(0,1,0),t!==0&&i.up.set(0,0,-t>0?1:-1),i.lookAt(e,t,r),i.updateMatrixWorld(),this.cameras.push(i)}}update(e,t,n,r=!1){if(this.pendingFace<0){if(!r&&t-this.lastUpdate<n)return!1;this.lastUpdate=t,this.applyState(e),this.pendingFace=0}let i=this.renderer,a=i.getRenderTarget(),o=i.autoClear;i.autoClear=!1;for(let e=0;e<3&&this.pendingFace<6;e++){let e=this.pendingFace++;i.setRenderTarget(this.target,e),i.clear(!0,!0,!1),i.render(this.scene,this.cameras[e])}return i.setRenderTarget(a),i.autoClear=o,this.pendingFace>=6&&(this.pendingFace=-1,!0)}applyState(e){let t=this.mat.uniforms;t.uZenith.value.copy(e.zenith),t.uMid.value.copy(e.mid),t.uHorizon.value.copy(e.horizon),t.uFog.value.copy(e.fog),t.uSunColor.value.copy(e.sunColor),t.uSunDir.value.copy(e.sunDir),t.uMoonDir.value.copy(e.moonDir),t.uStars.value=e.stars,t.uMoonGlow.value=e.moonLight/ce,t.uCloud.value=e.cloud,t.uSea.value.copy(e.horizon).multiplyScalar(.32)}dispose(){this.target.dispose(),this.dome.geometry.dispose(),this.mat.dispose()}},H=`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,ge=`
precision highp float;
uniform sampler2D tDiffuse;
uniform float uThreshold;
uniform float uCeiling;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  // 4 点盒式降采样 + 软阈值。每个采样先压到 uCeiling 以内：车灯灯罩、路灯这种亮度是白卡十几倍的小点
  // 不会把周围糊成一个白团，烟花的火星（几倍白卡）不受影响。
  vec3 cap = vec3(uCeiling);
  vec3 c = min(texture2D(tDiffuse, vUv + uTexel * vec2(-1.0, -1.0)).rgb, cap);
  c += min(texture2D(tDiffuse, vUv + uTexel * vec2( 1.0, -1.0)).rgb, cap);
  c += min(texture2D(tDiffuse, vUv + uTexel * vec2(-1.0,  1.0)).rgb, cap);
  c += min(texture2D(tDiffuse, vUv + uTexel * vec2( 1.0,  1.0)).rgb, cap);
  c *= 0.25;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float knee = uThreshold * 0.6;
  float soft = clamp(l - uThreshold + knee, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee + 1e-4);
  float w = max(l - uThreshold, soft) / max(l, 1e-4);
  gl_FragColor = vec4(c * w, 1.0);
}
`,U=`
precision highp float;
uniform sampler2D tDiffuse;
uniform vec2 uDir;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  vec3 sum = texture2D(tDiffuse, vUv).rgb * 0.2270270270;
  sum += texture2D(tDiffuse, vUv + uDir * uTexel * 1.3846153846).rgb * 0.3162162162;
  sum += texture2D(tDiffuse, vUv - uDir * uTexel * 1.3846153846).rgb * 0.3162162162;
  sum += texture2D(tDiffuse, vUv + uDir * uTexel * 3.2307692308).rgb * 0.0702702703;
  sum += texture2D(tDiffuse, vUv - uDir * uTexel * 3.2307692308).rgb * 0.0702702703;
  gl_FragColor = vec4(sum, 1.0);
}
`,W=`
precision highp float;
uniform sampler2D tDiffuse;
uniform sampler2D tBloom;
uniform vec2 uRes;
uniform float uBloom;
uniform float uExposure;
uniform float uBlur;
uniform float uVignette;
uniform float uDim;
uniform float uFlash;
uniform float uDrops;
uniform float uTime;
uniform float uSaturation;
varying vec2 vUv;

// Khronos PBR Neutral 色调映射
vec3 neutralToneMap(vec3 color) {
  const float startCompression = 0.8 - 0.04;
  const float desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b));
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < startCompression) return color;
  const float d = 1.0 - startCompression;
  float newPeak = 1.0 - d * d / (peak + d - startCompression);
  color *= newPeak / peak;
  float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
  return mix(color, vec3(newPeak), g);
}

vec3 toSRGB(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 d = vUv - 0.5;
  vec3 c;
  if (uBlur > 0.001) {
    // 速度感：向画面中心拉 6 个采样
    c = vec3(0.0);
    float wsum = 0.0;
    for (int i = 0; i < 6; i++) {
      float t = float(i) / 5.0;
      vec2 uv = vec2(0.5) + d * (1.0 - uBlur * 0.085 * t);
      float w = 1.0 - t * 0.55;
      c += texture2D(tDiffuse, uv).rgb * w;
      wsum += w;
    }
    c /= wsum;
  } else {
    c = texture2D(tDiffuse, vUv).rgb;
  }
  vec3 bloom = texture2D(tBloom, vUv).rgb;
  c += bloom * uBloom;
  c *= uExposure;
  c = neutralToneMap(c);

  // 轻度分级：阴影偏蓝紫，亮部偏暖，保住饱和
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 shadowGrade = c * vec3(0.92, 0.965, 1.075);
  vec3 highGrade = c * vec3(1.055, 1.015, 0.955);
  c = mix(c, shadowGrade, (1.0 - l) * 0.55);
  c = mix(c, highGrade, smoothstep(0.55, 1.0, l) * 0.6);
  l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSaturation);

  // 暗角
  float r = length(d) * 1.42;
  float vig = smoothstep(1.0, 0.35, r);
  c *= mix(1.0, 0.62, (1.0 - vig) * uVignette);

  // 镜头水珠（雨、泥点）
  if (uDrops > 0.001) {
    vec2 g = vUv * vec2(uRes.x / 70.0, uRes.y / 70.0);
    float n = hash(floor(g) + floor(uTime * 1.7));
    float drop = smoothstep(0.985, 1.0, n) * uDrops;
    c = mix(c, c * 0.82 + vec3(0.10, 0.12, 0.14), drop * 0.65);
  }

  c *= 1.0 - uDim * 0.6;
  c = mix(c, vec3(1.0), uFlash);
  // 抖动：天空渐变在 8 位输出上不出色带
  c += (hash(floor(vUv * uRes)) - 0.5) * (1.0 / 255.0);
  gl_FragColor = vec4(toSRGB(c), 1.0);
}
`,_e=class{renderer;sceneTarget;bloomA;bloomB;brightMat;blurMat;compositeMat;quadScene=new s;quadCam=new C(-1,1,1,-1,0,1);quad;width=1;height=1;msaa=2;bloomEnabled=!0;bloomScale=.5;constructor(e){this.renderer=e,this.sceneTarget=this.makeTarget(1,1,0),this.bloomA=this.makeTarget(1,1,0),this.bloomB=this.makeTarget(1,1,0),this.brightMat=new u({uniforms:{tDiffuse:{value:null},uThreshold:{value:.95},uCeiling:{value:16},uTexel:{value:new _}},vertexShader:H,fragmentShader:ge,depthTest:!1,depthWrite:!1}),this.blurMat=new u({uniforms:{tDiffuse:{value:null},uDir:{value:new _(1,0)},uTexel:{value:new _}},vertexShader:H,fragmentShader:U,depthTest:!1,depthWrite:!1}),this.compositeMat=new u({uniforms:{tDiffuse:{value:null},tBloom:{value:null},uRes:{value:new _(1,1)},uBloom:{value:.9},uExposure:{value:1},uBlur:{value:0},uVignette:{value:.35},uDim:{value:0},uFlash:{value:0},uDrops:{value:0},uTime:{value:0},uSaturation:{value:1.08}},vertexShader:H,fragmentShader:W,depthTest:!1,depthWrite:!1}),this.quad=new x(new f(2,2),this.compositeMat),this.quad.frustumCulled=!1,this.quadScene.add(this.quad)}makeTarget(e,t,n){let r=new O(Math.max(1,e),Math.max(1,t),{type:m,format:c,depthBuffer:!0,stencilBuffer:!1,samples:n,generateMipmaps:!1});return r.texture.colorSpace=b,r.texture.minFilter=v,r.texture.magFilter=v,r}resize(e,t,n,r){let i=Math.max(1,Math.floor(e)),a=Math.max(1,Math.floor(t)),o=Math.max(0,Math.min(4,Math.floor(n))),s=Math.max(1,Math.floor(i*this.bloomScale)),c=Math.max(1,Math.floor(a*this.bloomScale));(i!==this.width||a!==this.height||o!==this.msaa||r!==this.bloomEnabled)&&(this.width=i,this.height=a,this.msaa=o,this.bloomEnabled=r,this.sceneTarget.dispose(),this.bloomA.dispose(),this.bloomB.dispose(),this.sceneTarget=this.makeTarget(i,a,o),this.bloomA=this.makeTarget(s,c,0),this.bloomB=this.makeTarget(s,c,0),this.compositeMat.uniforms.uRes.value.set(i,a),this.brightMat.uniforms.uTexel.value.set(1/i,1/a))}beginScene(){this.renderer.setRenderTarget(this.sceneTarget),this.renderer.clear(!0,!0,!0)}finish(e){let t=this.renderer;if(this.brightMat.uniforms.tDiffuse.value=this.sceneTarget.texture,this.brightMat.uniforms.uThreshold.value=e.bloomThreshold,this.brightMat.uniforms.uCeiling.value=e.bloomCeiling,this.quad.material=this.brightMat,t.setRenderTarget(this.bloomA),t.clear(!0,!1,!1),t.render(this.quadScene,this.quadCam),this.bloomEnabled&&e.bloom>.001){this.quad.material=this.blurMat;let n=this.blurMat.uniforms.uTexel.value,r=this.blurMat.uniforms.uDir.value,i=e.bloomSpread>.01?2:1;for(let a=0;a<i;a++){let i=a===0?1:Math.min(1,e.bloomSpread);n.set(i/this.bloomA.width,i/this.bloomA.height),this.blurMat.uniforms.tDiffuse.value=this.bloomA.texture,r.set(1,0),t.setRenderTarget(this.bloomB),t.clear(!0,!1,!1),t.render(this.quadScene,this.quadCam),this.blurMat.uniforms.tDiffuse.value=this.bloomB.texture,r.set(0,1),t.setRenderTarget(this.bloomA),t.clear(!0,!1,!1),t.render(this.quadScene,this.quadCam)}}let n=this.compositeMat.uniforms;n.tDiffuse.value=this.sceneTarget.texture,n.tBloom.value=this.bloomA.texture,n.uBloom.value=this.bloomEnabled?e.bloom:0,n.uExposure.value=e.exposure,n.uBlur.value=e.blurScale>0?Math.min(1,e.radialBlur*e.blurScale):0,n.uVignette.value=e.vignette,n.uDim.value=e.dim,n.uFlash.value=e.flash,n.uDrops.value=e.lensDrops,n.uTime.value=performance.now()/1e3,n.uSaturation.value=e.saturation,this.quad.material=this.compositeMat,t.setRenderTarget(null),t.render(this.quadScene,this.quadCam)}get sceneTexture(){return this.sceneTarget.texture}get renderWidth(){return this.width}get renderHeight(){return this.height}dispose(){this.sceneTarget.dispose(),this.bloomA.dispose(),this.bloomB.dispose(),this.brightMat.dispose(),this.blurMat.dispose(),this.compositeMat.dispose(),this.quad.geometry.dispose()}},G=.95;function K(e,t,n){let r=Math.min(1,Math.max(0,(n-e)/(t-e)));return r*r*(3-2*r)}function ve(e){return 1-K(.05,.6,e)}function ye(e,t){let n=ve(e);return{threshold:G+-.13*n,intensity:t*(1+.3500000000000001*n),ceiling:16+-11*n,spread:n}}var q={rangeM:90,intensity:2.6,falloffM:26},J={rangeM:160,intensity:3.2,falloffM:42};function be(e,t){return e!==`auto`||t<.42}var Y=8,xe=class{gl;stats;ext;free=[];pending=[];active=null;constructor(e,t){if(this.gl=e,this.stats=t,this.ext=e.getExtension(`EXT_disjoint_timer_query_webgl2`),t.gpuFrameMs=t.gpuFrameId=null,t.gpuTimer=this.ext?`pending`:`unsupported`,this.ext){for(let t=0;t<Y;t++){let t=e.createQuery();t&&this.free.push({query:t,frame:0})}this.free.length||(t.gpuTimer=`unsupported`)}}begin(e){let{gl:t,ext:n,stats:r}=this;if(t.isContextLost()){r.gpuTimer=`context-lost`,r.gpuFrameMs=r.gpuFrameId=null;return}if(!n||r.gpuTimer===`unsupported`||this.active)return;if(t.getParameter(n.GPU_DISJOINT_EXT)){for(;this.pending.length;)this.free.push(this.pending.shift());r.gpuTimer=`disjoint`,r.gpuFrameMs=r.gpuFrameId=null;return}let i=this.pending[0];if(i&&t.getQueryParameter(i.query,t.QUERY_RESULT_AVAILABLE)){let e=t.getQueryParameter(i.query,t.QUERY_RESULT);this.pending.shift(),this.free.push(i),Number.isFinite(e)&&e>=0&&(r.gpuFrameMs=e/1e6,r.gpuFrameId=i.frame,r.gpuSampleSeq++,r.gpuTimer=`available`)}let a=this.free.pop();a?(r.gpuFrameMs===null&&(r.gpuTimer=`pending`),a.frame=e,t.beginQuery(n.TIME_ELAPSED_EXT,a.query),this.active=a):r.gpuSkippedFrames++}end(){this.active&&this.ext&&(this.gl.isContextLost()||(this.gl.endQuery(this.ext.TIME_ELAPSED_EXT),this.pending.push(this.active)),this.active=null)}dispose(){this.end();for(let e of[...this.free,...this.pending])this.gl.deleteQuery(e.query);this.free.length=this.pending.length=0}};function X(){let e=null,i,o,c,u,f,p,m,h,g,_,v,y,b,S=fe(),C=se(),T=`medium`,E=null,D=9.4,O=0,k=1,A=1,N=!0,P=!1,F=null,I=null,L=null,R=!1,z={drawCalls:0,triangles:0,gpu:``,softwareRendered:!1,width:1,height:1,gpuTimer:`unsupported`,gpuFrameMs:null,gpuFrameId:null,gpuSampleSeq:0,gpuSkippedFrames:0},B={radialBlur:0,vignette:.35,lensDrops:0,dim:0,flash:0},V=new w,H=new w,ge={x:0,y:0,visible:!1,behind:!1,distance:0},U,W=0,G=0,K=new w(0,0,1),Y=new w(0,1,0),X=new w,Se=new d,Z=new d,Q=[],Ce={max:8,get active(){let e=0;for(let t of Q)t.intensity>.001&&e++;return e},set(e){let t=Math.min(Q.length,e.length);for(let n=0;n<Q.length;n++){let r=Q[n];if(n<t){let t=e[n];r.position.set(t.x,t.y,t.z),t.color!==void 0&&r.color.set(t.color),r.intensity=t.intensity??1,r.distance=t.distance??55}else r.intensity=0}},clear(){for(let e of Q)e.intensity=0}};function we(){let e=document.createElement(`canvas`);return e.className=`tr-canvas`,e.style.display=`block`,e.style.width=`100%`,e.style.height=`100%`,e}function Te(){i=new t({canvas:o,antialias:!1,powerPreference:`high-performance`,stencil:!1,alpha:!1}),i.outputColorSpace=te,i.toneMapping=0,i.shadowMap.enabled=!0,i.shadowMap.type=2,i.autoClear=!1,i.info.autoReset=!1,i.setClearColor(12576501,1);let e=i.getContext(),n=e.getExtension(`WEBGL_debug_renderer_info`);z.gpu=n?String(e.getParameter(n.UNMASKED_RENDERER_WEBGL)):``,z.softwareRendered=/swiftshader|llvmpipe|software|basic render/i.test(z.gpu),L=`beginQuery`in e?new xe(e,z):null,o.addEventListener(`webglcontextlost`,Ee),o.addEventListener(`webglcontextrestored`,De)}function Ee(){L?.dispose(),L=null,R=!1,z.gpuTimer=`context-lost`,z.gpuFrameMs=z.gpuFrameId=null}function De(){let e=i.getContext();L=`beginQuery`in e?new xe(e,z):null}function Oe(){c=new s,g=new ee(13034223,260,3600),c.fog=g,u=new r,u.name=`worldRoot`,c.add(u),f=new n(64,16/9,.3,12e3),f.position.set(4300,42,-1850),f.lookAt(4300,40,-1750),p=new a(16773590,2.4),p.castShadow=!0,p.shadow.mapSize.set(1024,1024),p.shadow.bias=-6e-4,p.shadow.normalBias=.4,p.shadow.camera.near=1,p.shadow.camera.far=900,c.add(p),c.add(p.target),m=new a(10467048,0),m.castShadow=!1,c.add(m),h=new l(12576501,8161902,1.1),c.add(h),U=new re(16773330,0,q.rangeM,.48,.7,1.3),U.castShadow=!1,c.add(U),c.add(U.target);for(let e=0;e<8;e++){let e=new ne(16767392,0,55,1.7);e.castShadow=!1,c.add(e),Q.push(e)}}function ke(e){T=e;let t=M[e];if(!i)return;let n=t.standardShadowSize;i.shadowMap.enabled=n>0,p.castShadow=n>0,n>0&&p.shadow.mapSize.x!==n&&(p.shadow.mapSize.set(n,n),p.shadow.map?.dispose(),p.shadow.map=null);let r=le(e);_.configure(t.shadowCascades,t.shadowMapSize,r.radii,r.splits),b.setShadowCascades(t.shadowCascades),N=!0,$(k,A)}function $(t,n){if(!i)return;k=Math.max(1,Math.floor(t)),A=Math.max(1,Math.floor(n));let r=e?e.settings.get(`renderScale`):1,a=ue(k,A,window.devicePixelRatio||1,T,r);i.setPixelRatio(a.ratio),i.setSize(k,A,!1),f.aspect=k/A,f.updateProjectionMatrix();let o=M[T];y.resize(a.width,a.height,o.msaa,o.bloom),z.width=a.width,z.height=a.height,N=!1}let Ae=new w(0,1,0);function je(){let e=C.sunDir;Ae.set(e.x,Math.max(e.y,.05),e.z).normalize()}function Me(){if(M[T].standardShadowSize<=0)return;let e=V,t=Ae;p.position.copy(e).addScaledVector(t,220),p.target.position.copy(e),p.target.updateMatrixWorld();let n=p.shadow.camera;n.left=-55,n.right=55,n.top=55,n.bottom=-55,n.near=1,n.far=520,n.updateProjectionMatrix()}function Ne(t){let n=e?.services.env,r;n&&Number.isFinite(n.clockHours)?r=n.clockHours:(D=(D+24/2880*t)%24,r=D),oe(r,n??null,C);let a=M[T],o=a.lightScale;S.uSunDir.value.copy(C.sunDir),S.uMoonDir.value.copy(C.moonDir),S.uSunColor.value.copy(C.sunColor),S.uSkyTop.value.copy(C.skyTop),S.uSkyHorizon.value.copy(C.horizon),S.uSkyGround.value.copy(C.skyGround),S.uShadowTint.value.copy(C.shadowTint),S.uFogColor.value.copy(C.fog),S.uFogSunColor.value.copy(C.fogSun),S.uFogRange.value.set(C.fogNear,C.fogFar),S.uSunIntensity.value=C.sunIntensity*1,S.uMoonIntensity.value=C.moonLight,S.uShadowStrength.value=C.shadowStrength,S.uAmbient.value=C.ambient,S.uDaylight.value=C.daylight,S.uTime.value=O;let s=n?.weather;S.uWetness.value=n?.wetness??0,S.uSnow.value=.35+(s?.snowfall??0)*.65,S.uSnowLine.value=n?.snowLineY??600;let l=s?.windSpeed??4;S.uWindStrength.value=Math.min(2.2,.35+l*.12),s?.windDir&&S.uWindDir.value.set(s.windDir.x,s.windDir.z),p.color.copy(C.sunColor),p.intensity=C.sunIntensity*o,p.shadow.intensity=C.shadowStrength,i.shadowMap.autoUpdate=C.shadowStrength>.002,m.color.set(`#9FB6E8`),m.intensity=C.moonLight/ce*.35*o,m.position.copy(C.moonDir).multiplyScalar(200).add(f.position),h.color.copy(C.skyTop),h.groundColor.copy(C.skyGround),h.intensity=C.ambient*.62*o,g.color.copy(C.fog),g.near=C.fogNear,g.far=C.fogFar,i.setClearColor(C.fog,1),v.update(C,O,a.envRefreshSec),c.environment||(c.environment=v.texture,b.refreshEnv(v.texture)),c.environmentIntensity=.85*o*(.3+.7*C.daylight),je(),Me()}function Pe(t,n){let r=S.uHeadPos.value,i=e?.views.player,a=i?.active?e?.services.vehicles?.state(i.handle):void 0,o=e?.services.vehicleView?.headlights??`auto`,s=!!a&&be(o,C.daylight),c=Math.min(1,t*4);if(W+=(+!!s-W)*c,G+=(+(o===`high`)-G)*c,!a||W<.003){s||(W=0),r.w=0,U.intensity=0;return}let l=Math.min(1,Math.max(0,n));Z.set(a.prevRot.x,a.prevRot.y,a.prevRot.z,a.prevRot.w),Se.set(a.rot.x,a.rot.y,a.rot.z,a.rot.w),Z.slerp(Se,l),K.set(0,0,1).applyQuaternion(Z),Y.set(0,1,0).applyQuaternion(Z);let ee=Math.max(1.2,a.dims.lengthM*.5-.1);X.set(a.prevPos.x+(a.pos.x-a.prevPos.x)*l,a.prevPos.y+(a.pos.y-a.prevPos.y)*l,a.prevPos.z+(a.pos.z-a.prevPos.z)*l),X.addScaledVector(K,ee).addScaledVector(Y,.65);let u=.035-.02*G;K.addScaledVector(Y,-u).normalize();let d=q.rangeM+(J.rangeM-q.rangeM)*G,f=W*(.12+.88*ve(C.daylight)),te=(q.intensity+(J.intensity-q.intensity)*G)*f;r.set(X.x,X.y,X.z,te),S.uHeadDir.value.set(K.x,K.y,K.z,d),S.uHeadFalloff.value=q.falloffM+(J.falloffM-q.falloffM)*G,U.position.copy(X),U.target.position.copy(X).addScaledVector(K,20),U.target.updateMatrixWorld(),U.distance=d,U.intensity=30*(1+.4*G)*f*M[T].lightScale}function Fe(){if(!i||!y)return;E&&(f.position.set(E.pos[0],E.pos[1],E.pos[2]),f.lookAt(E.lookAt[0],E.lookAt[1],E.lookAt[2]),f.fov=E.fov??55,f.updateProjectionMatrix()),N&&$(k,A),V.lengthSq()<1e-6&&V.copy(f.position),pe(S,_.maps,_.matrices,_.texels,_.splits,_.count),C.shadowStrength>.002&&_.render(1/60,V,Ae);let t=M[T];y.beginScene(),i.render(c,f);let n=!!e&&e.settings.get(`motionBlur`)&&!e.settings.get(`reducedMotion`),r=ye(C.daylight,t.bloomIntensity*(n?1:.75));y.finish({...B,exposure:C.exposure,bloom:r.intensity,bloomThreshold:r.threshold,bloomCeiling:r.ceiling,bloomSpread:r.spread,blurScale:n?t.blurScale:0,saturation:1.09})}function Ie(){R||i.info.reset(),Fe(),R||(z.drawCalls=i.info.render.calls,z.triangles=i.info.render.triangles)}function Le(){f.aspect!==k/A&&(f.aspect=k/A,f.updateProjectionMatrix())}let Re={renderer:void 0,get canvas(){return o},get scene(){return c},get worldRoot(){return u},get camera(){return f},get materials(){return b},get envMap(){return v?.texture??null},get quality(){return T},stats:z,get post(){return B},get shadows(){return _},get skyState(){return C},get pointLights(){return Ce},setShadowFocus(e,t,n){V.set(e,t,n)},projectToScreen(e,t,n,r=ge){H.set(e,t,n);let i=H.distanceTo(f.position);return H.project(f),r.behind=H.z>1,r.distance=i,r.x=(H.x*.5+.5)*k,r.y=(-H.y*.5+.5)*A,r.visible=!r.behind&&H.x>-1.05&&H.x<1.05&&H.y>-1.05&&H.y<1.05,r},renderNow(){Ie()},capture(){return Ie(),new Promise((e,t)=>{o.toBlob(n=>n?e(n):t(Error(`toBlob failed`)),`image/png`)})}};return{id:`render.core`,init(t){e=t,o=we(),Te(),Oe(),Re.renderer=i,b=de(S),_=new me(i,c),y=new _e(i),v=new he(i),t.dom.stage.append(o),t.loading.report(`调好太阳和天空`,.55),$(t.dom.stage.clientWidth||window.innerWidth,t.dom.stage.clientHeight||window.innerHeight),F=new ResizeObserver(()=>$(t.dom.stage.clientWidth,t.dom.stage.clientHeight)),F.observe(t.dom.stage),window.addEventListener(`resize`,ze),t.services.render=Re,I=new r,I.visible=!1;let n=new ie(1,1,1);for(let e of b.warmupVariants()){let t=new x(n,e);t.castShadow=!0,t.receiveShadow=!0,I.add(t)}c.add(I),I.visible=!0,ke(t.settings.get(`quality`)),y.sceneTarget&&i.setRenderTarget(y.sceneTarget),i.compile(c,f),i.setRenderTarget(null),I.visible=!1,c.remove(I),I=null,n.dispose(),t.settings.subscribe((e,n)=>{e===`quality`?(ke(n.quality),t.bus.emit(`render:qualityChanged`,{quality:n.quality})):e===`renderScale`&&$(k,A)}),t.services.env||j(`setTime`,e=>{let t=typeof e==`number`?e:e?.hour;return typeof t==`number`&&Number.isFinite(t)&&(D=(t%24+24)%24),{ok:!0,hour:C.hour,source:`renderFallback`}}),ae().has(`setCameraPose`)||j(`setCameraPose`,e=>{if(e===null)return E=null,{ok:!0};if(typeof e==`string`){let n=t.services.world?.sites.get(e);if(!n)return{ok:!1,error:`unknown site ${e}`};E={pos:[n.x,n.y+12,n.z],lookAt:[n.x,n.y,n.z],fov:52}}else E={pos:e.pos,lookAt:e.lookAt,fov:e.fov};return{ok:!0,pose:E}}),j(`renderInfo`,()=>({ok:!0,gpu:z.gpu,softwareRendered:z.softwareRendered,drawCalls:z.drawCalls,triangles:z.triangles,width:z.width,height:z.height,gpuTimer:z.gpuTimer,gpuFrameMs:z.gpuFrameMs,gpuFrameId:z.gpuFrameId,gpuSampleSeq:z.gpuSampleSeq,gpuSkippedFrames:z.gpuSkippedFrames,quality:T,cascades:_.count,pointLights:Ce.active,hour:C.hour,daylight:C.daylight,sunIntensity:C.sunIntensity,shadowStrength:C.shadowStrength,moonLight:C.moonLight,ambient:C.ambient,exposure:C.exposure,headlight:S.uHeadPos.value.w})),t.loading.report(`点亮舞台灯光`,.82),P=!0},update(t,n){if(P){i.info.reset(),L?.begin(e?.time.frame??0),R=!0,O+=Math.min(.1,t);try{Ne(t),Pe(t,n),Le()}catch(e){throw L?.end(),R=!1,e}}},lateUpdate(){if(P)try{Fe()}finally{L?.end(),R=!1,z.drawCalls=i.info.render.calls,z.triangles=i.info.render.triangles}},dispose(){window.removeEventListener(`resize`,ze),o?.removeEventListener(`webglcontextlost`,Ee),o?.removeEventListener(`webglcontextrestored`,De),F?.disconnect(),F=null,L?.dispose(),L=null,_?.dispose(),y?.dispose(),v?.dispose(),b?.dispose(),i?.dispose(),o?.remove(),P=!1,e=null}};function ze(){e&&$(e.dom.stage.clientWidth,e.dom.stage.clientHeight)}}export{X as createRenderModule};