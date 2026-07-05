// Ashima simplex noise (webgl-noise, MIT)
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`

// Shared between particle + connection vertex shaders so line endpoints track particles exactly
const MOTION = /* glsl */ `
uniform float uTime;
uniform vec2 uMouse;
uniform float uDim;
uniform float uTravel;
uniform float uHovered;
uniform float uActive;
uniform float uConstel;
uniform float uFocus;
uniform vec3 uAccent;
uniform vec3 uSectionColors[5];
attribute float aSeed;
attribute float aAffinity;

vec3 displace(vec3 pos, float seed){
  float t=uTime*0.05;
  vec3 p=pos;
  p+=0.22*vec3(
    snoise(pos*0.32+vec3(t,13.7,0.0)),
    snoise(pos*0.32+vec3(0.0,t+37.2,7.1)),
    snoise(pos*0.32+vec3(29.3,0.0,t+91.7))
  );
  p+=0.035*vec3(
    sin(uTime*(1.2+seed*1.6)+seed*6.2831853),
    sin(uTime*(1.0+seed*1.3)+seed*4.7),
    sin(uTime*(1.4+seed*1.1)+seed*2.3)
  );
  p.x+=uMouse.x*0.12*(0.3+seed*0.7);
  p.y+=uMouse.y*0.12*(0.3+seed*0.7);
  return p;
}

float targetMix(float affinity){
  float sel=uHovered>=0.0?uHovered:uActive;
  if(sel<0.0) return -1.0;
  return step(abs(affinity-sel),0.5);
}

vec3 sectionColor(float affinity){
  return affinity>=0.0?uSectionColors[int(affinity+0.5)]:uAccent;
}

// Position + depth + seed palette for core nodes; section affinity tints on top
vec3 nodePalette(vec3 pos, float seed, float aff, float depth){
  float d=clamp(depth*0.11,0.0,1.0);
  float n=snoise(pos*0.22+seed*4.1)*0.5+0.5;
  float t=fract(pos.y*0.09+pos.x*0.06+pos.z*0.05+n*0.35+seed*0.28);
  vec3 c1=vec3(0.52,0.36,0.98);
  vec3 c2=vec3(0.36,0.58,0.96);
  vec3 c3=vec3(0.38,0.78,0.88);
  vec3 c4=vec3(0.78,0.40,0.92);
  vec3 col=t<0.33?mix(c1,c2,t*3.0):(t<0.66?mix(c2,c3,(t-0.33)*3.0):mix(c3,c4,(t-0.66)*3.0));
  col=mix(col*0.48,col*1.18,1.0-d);
  col*=0.86+0.28*seed;
  col=mix(col,uAccent,0.1);
  if(aff>=0.0) col=mix(col,sectionColor(aff),0.52);
  return col;
}
`

export const particleVert = /* glsl */ `
uniform float uSize;
varying float vGlow;
varying float vAlpha;
varying vec3 vColor;
${NOISE}
${MOTION}
void main(){
  vec3 p=displace(position,aSeed);
  float tm=targetMix(aAffinity);
  float hasSel=tm>=0.0?1.0:0.0;
  float isT=max(tm,0.0);
  float emphasis=max(uDim,uFocus);
  float bright=mix(1.0,mix(0.42,1.7,isT),emphasis*hasSel);
  float pulse=0.72+0.28*sin(uTime*2.5+aSeed*6.2831853);
  float hotspotBoost=aAffinity>=0.0?1.2:1.0;
  vGlow=bright*hotspotBoost*(1.0+uFocus*0.15*isT);
  vAlpha=(0.3+0.7*aSeed)*pulse*0.7;
  vAlpha*=mix(1.0,0.38,uFocus*(1.0-isT)*hasSel);
  vec4 mv=modelViewMatrix*vec4(p,1.0);
  vec3 base=nodePalette(position,aSeed,aAffinity,-mv.z);
  float lit=isT*hasSel*min(emphasis*1.6,1.0);
  vColor=mix(base,sectionColor(aAffinity)*1.65,lit);
  float grey=(1.0-isT)*hasSel*uFocus;
  vColor=mix(vColor,vec3(0.38,0.4,0.48),grey*0.55);
  gl_PointSize=uSize*(1.2+aSeed*2.2)*(0.85+0.3*pulse)*(34.0/-mv.z);
  gl_Position=projectionMatrix*mv;
}
`

export const particleFrag = /* glsl */ `
precision highp float;
varying float vGlow;
varying float vAlpha;
varying vec3 vColor;
void main(){
  float d=length(gl_PointCoord-0.5)*2.0;
  float a=pow(max(0.0,1.0-d),2.6);
  vec3 col=mix(vColor,vec3(1.0),pow(a,3.0)*0.55);
  gl_FragColor=vec4(col*vGlow,a*vAlpha);
  if(gl_FragColor.a<0.01) discard;
}
`

export const connectionVert = /* glsl */ `
varying float vAlpha;
varying vec3 vColor;
${NOISE}
${MOTION}
void main(){
  vec3 p=displace(position,aSeed);
  float tm=targetMix(aAffinity);
  float hasSel=tm>=0.0?1.0:0.0;
  float isT=max(tm,0.0);
  float emphasis=max(uDim,uFocus);
  float bright=mix(1.0,mix(0.38,1.4,isT),emphasis*hasSel);
  float pulse=0.5+0.5*sin(uTime*1.3+aSeed*6.2831853);
  vAlpha=0.085*(0.35+0.65*pulse)*bright;
  vAlpha*=mix(1.0,0.32,uFocus*(1.0-isT)*hasSel);
  vec4 mv=modelViewMatrix*vec4(p,1.0);
  vec3 base=nodePalette(position,aSeed,aAffinity,-mv.z);
  float lit=isT*hasSel*min(emphasis*1.5,1.0);
  vColor=mix(base,sectionColor(aAffinity)*1.3,lit)*1.12;
  float grey=(1.0-isT)*hasSel*uFocus;
  vColor=mix(vColor,vec3(0.36,0.38,0.46),grey*0.55);
  gl_Position=projectionMatrix*mv;
}
`

export const connectionFrag = /* glsl */ `
precision highp float;
varying float vAlpha;
varying vec3 vColor;
void main(){
  gl_FragColor=vec4(vColor,vAlpha);
}
`

export const constellationLineVert = /* glsl */ `
attribute float aOrder;
varying float vAlpha;
varying vec3 vColor;
${NOISE}
${MOTION}
void main(){
  vec3 p=displace(position,aSeed);
  float sec=uActive>=0.0?step(abs(aAffinity-uActive),0.5):0.0;
  float reveal=smoothstep(aOrder,aOrder+0.08,uConstel);
  float shine=1.0+uFocus*0.85;
  vAlpha=sec*reveal*(0.95+0.35*uFocus);
  vColor=mix(sectionColor(aAffinity),vec3(1.0),0.45+0.4*uFocus)*shine;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
}
`

export const constellationLineFrag = /* glsl */ `
precision highp float;
uniform float uFocus;
varying float vAlpha;
varying vec3 vColor;
void main(){
  gl_FragColor=vec4(vColor*(3.2+uFocus*2.5),vAlpha);
}
`

export const constellationStarVert = /* glsl */ `
uniform float uSize;
attribute float aOrder;
varying float vAlpha;
varying vec3 vColor;
${NOISE}
${MOTION}
void main(){
  vec3 p=displace(position,aSeed);
  float sec=uActive>=0.0?step(abs(aAffinity-uActive),0.5):0.0;
  float reveal=smoothstep(aOrder-0.06,aOrder+0.1,uConstel);
  float shine=1.0+uFocus*0.9;
  vAlpha=sec*reveal*(1.0+0.25*uFocus);
  vColor=mix(sectionColor(aAffinity),vec3(1.0),0.65+0.25*uFocus)*shine;
  vec4 mv=modelViewMatrix*vec4(p,1.0);
  float pop=reveal*(1.6-0.6*reveal);
  gl_PointSize=clamp(uSize*(5.2+2.5*uFocus)*(34.0/-mv.z),14.0,80.0)*pop;
  gl_Position=projectionMatrix*mv;
}
`

export const constellationStarFrag = /* glsl */ `
precision highp float;
uniform float uFocus;
varying float vAlpha;
varying vec3 vColor;
void main(){
  vec2 c=gl_PointCoord-0.5;
  float d=length(c)*2.0;
  float core=pow(max(0.0,1.0-d),3.0);
  float fx=pow(max(0.0,1.0-abs(c.x)*4.0),6.0)*max(0.0,1.0-abs(c.y)*3.0);
  float fy=pow(max(0.0,1.0-abs(c.y)*4.0),6.0)*max(0.0,1.0-abs(c.x)*3.0);
  float a=min(core+0.7*(fx+fy),1.0);
  gl_FragColor=vec4(mix(vColor,vec3(1.0),core)*(2.0+1.2*core+uFocus),a*vAlpha);
  if(gl_FragColor.a<0.01) discard;
}
`
