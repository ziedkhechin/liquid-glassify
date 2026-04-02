/**
 * LiquidGlassify
 *
 * A high-performance TypeScript library for creating dynamic "Liquid Glass" effects.
 * It utilizes SVG displacement maps and CSS backdrop-filters to simulate realistic glass refraction and light dispersion.
 *
 * @example
 * ```typescript
 * LiquidGlassify.getOrCreateInstance('.my-element', { distortion: 50, tint: 'var(--primary)', });
 * ```
 * @author Zied Khechine
 * @license Released under the MIT License.
 */
export default class LiquidGlassify<HTML_ELEMENT_TYPE extends HTMLElement = HTMLElement> {
	/** @internal XML namespace for SVG elements */
	private static readonly SVG_NS: string = 'http://www.w3.org/2000/svg';

	/** @internal XML namespace for xlink attributes */
	private static readonly XLINK_NS: string = 'http://www.w3.org/1999/xlink';

	/** @internal Stores active instances mapped to their DOM elements to prevent duplicates */
	private static readonly instances: WeakMap<HTMLElement, LiquidGlassify> = new WeakMap();

	/** @internal Determines if the current browser supports the full SVG liquid glass effect. */
	private static readonly isLiquidGlassSupported: boolean = ((): boolean => {
		if (navigator.userAgentData) {
			return !navigator.userAgentData.mobile && navigator.userAgentData.brands.some((data: NavigatorUABrandVersion) => 'Chromium' === data.brand);
		} else {
			const isChromium: boolean = !!(window as any).chrome;
			const isMobile: boolean = /Mobi|Android|iPhone/i.test(navigator.userAgent) || navigator.maxTouchPoints > 0;

			return isChromium && !isMobile
		}
	})();

	/** @internal A hidden global container to hold all generated SVG filters */
	private static parentNode: HTMLDivElement;

	/** @internal Default fallback options for the effect */
	private static readonly defaultOptions: Required<Options> = {
		width: 0, height: 0, cornerRadius: 0,
		darknessBlur: 5, distortion: 40, lightnessBlur: 15, centerSize: 15, iridescence: 80, postBlur: 15,
		outsetBoxShadow: '', tintColor: '#ffffff', tintOpacity: 65,
	};

	/** @internal The target HTML element receiving the glass effect */
	private readonly element: HTML_ELEMENT_TYPE;

	/** @internal The root SVG element containing the filter */
	private svg!: SVGElement;

	/** @internal The main SVG filter element */
	private filter!: SVGFilterElement;

	/* --- SVG Rendering Nodes --- */
	private feImage0!: SVGFEImageElement;
	private feImage1!: SVGFEImageElement;
	private feImage2!: SVGFEImageElement;
	private feImage3!: SVGFEImageElement;
	private disp0!: SVGFEDisplacementMapElement;
	private disp1!: SVGFEDisplacementMapElement;
	private disp2!: SVGFEDisplacementMapElement;
	private blend0!: SVGFEBlendElement;
	private blend1!: SVGFEBlendElement;
	private blend2!: SVGFEBlendElement;
	private blend3!: SVGFEBlendElement;
	private postblur!: SVGFEGaussianBlurElement;
	private composite!: SVGFECompositeElement;

	/* --- Observers --- */
	/** @internal Observes dimensions to dynamically update the SVG viewBox */
	private resizeObserver!: ResizeObserver;
	/** @internal Observes the DOM to clean up the instance if the element is removed */
	private mutationObserver!: MutationObserver;

	/**
	 * Creates a new LiquidGlassify instance.
	 *
	 * @param element - The HTML element to apply the effect to.
	 * @param options - Configuration options for the glass effect.
	 */
	constructor(
			element: HTML_ELEMENT_TYPE,
			options: Options,
	) {
		this.element = element;
		this.apply(options);
		LiquidGlassify.instances.set(element, this);
	}

	/**
	 * Retrieves an existing instance of LiquidGlassify attached to the given element.
	 *
	 * @param element - The HTML element or a CSS selector string.
	 * @returns The existing LiquidGlassify instance, or null if none exists.
	 */
	public static getInstance<HTML_ELEMENT_TYPE extends HTMLElement = HTMLElement>(
			element: string | HTML_ELEMENT_TYPE
	): LiquidGlassify<HTML_ELEMENT_TYPE> | null {
		let _element: HTML_ELEMENT_TYPE | null = null;

		if ('string' === typeof element) {
			_element = document.querySelector(element);
		} else if (element instanceof HTMLElement) {
			_element = element;
		}
		if (_element && LiquidGlassify.instances.has(_element)) {
			return (LiquidGlassify.instances.get(_element) as LiquidGlassify<HTML_ELEMENT_TYPE>);
		} else {
			return null;
		}
	}

	/**
	 * Retrieves an existing instance or creates a new one if it doesn't exist.
	 *
	 * @param element - The HTML element or a CSS selector string.
	 * @param options - Configuration options (used only if a new instance is created).
	 * @returns The LiquidGlassify instance, or null if the element cannot be found.
	 */
	public static getOrCreateInstance<HTML_ELEMENT_TYPE extends HTMLElement = HTMLElement>(
			element: string | HTML_ELEMENT_TYPE,
			options: Options = {},
	): LiquidGlassify<HTML_ELEMENT_TYPE> | null {
		let _element: HTML_ELEMENT_TYPE | null = null;

		if ('string' === typeof element) {
			_element = document.querySelector(element);
		} else if (element instanceof HTMLElement) {
			_element = element;
		}
		if (!_element) {
			return null;
		}

		return LiquidGlassify.getInstance(_element)?.apply(options) ?? new LiquidGlassify<HTML_ELEMENT_TYPE>(_element, options);
	}

	/**
	 * @internal Destroys the instance, removing observers, styles, and SVG nodes from the DOM.
	 */
	public dispose(): void {
		this.mutationObserver?.disconnect();
		this.resizeObserver?.disconnect();
		this.element.style.removeProperty('transform');
		this.element.style.removeProperty('-webkit-transform');
		this.element.style.removeProperty('backdrop-filter');
		this.element.style.removeProperty('-webkit-backdrop-filter');
		this.element.style.removeProperty('box-shadow');
		this.element.style.removeProperty('isolation');
		this.element.style.removeProperty('background-color');
		LiquidGlassify.instances.delete(this.element);
		this.svg && LiquidGlassify.parentNode?.removeChild(this.svg);
	}

	/**
	 * @internal Core initialization method that routes to either the full SVG effect or the fallback.
	 * @param options - Configuration options for the effect.
	 * @returns The current instance for chaining.
	 */
	private apply(options: Partial<Options>): LiquidGlassify<HTML_ELEMENT_TYPE> {
		const computedStyle: CSSStyleDeclaration = window.getComputedStyle(this.element);

		/** Merge provided options with defaults to prevent errors. */
		const _options: Required<Options> = {
			...LiquidGlassify.defaultOptions,
			width: parseInt(computedStyle.width, 10),
			height: parseInt(computedStyle.height, 10),
			cornerRadius: parseInt(computedStyle.borderRadius, 10),
			...options,
		};

		this.setElementStyle(_options);

		if (LiquidGlassify.isLiquidGlassSupported) {
			// the liquid glass feature only works on Chromium-based desktop browsers
			!this.svg && this.appendSvg();

			return this.subscribeToChanges(() => this.renderLiquidGlass(_options));
		} else {
			return this.renderFallbackEffect(_options);
		}
	}

	/**
	 * @internal Generates the complex SVG Filter DOM structure and appends it to the global container.
	 * @returns The current instance for chaining.
	 */
	private appendSvg(): LiquidGlassify<HTML_ELEMENT_TYPE> {
		const id: string = `liquid-glass-${crypto.randomUUID()}`;

		this.svg = document.createElementNS(LiquidGlassify.SVG_NS, 'svg') as SVGElement;
		this.filter = Object.assign(document.createElementNS(LiquidGlassify.SVG_NS, 'filter'), { id }) as SVGFilterElement;
		this.feImage0 = document.createElementNS(LiquidGlassify.SVG_NS, 'feImage') as SVGFEImageElement;
		this.feImage1 = document.createElementNS(LiquidGlassify.SVG_NS, 'feImage') as SVGFEImageElement;
		this.feImage2 = document.createElementNS(LiquidGlassify.SVG_NS, 'feImage') as SVGFEImageElement;
		this.feImage3 = document.createElementNS(LiquidGlassify.SVG_NS, 'feImage') as SVGFEImageElement;
		this.disp0 = document.createElementNS(LiquidGlassify.SVG_NS, 'feDisplacementMap') as SVGFEDisplacementMapElement;
		this.disp1 = document.createElementNS(LiquidGlassify.SVG_NS, 'feDisplacementMap') as SVGFEDisplacementMapElement;
		this.disp2 = document.createElementNS(LiquidGlassify.SVG_NS, 'feDisplacementMap') as SVGFEDisplacementMapElement;
		this.blend0 = document.createElementNS(LiquidGlassify.SVG_NS, 'feBlend') as SVGFEBlendElement;
		this.blend1 = document.createElementNS(LiquidGlassify.SVG_NS, 'feBlend') as SVGFEBlendElement;
		this.blend2 = document.createElementNS(LiquidGlassify.SVG_NS, 'feBlend') as SVGFEBlendElement;
		this.blend3 = document.createElementNS(LiquidGlassify.SVG_NS, 'feBlend') as SVGFEBlendElement;
		this.postblur = document.createElementNS(LiquidGlassify.SVG_NS, 'feGaussianBlur') as SVGFEGaussianBlurElement;
		this.composite = document.createElementNS(LiquidGlassify.SVG_NS, 'feComposite') as SVGFECompositeElement;

		this.svg.setAttribute('xmlns', LiquidGlassify.SVG_NS);
		this.filter.setAttribute('color-interpolation-filters', 'sRGB');
		[this.feImage0, this.feImage1, this.feImage2, this.feImage3].forEach((element: SVGFEImageElement, index: number): void => {
			element.setAttribute('x', '0%');
			element.setAttribute('y', '0%');
			element.setAttribute('width', '100%');
			element.setAttribute('height', '100%');
			element.setAttribute('result', `feImage${index}`);
			this.filter.append(element);
		});
		[this.disp0, this.disp1, this.disp2].forEach((element: SVGFEDisplacementMapElement, index: number): void => {
			element.setAttribute('in2', 'feImage3');
			element.setAttribute('in', 'SourceGraphic');
			element.setAttribute('xChannelSelector', 'B');
			element.setAttribute('yChannelSelector', 'G');
			this.filter.appendChild(element);

			const matrix = document.createElementNS(LiquidGlassify.SVG_NS, 'feColorMatrix');

			matrix.setAttribute('type', 'matrix');

			switch (index) {
				case 0:
					matrix.setAttribute('values', '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0');
					break;
				case 1:
					matrix.setAttribute('values', '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0');
					break;
				case 2:
					matrix.setAttribute('values', '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0');
					break;
			}

			matrix.setAttribute('result', `disp${index}`);
			this.filter.appendChild(matrix);
		});
		this.blend0.setAttribute('in2', 'disp1');
		this.blend0.setAttribute('mode', 'screen');
		this.blend1.setAttribute('in2', 'disp0');
		this.blend1.setAttribute('mode', 'screen');
		this.blend2.setAttribute('in2', 'feImage1');
		this.blend2.setAttribute('mode', 'screen');
		this.blend3.setAttribute('in2', 'feImage0');
		this.blend3.setAttribute('mode', 'multiply');
		this.composite.setAttribute('in2', 'feImage2');
		this.composite.setAttribute('operator', 'in');
		this.filter.append(this.blend0, this.blend1, this.postblur, this.blend2, this.blend3, this.composite);

		this.svg.appendChild(this.filter);
		this.parentNode.appendChild(this.svg);

		this.element.style.setProperty('-webkit-backdrop-filter', this.element.style.backdropFilter = `url(#${id})`);

		return this;
	}

	/**
	 * @internal Applies CSS properties necessary for the glass effect to the target element.
	 * @param options - Configuration options containing shadow and tint values.
	 * @returns The current instance for chaining.
	 */
	private setElementStyle(options: Required<Options>): LiquidGlassify<HTML_ELEMENT_TYPE> {
		const boxShadow = [`inset 0 2px 1px -1px #ffffff33`, `inset -1px -2px 4px -1px #ffffff33`];

		options.outsetBoxShadow && boxShadow.push(options.outsetBoxShadow);
		this.element.style.setProperty('-webkit-transform', this.element.style.transform = 'translateZ(0)');
		this.element.style.boxShadow = boxShadow.filter((s: string) => !!s).join(', ');
		this.element.style.isolation = 'isolate';
		this.element.style.backgroundColor = `color-mix(in srgb, ${options.tintColor} ${Math.max(0, Math.min(100, options.tintOpacity))}%, transparent)`;

		return this;
	}

	/**
	 * @internal Updates the SVG filter attributes based on the current element dimensions and options.
	 * @param options - Configuration options for math calculations.
	 * @returns The current instance for chaining.
	 */
	private renderLiquidGlass(options: Required<Options>): LiquidGlassify<HTML_ELEMENT_TYPE> {
		this.svg.setAttribute('width', `${options.width}`);
		this.svg.setAttribute('height', `${options.height}`);
		this.svg.setAttribute('viewBox', `0 0 ${options.width} ${options.height}`);

		this.feImage0.setAttributeNS(LiquidGlassify.XLINK_NS, 'xlink:href', `data:image/svg+xml,%3Csvg width='${options.width}' height='${options.height}' viewBox='0 0 ${options.width} ${options.height}' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='${options.width}' height='${options.height}' rx='${options.cornerRadius}' fill='%230001' /%3E%3Crect x='0' y='0' width='${options.width}' height='${options.height}' rx='${options.cornerRadius}' fill='%23FFF' style='filter:blur(${options.darknessBlur}px)' /%3E%3C/svg%3E`);
		this.feImage1.setAttributeNS(LiquidGlassify.XLINK_NS, 'xlink:href', `data:image/svg+xml,%3Csvg width='${options.width}' height='${options.height}' viewBox='0 0 ${options.width} ${options.height}' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='${options.width}' height='${options.height}' rx='${options.cornerRadius}' fill='%23FFF1' style='filter:blur(${options.lightnessBlur}px)' /%3E%3C/svg%3E`);
		this.feImage2.setAttributeNS(LiquidGlassify.XLINK_NS, 'xlink:href', `data:image/svg+xml,%3Csvg width='${options.width}' height='${options.height}' viewBox='0 0 ${options.width} ${options.height}' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='${options.width}' height='${options.height}' rx='${options.cornerRadius}' fill='%23000' /%3E%3C/svg%3E`);
		this.feImage3.setAttributeNS(LiquidGlassify.XLINK_NS, 'xlink:href', `data:image/svg+xml,%3Csvg width='${options.width}' height='${options.height}' viewBox='0 0 ${options.width} ${options.height}' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='gradient1' x1='0%25' y1='0%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' stop-color='%23000'/%3E%3Cstop offset='100%25' stop-color='%2300F'/%3E%3C/linearGradient%3E%3ClinearGradient id='gradient2' x1='0%25' y1='0%25' x2='0%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23000'/%3E%3Cstop offset='100%25' stop-color='%230F0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='0' y='0' width='${options.width}' height='${options.height}' rx='${options.cornerRadius}' fill='%237F7F7F' /%3E%3Crect x='0' y='0' width='${options.width}' height='${options.height}' rx='${options.cornerRadius}' fill='%23000' /%3E%3Crect x='0' y='0' width='${options.width}' height='${options.height}' rx='${options.cornerRadius}' fill='url(%23gradient1)' style='mix-blend-mode: screen' /%3E%3Crect x='0' y='0' width='${options.width}' height='${options.height}' rx='${options.cornerRadius}' fill='url(%23gradient2)' style='mix-blend-mode: screen' /%3E%3Crect x='0' y='0' width='${options.width}' height='${options.height}' rx='${options.cornerRadius}' fill='%237F7F7FBB' style='filter:blur(${20 - options.centerSize}px)' /%3E%3C/svg%3E`);
		this.disp0.setAttribute('scale', `${-1 * options.distortion + options.iridescence / 10}`);
		this.disp1.setAttribute('scale', `-${options.distortion}`);
		this.disp2.setAttribute('scale', `${-1 * options.distortion - options.iridescence / 10}`);
		this.postblur.setAttribute('stdDeviation', `${options.postBlur / 10}`);

		return this;
	}

	/**
	 * @internal Applies a basic CSS blur when the full SVG effect is not supported.
	 * @param _options - Configuration options (unused in fallback, kept for signature consistency).
	 * @returns The current instance for chaining.
	 */
	private renderFallbackEffect(_options: Required<Options>): LiquidGlassify<HTML_ELEMENT_TYPE> {
		this.element.style.setProperty('-webkit-backdrop-filter', this.element.style.backdropFilter = 'blur(2.5px)');

		return this;
	}

	/**
	 * @internal Attaches Resize and Mutation observers to keep the liquid glass effect synced with the DOM element.
	 * @param onResize - Callback executed when the element dimensions change.
	 * @returns The current instance for chaining.
	 */
	private subscribeToChanges(onResize: () => any): LiquidGlassify<HTML_ELEMENT_TYPE> {
		this.mutationObserver?.disconnect();
		this.mutationObserver = new MutationObserver((mutations: MutationRecord[]) => {
			for (const mutation of mutations) {
				if (Array.from(mutation.removedNodes).includes(this.element)) {
					this.dispose();
					break;
				}
			}
		});
		this.element.parentNode && this.mutationObserver.observe(this.element.parentNode, { childList: true, });

		this.resizeObserver?.disconnect();

		// Use requestAnimationFrame to prevent layout thrashing on resize
		let ticking = false;
		this.resizeObserver = new ResizeObserver(() => {
			if (!ticking) {
				window.requestAnimationFrame(() => {
					onResize();
					ticking = false;
				});
				ticking = true;
			}
		});
		this.resizeObserver.observe(this.element);

		return this;
	}

	/**
	 * @internal Gets or creates the global hidden container that stores all SVG filters.
	 * @returns The HTMLDivElement acting as the SVG container.
	 */
	private get parentNode(): HTMLDivElement {
		if (!LiquidGlassify.parentNode) {
			LiquidGlassify.parentNode = document.createElement('div');
			LiquidGlassify.parentNode.style.position = 'absolute';
			LiquidGlassify.parentNode.style.top = '-999px';
			LiquidGlassify.parentNode.style.left = '-999px';
			document.body.appendChild(LiquidGlassify.parentNode);
		}

		return LiquidGlassify.parentNode;
	}
}

/**
 * Configuration options for the LiquidGlassify effect.
 */
type Options = {
	/**
	 * Element's width in pixels. Usually calculated automatically.
	 */
	width?: number;
	/**
	 * Element's height in pixels. Usually calculated automatically.
	 */
	height?: number;
	/**
	 * Element's border-radius in pixels. Usually calculated automatically.
	 */
	cornerRadius?: number;
	/**
	 * Darkness blur intensity. @defaultValue `5`
	 */
	darknessBlur?: number;
	/**
	 * Magnification and displacement level.
	 * @defaultValue `40`
	 */
	distortion?: number;
	/**
	 * Lightness blur intensity. @defaultValue `15`
	 */
	lightnessBlur?: number;
	/**
	 * Size of the center gradient focal point (0-20).
	 * @defaultValue `15`
	 */
	centerSize?: number;
	/**
	 * Chromatic aberration / Iridescence strength (0-50).
	 * @defaultValue `80`
	 */
	iridescence?: number;
	/**
	 * Final smoothing blur applied to the glass effect (0-100).
	 * @defaultValue `15`
	 */
	postBlur?: number;
	/**
	 * Optional custom CSS box-shadow string to apply to the element.
	 */
	outsetBoxShadow?: string;
	/**
	 * Tint color. Can be hex code, RGB string, or CSS variable.
	 * @defaultValue `#ffffff`
	 */
	tintColor?: string;
	/**
	 * Tint transparency percentage (0-100).
	 * @defaultValue `65`
	 */
	tintOpacity?: number;
};