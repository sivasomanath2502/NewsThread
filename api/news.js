export default async function handler(req, res) {
    const API_KEY = process.env.NEWS_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: "Missing API key" });
    }

    try {
        const { q = "", category = "", pageSize = "20" } = req.query;

        let url;

        if (q) {
            // 🔥 Search mode
            url = new URL("https://newsapi.org/v2/everything");
            url.searchParams.set("q", q);
            url.searchParams.set("language", "en");
            url.searchParams.set("sortBy", "publishedAt");
        } else {
            // 🔥 Normal feed
            url = new URL("https://newsapi.org/v2/top-headlines");
            url.searchParams.set("country", "in");

            if (category) {
                url.searchParams.set("category", category);
            }
        }

        url.searchParams.set("pageSize", pageSize);
        url.searchParams.set("apiKey", API_KEY);

        const response = await fetch(url);
        const data = await response.json();

        return res.status(200).json(data);

    } catch (err) {
        return res.status(500).json({
            error: "Failed to fetch news",
            details: err.message,
        });
    }
}