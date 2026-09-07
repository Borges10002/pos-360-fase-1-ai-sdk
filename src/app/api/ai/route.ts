import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export async function GET() {
    const result = await generateText({
        model: openrouter("openai/gpt-4o"),
        prompt: 'Traduza "Hello World" para português!',
        system:
            "Você é uma AI especializada em tradução, sempre retorne da maneira mais sucinta possível.",
    });

    return NextResponse.json({ message: result.text });
}
