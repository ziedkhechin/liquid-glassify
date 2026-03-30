# LiquidGlassify

A high-performance, lightweight TypeScript library that applies a dynamic "liquid glass" effect to any HTML element using SVG backdrop filters. This effect includes realistic refraction, chromatic aberration (iridescence), and customizable frosted glass properties.

---

## Features

* **Dynamic Refraction:** Real-time displacement mapping that reacts to the background.
* **Iridescence:** Adjustable chromatic aberration for a premium glass look.
* **Auto-Responsive:** Ensures the filter stays perfectly aligned if the element or window changes size.
* **Smart Cleanup:** Automatically disposes SVG resources when the target element is removed from the DOM.
* **TypeScript Ready:** Fully typed for a better developer experience.

---

## Installation

```bash
npm install liquid-glassify
```

---

## Usage

### Basic Setup

```typescript
import LiquidGlassify from 'liquid-glassify';

const element = document.querySelector('.my-glass-card');

// Initialize with default settings
LiquidGlassify.getOrCreateInstance(element);
```

### With Custom Options

```typescript
LiquidGlassify.getOrCreateInstance(element, {
    darknessBlur: 10,
    lightnessBlur: 20,
    iridescence: 100,
    centerSize: 18,
    postBlur: 5
});
```

---

## API Options

The `Options` object allows you to fine-tune the liquid glass physics:

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `darknessBlur` | `number` | `5` | Intensity of the shadow/edge depth blur. |
| `lightnessBlur` | `number` | `15` | Intensity of the highlight/frosted blur. |
| `centerSize` | `number` | `15` | Controls the focal point of the distortion (0-20). |
| `iridescence` | `number` | `80` | Strength of the RGB color splitting/refraction (0-50 logic internal). |
| `postBlur` | `number` | `15` | Final smoothing blur applied to the entire effect. |
| `cornerRadius` | `number` | *Auto* | Corner radius of the glass effect (inherited from CSS if not set). |

---

## Methods

### `getOrCreateInstance(element, options)`
The primary entry point. It checks if an instance already exists for the element to prevent duplicate SVG injections.

### `dispose()`
Manually removes the SVG filters from the DOM and disconnects all observers.

---

## How it Works

LiquidGlassify generates a hidden SVG filter in the document body. It uses several `feImage` primitives to create displacement maps based on the element's dimensions. These maps drive `feDisplacementMap` filters that shift the Red, Green, and Blue channels independently to simulate light passing through thick, irregular glass.

---

## License & Copyright

© 2026 Zied Khechine.
This project is licensed under the **MIT License**.