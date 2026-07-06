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
uniform float uFocus;
uniform float uNodeCount;
uniform float uSpawn;
uniform float uSliderSpawn;
uniform float uRevealFrom;
uniform float uIntroPulse;
uniform float uConnect;
uniform vec3 uAccent;
uniform vec3 uSectionColors[5];
uniform vec3 uHotspots[5];
uniform float uWaveSection;
uniform float uWaveT;
attribute float aSeed;
attribute float aAffinity;
attribute float aIndex;
attribute vec3 aScatter;

float spawnEase(float t){
  t=clamp(t,0.0,1.0);
  return 1.0-pow(1.0-t,2.8);
}

// stagger < 1 and denominator (1 - stagger) guarantee t = 1 when the driver reaches 1,
// otherwise high-seed nodes get stranded mid-morph outside the brain
float particleSpawnT(float seed,float idx){
  if(idx>=uNodeCount) return 0.0;
  if(idx>=uRevealFrom){
    float band=max(uNodeCount-uRevealFrom,1.0);
    float local=(idx-uRevealFrom)/band;
    float stagger=min(seed*0.55+local*0.45,0.92);
    return clamp((uSliderSpawn-stagger)/(1.0-stagger),0.0,1.0);
  }
  float stagger=seed*0.82;
  return clamp((uSpawn-stagger)/(1.0-stagger),0.0,1.0);
}

// Curved convergence: each node arcs sideways along a seed-derived tangent while
// flying in (sin(t*PI) is 0 at both ends, so rest positions are exact)
vec3 morphedPos(vec3 target,vec3 scatter,float seed,float idx){
  float t=spawnEase(particleSpawnT(seed,idx));
  vec3 p=mix(scatter,target,t);
  vec3 dir=scatter-target;
  vec3 axis=vec3(sin(seed*12.9),0.55+seed*0.45,cos(seed*7.7));
  vec3 tangent=cross(dir,axis);
  float tl=length(tangent);
  if(tl>0.001) p+=(tangent/tl)*sin(t*3.14159265)*(0.9+seed*1.8);
  return p;
}

// Intro-branch nodes (idx < uRevealFrom) stay visible while scattered so the
// opening shows a field of drifting particles; slider-band nodes hide until spawned
bool hideParticle(float idx){
  if(idx>=uNodeCount) return true;
  if(idx>=uRevealFrom) return particleSpawnT(aSeed,idx)<=0.001;
  return false;
}

vec3 displace(vec3 pos, float seed, float morph){
  float k=morph*morph;
  float t=uTime*0.05;
  vec3 p=pos;
  p+=0.04*k*vec3(
    snoise(pos*0.32+vec3(t,13.7,0.0)),
    snoise(pos*0.32+vec3(0.0,t+37.2,7.1)),
    snoise(pos*0.32+vec3(29.3,0.0,t+91.7))
  );
  // Slow ambient drift while still scattered (fades out as the node settles)
  p+=(1.0-k)*0.5*vec3(
    sin(uTime*0.31+seed*11.0),
    sin(uTime*0.24+seed*23.0+2.1),
    sin(uTime*0.28+seed*17.0+4.4)
  );
  p+=0.012*k*vec3(
    sin(uTime*(1.2+seed*1.6)+seed*6.2831853),
    sin(uTime*(1.0+seed*1.3)+seed*4.7),
    sin(uTime*(1.4+seed*1.1)+seed*2.3)
  );
  p.x+=uMouse.x*0.05*k*(0.3+seed*0.7);
  p.y+=uMouse.y*0.05*k*(0.3+seed*0.7);
  return p;
}

// Expanding spherical shockwave from a lobe hotspot; ph 0..1 sweeps the whole
// brain (max hotspot-to-far-side distance ~7), fading as it travels outward.
// The sin shimmer makes the wavefront ragged/organic instead of a clean shell.
float waveFront(vec3 pos,vec3 origin,float ph,float sharp){
  float d=distance(pos,origin);
  float w=exp(-sharp*abs(d-ph*7.0))*(1.0-ph)*(1.0-ph);
  w*=0.7+0.5*sin(dot(pos,vec3(2.3,1.9,2.7))+uTime*1.6);
  return max(w,0.0);
}

// Ambient brain activity: one subtle wave at a time, source rotating between
// lobes — same shockwave concept as hover, dialed way down
vec3 brainActivity(vec3 pos){
  float cyc=uTime*0.09;
  int src=int(mod(floor(cyc),5.0));
  vec3 act=uSectionColors[src]*waveFront(pos,uHotspots[src],fract(cyc),3.0)*0.5;
  if(uWaveSection>=0.0&&uWaveT<0.999){
    int wi=int(uWaveSection+0.5);
    act+=uSectionColors[wi]*waveFront(pos,uHotspots[wi],uWaveT,4.0)*2.2;
  }
  return act;
}

float targetMix(float affinity){
  float sel=uHovered>=0.0?uHovered:uActive;
  if(sel<0.0) return -1.0;
  return step(abs(affinity-sel),0.5);
}

vec3 sectionColor(float affinity){
  return affinity>=0.0?uSectionColors[int(affinity+0.5)]:uAccent;
}

// Position + depth + seed palette — warm cortex, cooler deep matter
vec3 nodePalette(vec3 pos, float seed, float aff, float depth){
  float d=clamp(depth*0.11,0.0,1.0);
  float radial=length(pos-vec3(0.0,0.12,0.0));
  float cortex=smoothstep(0.62,1.18,radial);
  float n=snoise(pos*0.22+seed*4.1)*0.5+0.5;
  float t=fract(pos.y*0.09+pos.x*0.06+pos.z*0.05+n*0.35+seed*0.28);
  vec3 deep=vec3(0.38,0.28,0.52);
  vec3 cort=vec3(0.94,0.62,0.78);
  vec3 c1=mix(deep,cort,cortex*0.85);
  vec3 c2=vec3(0.42,0.52,0.88);
  vec3 c3=vec3(0.38,0.72,0.82);
  vec3 c4=vec3(0.72,0.38,0.86);
  vec3 col=t<0.33?mix(c1,c2,t*3.0):(t<0.66?mix(c2,c3,(t-0.33)*3.0):mix(c3,c4,(t-0.66)*3.0));
  col=mix(col*0.52,col*1.02,1.0-d);
  col*=0.72+0.22*seed;
  col=mix(col,uAccent,0.06);
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
  if(hideParticle(aIndex)){
    gl_Position=vec4(2.0,2.0,2.0,1.0);
    gl_PointSize=0.0;
    return;
  }
  vec3 anchor=morphedPos(position,aScatter,aSeed,aIndex);
  float morph=spawnEase(particleSpawnT(aSeed,aIndex));
  vec3 p=displace(anchor,aSeed,morph);
  float tm=targetMix(aAffinity);
  float hasSel=tm>=0.0?1.0:0.0;
  float isT=max(tm,0.0);
  float emphasis=max(uDim,uFocus);
  if(emphasis<0.02&&uHovered>=0.0&&hasSel>0.5) emphasis=0.48;
  float bright=mix(0.92,mix(0.55,1.45,isT),emphasis*hasSel);
  float pulse=0.96+0.04*sin(uTime*2.5+aSeed*6.2831853);
  vGlow=bright*(1.0+uFocus*0.18*isT)*(1.0+uIntroPulse*0.35);
  vAlpha=(0.5+0.38*aSeed)*pulse*mix(0.4,1.0,morph);
  vAlpha*=mix(1.0,0.35,uFocus*(1.0-isT)*hasSel);
  vec4 mv=modelViewMatrix*vec4(p,1.0);
  vec3 baseCol=nodePalette(position,aSeed,aAffinity,-mv.z);
  float lit=isT*hasSel*min(emphasis*1.6,1.0);
  vColor=mix(baseCol,sectionColor(aAffinity)*1.5,lit);
  float grey=(1.0-isT)*hasSel*uFocus;
  vColor=mix(vColor,vec3(0.38,0.4,0.48),grey*0.55);
  vec3 act=brainActivity(position)*morph*uConnect*(1.0-uFocus*0.75);
  vColor+=act*1.35;
  vGlow+=dot(act,vec3(0.5));
  float px=uSize*(0.82+aSeed*0.38)*(28.0/-mv.z);
  gl_PointSize=clamp(px,1.8,5.5);
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
  if(d>1.0) discard;
  // Tight disk — no wide soft halo
  float disk=1.0-smoothstep(0.62,1.0,d);
  // Pin-point catch light at center only
  float pin=pow(max(0.0,1.0-d*2.6),14.0);
  vec3 col=vColor*vGlow;
  col+=pin*0.42;
  gl_FragColor=vec4(col,disk*vAlpha);
  if(gl_FragColor.a<0.02) discard;
}
`

export const connectionVert = /* glsl */ `
varying float vAlpha;
varying vec3 vColor;
${NOISE}
${MOTION}
void main(){
  if(uConnect<0.01||hideParticle(aIndex)){
    gl_Position=vec4(2.0,2.0,2.0,1.0);
    return;
  }
  vec3 anchor=morphedPos(position,aScatter,aSeed,aIndex);
  float morph=spawnEase(particleSpawnT(aSeed,aIndex));
  vec3 p=displace(anchor,aSeed,morph);
  float tm=targetMix(aAffinity);
  float hasSel=tm>=0.0?1.0:0.0;
  float isT=max(tm,0.0);
  float emphasis=max(uDim,uFocus);
  if(emphasis<0.02&&uHovered>=0.0&&hasSel>0.5) emphasis=0.48;
  float bright=mix(0.85,mix(0.4,1.25,isT),emphasis*hasSel);
  float pulse=0.78+0.22*sin(uTime*1.3+aSeed*6.2831853);
  vAlpha=0.07*(0.35+0.5*pulse)*bright*uConnect;
  vAlpha*=mix(1.0,0.32,uFocus*(1.0-isT)*hasSel);
  vAlpha*=smoothstep(0.82,1.0,morph);
  vec4 mv=modelViewMatrix*vec4(p,1.0);
  vec3 baseCol=nodePalette(position,aSeed,aAffinity,-mv.z);
  float lit=isT*hasSel*min(emphasis*1.5,1.0);
  vColor=mix(baseCol,sectionColor(aAffinity)*1.2,lit);
  float grey=(1.0-isT)*hasSel*uFocus;
  vColor=mix(vColor,vec3(0.36,0.38,0.46),grey*0.55);
  vColor+=brainActivity(position)*0.7*morph*uConnect*(1.0-uFocus*0.75);
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
