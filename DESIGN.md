---
name: Chance AI Shadow
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1b1b'
  surface-container: '#1f1f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#d4c0d7'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#303030'
  outline: '#9d8ba0'
  outline-variant: '#514255'
  surface-tint: '#ecb2ff'
  primary: '#ecb2ff'
  on-primary: '#520071'
  primary-container: '#bd00ff'
  on-primary-container: '#ffffff'
  inverse-primary: '#9900cf'
  secondary: '#ffabf3'
  on-secondary: '#5b005b'
  secondary-container: '#fe00fe'
  on-secondary-container: '#500050'
  tertiary: '#c9c6c5'
  on-tertiary: '#313030'
  tertiary-container: '#777575'
  on-tertiary-container: '#fcffff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#f8d8ff'
  primary-fixed-dim: '#ecb2ff'
  on-primary-fixed: '#320047'
  on-primary-fixed-variant: '#74009f'
  secondary-fixed: '#ffd7f5'
  secondary-fixed-dim: '#ffabf3'
  on-secondary-fixed: '#380038'
  on-secondary-fixed-variant: '#810081'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c9c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474646'
  background: '#131313'
  on-background: '#e2e2e2'
  surface-variant: '#353535'
typography:
  display-lg:
    fontFamily: Bodoni Moda
    fontSize: 72px
    fontWeight: '800'
    lineHeight: 80px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Bodoni Moda
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
  headline-lg-mobile:
    fontFamily: Bodoni Moda
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Bodoni Moda
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  body-lg:
    fontFamily: Sora
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Sora
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Sora
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  caption:
    fontFamily: Sora
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
spacing:
  base: 8px
  gutter: 24px
  margin: 32px
  container-max: 1280px
---

## Brand & Style

This design system embodies a "Romantic Cyberpunk" aesthetic—a sophisticated intersection of high-technology and moody, noir-inspired elegance. It is built for an audience that values exclusivity, mystery, and avant-garde AI tools. The visual language is defined by absolute darkness, punctuated by high-frequency neon accents that suggest energy pulsing beneath a cold, minimal surface.

The design style is **Minimalist High-Contrast**. It leverages the "void" of absolute black to create a sense of infinite depth. By combining razor-sharp edges with subtle glassmorphism and neon glows, the UI feels like a high-end physical console found in a futuristic, dimly lit cityscape. It avoids clutter, favoring massive negative space and extreme typographic hierarchy to evoke a premium, authoritative emotional response.

## Colors

The palette is rooted in **Absolute Black (#000000)** to ensure perfect contrast on OLED displays and to establish the "void" aesthetic. 

- **Primary (Vibrant Purple):** Used for primary actions, active states, and core brand identifiers. It represents the "intelligence" of the AI.
- **Secondary (Magenta):** Used sparingly for high-attention alerts, accents, and gradient stops to create a "bio-digital" warmth.
- **Surface (Deep Charcoal):** Used for container backgrounds to provide just enough separation from the absolute black background without breaking the dark immersion.
- **Accents:** Use light-transmitting glows (diffused purples) behind glass layers to simulate depth and energy.

## Typography

The typography strategy relies on the tension between the classical, high-contrast **Bodoni Moda** and the technical, geometric **Sora**.

- **Display & Headlines:** Bodoni Moda provides a "gothic-editorial" feel. It should be used for the brand name and major section headers. Use tight letter-spacing for large sizes to enhance the aggressive, premium look.
- **Body & Interface:** Sora provides maximum legibility and a modern, robotic precision. 
- **Labels:** Small caps or all-caps Sora with increased tracking should be used for metadata and navigation to maintain a technical "HUD" feel.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy to maintain architectural rigidity. A 12-column system is used for desktop, collapsing to 4 columns for mobile. 

- **Alignment:** Elements should strictly align to the grid edges to emphasize the "sharp" design language.
- **Rhythm:** Use an 8px base unit. Large sections of content should be separated by massive vertical padding (80px to 120px) to allow the absolute black background to "breathe."
- **Margins:** Generous outer margins are required to prevent the UI from feeling cramped, reinforcing the minimalist luxury vibe.

## Elevation & Depth

This design system avoids traditional shadows in favor of **Tonal Layering** and **Luminescent Depth**.

- **Surface Levels:** The background is #000000. Interactive containers use #0A0A0A. 
- **Borders:** Use thin (1px), low-opacity white or purple borders (e.g., `rgba(189, 0, 255, 0.2)`) to define shapes instead of drop shadows.
- **Glassmorphism:** For overlays and navigation bars, use a backdrop blur (20px) with a 5% white opacity fill. This creates a "frosted obsidian" effect.
- **Glows:** Primary buttons and active states should emit a soft, localized outer glow (blur: 15px, color: Primary) to simulate light reflecting off a dark surface.

## Shapes

The shape language is **Strictly Sharp**. 

- **Corners:** Use 0px border radius for all primary containers, buttons, and input fields. This communicates a sense of precision, danger, and technological edge.
- **Exceptions:** Icons and very small decorative elements may use slight rounding only if necessary for legibility, but the structural UI remains rectangular and rigid.

## Components

- **Buttons:** Primary buttons use a solid Purple-to-Magenta linear gradient (45 degrees) with sharp corners. Ghost buttons use a 1px Purple border with white text. Hover states should trigger a brightness increase and a subtle neon outer glow.
- **Input Fields:** Backgrounds are absolute black with a 1px Deep Charcoal border. Upon focus, the border transitions to Vibrant Purple with a subtle inner glow.
- **Cards:** Use the Deep Charcoal (#0A0A0A) background. Content should be heavily inset with at least 24px of padding.
- **Chips/Badges:** Small, sharp-edged rectangles with a dark purple background and bright magenta text. These represent "data tags."
- **Lists:** Separated by 1px Deep Charcoal hair lines. Interactive list items should have a subtle background shift to #0F0F0F on hover.
- **Progress Bars:** Ultra-thin (2px-4px) lines using the primary purple gradient, often placed at the very top or bottom of containers to maintain the minimalist feel.