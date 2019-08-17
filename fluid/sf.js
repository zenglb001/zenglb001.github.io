var RTSize = 512;
let ShaderCommon = (function(){/**
ivec2 texsize = ivec2(512,512);
//ivec2 texsize = textureSize(uSampler,0);

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
  //varying vec2 vUV;
  void main() {
    gl_FragColor = vec4(1.0,0.0,0.0,1.0); //texture2D(uSampler,vUV);
  }
**/}).toString().slice(15,-5);

//ps_advect
let PS_Advect = ShaderCommon + (function(){/**
precision highp float;
varying vec2 vUV;

uniform sampler2D uSampler;
uniform float uDeltaTime;

void main(){
    vec2 rdx = vec2(texsize.y/texsize.x,1.0); // 1 / grid scale

    // follow the velocity field "back in time"
    vec2 col = texture2D(uSampler,vUV).xy;
    vec2 duv = col * rdx * uDeltaTime;
    gl_FragColor = vec4(texture2D(uSampler,vUV - duv).xy,0.0,1.0);
}
**/}).toString().slice(15,-5);

//ps_force
let PS_Force = ShaderCommon + (function(){/**
precision highp float;
varying vec2 vUV;

uniform sampler2D uSampler; //W_in 2D
uniform float uDeltaTime;

//map to [0,1.0]
uniform vec3 uForceOrigin; //vec2
uniform vec3 uForceVector; //vec2
uniform float uForceExponent;

 //W_out 2D
void main(){
    vec4 col = texture2D(uSampler,vUV);
    vec2 pos = vUV;
    float amp = exp(-uForceExponent * distance(uForceOrigin.xy,pos));
    gl_FragColor = vec4(col.xy + uForceVector.xy * amp,0.0,1.0);
}
**/}).toString().slice(15,-5);

//ps_jacobi
let PS_Jacobi = ShaderCommon + (function(){/**
precision highp float;
varying vec2 vUV;
uniform sampler2D uSampler; //1D X1
uniform sampler2D uSampler1;//1D B1

uniform float uAlpha;
uniform float uBeta;

void main(){
    // left, right, bottom, and top x samples
    vec2 uvoff = 1.0 / vec2(texsize);
    vec2 wL = texture2D(uSampler, vUV - vec2(uvoff.x,0)).xy;
    vec2 wR = texture2D(uSampler, vUV + vec2(uvoff.x,0)).xy;
    vec2 wB = texture2D(uSampler, vUV - vec2(0,uvoff.y)).xy;
    vec2 wT = texture2D(uSampler, vUV + vec2(0,uvoff.y)).xy;

    // b sample, from center
    vec2 bC = texture2D(uSampler1, vUV).xy;
    // evaluate Jacobi iteration
    gl_FragColor = vec4((wL + wR + wB + wT + uAlpha * bC) / uBeta, 0.0, 1.0);
}
**/}).toString().slice(15,-5);

//ps_projdiv
let PS_ProjDiv = ShaderCommon + (function(){/**
precision highp float;
varying vec2 vUV;

uniform sampler2D uSampler; //W_in 2D 

void main(){
    vec2 uvoff = 1.0 / vec2(texsize);
    vec2 wL = texture2D(uSampler, vUV - vec2(uvoff.x,0)).xy;
    vec2 wR = texture2D(uSampler, vUV + vec2(uvoff.x,0)).xy;
    vec2 wB = texture2D(uSampler, vUV - vec2(0,uvoff.y)).xy;
    vec2 wT = texture2D(uSampler, vUV + vec2(0,uvoff.y)).xy;

    float v = 0.5 * (wR.x - wL.x + wT.y - wB.y) / (uvoff.x);
    gl_FragColor = vec4(vec2(v,v),0.0,1.0);
}
**/}).toString().slice(15,-5);

//ps_projgrad
let PS_ProjGrad = ShaderCommon + (function(){/**
precision mediump float;
varying vec2 vUV;

uniform sampler2D uSampler; //1D P_in
uniform sampler2D uSampler1; //2D W_in

void main(){
    vec2 uvoff = 1.0 / vec2(texsize);
    vec2 wL = texture2D(uSampler, vUV - vec2(uvoff.x,0)).xy;
    vec2 wR = texture2D(uSampler, vUV + vec2(uvoff.x,0)).xy;
    vec2 wB = texture2D(uSampler, vUV - vec2(0,uvoff.y)).xy;
    vec2 wT = texture2D(uSampler, vUV + vec2(0,uvoff.y)).xy;

    vec2 u = texture2D(uSampler1,vUV).xy;
    u -= 0.5 * vec2(wR.x-wL.x, wT.x-wB.x) /(uvoff.y);
    gl_FragColor = vec4(u,0.0,1.0);
}
**/}).toString().slice(15,-5);

//ps_fluid
let PS_Fluid= ShaderCommon + (function(){/**
precision mediump float;
varying vec2 vUV;
uniform sampler2D uSampler; //Color Texture RGB
uniform sampler2D uSampler1; //Velocity texture2D RG32F

uniform float uDeltaTime;

uniform float uForceExponent;
uniform vec3 uForceOrigin;
uniform float uTime;

void main(){
    //color advection
    vec2 delta = texture2D(uSampler1,vUV).xy * uDeltaTime;
    vec3 color = texture2D(uSampler,vUV - delta).xyz;

    if(uTime > 0.0)
    {
        //color added
        vec3 dye = clamp(sin(uTime * vec3(2.72, 5.12, 4.98))+0.5,0.0,1.0);
        float amp = exp(-uForceExponent * distance(uForceOrigin.xy, vUV));
        color = mix(color, dye,  clamp(amp * 100.0,0.0,1.0));
    }

    gl_FragColor = vec4(color,1.0);
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
    SFluid.prototype.updateCopy = function(dst, src) {
        var this_ = this;
        dst.drawTo(function() {
            src.bind(0);
            this_.RTShaderCopy.uniforms({
                uSampler : 0,
              }).draw(this_.quad);
              src.unbind(0);
        });
    };

    SFluid.prototype.updateClear = function(tex) {
        tex.drawTo(function() {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        });
    };

    //Advection
    this.RTShaderAdvect = new GL.Shader(VS_Shader, PS_Advect);
    SFluid.prototype.updateAdvection = function(dst, src, deltaTime) {
        var this_ = this;
        dst.drawTo(function() {
            src.bind(0);
            this_.RTShaderAdvect.uniforms({
                uDeltaTime: deltaTime,
                uSampler : 0,
              }).draw(this_.quad);
              src.unbind(0);
        });
    };

    //Jacobi
    this.RTShaderJacobi = new GL.Shader(VS_Shader, PS_Jacobi);
    SFluid.prototype.updateJacobi = function(dst, src0, src1, alpha, beta) {
        var this_ = this;
        dst.drawTo(function() {
            src0.bind(0);
            src1.bind(1);
            this_.RTShaderJacobi.uniforms({
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
    SFluid.prototype.updateForce = function(dst, src, exponent, forceVec, forceOri) {
        var this_ = this;
        dst.drawTo(function() {
            src.bind(0);
            this_.RTShaderForce.uniforms({
                uSampler : 0,
                uForceExponent : exponent,
                uForceVector : forceVec,
                uForceOrigin : forceOri,
              }).draw(this_.quad);
              src.unbind(0);
        });
    };

    //Proj
    this.RTShaderProjDiv = new GL.Shader(VS_Shader, PS_ProjDiv);
    SFluid.prototype.updateProjDiv = function(dst, src) {
        var this_ = this;
        dst.drawTo(function() {
            src.bind(0);
            this_.RTShaderProjDiv.uniforms({
                uSampler : 0,
              }).draw(this_.quad);
              src.unbind(0);
        });
    };

    this.RTShaderProjGrad = new GL.Shader(VS_Shader, PS_ProjGrad);
    SFluid.prototype.updateProjGrad = function(dst, src0, src1) {
        var this_ = this;
        dst.drawTo(function() {
            src0.bind(0);
            src1.bind(1);
            this_.RTShaderProjGrad.uniforms({
                uSampler : 0,
                uSampler1 : 1,
              }).draw(this_.quad);
              src0.unbind(0);
              src1.unbind(1);
        });
    };

    //Fluid
    this.RTShaderFluid = new GL.Shader(VS_Shader, PS_Fluid);
    SFluid.prototype.updateFluid = function(dst, src0, src1, deltaTime, time, exponent, inputVec) {
        var this_ = this;
        dst.drawTo(function() {
            src0.bind(0);
            src1.bind(1);
            this_.RTShaderFluid.uniforms({
                uSampler : 0,
                uSampler1 : 1,
                uDeltaTime : deltaTime,
                uTime : time,
                uForceExponent : exponent,
                uForceOrigin : inputVec,
              }).draw(this_.quad);
              src0.unbind(0);
              src1.unbind(1);
        });
    };
};
