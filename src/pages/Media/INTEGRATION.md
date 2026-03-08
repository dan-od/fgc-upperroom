# Youth Community Media Gallery: Integration Guide

This document explains how to integrate the advanced media gallery features—including YouTube sync, audio support, and date filtering—into your project while maintaining your specific brand identity (colors, fonts, and files).

---

## 1. Architecture: Full-Stack Setup
To securely handle YouTube API keys and dynamic content, the project uses an **Express + Vite** full-stack architecture.

### Backend (`server.ts`)
1. **YouTube API Endpoint**: Create a route (`/api/sermons`) that uses `fetch` to call the YouTube Data API v3.
2. **Metadata Parsing**: Use Regex to extract "Speaker" and "Key Point" from the YouTube video description.
   ```typescript
   const speakerMatch = description.match(/Speaker:\s*([^\n\r]+)/i);
   const keypointMatch = description.match(/Key Point:\s*([^\n\r]+)/i);
   ```
3. **Environment Variables**: Ensure `YOUTUBE_API_KEY` and `YOUTUBE_CHANNEL_ID` are stored in your server's environment.

---

## 2. Frontend Data Model
Update your `GalleryImage` interface to support the new media types and metadata:

```typescript
interface GalleryImage {
  id: string;
  url: string;
  title: string;
  category: 'worship' | 'community' | 'events' | 'youth' | 'sermons' | 'audio';
  description: string;
  date: string;
  timestamp: number; // Critical for "Latest First" sorting
  speaker?: string;
  keypoint?: string;
  videoUrl?: string;
  audioUrl?: string;
}
```

---

## 3. Core Logic: Sorting & Filtering
Use `useMemo` to handle complex filtering without performance lag.

### Latest-First Sorting
Always sort your combined data (static + fetched) by timestamp descending:
```typescript
const allContent = useMemo(() => {
  return [...STATIC_IMAGES, ...sermons].sort((a, b) => b.timestamp - a.timestamp);
}, [sermons]);
```

### Multi-Layer Filtering
Implement a filter that checks both **Category** and **Date Range** (Presets or Manual):
1. **Presets**: Calculate timestamps for "This Month" (30 days), "Last 3 Months" (90 days), etc.
2. **Manual Range**: Use `startDate` and `endDate` from HTML5 date inputs.
3. **Reset Logic**: Ensure selecting a preset clears manual dates, and vice versa.

---

## 4. UI Components & Theming
Map these components to your project's Tailwind theme:

### Filter Navigation
- **Categories**: Use a horizontal flex-wrap container.
- **Date Presets**: A secondary, smaller row of buttons.
- **Manual Picker**: Two `<input type="date" />` fields with a "Clear" button.

### Gallery Cards
- **Icons**: Use `lucide-react` icons (`Play`, `Headphones`) as overlays to indicate media type.
- **Hover States**: Use a gradient overlay (`bg-gradient-to-t`) to show the Title, Speaker, and Key Point.
- **Animation**: Use `motion.div` from `motion/react` with `layout="position"` to prevent stretching during grid shifts.

### Lightbox (The "Player")
- **Video**: Use an `<iframe>` for YouTube embeds.
- **Audio**: Use the native `<audio controls />` tag inside a styled container.
- **Key Point Display**: Create a dedicated "Key Point" card inside the lightbox for high-impact visibility.

---

## 5. Implementation Checklist for Your Agent
1. **Server**: Add `express` and `vite` as middleware in `server.ts`.
2. **Package.json**: Update the `dev` script to `tsx server.ts`.
3. **App.tsx**:
   - Add `useState` for `sermons`, `activeCategory`, `activeDateFilter`, `startDate`, and `endDate`.
   - Add a `useEffect` to fetch from `/api/sermons` on mount.
   - Replace the static gallery array with the `filteredImages` memo.
   - Update the Lightbox to conditionally render the `<iframe>` or `<audio>` tag.
4. **Styling**: Replace the hex codes (e.g., `#5a5a40`) and font classes (e.g., `font-serif`) with your project's specific Tailwind variables.

---

## 6. Brand Mapping
| Feature | My Code | Your Project |
| :--- | :--- | :--- |
| **Primary Color** | `#5a5a40` (Olive) | `bg-primary` / `text-primary` |
| **Background** | `#fdfcf8` (Warm White) | `bg-background` |
| **Typography** | `font-serif` | `font-sans` / `font-display` |
| **Radius** | `rounded-3xl` | `rounded-xl` / `rounded-full` |
| **Icons** | `lucide-react` | (Keep or swap for your icon set) |
