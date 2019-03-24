let voxelCloud_Main = {
    VS : voxelCloudInc + `
    // Attributes
    attribute vec3 position;
    attribute vec2 uv;
    attribute vec3 normal;

    // Uniforms
    uniform mat4 worldViewProjection;

    void main(void) {
        //vUV = uv;
        vNormal = normal;
        vPosition = vec4(position, 1.0);
        gl_Position = worldViewProjection * vPosition;

        vec2 puv = gl_Position.xy / gl_Position.w;
        puv = puv * 0.5 + 0.5;
        vUV = puv;
    }
    `
    ,
    FS : voxelCloudInc + `

    uniform mat4 world;

    uniform sampler2D NoiseDetailSampler;
    uniform sampler2D NoiseShapeSampler;

    uniform float iTime;
    uniform float TexResolution;

    #define CLOUD_MARCH_STEPS 12
    #define CLOUD_SELF_SHADOW_STEPS 6

    #define EARTH_RADIUS    (1500000.) // (6371000.)
    #define CLOUDS_BOTTOM   (1350.)
    #define CLOUDS_TOP      (2150.)

    #define CLOUDS_LAYER_BOTTOM   (-150.)
    #define CLOUDS_LAYER_TOP      (-70.)

    #define CLOUDS_COVERAGE (.52)
    #define CLOUDS_LAYER_COVERAGE (.41)

    #define CLOUDS_DETAIL_STRENGTH (.2)
    #define CLOUDS_BASE_EDGE_SOFTNESS (.1)
    #define CLOUDS_BOTTOM_SOFTNESS (.25)
    #define CLOUDS_DENSITY (.03)
    #define CLOUDS_SHADOW_MARGE_STEP_SIZE (10.)
    #define CLOUDS_LAYER_SHADOW_MARGE_STEP_SIZE (4.)
    #define CLOUDS_SHADOW_MARGE_STEP_MULTIPLY (1.3)
    #define CLOUDS_FORWARD_SCATTERING_G (.8)
    #define CLOUDS_BACKWARD_SCATTERING_G (-.2)
    #define CLOUDS_SCATTERING_LERP (.5)

    #define CLOUDS_AMBIENT_COLOR_TOP (vec3(149., 167., 200.)*(1.5/255.))
    #define CLOUDS_AMBIENT_COLOR_BOTTOM (vec3(39., 67., 87.)*(1.5/255.))
    #define CLOUDS_MIN_TRANSMITTANCE .1

    #define CLOUDS_BASE_SCALE 1.51
    #define CLOUDS_DETAIL_SCALE 20.

    //
    // Cloud shape modelling and rendering 
    //
    float HenyeyGreenstein( float sundotrd, float g) {
        float gg = g * g;
        return (1. - gg) / pow( 1. + gg - 2. * g * sundotrd, 1.5);
    }

    float interectCloudSphere( vec3 rd, float r ) {
        float b = EARTH_RADIUS * rd.y;
        float d = b * b + r * r + 2. * EARTH_RADIUS * r;
        return -b + sqrt( d );
    }

    float linearstep( const float s, const float e, float v ) {
        return clamp( (v-s)*(1./(e-s)), 0., 1. );
    }

    float linearstep0( const float e, float v ) {
        return min( v*(1./e), 1. );
    }

    float remap(float v, float s, float e) {
        return (v - s) / (e - s);
    }

    float cloudMapBase(vec3 p, float norY) {
        vec3 uv = p * (0.00005 * CLOUDS_BASE_SCALE);
        vec3 cloud = texture(NoiseShapeSampler, uv.xz).rgb;
    
        float n = norY*norY;
        n *= cloud.b ;
            n+= pow(1.-norY, 16.); 
        return remap( cloud.r - n, cloud.g, 1.);
    }

    float cloudMapDetail(vec3 p) { 
        // 3d lookup in 2d texture :(
        p = abs(p) * (0.0016 * CLOUDS_BASE_SCALE * CLOUDS_DETAIL_SCALE);
    
        float yi = mod(p.y,32.);
        ivec2 offset = ivec2(mod(yi,8.), mod(floor(yi/8.),4.))*34 + 1;
        float a = texture(NoiseDetailSampler, (mod(p.xz,32.)+vec2(offset.xy)+1.)/vec2(TexResolution)).r;
        
        yi = mod(p.y+1.,32.);
        offset = ivec2(mod(yi,8.), mod(floor(yi/8.),4.))*34 + 1;
        float b = texture(NoiseDetailSampler, (mod(p.xz,32.)+vec2(offset.xy)+1.)/vec2(TexResolution)).r;
        
        return mix(a,b,fract(p.y));
    }

    float cloudGradient( float norY ) {
        return linearstep( 0., .05, norY ) - linearstep( .8, 1.2, norY);
    }

    float cloudMap(vec3 pos, vec3 rd, float norY) {
        vec3 ps = pos;
        
        float m = cloudMapBase(ps, norY);
        m *= cloudGradient( norY );

        float dstrength = smoothstep(1., 0.5, m);
        
        // erode with detail
        if(dstrength > 0.) {
            m -= cloudMapDetail( ps ) * dstrength * CLOUDS_DETAIL_STRENGTH;
        }

        m = smoothstep( 0., CLOUDS_BASE_EDGE_SOFTNESS, m+(CLOUDS_COVERAGE-1.) );
        m *= linearstep0(CLOUDS_BOTTOM_SOFTNESS, norY);

        return clamp(m * CLOUDS_DENSITY * (1.+max((ps.x-7000.)*0.005,0.)), 0., 1.);
    }

    float volumetricShadow(in vec3 from, in float sundotrd ) {
        float dd = CLOUDS_SHADOW_MARGE_STEP_SIZE;
        vec3 rd = SUN_DIR;
        float d = dd * .5;
        float shadow = 1.0;

        for(int s=0; s<CLOUD_SELF_SHADOW_STEPS; s++) {
            vec3 pos = from + rd * d;
            float norY = (length(pos) - (EARTH_RADIUS + CLOUDS_BOTTOM)) * (1./(CLOUDS_TOP - CLOUDS_BOTTOM));

            if(norY > 1.) return shadow;

            float muE = cloudMap( pos, rd, norY );
            shadow *= exp(-muE * dd);

            dd *= CLOUDS_SHADOW_MARGE_STEP_MULTIPLY;
            d += dd;
        }
        return shadow;
    }

    vec4 renderClouds( vec3 ro, vec3 rd, inout float dist ) {
        if( rd.y < 0. ) {
            return vec4(0,0,0,10);
        }

        ro.xz *= SCENE_SCALE;
        ro.y = sqrt(EARTH_RADIUS*EARTH_RADIUS-dot(ro.xz,ro.xz));

        float start = interectCloudSphere( rd, CLOUDS_BOTTOM );
        float end  = interectCloudSphere( rd, CLOUDS_TOP );
        
        if (start > dist) {
            return vec4(0,0,0,10);
        }
        
        end = min(end, dist);
        
        float sundotrd = dot( rd, -SUN_DIR);

        // raymarch
        float d = start;
        float dD = (end-start) / float(CLOUD_MARCH_STEPS);

        float h = hash13(rd + fract(iTime) );
        d -= dD * h;

        float scattering =  mix( HenyeyGreenstein(sundotrd, CLOUDS_FORWARD_SCATTERING_G),
            HenyeyGreenstein(sundotrd, CLOUDS_BACKWARD_SCATTERING_G), CLOUDS_SCATTERING_LERP );

        float transmittance = 1.0;
        vec3 scatteredLight = vec3(0.0, 0.0, 0.0);

        dist = EARTH_RADIUS;

        for(int s=0; s<CLOUD_MARCH_STEPS; s++) {
            vec3 p = ro + d * rd;

            float norY = clamp( (length(p) - (EARTH_RADIUS + CLOUDS_BOTTOM)) * (1./(CLOUDS_TOP - CLOUDS_BOTTOM)), 0., 1.);

            float alpha = cloudMap( p, rd, norY );

            if( alpha > 0. ) {
                dist = min( dist, d);
                vec3 ambientLight = mix( CLOUDS_AMBIENT_COLOR_BOTTOM, CLOUDS_AMBIENT_COLOR_TOP, norY );

                vec3 S = (ambientLight + SUN_COLOR * (scattering * volumetricShadow(p, sundotrd))) * alpha;
                float dTrans = exp(-alpha * dD);
                vec3 Sint = (S - S * dTrans) * (1. / alpha);
                scatteredLight += transmittance * Sint; 
                transmittance *= dTrans;
            }

            if( transmittance <= CLOUDS_MIN_TRANSMITTANCE ) break;

            d += dD;
        }

        return vec4(scatteredLight, transmittance);
    }

    //
    //
    // !Because I wanted a second cloud layer (below the horizon), I copy-pasted 
    // almost all of the code above:
    //

    float cloudMapLayer(vec3 pos, vec3 rd, float norY) {
        vec3 ps = pos;

        float m = cloudMapBase(ps, norY);
        // m *= cloudGradient( norY );
        float dstrength = smoothstep(1., 0.5, m);
        
        // erode with detail
        if (dstrength > 0.) {
            m -= cloudMapDetail( ps ) * dstrength * CLOUDS_DETAIL_STRENGTH;
        }

        m = smoothstep( 0., CLOUDS_BASE_EDGE_SOFTNESS, m+(CLOUDS_LAYER_COVERAGE-1.) );

        return clamp(m * CLOUDS_DENSITY, 0., 1.);
    }

    float volumetricShadowLayer(in vec3 from, in float sundotrd ) {
        float dd = CLOUDS_LAYER_SHADOW_MARGE_STEP_SIZE;
        vec3 rd = SUN_DIR;
        float d = dd * .5;
        float shadow = 1.0;

        for(int s=0; s<CLOUD_SELF_SHADOW_STEPS; s++) {
            vec3 pos = from + rd * d;
            float norY = clamp( (pos.y - CLOUDS_LAYER_BOTTOM ) * (1./(CLOUDS_LAYER_TOP - CLOUDS_LAYER_BOTTOM)), 0., 1.);

            if(norY > 1.) return shadow;

            float muE = cloudMapLayer( pos, rd, norY );
            shadow *= exp(-muE * dd);

            dd *= CLOUDS_SHADOW_MARGE_STEP_MULTIPLY;
            d += dd;
        }
        return shadow;
    }

    vec4 renderCloudLayer( vec3 ro, vec3 rd, inout float dist ) {
        if( rd.y > 0. ) {
            return vec4(0,0,0,10);
        }

        ro.xz *= SCENE_SCALE;
        ro.y = 0.;

        float start = CLOUDS_LAYER_TOP/rd.y;
        float end  = CLOUDS_LAYER_BOTTOM/rd.y;
        
        if (start > dist) {
            return vec4(0,0,0,10);
        }
        
        end = min(end, dist);
        
        float sundotrd = dot( rd, -SUN_DIR);

        // raymarch
        float d = start;
        float dD = (end-start) / float(CLOUD_MARCH_STEPS);

        float h = hash13(rd + fract(iTime) );
        d -= dD * h;

        float scattering =  mix( HenyeyGreenstein(sundotrd, CLOUDS_FORWARD_SCATTERING_G),
            HenyeyGreenstein(sundotrd, CLOUDS_BACKWARD_SCATTERING_G), CLOUDS_SCATTERING_LERP );

        float transmittance = 1.0;
        vec3 scatteredLight = vec3(0.0, 0.0, 0.0);

        dist = EARTH_RADIUS;

        for(int s=0; s<CLOUD_MARCH_STEPS; s++) {
            vec3 p = ro + d * rd;

            float norY = clamp( (p.y - CLOUDS_LAYER_BOTTOM ) * (1./(CLOUDS_LAYER_TOP - CLOUDS_LAYER_BOTTOM)), 0., 1.);

            float alpha = cloudMapLayer( p, rd, norY );

            if( alpha > 0. ) {
                dist = min( dist, d);
                vec3 ambientLight = mix( CLOUDS_AMBIENT_COLOR_BOTTOM, CLOUDS_AMBIENT_COLOR_TOP, norY );

                vec3 S = .7 * (ambientLight +  SUN_COLOR * (scattering * volumetricShadowLayer(p, sundotrd))) * alpha;
                float dTrans = exp(-alpha * dD);
                vec3 Sint = (S - S * dTrans) * (1. / alpha);
                scatteredLight += transmittance * Sint; 
                transmittance *= dTrans;
            }

            if( transmittance <= CLOUDS_MIN_TRANSMITTANCE ) break;

            d += dD;
        }

        return vec4(scatteredLight, transmittance);
    }
      
    void main(void) {
        float dist = 100000.;//texelFetch(iChannel2, ivec2(fragCoord),0).w * SCENE_SCALE;
        vec4 col = vec4(0,0,0,1);
        
        vec3 ro, rd;
        rd = normalize( vec3( world * vPosition ) );
        ro = vec3(0.0); //for simple

        if( rd.y > 0. ) {
            // clouds
            col = renderClouds(ro, rd, dist);
        } 

        vec3 SkyColor = vec3(0.2,0.3,0.55);
        vec3 FinalColor = mix(col.rgb, SkyColor, col.a);
        gl_FragColor = vec4(FinalColor, 1.0);
    }
    `,
    create : function(scene) {
        let shaderName = "voxelCloud_Main";
        BABYLON.Effect.ShadersStore[shaderName + "VertexShader"] = this.VS;
        BABYLON.Effect.ShadersStore[shaderName + "FragmentShader"] = this.FS;
        
        let mtl = new BABYLON.ShaderMaterial(shaderName, scene, {
            vertexElement: shaderName,
            fragmentElement: shaderName,
        },
        {
            attributes: ["position", "normal", "uv"],
            uniforms: ["world", "worldView", "worldViewProjection", "view", "projection","inverseViewProjection"],
            samplers: ["NoiseDetailSampler","NoiseShapeSampler"],
        });
        mtl.backFaceCulling = false;
        return mtl;
    }
};