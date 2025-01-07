import DataProcess from './dataProcess'
import ParticleSystem from './particleSystem'
import Util from './util'
const SPECTOR = require("spectorjs");
export default class Wind3D {
    constructor(panel, viewer) {
        this.viewer = viewer;
        this.scene = this.viewer.scene;
        this.camera = this.viewer.camera;

        this.panel = panel;

        this.viewerParameters = {
            lonRange: new Cesium.Cartesian2(),
            latRange: new Cesium.Cartesian2(),
            pixelSize: 0.0
        };
        // use a smaller earth radius to make sure distance to camera > 0
        this.globeBoundingSphere = new Cesium.BoundingSphere(Cesium.Cartesian3.ZERO, 0.99 * 6378137.0);
        this.updateViewerParameters();

        DataProcess.loadData().then((data) => {
            this.particleSystem = new ParticleSystem(this.scene.context, data, this.panel.getUserInput(), this.viewerParameters);
            this.addPrimitives();
            this.setupEventListeners();
            // this.debug();
        });
        this.imageryLayers = this.viewer.imageryLayers;
    }

    addPrimitives() {
        // the order of primitives.add() should respect the dependency of primitives
        this.scene.primitives.add(this.particleSystem.particlesComputing.primitives.calculateSpeed);
        this.scene.primitives.add(this.particleSystem.particlesComputing.primitives.updatePosition);
        this.scene.primitives.add(this.particleSystem.particlesComputing.primitives.postProcessingPosition);

        this.scene.primitives.add(this.particleSystem.particlesRendering.primitives.segments);
        this.scene.primitives.add(this.particleSystem.particlesRendering.primitives.trails);
        this.scene.primitives.add(this.particleSystem.particlesRendering.primitives.screen);
    }

    updateViewerParameters() {
        const viewRectangle = this.camera.computeViewRectangle(this.scene.globe.ellipsoid);
        const lonLatRange = Util.viewRectangleToLonLatRange(viewRectangle);
        this.viewerParameters.lonRange.x = lonLatRange.lon.min;
        this.viewerParameters.lonRange.y = lonLatRange.lon.max;
        this.viewerParameters.latRange.x = lonLatRange.lat.min;
        this.viewerParameters.latRange.y = lonLatRange.lat.max;

        const pixelSize = this.camera.getPixelSize(
            this.globeBoundingSphere,
            this.scene.drawingBufferWidth,
            this.scene.drawingBufferHeight
        );

        if (pixelSize > 0) {
            this.viewerParameters.pixelSize = pixelSize;
        }
    }

    setupEventListeners() {
        const that = this;

        this.camera.moveStart.addEventListener(() => {
            that.scene.primitives.show = false;
        });

        this.camera.moveEnd.addEventListener( () => {
            that.updateViewerParameters();
            that.particleSystem.applyViewerParameters(that.viewerParameters);
            that.scene.primitives.show = true;
        });

        // let resized = false;
        // window.addEventListener("resize", () => {
        //     resized = true;
        //     that.scene.primitives.show = false;
        //     that.scene.primitives.removeAll();
        // });

        // this.scene.preRender.addEventListener(() => {
        //     if (resized) {
        //         that.particleSystem.canvasResize(that.scene.context);
        //         resized = false;
        //         that.addPrimitives();
        //         that.scene.primitives.show = true;
        //     }
        // });

        window.addEventListener('particleSystemOptionsChanged', () => {
            that.particleSystem.applyUserInput(that.panel.getUserInput());
        });
    }

    debug() {
        const that = this;
        const animate = function () {
            that.viewer.resize();
            that.viewer.render();
            requestAnimationFrame(animate);
        }
        const spector = new SPECTOR.Spector();
        spector.displayUI();
        spector.spyCanvases();
        animate();
    }
}
