import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route for Sermons (Automatic YouTube Sync)
  app.get("/api/sermons", async (req, res) => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const channelId = process.env.YOUTUBE_CHANNEL_ID;

    if (!apiKey || !channelId) {
      return res.json({ setupRequired: true, data: [] });
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=12&type=video`
      );

      if (!response.ok) throw new Error("YouTube API Error");

      const data = await response.json();

      const sermons = data.items.map((item: any) => {
        const description = item.snippet.description || "";

        const speakerMatch = description.match(/Speaker:\s*([^\n\r]+)/i);
        const keypointMatch = description.match(/Key Point:\s*([^\n\r]+)/i);

        return {
          id: item.id.videoId,
          url: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
          title: item.snippet.title,
          category: 'sermons',
          description: description,
          speaker: speakerMatch ? speakerMatch[1].trim() : "Guest Speaker",
          keypoint: keypointMatch ? keypointMatch[1].trim() : "",
          date: new Date(item.snippet.publishedAt).toLocaleDateString('en-US', { 
            month: 'long', day: 'numeric', year: 'numeric' 
          }),
          videoUrl: `https://www.youtube.com/embed/${item.id.videoId}`
        };
      });

      res.json({ data: sermons });
    } catch (error: any) {
      res.status(500).json({ error: error.message, data: [] });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
