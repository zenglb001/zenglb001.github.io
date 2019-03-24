let CloudySettings = function() {
    this.WindDegrees = 0;
    this.WindSpeed = 1;
    this.P_UvPow = 0.7;
    this.P_CloudSpeed = 0.05;
    this.P_CloudScale = 1.7;
    this.P_CloudCover = 0.6;
}

window.onload = function() {
    let cloudySettings = new CloudySettings();
    let gui = new dat.GUI();
    let f1 = gui.addFolder('Cloudy');
    f1.add(cloudySettings, 'WindDegrees', 0, 360, 0.1);
    f1.add(cloudySettings, 'WindSpeed', 0, 3, 0.1);
    f1.add(cloudySettings, 'P_UvPow', 0, 1, 0.1);
    f1.add(cloudySettings, 'P_CloudSpeed', 0, 0.5, 0.01);
    f1.add(cloudySettings, 'P_CloudScale', 0, 5, 0.1);
    f1.add(cloudySettings, 'P_CloudCover', 0, 0.8, 0.1);
    f1.open();

    let canvas = document.getElementById('babylon_canvas');
    let engine = new BABYLON.Engine(canvas, true);
    console.log(`WebGL version ${engine.webGLVersion}`);

    let debugSphere;

    let createScene = function () {
        let scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color3(0.2,0.3,0.55);

        // Adding a light
        let light = new BABYLON.HemisphericLight();

        // Adding an Arc Rotate Camera
        //let camera = new BABYLON.ArcRotateCamera("Camera", -1.8, 1.8, 20, new BABYLON.Vector3(-5,29,0), scene);
        let camera = new BABYLON.ArcRotateCamera("Camera", -2.12, 2.04, 20, new BABYLON.Vector3(-5,29,0), scene);
        camera.attachControl(canvas, true);

        // Import meshes
        BABYLON.SceneLoader.Append("./mow_cop_v2/", "scene.gltf", scene, function (loaded) {
            
            console.log(`Loaded ${loaded.meshes.length} meshes`);
            //console.log(scene);

            // Add skybox
            let skyMaterial = shaderCloudySkybox.create(scene);
            skyMaterial.setTexture("NoiseTextureSampler", new BABYLON.Texture("./img/UnCompressed_Cloud_PBR.bmp", scene));

            let skybox = BABYLON.Mesh.CreateSphere("boxCloud", 100, 6000, scene);
            //let skybox = BABYLON.Mesh.CreateBox("skyBox", 10000.0, scene);
            skybox.material = skyMaterial;
            scene.skybox = skybox;
            
            //console.log(viewProjection.getTranslation(new BABYLON.Vector3(0,0,0)));
            ////var global_position = BABYLON.Vector3.TransformCoordinates(local_position, matrix);

            debugSphere = BABYLON.Mesh.CreateSphere("boxCloud", 8, 5, scene);

        });
        
        return scene;
    }

    let scene = createScene();
    let fpsLabel = document.getElementById("fpsLabel");
    let CloudUV = BABYLON.Vector2.Zero();

    engine.runRenderLoop(function() {

        fpsLabel.innerHTML = engine.getFps().toFixed() + " fps";
        if (scene.skybox)
        {
            let mtl = scene.skybox.material;
            mtl.setMatrix("inverseViewProjection", scene.getViewMatrix().multiply(scene.getProjectionMatrix()).invert());

            mtl.setFloat("P_UvPow",         cloudySettings.P_UvPow);
            mtl.setFloat("P_CloudSpeed",    cloudySettings.P_CloudSpeed);
            mtl.setFloat("P_CloudScale",    cloudySettings.P_CloudScale);
            mtl.setFloat("P_CloudCover",    cloudySettings.P_CloudCover);

            // Update cloud UV coordinates
            let wDegreeForCloud = cloudySettings.WindDegrees * Math.PI / 180.0;
            let wSpeed = cloudySettings.WindSpeed * Math.max(1.0, 30.0*0.3);

            let sinr = Math.sin(wDegreeForCloud);
            let cosr = Math.cos(wDegreeForCloud);

            let windForCloud = new BABYLON.Vector2(cosr, sinr);
            windForCloud.scaleInPlace(engine.getDeltaTime() * wSpeed / 1000.0);
            CloudUV.addInPlace(windForCloud);
            //console.log(CloudUV);

            mtl.setVector2("P_CloudUV", CloudUV);
        }

        scene.render();
    });
}
