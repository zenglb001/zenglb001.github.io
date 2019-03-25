// https://www.babylonjs-playground.com/#1XPCZC#19
// https://www.shadertoy.com/view/MdGfzh
// Buffer Shape: The main look-up texture for the cloud shapes. 
// Buffer Detail: A 3D (32x32x32) look-up texture with Worley Noise used to add small details 
//           to the shapes of the clouds. I have packed this 3D texture into a 2D buffer.

let Tex_VoxelCloudShape ={
    Name: "Tex_VoxelCloudShape",
    PS : voxelCloudTexInc + `
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
        BABYLON.Effect.ShadersStore[this.Name + "PixelShader"] = this.PS;
        let tex = new BABYLON.CustomProceduralTexture("custom" + this.Name, this.Name, 1024, scene);
        tex.animate = false;
        tex.refreshRate = BABYLON.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
        return tex;
    }
};

let Tex_VoxelCloudDetail ={
    Name: "Tex_VoxelCloudDetail",
    PS : voxelCloudTexInc + `
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
        BABYLON.Effect.ShadersStore[this.Name + "PixelShader"] = this.PS;
        let tex = new BABYLON.CustomProceduralTexture("custom" + this.Name, this.Name, 1024, scene);
        tex.animate = false;
        tex.refreshRate = BABYLON.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
        return tex;
    }
};