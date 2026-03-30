/**
 * LiquidGlassify v1.0.0
 * (c) 2026 Zied Khechine
 * Released under the MIT License.
 */
export default class LiquidGlassify<HTML_ELEMENT_TYPE extends HTMLElement = HTMLElement> {
	private static readonly SVG_NS: string = 'http://www.w3.org/2000/svg';
	private static readonly XLINK_NS: string = 'http://www.w3.org/1999/xlink';
	private static readonly instances: Map<HTMLElement, LiquidGlassify> = new Map();
	private static readonly defaultOptions: Options = {
		width: undefined, height: undefined, cornerRadius: undefined,
		darknessBlur: 5, lightnessBlur: 15, centerSize: 15, iridescence: 80, postBlur: 15,
	}
	private static parentNode: HTMLDivElement;

	private element: HTML_ELEMENT_TYPE;
	private svg: SVGElement;
	private filter: SVGFilterElement;
	private feImage0: SVGFEImageElement;
	private feImage1: SVGFEImageElement;
	private feImage2: SVGFEImageElement;
	private feImage3: SVGFEImageElement;
	private disp0: SVGFEDisplacementMapElement;
	private disp1: SVGFEDisplacementMapElement;
	private disp2: SVGFEDisplacementMapElement;
	private blend0: SVGFEBlendElement;
	private blend1: SVGFEBlendElement;
	private blend2: SVGFEBlendElement;
	private blend3: SVGFEBlendElement;
	private postblur: SVGFEGaussianBlurElement;
	private composite: SVGFECompositeElement;
	private resizeObserver: ResizeObserver;
	private mutationObserver: MutationObserver;

	constructor(
			element: HTML_ELEMENT_TYPE,
			options: Options,
	) {
		this.element = element;
		this.appendSvg().subscribeToChanges(() => this.render(options));
		LiquidGlassify.instances.set(element, this);
	}

	public static getInstance<HTML_ELEMENT_TYPE extends HTMLElement = HTMLElement>(
			element: string | HTML_ELEMENT_TYPE
	): LiquidGlassify<HTML_ELEMENT_TYPE> {
		let _element: HTML_ELEMENT_TYPE;

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

	public static getOrCreateInstance<HTML_ELEMENT_TYPE extends HTMLElement = HTMLElement>(
			element: string | HTML_ELEMENT_TYPE,
			options: Options = {},
	): LiquidGlassify<HTML_ELEMENT_TYPE> {
		let _element: HTML_ELEMENT_TYPE;

		if ('string' === typeof element) {
			_element = document.querySelector(element);
		} else if (element instanceof HTMLElement) {
			_element = element;
		}
		if (!_element) {
			return null;
		}

		return LiquidGlassify.getInstance(_element)?.render(options) ?? new LiquidGlassify<HTML_ELEMENT_TYPE>(_element, options);
	}

	public dispose(): void {
		this.resizeObserver.disconnect();
		this.mutationObserver.disconnect();
		this.parentNode.removeChild(this.svg);
		LiquidGlassify.instances.delete(this.element);
		if (!LiquidGlassify.instances.size) {
			document.body.removeChild(LiquidGlassify.parentNode);
			LiquidGlassify.parentNode = undefined;
		}
	}

	/**
	 * Generates the SVG Filter DOM structure
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

		this.element.style.backdropFilter = `url(#${id})`;
		this.element.style.setProperty('-webkit-backdrop-filter', `url(#${id})`);

		this.svg.appendChild(this.filter);
		this.parentNode.appendChild(this.svg);

		return this;
	}

	private render(options: Options): LiquidGlassify<HTML_ELEMENT_TYPE> {
		const computedStyle: CSSStyleDeclaration = window.getComputedStyle(this.element);

		// Merge provided options with defaults to prevent errors
		options = {
			...LiquidGlassify.defaultOptions,
			width: parseInt(computedStyle.width), height: parseInt(computedStyle.height), cornerRadius: parseInt(computedStyle.borderRadius),
			...options,
		};
		this.svg.setAttribute('width', `${options.width}`);
		this.svg.setAttribute('height', `${options.height}`);
		this.svg.setAttribute('viewBox', `0 0 ${options.width} ${options.height}`);

		this.feImage0.setAttributeNS(LiquidGlassify.XLINK_NS, 'xlink:href', `data:image/svg+xml,%3Csvg width='${options.width}' height='${options.height}' viewBox='0 0 ${options.width} ${options.height}' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='${options.width}' height='${options.height}' rx='${options.cornerRadius}' fill='%230001' /%3E%3Crect x='0' y='0' width='${options.width}' height='${options.height}' rx='${options.cornerRadius}' fill='%23FFF' style='filter:blur(${options.darknessBlur}px)' /%3E%3C/svg%3E`);
		this.feImage1.setAttributeNS(LiquidGlassify.XLINK_NS, 'xlink:href', `data:image/svg+xml,%3Csvg width='${options.width}' height='${options.height}' viewBox='0 0 ${options.width} ${options.height}' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='${options.width}' height='${options.height}' rx='${options.cornerRadius}' fill='%23FFF1' style='filter:blur(${options.lightnessBlur}px)' /%3E%3C/svg%3E`);
		this.feImage2.setAttributeNS(LiquidGlassify.XLINK_NS, 'xlink:href', `data:image/svg+xml,%3Csvg width='${options.width}' height='${options.height}' viewBox='0 0 ${options.width} ${options.height}' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='${options.width}' height='${options.height}' rx='${options.cornerRadius}' fill='%23000' /%3E%3C/svg%3E`);
		this.feImage3.setAttributeNS(LiquidGlassify.XLINK_NS, 'xlink:href', `data:image/svg+xml,%3Csvg width='${options.width}' height='${options.height}' viewBox='0 0 ${options.width} ${options.height}' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='gradient1' x1='0%25' y1='0%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' stop-color='%23000'/%3E%3Cstop offset='100%25' stop-color='%2300F'/%3E%3C/linearGradient%3E%3ClinearGradient id='gradient2' x1='0%25' y1='0%25' x2='0%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23000'/%3E%3Cstop offset='100%25' stop-color='%230F0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='0' y='0' width='${options.width}' height='${options.height}' rx='${options.cornerRadius}' fill='%237F7F7F' /%3E%3Crect x='0' y='0' width='${options.width}' height='${options.height}' rx='${options.cornerRadius}' fill='%23000' /%3E%3Crect x='0' y='0' width='${options.width}' height='${options.height}' rx='${options.cornerRadius}' fill='url(%23gradient1)' style='mix-blend-mode: screen' /%3E%3Crect x='0' y='0' width='${options.width}' height='${options.height}' rx='${options.cornerRadius}' fill='url(%23gradient2)' style='mix-blend-mode: screen' /%3E%3Crect x='0' y='0' width='${options.width}' height='${options.height}' rx='${options.cornerRadius}' fill='%237F7F7FBB' style='filter:blur(${20 - options.centerSize}px)' /%3E%3C/svg%3E`);
		this.disp0.setAttribute('scale', `${-150 + options.iridescence / 10}`);
		this.disp1.setAttribute('scale', '-150');
		this.disp2.setAttribute('scale', `${-150 - options.iridescence / 10}`);
		this.postblur.setAttribute('stdDeviation', `${options.postBlur / 10}`);

		return this;
	}

	private subscribeToChanges(onResize: () => any): LiquidGlassify<HTML_ELEMENT_TYPE> {
		this.mutationObserver = new MutationObserver((mutations: MutationRecord[]) => {
			for (const mutation of mutations) {
				if (Array.from(mutation.removedNodes).includes(this.element)) {
					this.dispose();
					break;
				}
			}
		});
		this.mutationObserver.observe(this.element.parentNode, { childList: true, });

		this.resizeObserver = new ResizeObserver(onResize);
		this.resizeObserver.observe(this.element);

		return this;
	}

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

type Options = {
	/**
	 * Element's width.
	 */
	width?: number;
	/**
	 * Element's height
	 */
	height?: number;
	/**
	 * Element's corner radius
	 */
	cornerRadius?: number;
	/**
	 * Darkness blur
	 *
	 * @defaultValue `5`
	 */
	darknessBlur?: number;
	/**
	 * Lightness blur
	 *
	 * @defaultValue `15`
	 */
	lightnessBlur?: number;
	/**
	 * Center Size (0-20)
	 *
	 * @defaultValue `15`
	 */
	centerSize?: number;
	/**
	 * Iridescence (0-50)
	 *
	 * @defaultValue `80`
	 */
	iridescence?: number;
	/**
	 * Post-blur (0-100)
	 *
	 * @defaultValue `15`
	 */
	postBlur?: number;
};