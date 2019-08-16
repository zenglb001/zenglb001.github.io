
var RTSize = 512;
let ShaderCommon = (function(){/**
ivec2 texsize = ivec2(512,512);
**/}).toString().slice(15,-5);

let VS_Shader = ShaderCommon + (function(){/**
  varying vec2 vUV;
  void main() {
    vUV = gl_Vertex.xy * 0.5 + 0.5;
    gl_Position = vec4(gl_Vertex.xyz, 1.0);
  }
**/}).toString().slice(15,-5);

let PS_Copy = ShaderCommon + (function(){/**
  uniform sampler2D uSampler;
  varying vec2 vUV;
  void main() {
    gl_FragColor = texture2D(uSampler,vUV);
  }
**/}).toString().slice(15,-5);

let PS_Clear = ShaderCommon + (function(){/**
  void main() {
    gl_FragColor = vec4(0.0,0.0,0.0,0.0);
  }
**/}).toString().slice(15,-5);

//ps_advect
let PS_Advect = ShaderCommon + (function(){/**
precision highp float;
varying vec2 vUV;

uniform sampler2D uSampler;
uniform float uDeltaTime;

void main(){
    vec4 col = texture2D(uSampler,vUV);
    vec2 duv = col.xy * vec2(texsize.y/texsize.x,1.0) * uDeltaTime; 
    gl_FragColor = vec4(texture2D(uSampler,vUV - duv).xy,0.0,1.0);
}
**/}).toString().slice(15,-5);

//ps_fluid
let PS_Fluid= ShaderCommon + (function(){/**
precision mediump float;
varying vec2 vUV;
uniform sampler2D uSampler; //Color Texture RGB
uniform sampler2D uSampler1; //Velocity texture2D RG32F

uniform float uDeltaTime;

//uniform float uForceExponent;
//uniform vec2 uForceOrigin;
//uniform float uTime;

void main(){
    //color advection
    vec2 delta = texture2D(uSampler1,vUV).xy  * uDeltaTime;
    vec3 color =texture2D(uSampler,vUV - delta).xyz;

    //color added
    // vec3 dye = clamp(sin(uTime * vec3(2.72, 5.12, 4.98))+0.5,0.0,1.0);
    // float amp = exp(-uForceExponent * distance(uForceOrigin, vUV));
    // color = mix(color, dye,  clamp(amp * 100.0,0.0,1.0));

    gl_FragColor = vec4(color,1.0);
}
**/}).toString().slice(15,-5);

//ps_force
let PS_Force = ShaderCommon + (function(){/**
precision highp float;
varying vec2 vUV;

uniform sampler2D uSampler; //W_in 2D
uniform float uDeltaTime;

//map to [0,1.0]
// uniform vec2 uForceOrigin;
// uniform vec2 uForceVector;
uniform vec3 uForceOrigin;
uniform vec3 uForceVector;
uniform float uForceExponent;

 //W_out 2D
void main(){
    vec4 col = texture2D(uSampler,vUV);
    vec2 pos = vUV;
    float amp = exp(-uForceExponent * distance(uForceOrigin.xy,pos));
    gl_FragColor = vec4(col.xy + uForceVector.xy * amp,0.0,1.0);
}
**/}).toString().slice(15,-5);

//ps_jacobi1d
let PS_Jacobi1d = ShaderCommon + (function(){/**
precision highp float;
varying vec2 vUV;
uniform sampler2D uSampler; //1D X1
uniform sampler2D uSampler1;//1D B1

uniform float uAlpha;
uniform float uBeta;

void main(){
    //ivec2 texsize = textureSize(uSampler,0);
    float uoff = 1.0 / float(texsize.x);
    float voff = 1.0 / float(texsize.y);

    float x1 = texture2D(uSampler,vUV - vec2(uoff,0)).x;
    float x2 = texture2D(uSampler,vUV + vec2(uoff,0)).x;
    float y1 = texture2D(uSampler,vUV - vec2(0,voff)).x;
    float y2 = texture2D(uSampler,vUV + vec2(0,voff)).x;

    float b1 = texture2D(uSampler1,vUV).x;

    gl_FragColor = vec4((x1 + x2 +y1+y2 + uAlpha *b1) / uBeta, 0.0, 0.0, 1.0);
}
**/}).toString().slice(15,-5);

//ps_jacobi2d
let PS_Jacobi2d = ShaderCommon + (function(){/**
precision mediump float;
varying vec2 vUV;

uniform sampler2D uSampler; //2D X2
uniform sampler2D uSampler1;//2D B2

uniform float uAlpha;
uniform float uBeta;

void main(){
    //ivec2 texsize = textureSize(uSampler,0);
    float uoff = 1.0/ float(texsize.x);
    float voff = 1.0 / float(texsize.y);

    vec2 x1 = texture2D(uSampler,vUV - vec2(uoff,0)).xy;
    vec2 x2 = texture2D(uSampler,vUV + vec2(uoff,0)).xy;
    vec2 y1 = texture2D(uSampler,vUV - vec2(0,voff)).xy;
    vec2 y2 = texture2D(uSampler,vUV + vec2(0,voff)).xy;

    vec2 b1 = texture2D(uSampler1,vUV).xy;

    gl_FragColor = vec4((x1 + x2 +y1+y2 + uAlpha *b1) / uBeta,0.0,1.0);
}
**/}).toString().slice(15,-5);

//ps_projfinish
let PS_ProjFinish = ShaderCommon + (function(){/**
precision mediump float;
varying vec2 vUV;

uniform sampler2D uSampler; //1D P_in
uniform sampler2D uSampler1; //2D W_in

void main(){
    //ivec2 texsize = textureSize(uSampler,0);
    float uoff = 1.0 / float(texsize.x);
    float voff = 1.0 / float(texsize.y);

    float p1 = texture2D(uSampler,vUV - vec2(uoff,0)).x;
    float p2 = texture2D(uSampler,vUV + vec2(uoff,0)).x;
    float p3 = texture2D(uSampler,vUV - vec2(0,voff)).x;
    float p4 = texture2D(uSampler,vUV + vec2(0,voff)).x;

    vec2 u = texture2D(uSampler1,vUV).xy - vec2(p2-p1,p4-p3) /(2.0 * voff);

    gl_FragColor = vec4(u,0.0,1.0);
}
**/}).toString().slice(15,-5);

//ps_projsetup
let PS_ProjSetup = ShaderCommon + (function(){/**
precision highp float;
varying vec2 vUV;

uniform sampler2D uSampler; //W_in 2D 

//DivW_out 1D
void main(){
    //ivec2 texsize = textureSize(uSampler,0);
    float uoff = 1.0/ float(texsize.x);
    float voff = 1.0 / float(texsize.y);


    float x1 = texture2D(uSampler,vUV + vec2(uoff,0)).x;
    float x2 = texture2D(uSampler,vUV - vec2(uoff,0)).x;

    float y1 = texture2D(uSampler,vUV + vec2(0,voff)).y;
    float y2 = texture2D(uSampler,vUV - vec2(0,voff)).y;

    float v =  (x1 - x2 + y1 - y2) / (2.0 * uoff);
    gl_FragColor = vec4(vec2(v,v),0.0,1.0);
}
**/}).toString().slice(15,-5);

function SFluid() {
    this.quad = GL.Mesh.plane();

    //RTShader
    this.texV1  = new GL.Texture(RTSize, RTSize, { type: gl.FLOAT }); //RG32F
    this.texV2  = new GL.Texture(RTSize, RTSize, { type: gl.FLOAT }); //RG32F
    this.texV3  = new GL.Texture(RTSize, RTSize, { type: gl.FLOAT }); //RG32F
    this.texP1  = new GL.Texture(RTSize, RTSize, { type: gl.FLOAT }); //R32F
    this.texP2  = new GL.Texture(RTSize, RTSize, { type: gl.FLOAT }); //R32F
    if ((!this.texV1.canDrawTo()) && GL.Texture.canUseHalfFloatingPointTextures()) {
      this.texV1  = new GL.Texture(RTSize, RTSize, { type: gl.HALF_FLOAT_OES }); //RG32F
      this.texV2  = new GL.Texture(RTSize, RTSize, { type: gl.HALF_FLOAT_OES }); //RG32F
      this.texV3  = new GL.Texture(RTSize, RTSize, { type: gl.HALF_FLOAT_OES }); //RG32F
      this.texP1  = new GL.Texture(RTSize, RTSize, { type: gl.HALF_FLOAT_OES }); //R32F
      this.texP2  = new GL.Texture(RTSize, RTSize, { type: gl.HALF_FLOAT_OES }); //R32F
    }
  
  
    this.colRT1 = new GL.Texture(RTSize, RTSize); //RGBA8
    this.colRT2 = new GL.Texture(RTSize, RTSize); //RGBA8

    //init
    this.RTShaderCopy = new GL.Shader(VS_Shader, PS_Copy);
    SFluid.prototype.updateCopy = function(src, dst) {
        var this_ = this;
        dst.drawTo(function() {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            src.bind(0);
            this_.RTShaderCopy.uniforms({
                uSampler : 0,
              }).draw(this_.quad);
              src.unbind(0);
        });
    };

    this.RTShaderClear = new GL.Shader(VS_Shader, PS_Clear);
    SFluid.prototype.updateClear = function(tex) {
        var this_ = this;
        tex.drawTo(function() {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            this_.RTShaderClear.draw(this_.quad);
        });
    };

    //Advection
    this.RTShaderAdvect = new GL.Shader(VS_Shader, PS_Advect);
    SFluid.prototype.updateAdvection = function(src, dst, deltaTime) {
        var this_ = this;
        dst.drawTo(function() {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            src.bind(0);
            this_.RTShaderAdvect.uniforms({
                uDeltaTime: deltaTime,
                uSampler : 0,
              }).draw(this_.quad);
              src.unbind(0);
        });
    };

    //Jacobi
    this.RTShaderJacobi1d = new GL.Shader(VS_Shader, PS_Jacobi1d);
    SFluid.prototype.updateJacobi1d = function(src0, src1, dst, alpha, beta) {
        var this_ = this;
        dst.drawTo(function() {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            src0.bind(0);
            src1.bind(1);
            this_.RTShaderJacobi1d.uniforms({
                uSampler : 0,
                uSampler1 : 1,
                uAlpha : alpha,
                uBeta : beta,
              }).draw(this_.quad);
              src0.unbind(0);
              src1.unbind(1);
        });
    };

    this.RTShaderJacobi2d = new GL.Shader(VS_Shader, PS_Jacobi2d);
    SFluid.prototype.updateJacobi2d = function(src0, src1, dst, alpha, beta) {
        var this_ = this;
        dst.drawTo(function() {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            src0.bind(0);
            src1.bind(1);
            this_.RTShaderJacobi2d.uniforms({
                uSampler : 0,
                uSampler1 : 1,
                uAlpha : alpha,
                uBeta : beta,
              }).draw(this_.quad);
              src0.unbind(0);
              src1.unbind(1);
        });
    };

    //Force
    this.RTShaderForce = new GL.Shader(VS_Shader, PS_Force);
    SFluid.prototype.updateForce = function(src, dst, exponent, forceVec, inputVec) {
        var this_ = this;
        dst.drawTo(function() {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            src.bind(0);
            this_.RTShaderForce.uniforms({
                uSampler : 0,
                uForceExponent : exponent,
                uForceVector : forceVec,
                uForceOrigin : inputVec,
              }).draw(this_.quad);
              src.unbind(0);
        });
    };

    //Proj
    this.RTShaderProjSetup = new GL.Shader(VS_Shader, PS_ProjSetup);
    SFluid.prototype.updateProjSetup = function(src, dst) {
        var this_ = this;
        dst.drawTo(function() {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            src.bind(0);
            this_.RTShaderProjSetup.uniforms({
                uSampler : 0,
              }).draw(this_.quad);
              src.unbind(0);
        });
    };

    this.RTShaderProjFinish = new GL.Shader(VS_Shader, PS_ProjFinish);
    SFluid.prototype.updateProjFinish = function(src0, src1, dst) {
        var this_ = this;
        dst.drawTo(function() {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            src0.bind(0);
            src1.bind(1);
            this_.RTShaderProjFinish.uniforms({
                uSampler : 0,
                uSampler1 : 1,
              }).draw(this_.quad);
              src0.unbind(0);
              src1.unbind(1);
        });
    };

    //Fluid
    this.RTShaderFluid = new GL.Shader(VS_Shader, PS_Fluid);
    SFluid.prototype.updateFluid = function(src0, src1, dst, deltaTime, time, exponent, inputVec) {
        var this_ = this;
        dst.drawTo(function() {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            src0.bind(0);
            src1.bind(1);
            this_.RTShaderFluid.uniforms({
                uSampler : 0,
                uSampler1 : 1,
                uDeltaTime : deltaTime,
                //uTime : time,
                //uForceExponent : exponent,
                //uForceOrigin : inputVec,
              }).draw(this_.quad);
              src0.unbind(0);
              src1.unbind(1);
        });
    };
};
