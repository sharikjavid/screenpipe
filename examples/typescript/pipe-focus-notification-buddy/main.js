const INTERVAL = 1 * 6 * 1000; // 1 minute in milliseconds
const OPENAI_API_KEY = "sk-Lp6-yQ9uJrnbEjeqwcZIy9GRZdG1jxzU6IajcPJSrcT3BlbkFJcNyYCtMPLeV2WKxdqNq15XYAs89koFlh37HgD9by8A";

async function queryScreenpipe(params) {
    try {
        const queryParams = Object.entries(params)
            .filter(([_, v]) => v != null)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
        console.log("Calling Screenpipe:", JSON.stringify(params));
        const result = await pipe.get(`http://localhost:3030/search?${queryParams}`);
        console.log("Retrieved", result.data.length, "items from Screenpipe");
        return result;
    } catch (error) {
        console.error("Error querying Screenpipe:", error);
        return null;
    }
}

async function detectWorkStatus(screenData) {
    const prompt = `Based on the following screen data, determine if the user is working or not:

    ${JSON.stringify(screenData)}

    We will show a desktop notification if the user is not working.
    Not working:
    - Social media
    - Chatting
    - YouTube
    - Netflix
    - Games
    - Porn
    - Other distracting websites

    Be funny, sarcastic, like say "stop watching porn bro", use techbro language. Keep body short as it's a notification.

    Return a JSON object with the following structure:
    {
        "work": boolean,
        "title": "A brief title with advice or support",
        "body": "A brief message with advice or support"
    }
    Do not say anything else but JSON.`;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: prompt },
                ],
                temperature: 0.7,
            }),
        });

        const result = await response.json();
        console.log("AI response:", result);

        const content = result.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error("Error querying OpenAI API:", error);
        return null;
    }
}

async function main() {
    while (true) {
        try {
            const screenData = await queryScreenpipe({
                limit: 10,
                offset: 0,
                start_time: new Date(Date.now() - INTERVAL).toISOString(),
                end_time: new Date().toISOString(),
                content_type: "ocr",
            });

            if (screenData && screenData.data) {
                const workStatus = await detectWorkStatus(screenData.data);

                if (workStatus && !workStatus.work) {
                    pipe.sendNotification({
                        title: workStatus.title,
                        body: workStatus.body,
                    });
                }
            }
        } catch (error) {
            console.error("Error in main loop:", error);
        }

        await new Promise(resolve => setTimeout(resolve, INTERVAL));
    }
}

main();
