let CloudySettings = function() {
    this.xxx = 0;
}

window.onload = function() {
    let cloudySettings = new CloudySettings();
    let gui = new dat.GUI();
    let f1 = gui.addFolder('Cloudy');
    f1.add(cloudySettings, 'xxx', 0, 360, 0.1);
    f1.open();

    let canvas = document.getElementById('babylon_canvas');
    let engine = new BABYLON.Engine(canvas, true);
    console.log(`WebGL version ${engine.webGLVersion}`);

    let CameraCenter = new BABYLON.Vector3(-5,29,0);

    let debugSphere;

    let createScene = function () {
        let scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color3(0.2,0.3,0.55);


        // Adding a light
        let light = new BABYLON.HemisphericLight();

        // Adding an Arc Rotate Camera
        //let camera = new BABYLON.ArcRotateCamera("Camera", -1.8, 1.8, 20, CameraCenter, scene);
        //let camera = new BABYLON.ArcRotateCamera("Camera", -2.12, 2.04, 20, CameraCenter, scene);
        let camera = new BABYLON.ArcRotateCamera("Camera", 1.5, 1.8, 20, CameraCenter, scene);
        camera.attachControl(canvas, true);

        //Import meshes
        BABYLON.SceneLoader.Append("./mow_cop_v2/", "scene.gltf", scene, function (loaded) {
            
            console.log(`Loaded ${loaded.meshes.length} meshes`);
            //console.log(scene);

            // Add skybox
            let skybox = BABYLON.Mesh.CreateSphere("boxCloud", 100, 6000, scene);
             //let skybox = BABYLON.Mesh.CreateBox("skyBox", 10000.0, scene);
            
            // //console.log(viewProjection.getTranslation(new BABYLON.Vector3(0,0,0)));
            // ////var global_position = BABYLON.Vector3.TransformCoordinates(local_position, matrix);

            // debugSphere = BABYLON.Mesh.CreateSphere("boxCloud", 8, 5, scene);


            // // -------- RT_NoiseShape
            // let NoiseShapeMaterial = voxelCloud_Shape.create(scene);
            // let RT_NoiseShape = new BABYLON.RenderTargetTexture("RT_NoiseShape", 1024, scene, true);
            // RT_NoiseShape.renderList.push(skybox);
            // scene.customRenderTargets.push(RT_NoiseShape);
            // RT_NoiseShape.onBeforeRender = function () {
            //     for (var index = 0; index < RT_NoiseShape.renderList.length; index++) {
            //         RT_NoiseShape.renderList[index]._savedMaterial = RT_NoiseShape.renderList[index].material;
            //         RT_NoiseShape.renderList[index].material = NoiseShapeMaterial;
            //     }
            // }

            // //let Tex_NoiseShape;
            // RT_NoiseShape.onAfterRender = function () {
            //     // Restoring previoux material
            //     for (var index = 0; index < RT_NoiseShape.renderList.length; index++) {
            //         RT_NoiseShape.renderList[index].material = RT_NoiseShape.renderList[index]._savedMaterial;
            //     }
            //     //scene.customRenderTargets.pop();
            //     //Tex_NoiseShape = RT_NoiseShape.getInternalTexture().clone("Tex_NoiseShape");
            //     //??????????
            // }

            let PR_NoiseShape = Tex_VoxelCloudShape.create(scene);
            let PR_NoiseDetail = Tex_VoxelCloudDetail.create(scene);

            // // Plane
            // var debugplanemat = new BABYLON.StandardMaterial("debugplanemat", scene);
            // debugplanemat.emissiveTexture = PR_NoiseDetail;//.Clone();
            // debugplanemat.disableLighting = true;

            // let debugplane = BABYLON.Mesh.CreatePlane("debugplane", 15, scene);
            // debugplane.position = CameraCenter;
            // debugplane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
            // debugplane.scaling.y = 1.0 / engine.getAspectRatio(scene.activeCamera);
            // debugplane.material = debugplanemat;

            // console.log("sss");


            //let skyMaterial = voxelCloud_Shape.create(scene);
            let skyMaterial = voxelCloud_Main.create(scene);
            //skyMaterial.setTexture("NoiseTextureSampler", new BABYLON.Texture("./img/UnCompressed_Cloud_PBR.bmp", scene));
            skyMaterial.setTexture("NoiseDetailSampler", PR_NoiseDetail);
            skyMaterial.setTexture("NoiseShapeSampler", PR_NoiseShape);
            skybox.material = skyMaterial;
            scene.skybox = skybox;

        });
        
        return scene;
    }

    let scene = createScene();
    let fpsLabel = document.getElementById("fpsLabel");
    let CloudUV = BABYLON.Vector2.Zero();

    let first = 0;

    let iTime = 0.0;
    engine.runRenderLoop(function() {

        fpsLabel.innerHTML = engine.getFps().toFixed() + " fps";
        if (scene.skybox)
        {
            let mtl = scene.skybox.material;
            //mtl.setMatrix("inverseViewProjection", scene.getViewMatrix().multiply(scene.getProjectionMatrix()).invert());
            iTime += engine.getDeltaTime();
            mtl.setFloat("iTime",iTime);
            mtl.setFloat("TexResolution",1024.0);

        }

        // if(first++ > 2)
        // {
        //     scene.customRenderTargets.pop();
        //     scene.customRenderTargets.pop();
        // }

        scene.render();
    });
}
