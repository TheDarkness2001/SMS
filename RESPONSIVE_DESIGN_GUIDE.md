# 📱 Responsive Design Quick Reference Guide

## Breakpoint System

```css
/* Mobile First Approach */
0px - 480px     /* Small Mobile */
481px - 768px   /* Small Tablet */ 
769px - 1024px  /* Large Tablet */
1025px - 1920px /* Desktop */
1921px+         /* Ultra-Wide */
```

## CSS Media Queries

### Mobile (≤480px)
```css
@media (max-width: 480px) {
  /* Single column layouts */
  /* Padding: 16px */
  /* Button height: 44px minimum */
  /* Font size: 14px for touch text */
}
```

### Tablet (481-768px)
```css
@media (max-width: 768px) {
  /* Two-column grids */
  /* Padding: 20px */
  /* Margin-left: 0 (hide sidebar) */
  /* Modal: 95% width */
}
```

### Desktop (1025-1920px)
```css
@media (min-width: 1025px) {
  /* Full sidebar: 270px */
  /* Margin-left: 270px */
  /* Max-width: 1600px */
  /* Multi-column grids */
}
```

### Ultra-Wide (≥1921px)
```css
@media (min-width: 1921px) {
  /* Center content with auto margins */
  /* Max-width: 1600px */
  /* Balanced spacing */
}
```

---

## Layout Structure

### Content Area Layout
```
Desktop (1025px+)
┌─────────────────────────────────────┐
│ NAVBAR (Fixed, height: 70px)        │
├──────────┬─────────────────────────┤
│ SIDEBAR  │ CONTENT AREA            │
│ 270px    │ margin-left: 270px      │
│ Fixed    │ margin-right: 20px      │
│ z: 99    │ max-width: 1600px       │
│          │                         │
└──────────┴─────────────────────────┘

Tablet (<768px)
┌─────────────────────────────────────┐
│ NAVBAR                              │
├─────────────────────────────────────┤
│ CONTENT AREA (Full width)           │
│ margin-left: 0, padding: 20px       │
│ Sidebar hidden                      │
│                                     │
└─────────────────────────────────────┘

Mobile (≤480px)
┌─────────────────────────────────────┐
│ NAVBAR                              │
├─────────────────────────────────────┤
│ CONTENT AREA (Full width)           │
│ margin-left: 0, padding: 16px       │
│ Sidebar: transform translateX(-100%)│
│                                     │
└─────────────────────────────────────┘
```

---

## Common Responsive Classes

### Grid Utilities
```css
/* Auto-fit grid (responsive) */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

/* Tablet: Single column */
@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
```

### Flex Utilities
```css
/* Responsive flex direction */
.flex-row-mobile {
  display: flex;
  flex-direction: column;
}

@media (min-width: 769px) {
  .flex-row-mobile {
    flex-direction: row;
  }
}
```

### Typography
```css
/* Mobile: Smaller text */
@media (max-width: 480px) {
  h1 { font-size: 24px; }
  h2 { font-size: 20px; }
  h3 { font-size: 18px; }
  p { font-size: 14px; }
}

/* Desktop: Larger text */
@media (min-width: 1025px) {
  h1 { font-size: 28px; }
  h2 { font-size: 24px; }
  h3 { font-size: 20px; }
  p { font-size: 15px; }
}
```

---

## Touch Targets

```css
/* Minimum touch target size: 44x44px */
.btn {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 18px;  /* At least 12px padding */
}

.icon-button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Ensure gap between clickables */
.btn + .btn {
  margin-left: 8px;  /* Space for accidental touches */
}
```

---

## Table Responsiveness

### Desktop Tables
```css
.table {
  width: 100%;
  border-collapse: collapse;
}

.table th, .table td {
  padding: 16px;
  text-align: left;
}
```

### Mobile Tables
```css
@media (max-width: 768px) {
  /* Option 1: Horizontal scroll */
  .table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  /* Option 2: Reduce columns shown */
  .table th:nth-child(n+4),
  .table td:nth-child(n+4) {
    display: none;  /* Hide less important columns */
  }
  
  /* Adjust padding */
  .table th, .table td {
    padding: 8px 6px;
  }
}
```

---

## Navigation Patterns

### Sidebar (Desktop)
```css
.sidebar {
  position: fixed;
  left: 0;
  width: 270px;
  height: calc(100vh - 70px);
  background: #1e293b;
  z-index: 99;
}

.content-area {
  margin-left: 270px;
}
```

### Drawer (Mobile)
```css
.sidebar {
  position: fixed;
  left: 0;
  width: 220px;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  z-index: 100;
}

.sidebar.open {
  transform: translateX(0);
  box-shadow: 4px 0 15px rgba(0, 0, 0, 0.3);
}
```

---

## Images & Media

```css
/* Responsive images */
img {
  max-width: 100%;
  height: auto;
}

/* Container-relative sizing */
.image-container {
  max-width: 100%;
  box-sizing: border-box;
}

/* Aspect ratio containers */
.video-container {
  position: relative;
  padding-bottom: 56.25%;  /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
}

.video-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
```

---

## Common Patterns

### Full-Width Sections
```css
.section {
  width: 100%;
  padding: 20px;
  box-sizing: border-box;
  
  max-width: 1600px;
  margin: 0 auto;  /* Center on ultra-wide */
}
```

### Centered Content
```css
.centered-content {
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  padding: 0 20px;
}

@media (max-width: 480px) {
  .centered-content {
    padding: 0 16px;
  }
}
```

### Stacked on Mobile
```css
.two-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 768px) {
  .two-column {
    grid-template-columns: 1fr;
  }
}
```

---

## Testing Checklist

### Mobile (≤480px)
- [ ] Sidebar hidden or drawer
- [ ] Single-column layouts
- [ ] Button touch targets ≥44px
- [ ] No horizontal scroll
- [ ] Text readable
- [ ] Images scale properly
- [ ] Forms accessible

### Tablet (481-1024px)
- [ ] Content full-width
- [ ] Two-column grids work
- [ ] Tables readable
- [ ] Navigation accessible
- [ ] Modals centered
- [ ] Landscape mode works

### Desktop (1025+)
- [ ] Full sidebar visible
- [ ] Multi-column layouts
- [ ] No excessive whitespace
- [ ] Professional appearance
- [ ] All features visible
- [ ] Tables properly formatted

### Ultra-Wide (≥1921px)
- [ ] Content centered
- [ ] Max-width applied
- [ ] Balanced spacing
- [ ] No stretched text
- [ ] Charts readable

---

## Useful Tools & Resources

### Testing Tools
- Chrome DevTools (F12)
- Responsive design simulator: https://responsivedesignchecker.com
- Real device testing (actual phones/tablets)

### Reference
- MDN Responsive Design: https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design
- Material Design Breakpoints
- Bootstrap Grid System

---

## Performance Tips

1. **Mobile-First CSS**
   ```css
   /* Mobile base styles first */
   .card { padding: 16px; }
   
   /* Add larger styles for bigger screens */
   @media (min-width: 769px) {
     .card { padding: 24px; }
   }
   ```

2. **Avoid Layout Shifts**
   ```css
   /* Bad: Causes layout shift */
   @media (max-width: 768px) {
     .element { display: none; }
   }
   
   /* Good: Use visibility or opacity */
   @media (max-width: 768px) {
     .element { visibility: hidden; }
   }
   ```

3. **Use Modern CSS**
   ```css
   /* Use CSS Grid for flexibility */
   .gallery {
     display: grid;
     grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
     gap: 20px;
   }
   ```

---

**Last Updated:** December 18, 2025  
**Maintained By:** Dev Team  
**Version:** 1.0
