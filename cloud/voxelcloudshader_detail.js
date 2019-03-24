// https://www.shadertoy.com/view/MdGfzh
// Buffer Shape: The main look-up texture for the cloud shapes. 
// Buffer Detail: A 3D (32x32x32) look-up texture with Worley Noise used to add small details 
//           to the shapes of the clouds. I have packed this 3D texture into a 2D buffer.

let voxelCloud_Detail = {
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
        // pack 32x32x32 3d texture in 2d texture (with padding)
        //float z = floor(fragCoord.x/34.) + 8.*floor(fragCoord.y/34.);
        //vec2 uv = mod(fragCoord.xy, 34.) - 1.;
        //vec3 coord = vec3(uv, z) / 32.;

        vec2 uv = vUV * vec2(8.0, 4.0);
        float z = floor(uv.x) + 8.0 * floor(uv.y);
        vec3 coord = vec3(fract(uv), z/32.);

        float r = tilableVoronoi( coord, 16,  3. );
        float g = tilableVoronoi( coord,  4,  8. );
        float b = tilableVoronoi( coord,  4, 16. );

        float c = max(0., 1.-(r + g * .5 + b * .25) / 1.75);

        // if(z == 31.0)
        // {
        //     gl_FragColor = vec4(1.0,0,0,1.0);
        // }
        // else
        // {
        gl_FragColor = vec4(c,c,c,c);
        //}
    }
    `,
    create : function(scene) {
        let shaderName = "voxelCloud_Detail";
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