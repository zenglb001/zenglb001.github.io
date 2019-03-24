let shaderCloudySkyboxInc = `
#ifdef GL_ES
precision highp float;
#endif

#define PI 3.14159265359
vec4 saturate( in vec4 a){return clamp(a, 0.0,1.0);}
vec3 saturate( in vec3 a){return clamp(a, 0.0,1.0);}
vec2 saturate( in vec2 a){return clamp(a, 0.0,1.0);}
float saturate( in float a){return clamp(a, 0.0,1.0);}

// Normal
varying vec2 vUV;
varying vec4 vPosition;
varying vec3 vNormal;

//Interpolants
varying vec4 Interpolants_suvpack0;
varying vec4 Interpolants_suvpack1;
varying vec4 Interpolants_suvpack2;
varying vec4 Interpolants_suvpack3;
varying float Interpolants_CloudFade_Phase;

// Uniforms
uniform mat4 inverseViewProjection;

uniform vec2 P_CloudUV;
uniform float P_UvPow;
uniform float P_CloudSpeed;
uniform float P_CloudScale;
uniform float P_CloudCover;

vec3 GetWorldPos(vec2 screenUV)
{
    vec2 clipSpacePlane = screenUV * 2.0 - 1.0;
    vec4 posH = vec4(clipSpacePlane, 1.0, 1.0); //far
    vec4 posM = inverseViewProjection * posH;
    posM /= posM.w;
    return posM.xyz;
}
`
let shaderCloudySkybox = {
VS : shaderCloudySkyboxInc + `
// Attributes
attribute vec3 position;
attribute vec2 uv;
attribute vec3 normal;

// Uniforms
uniform mat4 worldViewProjection;

vec2 GetCloudUvMMM(vec3 vertexM, float speed, float scale, vec2 _CloudUV, float _UvPow)
{
	vec3 vertnorm = normalize(vertexM);
    vec2 vertuv   = vertnorm.xz / pow(abs(vertnorm.y) + 0.1, _UvPow);

    return (vertuv + _CloudUV.xy * speed) / scale;
}

vec2 GetCloudUv(vec2 screenUV, float speed, float scale, vec2 _CloudUV, float _UvPow)
{
    vec3 xxx = GetWorldPos(screenUV);
    return GetCloudUvMMM(xxx, speed, scale, _CloudUV, _UvPow);
}

float GetCloudFade(float z)
{
	return saturate(z*z*z * 200.0);
}

void main(void) {
    //vUV = uv;
    vNormal = normal;
    vPosition = vec4(position, 1.0);
    gl_Position = worldViewProjection * vPosition;

    vec2 puv = gl_Position.xy / gl_Position.w;
    puv = puv * 0.5 + 0.5;
    vUV = puv;

 	//vec2 blurdir = normalize(puv * P_CloudVLitOffset.xy + P_CloudVLitOffset.zw) * lerp(0.001f, 0.009f, saturate(View2World.z*2));;
      vec2 blurdir = vec2(0);

	 vec2 clouduv = P_CloudUV;
	 float uvpow = P_UvPow;
	 float cloudspeed = P_CloudSpeed;
	 float cloudscale = P_CloudScale;

 	Interpolants_suvpack0 = vec4(GetCloudUv(puv + blurdir * 0.0, cloudspeed, cloudscale, clouduv, uvpow), GetCloudUv(puv + blurdir * 1.0, cloudspeed, cloudscale, clouduv, uvpow));
 	Interpolants_suvpack1 = vec4(GetCloudUv(puv + blurdir * 2.0, cloudspeed, cloudscale, clouduv, uvpow), GetCloudUv(puv + blurdir * 3.0, cloudspeed, cloudscale, clouduv, uvpow));
 	Interpolants_suvpack2 = vec4(GetCloudUv(puv + blurdir * 4.0, cloudspeed, cloudscale, clouduv, uvpow), GetCloudUv(puv + blurdir * 5.0, cloudspeed, cloudscale, clouduv, uvpow));
 	Interpolants_suvpack3 = vec4(GetCloudUv(puv + blurdir * 6.0, cloudspeed, cloudscale, clouduv, uvpow), GetCloudUv(puv + blurdir * 7.0, cloudspeed, cloudscale, clouduv, uvpow));

    vec3 View2World = normalize(position);
 	Interpolants_CloudFade_Phase = GetCloudFade(View2World.y);
}
`
,
FS : shaderCloudySkyboxInc + `
// Refs
uniform sampler2D NoiseTextureSampler;
uniform mat4 world;

float GetCloudDensity(vec4 clTexColor, float _CloudCover)
{
	// blend 4 channel of the cloud texture according to cloud cover 
	float cv = _CloudCover;
	vec4 vDensity = abs(cv - vec4(0.25, 0.5, 0.75, 1.0)) / 0.25;
	vDensity = saturate(1.0 - vDensity);

	float finalDensity = dot(clTexColor, vDensity);
	return finalDensity;
}

void main(void) {

    //if(GetWorldPos(vUV).y < 0.0)
    //    discard;

    if(Interpolants_CloudFade_Phase < 0.00001)
        discard;
    
    float CloudCover = P_CloudCover;
    float orgDensity = GetCloudDensity(texture2D(NoiseTextureSampler, Interpolants_suvpack0.xy), CloudCover);
    float clDensity = orgDensity;
    clDensity += GetCloudDensity(texture2D(NoiseTextureSampler, Interpolants_suvpack0.zw), CloudCover); // 1
    clDensity += GetCloudDensity(texture2D(NoiseTextureSampler, Interpolants_suvpack1.xy), CloudCover); // 2
    clDensity += GetCloudDensity(texture2D(NoiseTextureSampler, Interpolants_suvpack1.zw), CloudCover); // 3
    clDensity += GetCloudDensity(texture2D(NoiseTextureSampler, Interpolants_suvpack2.xy), CloudCover); // 4
    clDensity += GetCloudDensity(texture2D(NoiseTextureSampler, Interpolants_suvpack2.zw), CloudCover); // 5
    clDensity += GetCloudDensity(texture2D(NoiseTextureSampler, Interpolants_suvpack3.xy), CloudCover); // 6
    clDensity += GetCloudDensity(texture2D(NoiseTextureSampler, Interpolants_suvpack3.zw), CloudCover); // 7
    clDensity /= 8.0;
    clDensity = saturate(clDensity);

    float LightDirEstOpticalDepth = mix(0.0, 3.0, clDensity);
    float LightdirTransmittance = exp(-LightDirEstOpticalDepth);
    
    vec3 SkyColor = vec3(0.2,0.3,0.55);
    vec3 mainLit = vec3(5);//DirectionalInscatterColor * Interpolants.CloudFade_Phase.y;
	vec3 ambientLit = SkyColor;
	vec3 CloudColor = ambientLit *0.71 + LightdirTransmittance * mainLit;
	float Cloudness = orgDensity * Interpolants_CloudFade_Phase;
    

    vec3 FinalColor = mix(SkyColor, CloudColor, Cloudness);
    gl_FragColor 		= vec4(FinalColor,1.0);

    //gl_FragColor = vec4(Interpolants_CloudFade_Phase,0.0,0.0,1.0);

    // if(Interpolants_CloudFade_Phase<0.00001)
    // {
    //     gl_FragColor 		= vec4(1.0);
    // }
    // else
    // {
    //     gl_FragColor 		= vec4(0.0,0.0,0.0,1.0);
    // }
}    
`,
create : function(scene) {
    let shaderName = "cloudySkybox";
    BABYLON.Effect.ShadersStore[shaderName + "VertexShader"] = this.VS;
    BABYLON.Effect.ShadersStore[shaderName + "FragmentShader"] = this.FS;
    
    let mtl = new BABYLON.ShaderMaterial(shaderName, scene, {
        vertexElement: shaderName,
        fragmentElement: shaderName,
    },
    {
        attributes: ["position", "normal", "uv"],
        uniforms: ["world", "worldView", "worldViewProjection", "view", "projection","inverseViewProjection"],
        samplers: ["NoiseTextureSampler"],
    });
    mtl.backFaceCulling = false;
    return mtl;
}
};