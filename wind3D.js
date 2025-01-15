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
        this.disableVisible = false;

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
        this.visible = this.visible;
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
    removePrimitives() {
        this.scene.primitives.remove(this.particleSystem.particlesComputing.primitives.calculateSpeed);
        this.scene.primitives.remove(this.particleSystem.particlesComputing.primitives.updatePosition);
        this.scene.primitives.remove(this.particleSystem.particlesComputing.primitives.postProcessingPosition);

        this.scene.primitives.remove(this.particleSystem.particlesRendering.primitives.segments);
        this.scene.primitives.remove(this.particleSystem.particlesRendering.primitives.trails);
        this.scene.primitives.remove(this.particleSystem.particlesRendering.primitives.screen);
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
        let height = 0;
        this.camera.moveStart.addEventListener(() => {
            // !this.disableVisible && this.visible(false);
            height = this.viewer.camera.positionCartographic.height;
            if(height < 25000) {
                !this.disableVisible && this.visible(false);
            } else {
                !this.disableVisible && this.visible(true);
            }
        });
        this.camera.moveEnd.addEventListener(this.throttle(() => {
            if (height !== this.viewer.camera.positionCartographic.height) {
                height = this.viewer.camera.positionCartographic.height;
                that.updateViewerParameters();
                that.particleSystem.applyViewerParameters(that.viewerParameters);
                
                height = this.viewer.camera.positionCartographic.height;
            }
            
        }, 300));

        let resized = false;
        window.addEventListener("resize", () => {
            resized = true;
            !this.disableVisible && this.visible(false);
            this.removePrimitives()
        });

        this.scene.preRender.addEventListener(() => {
            if (resized) {
                that.particleSystem.canvasResize(that.scene.context);
                resized = false;
                that.addPrimitives();
                !this.disableVisible && this.visible(true);
            }
        });

        window.addEventListener('particleSystemOptionsChanged', () => {
            that.particleSystem.applyUserInput(that.panel.getUserInput());
        });
    }
    throttle(func, wait) {
        let timeout = null;
        return function(...args) {
            if (!timeout) {
                timeout = setTimeout(() => {
                    func.apply(this, args);
                    timeout = null;
                }, wait);
            }
        };
    }
    visible(visible) {
        // the order of primitives.add() should respect the dependency of primitives
        this.particleSystem.particlesComputing.primitives.calculateSpeed.show = visible;
        this.particleSystem.particlesComputing.primitives.updatePosition.show = visible;
        this.particleSystem.particlesComputing.primitives.postProcessingPosition.show = visible;

        this.particleSystem.particlesRendering.primitives.segments.show = visible;
        this.particleSystem.particlesRendering.primitives.trails.show = visible;
        this.particleSystem.particlesRendering.primitives.screen.show = visible;
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
