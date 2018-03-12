﻿module BABYLON {
    /**
	 * The default rendering pipeline can be added to a scene to apply common post processing effects such as anti-aliasing or depth of field.
     * See https://doc.babylonjs.com/how_to/using_default_rendering_pipeline
     */
    export class DefaultRenderingPipeline extends PostProcessRenderPipeline implements IDisposable, IAnimatable {
        private _scene: Scene;
        private _originalCameras:Array<Camera> = [];
        /**
		 * ID of the sharpen post process,
		 */
        readonly SharpenPostProcessId: string = "SharpenPostProcessEffect";
        /**
		 * ID of the image processing post process;
		 */
        readonly ImageProcessingPostProcessId: string = "ImageProcessingPostProcessEffect";
        /**
		 * ID of the Fast Approximate Anti-Aliasing post process;
		 */
        readonly FxaaPostProcessId: string = "FxaaPostProcessEffect";
        /**
		 * ID of the chromatic aberration post process,
		 */
        readonly ChromaticAberrationPostProcessId: string = "ChromaticAberrationPostProcessEffect";

        // Post-processes
        /**
		 * Sharpen post process which will apply a sharpen convolution to enhance edges
		 */
        public sharpen: SharpenPostProcess;
        private _sharpenEffect: PostProcessRenderEffect;
        private bloom: BloomEffect;
        /**
         * Depth of field effect, applies a blur based on how far away objects are from the focus distance.
         */
        public depthOfField: DepthOfFieldEffect;
        /**
         * The Fast Approximate Anti-Aliasing post process which attemps to remove aliasing from an image.
         */
        public fxaa: FxaaPostProcess;
        /**
         * Image post processing pass used to perform operations such as tone mapping or color grading.
         */
        public imageProcessing: ImageProcessingPostProcess;
        /**
		 * Chromatic aberration post process which will shift rgb colors in the image
		 */
        public chromaticAberration: ChromaticAberrationPostProcess;
        private _chromaticAberrationEffect: PostProcessRenderEffect;

        /**
         * Animations which can be used to tweak settings over a period of time
         */
        public animations: Animation[] = [];

        // Values   
        private _sharpenEnabled:boolean = false;    
        private _bloomEnabled: boolean = false;
        private _depthOfFieldEnabled: boolean = false;
        private _depthOfFieldBlurLevel = DepthOfFieldEffectBlurLevel.Low;
        private _fxaaEnabled: boolean = false;
        private _msaaEnabled: boolean = false;
        private _imageProcessingEnabled: boolean = true;
        private _defaultPipelineTextureType: number;
        private _bloomScale: number = 0.6;
        private _chromaticAberrationEnabled:boolean = false;  

        private _buildAllowed = true;

        /**
         * Enable or disable the sharpen process from the pipeline
         */
        public set sharpenEnabled(enabled: boolean) {
            if (this._sharpenEnabled === enabled) {
                return;
            }
            this._sharpenEnabled = enabled;

            this._buildPipeline();
        }

        @serialize()
        public get sharpenEnabled(): boolean {
            return this._sharpenEnabled;
        }


        /**
		 * Specifies the size of the bloom blur kernel, relative to the final output size
		 */
        @serialize()
        public bloomKernel: number = 64;

        /**
		 * Specifies the weight of the bloom in the final rendering
		 */
        @serialize()
        private _bloomWeight: number = 0.15;

        @serialize()
        private _hdr: boolean;

        /**
         * The strength of the bloom.
         */
        public set bloomWeight(value: number) {
            if (this._bloomWeight === value) {
                return;
            }
            if(this.bloom._merge._mergeOptions.bloom){
                this.bloom._merge._mergeOptions.bloom.weight = value;
            }
            
            this._bloomWeight = value;
        }

        @serialize()
        public get bloomWeight(): number {
            return this._bloomWeight;
        }

        /**
         * The scale of the bloom, lower value will provide better performance.
         */
        public set bloomScale(value: number) {
            if (this._bloomScale === value) {
                return;
            }
            this._bloomScale = value;

            // recreate bloom and dispose old as this setting is not dynamic
            var oldBloom = this.bloom;
            this.bloom = new BloomEffect(this._scene, this.bloomScale, this.bloomKernel, this._defaultPipelineTextureType);
            for (var i = 0; i < this._cameras.length; i++) {
                oldBloom.disposeEffects(this._cameras[i]);
            }

            this._buildPipeline();
        }

        @serialize()
        public get bloomScale(): number {
            return this._bloomScale;
        }

        /**
         * Enable or disable the bloom from the pipeline
         */
        public set bloomEnabled(enabled: boolean) {
            if (this._bloomEnabled === enabled) {
                return;
            }
            this._bloomEnabled = enabled;

            this._buildPipeline();
        }

        @serialize()
        public get bloomEnabled(): boolean {
            return this._bloomEnabled;
        }

        /**
         * If the depth of field is enabled.
         */
        @serialize()
        public get depthOfFieldEnabled(): boolean {
            return this._depthOfFieldEnabled;
        }   
        
        public set depthOfFieldEnabled(enabled: boolean) {
            if (this._depthOfFieldEnabled === enabled) {
                return;
            }
            this._depthOfFieldEnabled = enabled;
            
            this._buildPipeline();
        }

        /**
         * Blur level of the depth of field effect. (Higher blur will effect performance)
         */
        @serialize()
        public get depthOfFieldBlurLevel(): DepthOfFieldEffectBlurLevel {
            return this._depthOfFieldBlurLevel;
        }   
        
        public set depthOfFieldBlurLevel(value: DepthOfFieldEffectBlurLevel) {
            if (this._depthOfFieldBlurLevel === value) {
                return;
            }
            this._depthOfFieldBlurLevel = value;
            
            // recreate dof and dispose old as this setting is not dynamic
            var oldDof = this.depthOfField;
            
            this.depthOfField = new DepthOfFieldEffect(this._scene, null, this._depthOfFieldBlurLevel, this._defaultPipelineTextureType);
            this.depthOfField.focalLength = oldDof.focalLength;
            this.depthOfField.focusDistance = oldDof.focusDistance;
            this.depthOfField.fStop = oldDof.fStop;
            this.depthOfField.lensSize = oldDof.lensSize;
            
            for (var i = 0; i < this._cameras.length; i++) {
                oldDof.disposeEffects(this._cameras[i]);
            }

            this._buildPipeline();
        }

        /**
         * If the anti aliasing is enabled.
         */
        public set fxaaEnabled(enabled: boolean) {
            if (this._fxaaEnabled === enabled) {
                return;
            }
            this._fxaaEnabled = enabled;

            this._buildPipeline();
        }

        @serialize()
        public get fxaaEnabled(): boolean {
            return this._fxaaEnabled;
        }

        /**
         * If the multisample anti-aliasing is enabled.
         */
        public set msaaEnabled(enabled: boolean) {
            if (this._msaaEnabled === enabled) {
                return;
            }
            this._msaaEnabled = enabled;

            this._buildPipeline();
        }

        @serialize()
        public get msaaEnabled(): boolean {
            return this._msaaEnabled;
        }

        /**
         * If image processing is enabled.
         */
        public set imageProcessingEnabled(enabled: boolean) {
            if (this._imageProcessingEnabled === enabled) {
                return;
            }
            this._imageProcessingEnabled = enabled;

            this._buildPipeline();
        }

        @serialize()
        public get imageProcessingEnabled(): boolean {
            return this._imageProcessingEnabled;
        }

        /**
         * Enable or disable the chromaticAberration process from the pipeline
         */
        public set chromaticAberrationEnabled(enabled: boolean) {
            if (this._chromaticAberrationEnabled === enabled) {
                return;
            }
            this._chromaticAberrationEnabled = enabled;

            this._buildPipeline();
        }

        @serialize()
        public get chromaticAberrationEnabled(): boolean {
            return this._chromaticAberrationEnabled;
        }

        /**
         * @constructor
         * @param {string} name - The rendering pipeline name
         * @param {BABYLON.Scene} scene - The scene linked to this pipeline
         * @param {any} ratio - The size of the postprocesses (0.5 means that your postprocess will have a width = canvas.width 0.5 and a height = canvas.height 0.5)
         * @param {BABYLON.Camera[]} cameras - The array of cameras that the rendering pipeline will be attached to
         * @param {boolean} automaticBuild - if false, you will have to manually call prepare() to update the pipeline
         */
        constructor(name: string, hdr: boolean, scene: Scene, cameras?: Camera[], automaticBuild = true) {
            super(scene.getEngine(), name);
            this._cameras = cameras ||  [];
            this._originalCameras = this._cameras.slice();

            this._buildAllowed = automaticBuild;

            // Initialize
            this._scene = scene;
            var caps = this._scene.getEngine().getCaps();
            this._hdr = hdr && (caps.textureHalfFloatRender || caps.textureFloatRender);

            // Misc
            if (this._hdr) {
                if (caps.textureHalfFloatRender) {
                    this._defaultPipelineTextureType = Engine.TEXTURETYPE_HALF_FLOAT;
                }
                else if (caps.textureFloatRender) {
                    this._defaultPipelineTextureType = Engine.TEXTURETYPE_FLOAT;
                }
            } else {
                this._defaultPipelineTextureType = Engine.TEXTURETYPE_UNSIGNED_INT;
            }

            // Attach
            scene.postProcessRenderPipelineManager.addPipeline(this);

            var engine = this._scene.getEngine();
            // Create post processes before hand so they can be modified before enabled.
            // Block compilation flag is set to true to avoid compilation prior to use, these will be updated on first use in build pipeline.
            this.sharpen = new SharpenPostProcess("sharpen", 1.0, null, Texture.BILINEAR_SAMPLINGMODE, engine, false, this._defaultPipelineTextureType, true);
            this._sharpenEffect = new PostProcessRenderEffect(engine, this.SharpenPostProcessId, () => { return this.sharpen; }, true);

            this.depthOfField = new DepthOfFieldEffect(this._scene, null, this._depthOfFieldBlurLevel, this._defaultPipelineTextureType, true);
            
            this.bloom = new BloomEffect(this._scene, this.bloomScale, this.bloomKernel, this._defaultPipelineTextureType, true);

            this.chromaticAberration = new ChromaticAberrationPostProcess("ChromaticAberration", engine.getRenderWidth(), engine.getRenderHeight(), 1.0, null, Texture.BILINEAR_SAMPLINGMODE, engine, false, this._defaultPipelineTextureType, true);
            this._chromaticAberrationEffect = new PostProcessRenderEffect(engine, this.ChromaticAberrationPostProcessId, () => { return this.chromaticAberration; }, true);
            
            this._buildPipeline();
        }

        /**
         * Force the compilation of the entire pipeline.
         */
        public prepare(): void {
            let previousState = this._buildAllowed;
            this._buildAllowed = true;
            this._buildPipeline();
            this._buildAllowed = previousState;
        }

        private _prevPostProcess:Nullable<PostProcess> = null;
        private _prevPrevPostProcess:Nullable<PostProcess> = null;

        private _setAutoClearAndTextureSharing(postProcess:PostProcess, skipTextureSharing = false){
            if(this._prevPostProcess && this._prevPostProcess.autoClear){
                postProcess.autoClear = false;
            }else{
                postProcess.autoClear = true;
            }

            if(!skipTextureSharing){
                if(this._prevPrevPostProcess){
                    postProcess.shareOutputWith(this._prevPrevPostProcess);
                }else{
                    postProcess.useOwnOutput();
                }

                if(this._prevPostProcess){
                    this._prevPrevPostProcess = this._prevPostProcess;
                }
                this._prevPostProcess = postProcess;
            }
        }

        private _buildPipeline() {
            if (!this._buildAllowed) {
                return;
            }

            var engine = this._scene.getEngine();

            this._disposePostProcesses();
            if (this._cameras !== null) {
                this._scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(this._name, this._cameras);
                // get back cameras to be used to reattach pipeline
                this._cameras = this._originalCameras.slice();
            }
            this._reset();
            this._prevPostProcess = null;
            this._prevPrevPostProcess = null;

            if (this.sharpenEnabled) {
                if(!this.sharpen.isReady()){
                    this.sharpen.updateEffect();
                }
                this.addEffect(this._sharpenEffect);
                this._setAutoClearAndTextureSharing(this.sharpen);
            }

            if (this.depthOfFieldEnabled) {
                var depthTexture = this._scene.enableDepthRenderer(this._cameras[0]).getDepthMap();
                this.depthOfField.depthTexture = depthTexture;
                if(!this.depthOfField._isReady()){
                    this.depthOfField._updateEffects();
                }
                this.addEffect(this.depthOfField);
                this._setAutoClearAndTextureSharing(this.depthOfField._depthOfFieldMerge);
            }

            if (this.bloomEnabled) {
                if(!this.bloom._isReady()){
                    this.bloom._updateEffects();
                }
                this.addEffect(this.bloom);
            }

            if (this.fxaaEnabled) {
                this.fxaa = new FxaaPostProcess("fxaa", 1.0, null, Texture.BILINEAR_SAMPLINGMODE, engine, false, this._defaultPipelineTextureType);
                this.addEffect(new PostProcessRenderEffect(engine, this.FxaaPostProcessId, () => { return this.fxaa; }, true));
                this._setAutoClearAndTextureSharing(this.fxaa);
            }

            if (this.chromaticAberrationEnabled) {
                if(!this.chromaticAberration.isReady()){
                    this.chromaticAberration.updateEffect();
                }
                this.addEffect(this._chromaticAberrationEffect);
                this._setAutoClearAndTextureSharing(this.chromaticAberration);
            }

            if (this._cameras !== null) {
                this._scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(this._name, this._cameras);
            }

            if(this.msaaEnabled){
                if(!this._enableMSAAOnFirstPostProcess()){
                    BABYLON.Tools.Warn("MSAA failed to enable, MSAA is only supported in browsers that support webGL >= 2.0");
                }
            }
        }

        private _disposePostProcesses(disposeNonRecreated = false): void {
            for (var i = 0; i < this._cameras.length; i++) {
                var camera = this._cameras[i];

                if (this.imageProcessing) {
                    this.imageProcessing.dispose(camera);
                }

                if (this.fxaa) {
                    this.fxaa.dispose(camera);
                }

                // These are created in the constructor and should not be disposed on every pipeline change
                if(disposeNonRecreated){
                    if (this.sharpen) {
                        this.sharpen.dispose(camera);
                    }
    
                    if(this.depthOfField){
                        this.depthOfField.disposeEffects(camera);
                    }

                    if(this.bloom){
                        this.bloom.disposeEffects(camera);
                    }
    
                    if(this.chromaticAberration){
                        this.chromaticAberration.dispose(camera);
                    }
                }
            }
            
            (<any>this.imageProcessing) = null;
            (<any>this.fxaa) = null;

            if(disposeNonRecreated){
                (<any>this.sharpen) = null;
                (<any>this.depthOfField) = null;
                (<any>this.bloom) = null;
                (<any>this.chromaticAberration) = null;
            } 
        }

        /**
         * Dispose of the pipeline and stop all post processes
         */
        public dispose(): void {
            this._disposePostProcesses(true);

            this._scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(this._name, this._cameras);

            super.dispose();
        }

        /**
         * Serialize the rendering pipeline (Used when exporting)
         * @returns the serialized object
         */
        public serialize(): any {
            var serializationObject = SerializationHelper.Serialize(this);
            serializationObject.customType = "DefaultRenderingPipeline";

            return serializationObject;
        }

        /**
         * Parse the serialized pipeline
         * @param source Source pipeline.
         * @param scene The scene to load the pipeline to.
         * @param rootUrl The URL of the serialized pipeline.
         * @returns An instantiated pipeline from the serialized object.
         */
        public static Parse(source: any, scene: Scene, rootUrl: string): DefaultRenderingPipeline {
            return SerializationHelper.Parse(() => new DefaultRenderingPipeline(source._name, source._name._hdr, scene), source, scene, rootUrl);
        }
    }
}
