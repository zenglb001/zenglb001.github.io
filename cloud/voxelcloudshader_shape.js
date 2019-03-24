// https://www.shadertoy.com/view/MdGfzh
// Buffer Shape: The main look-up texture for the cloud shapes. 
// Buffer Detail: A 3D (32x32x32) look-up texture with Worley Noise used to add small details 
//           to the shapes of the clouds. I have packed this 3D texture into a 2D buffer.

let voxelCloud_Shape = {
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

    void main(void) {
        vec3 coord = fract(vec3(vUV + vec2(.2,0.62), .5));
        
        vec4 col = vec4(1);
        
        float mfbm = 0.9;
        float mvor = 0.7;
        
        col.r = mix(1., tilableFbm( coord, 7, 4. ), mfbm) * 
                mix(1., tilableVoronoi( coord, 8, 9. ), mvor);
        col.g = 0.625 * tilableVoronoi( coord + 0., 3, 15. ) +
                0.250 * tilableVoronoi(  coord + 0., 3, 19. ) +
                0.125 * tilableVoronoi( coord + 0., 3, 23. ) 
                -1.;
        col.b = 1. - tilableVoronoi( coord + 0.5, 6, 9. );
        
        gl_FragColor = col;
    }
    `,
    create : function(scene) {
        let shaderName = "voxelCloud_Shape";
        BABYLON.Effect.ShadersStore[shaderName + "VertexShader"] = this.VS;
        BABYLON.Effect.ShadersStore[shaderName + "FragmentShader"] = this.FS;
        
        let mtl = new BABYLON.ShaderMaterial(shaderName, scene, {
            vertexElement: shaderName,
            fragmentElement: shaderName,
        },
        {
            attributes: ["position", "normal", "uv"],
            uniforms: ["world", "worldView", "worldViewProjection", "view", "projection","inverseViewProjection"],
            //samplers: ["NoiseTextureSampler"],
        });
        mtl.backFaceCulling = false;
        return mtl;
    }
};